from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, AsyncGenerator
from sqlalchemy.orm import Session
import joblib
import json
import os
import uuid
import numpy as np
import re
import asyncio
import httpx
import logging

from app.core.config import settings
from app.core.security import get_current_user, require_role
from app.core.constants import SPECIALIST_MAP
from app.db.session import get_db
from app.models.models import User, MedicalRecord, UserRole

logger = logging.getLogger(__name__)

router = APIRouter()

ML_PATH = os.path.join(settings.ML_MODEL_PATH, "symptom_analysis")
MODEL_FILE = os.path.join(ML_PATH, "symptom_xgb_model.joblib")
META_FILE = os.path.join(ML_PATH, "model_metadata.json")

_cached_model = None
_cached_meta = None


def _load_symptom_model():
    global _cached_model, _cached_meta
    if _cached_model is None or _cached_meta is None:
        if not os.path.exists(MODEL_FILE) or not os.path.exists(META_FILE):
            raise HTTPException(status_code=500, detail="ML model not initialized.")
        _cached_model = joblib.load(MODEL_FILE)
        with open(META_FILE, "r") as f:
            _cached_meta = json.load(f)
    return _cached_model, _cached_meta


# In-memory cache for Ollama responses (LRU-style, max 200 entries)
_ollama_cache: Dict[str, str] = {}
_ollama_cache_max = 200

# Pre-generated disease response templates (filled by pregenerate_disease_templates on startup)
# Key: (disease, confidence_tier) where tier is "high"|"medium"|"low"
_disease_templates: Dict[tuple, str] = {}


def _confidence_tier(conf: float) -> str:
    """Categorize confidence into tier."""
    if conf >= 80:
        return "high"
    elif conf >= 60:
        return "medium"
    return "low"


async def pregenerate_disease_templates(diseases: List[str]):
    """Use Ollama once at startup to generate natural response templates for each disease.
    Runtime then uses these cached templates - zero Ollama latency for diagnoses."""
    from app.core.constants import SPECIALIST_MAP

    tiers = [
        ("high", 85, "You're confident about this prediction"),
        ("medium", 70, "You're moderately confident"),
        ("low", 50, "You're uncertain but suggest possibility"),
    ]

    for disease in diseases:
        specialist = SPECIALIST_MAP.get(disease, "General Physician")
        for tier_name, conf, hint in tiers:
            key = (disease, tier_name)
            if key in _disease_templates:
                continue
            prompt = (
                f"You are a friendly medical assistant. {hint}. "
                f"Write ONE natural sentence (no preamble) telling a patient their symptoms suggest {disease} "
                f"with {conf}% confidence, and recommend seeing a {specialist}. "
                f"Use placeholder {{symptoms}} where their symptom list should be inserted. "
                f"Example format: 'Based on {{symptoms}}, you likely have X. Please see Y.' "
                f"Just the sentence, no quotes."
            )
            try:
                response = await _call_ollama(prompt, max_tokens=80)
                if response:
                    _disease_templates[key] = response
            except Exception as e:
                print(f"Template gen failed for {disease}/{tier_name}: {e}")

    print(f"[Startup] Pre-generated {len(_disease_templates)} disease templates")


def _get_diagnosis_response(disease: str, confidence: float, symptoms: List[str]) -> str:
    """Get pre-generated response template for a diagnosis. Falls back if not generated."""
    from app.core.constants import SPECIALIST_MAP
    tier = _confidence_tier(confidence)
    symptom_str = ", ".join(symptoms) if symptoms else "your symptoms"

    template = _disease_templates.get((disease, tier))
    if template:
        # Substitute {symptoms} placeholder
        return template.replace("{symptoms}", symptom_str).replace("{{symptoms}}", symptom_str)

    # Fallback if Ollama pre-gen failed
    specialist = SPECIALIST_MAP.get(disease, "General Physician")
    return f"Based on {symptom_str}, this looks like {disease} ({confidence}% confidence). I'd recommend consulting a {specialist}."


async def _call_ollama(prompt: str, max_tokens: int = 80) -> str:
    """Call Ollama API with caching and token limit for speed."""
    # Cache key: hash of full prompt for true uniqueness
    import hashlib
    cache_key = hashlib.md5(prompt.encode()).hexdigest()
    if cache_key in _ollama_cache:
        return _ollama_cache[cache_key]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_API_URL}/api/generate",
                json={
                    "model": "llama2",
                    "prompt": prompt,
                    "stream": False,
                    "keep_alive": "30m",            # Keep model loaded 30 min
                    "options": {
                        "num_predict": max_tokens,  # Limit output tokens
                        "temperature": 0.5,         # Lower = faster + less rambling
                        "top_k": 1,                 # Greedy sampling = fastest
                        "top_p": 1.0,
                        "num_ctx": 256,             # Tiny context = faster prompt processing
                        "repeat_penalty": 1.0,      # Skip extra computation
                    },
                },
            )
            if response.status_code != 200:
                return ""
            data = response.json()
            result = _clean_ollama_response(data.get("response", ""))
            # Cache result
            if len(_ollama_cache) >= _ollama_cache_max:
                _ollama_cache.pop(next(iter(_ollama_cache)))  # Evict oldest
            _ollama_cache[cache_key] = result
            return result
    except Exception as e:
        print(f"Ollama error: {e}")
        return ""


async def _stream_ollama(prompt: str, max_tokens: int = 80):
    """Stream Ollama tokens as they're generated (much faster perceived latency)."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            async with client.stream(
                "POST",
                f"{settings.OLLAMA_API_URL}/api/generate",
                json={
                    "model": "llama2",
                    "prompt": prompt,
                    "stream": True,
                    "keep_alive": "30m",
                    "options": {
                        "num_predict": max_tokens,
                        "temperature": 0.5,
                        "top_k": 1,
                        "top_p": 1.0,
                        "num_ctx": 256,
                        "repeat_penalty": 1.0,
                    },
                },
            ) as response:
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        chunk = data.get("response", "")
                        if chunk:
                            yield chunk
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        print(f"Ollama stream error: {e}")
        yield ""


def _clean_ollama_response(text: str) -> str:
    """Minimal cleanup - strip surrounding quotes only. Keep llama2's natural style."""
    text = text.strip()
    # Strip surrounding quotes if Ollama wrapped the response in them
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1].strip()
    if text.startswith("'") and text.endswith("'"):
        text = text[1:-1].strip()
    return text


async def _detect_user_intent(message: str, last_asked_symptom: Optional[str] = None) -> Dict[str, Any]:
    """Use Ollama to intelligently detect user intent. Returns dict with intent type and reasoning."""
    # Context for Ollama
    context = "You are analyzing user intent in a medical chatbot conversation."
    if last_asked_symptom:
        context += f" The assistant just asked about '{last_asked_symptom}'."

    prompt = (
        f"{context}\n\n"
        f"User message: \"{message}\"\n\n"
        f"Determine the user's intent. Respond with ONLY a JSON object (no markdown, no extras):\n"
        f'{{"intent": "<type>", "is_done": <bool>, "is_negative": <bool>}}\n\n'
        f"Where:\n"
        f'- "intent" is one of: "symptom_list" (describing symptoms), "yes_to_symptom" (answering yes), '
        f'"no_to_symptom" (answering no to last asked), "done_with_symptoms" (saying done/enough), "greeting" (hello/hi), "other"\n'
        f'- "is_done": true if user is ending the conversation or saying they have no more symptoms\n'
        f'- "is_negative": true if user is saying "no" to something\n\n'
        f"Examples:\n"
        f'User: "only fever" → {{"intent": "symptom_list", "is_done": false, "is_negative": false}}\n'
        f'User: "yes" (after being asked about cough) → {{"intent": "yes_to_symptom", "is_done": false, "is_negative": false}}\n'
        f'User: "no" (after being asked about cough) → {{"intent": "no_to_symptom", "is_done": false, "is_negative": true}}\n'
        f'User: "thats all" → {{"intent": "done_with_symptoms", "is_done": true, "is_negative": false}}'
    )

    try:
        response = await _call_ollama(prompt, max_tokens=50)
        # Parse JSON response
        import json
        # Extract JSON from response (may have extra text)
        json_match = re.search(r'\{[^}]+\}', response)
        if json_match:
            intent_data = json.loads(json_match.group())
            logger.info(f"Intent detection: msg='{message}', asked='{last_asked_symptom}' → {intent_data}")
            return intent_data
    except Exception as e:
        logger.error(f"Intent detection error: {e}")

    # Fallback: safe defaults
    logger.warning(f"Intent detection fallback for msg='{message}'")
    return {"intent": "other", "is_done": False, "is_negative": False}


def _find_doctor_by_specialty(db: Session, specialty: str) -> Optional[dict]:
    """Find an available doctor matching the specialty. Returns name, email, specialty."""
    from app.models.models import DoctorProfile

    # Try exact specialty match first
    profile = (
        db.query(DoctorProfile)
        .filter(DoctorProfile.specialization.ilike(f"%{specialty}%"))
        .filter(DoctorProfile.availability_status == True)
        .first()
    )

    # Fallback: any active doctor
    if not profile:
        profile = (
            db.query(DoctorProfile)
            .filter(DoctorProfile.availability_status == True)
            .first()
        )

    if not profile:
        return None

    user = db.query(User).filter(User.id == profile.user_id).first()
    if not user:
        return None

    return {
        "id": str(user.id),
        "name": user.email.split("@")[0].replace(".", " ").title(),  # Derive name from email
        "email": user.email,
        "specialty": profile.specialization or specialty,
    }


def _build_chat_prompt(user_message: str, symptoms: List[str] = None, diagnosis: dict = None,
                       doctor_info: dict = None, ready_to_diagnose: bool = False) -> str:
    """Build conversational prompt - natural dialogue like ChatGPT."""
    context = (
        "You are a warm, empathetic medical assistant. Your style is conversational and natural, like chatting with a knowledgeable friend. "
        "Keep responses concise (1-2 sentences). Never ask 'do you have X?' style questions. Instead, naturally ask follow-up questions based on what they share. "
        "Focus on understanding their experience, severity, and duration when relevant."
    )

    symptom_count = len(symptoms) if symptoms else 0

    if symptoms:
        context += f"\nSymptoms mentioned so far: {', '.join(symptoms)}."
        if symptom_count == 1:
            context += " Since they just mentioned their first symptom, ask a natural follow-up (like 'how long?' or 'how severe?') rather than asking about other symptoms."
        elif symptom_count >= 2:
            context += " They've shared multiple symptoms. Continue conversing naturally about these or ask clarifying questions."

    if ready_to_diagnose and diagnosis and diagnosis.get("disease"):
        # Diagnosis is ready - present warmly
        doctor_phrase = ""
        if doctor_info and doctor_info.get("email"):
            doctor_phrase = f"I can recommend Dr. {doctor_info['name']} ({doctor_info['specialty']})"
        else:
            doctor_phrase = f"A {diagnosis['specialist']} would be best"

        context += (
            f"\n\nBased on the symptoms shared, the analysis suggests: {diagnosis['disease']} "
            f"(confidence: {diagnosis['confidence']}%). {doctor_phrase}. "
            f"Respond warmly, explain what this means simply, and suggest they can book an appointment to get proper medical care."
        )
    elif symptom_count >= 2:
        context += "\n\nThey've shared enough to start understanding their condition. Offer to generate a brief analysis when ready, or continue asking relevant follow-ups."
    elif symptom_count == 1:
        context += "\n\nAsk natural follow-up questions to better understand their situation (duration, severity, what made it better/worse, etc)."
    else:
        context += "\n\nStart by greeting warmly and asking what brings them in today or what they're experiencing health-wise."

    return f"{context}\n\nUser: {user_message}\nAssistant:"


GREETINGS = ["hi", "hello", "hey", "yo", "hola", "howdy", "greetings", "sup"]
THANKS = ["thanks", "thank you", "thx", "ty"]
GENERAL_QUESTIONS = ["how are you", "what can you do", "who are you", "what are you", "help"]


def _is_greeting(message: str) -> bool:
    """Check if message is a greeting."""
    msg = message.lower().strip().rstrip("!?.,")
    return msg in GREETINGS or any(msg.startswith(g + " ") for g in GREETINGS)


def _is_thanks(message: str) -> bool:
    """Check if message is thanks."""
    msg = message.lower().strip().rstrip("!?.,")
    return msg in THANKS or any(t in msg for t in THANKS)


def _is_general_question(message: str) -> bool:
    """Check if message is a general (non-symptom) question."""
    msg = message.lower().strip().rstrip("!?.,")
    return any(q in msg for q in GENERAL_QUESTIONS)


def _extract_symptoms_with_regex(message: str, known_symptoms: List[str]) -> List[str]:
    """Extract symptoms using fast regex matching - no Ollama latency."""
    # Skip greetings/non-symptom messages
    msg_lower = message.lower().strip()
    if _is_greeting(msg_lower) or _is_thanks(msg_lower) or len(msg_lower) < 3:
        return []

    # Skip short affirmations
    if msg_lower in ["yes", "no", "yeah", "yep", "yup", "sure", "ok", "okay"]:
        return []

    # Use regex word boundary matching (already in _parse_symptoms_from_text)
    return _parse_symptoms_from_text(message, known_symptoms)


def _format_diagnosis_response_template(
    disease: str,
    confidence: float,
    specialist: str,
    symptoms: List[str],
) -> str:
    """Format diagnosis response using templates - instant, no Ollama."""
    symptom_str = ", ".join(symptoms) if symptoms else "your symptoms"
    confidence_int = int(confidence)

    # Template-based responses with confidence tiers
    if confidence >= 80:
        return f"Based on {symptom_str}, I'm quite confident you likely have {disease} ({confidence}% confidence). I'd recommend consulting a {specialist} for a proper evaluation."
    elif confidence >= 60:
        return f"Based on {symptom_str}, {disease} appears to be a possibility ({confidence}% confidence). Please see a {specialist} to confirm the diagnosis."
    else:
        return f"Your symptoms could suggest {disease} ({confidence}% confidence), but I'd recommend consulting a {specialist} for a thorough assessment."


def _parse_symptoms_from_text(text: str, known_symptoms: List[str]) -> List[str]:
    """Extract symptom keywords from free-form user input."""
    text_lower = text.lower()
    found = []
    seen = set()

    for symptom in known_symptoms:
        if symptom not in seen and re.search(r'\b' + re.escape(symptom) + r'\b', text_lower):
            found.append(symptom)
            seen.add(symptom)

    return found


def _get_next_symptom_prompt_template(
    selected_symptoms: List[str],
    known_symptoms: List[str],
    asked_symptoms: List[str] = [],
) -> tuple:
    """Generate next prompt using templates - instant."""
    symptom_count = len(selected_symptoms)

    # Template-based follow-ups
    if symptom_count == 0:
        return "What symptoms are you experiencing? Please describe how you're feeling.", None
    elif symptom_count == 1:
        symptom = selected_symptoms[0]
        # Ask follow-up about the main symptom
        return f"I see you have {symptom}. How long have you had it? Any other symptoms?", None
    elif symptom_count == 2:
        return f"Good, I've noted {', '.join(selected_symptoms)}. Any other symptoms you'd like to mention? Or should I provide a diagnosis?", None
    else:
        # 3+ symptoms - offer diagnosis
        return f"I've recorded {', '.join(selected_symptoms[:3])}{'...' if len(selected_symptoms) > 3 else ''}. I can provide a diagnosis now. Shall I?", None


# ── Symptom Analysis ──────────────────────────────────────────────────────────

class SymptomRequest(BaseModel):
    symptoms: List[str]
    save_record: bool = False


class PredictionResponse(BaseModel):
    predicted_disease: str
    confidence: float
    recommended_specialist: str
    recognized_symptoms: List[str]
    unknown_symptoms: List[str]
    record_id: Optional[str] = None


# ── Chat-Based Diagnosis ──────────────────────────────────────────────────────

class DiagnosisChatRequest(BaseModel):
    message: str
    selected_symptoms: List[str] = []
    asked_symptoms: List[str] = []
    last_asked_symptom: Optional[str] = None
    session_id: Optional[str] = None


class CurrentDiagnosis(BaseModel):
    disease: str
    confidence: float
    specialist: str


class DiagnosisChatResponse(BaseModel):
    assistant_message: str
    updated_symptoms: List[str]
    current_diagnosis: Dict[str, Any]
    recommended_doctor: Optional[Dict[str, Any]] = None
    next_symptom_to_ask: Optional[str] = None
    conversation_state: str
    recognized_keywords: List[str] = []




@router.post("/symptoms", response_model=PredictionResponse)
def analyze_symptoms(
    request: SymptomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not request.symptoms:
        raise HTTPException(status_code=400, detail="No symptoms provided.")

    model, meta = _load_symptom_model()
    known_symptoms = meta["symptoms"]
    classes = meta.get("diseases", meta.get("classes", []))

    recognized_symptoms = [s for s in request.symptoms if s in known_symptoms]
    unknown_symptoms = [s for s in request.symptoms if s not in known_symptoms]

    if not recognized_symptoms:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "None of the submitted symptoms were recognized.",
                "unknown_symptoms": unknown_symptoms,
            },
        )

    profile = np.zeros(len(known_symptoms))
    for symp in recognized_symptoms:
        idx = known_symptoms.index(symp)
        profile[idx] = 1

    profile = profile.reshape(1, -1)
    pred_idx = model.predict(profile)[0]
    pred_proba = np.max(model.predict_proba(profile)) * 100

    # Validate model output
    if not isinstance(pred_idx, (int, np.integer)) or not classes or pred_idx < 0 or pred_idx >= len(classes):
        raise HTTPException(
            status_code=500,
            detail="Model produced invalid output. Please try again."
        )

    disease_name = classes[int(pred_idx)]
    specialist = SPECIALIST_MAP.get(disease_name, "General Physician")
    confidence = round(float(pred_proba), 2)

    record_id = None
    if request.save_record:
        record = MedicalRecord(
            id=str(uuid.uuid4()),
            patient_id=str(current_user.id),
            symptoms=request.symptoms,
            ai_prediction=disease_name,
            confidence_score=confidence,
            recommended_specialist=specialist,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        record_id = str(record.id)

    return {
        "predicted_disease": disease_name,
        "confidence": confidence,
        "recommended_specialist": specialist,
        "recognized_symptoms": recognized_symptoms,
        "unknown_symptoms": unknown_symptoms,
        "record_id": record_id,
    }


@router.post("/chat", response_model=DiagnosisChatResponse)
async def diagnosis_chat(
    request: DiagnosisChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat-based diagnosis. Ollama drives intent detection + response generation."""

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    model, meta = _load_symptom_model()
    known_symptoms = meta["symptoms"]
    classes = meta.get("diseases", meta.get("classes", []))

    # Use Ollama to understand user intent intelligently
    intent_result = await _detect_user_intent(request.message, request.last_asked_symptom)
    intent_type = intent_result.get("intent", "other")
    is_negative = intent_result.get("is_negative", False)
    user_said_done = intent_result.get("is_done", False)

    # Extract symptoms from message
    regex_symptoms = _extract_symptoms_with_regex(request.message, known_symptoms)

    # Based on intent, handle differently:
    # - "yes_to_symptom": add last_asked_symptom if exists
    # - "no_to_symptom": skip last_asked_symptom (they don't have it)
    # - "symptom_list": use extracted symptoms only
    # - "done_with_symptoms": trigger diagnosis

    if intent_type == "yes_to_symptom" and request.last_asked_symptom and request.last_asked_symptom in known_symptoms:
        regex_symptoms = [request.last_asked_symptom] + regex_symptoms

    # Merge all symptoms
    seen = set()
    merged_symptoms = []
    for s in request.selected_symptoms + regex_symptoms:
        if s in known_symptoms and s not in seen:
            merged_symptoms.append(s)
            seen.add(s)
    merged_symptoms.sort()

    # Run XGBoost prediction
    diagnosis_dict = {}
    if merged_symptoms:
        symptom_idx_map = {s: i for i, s in enumerate(known_symptoms)}
        profile = np.zeros(len(known_symptoms))
        for symp in merged_symptoms:
            profile[symptom_idx_map[symp]] = 1

        profile = profile.reshape(1, -1)
        pred_idx = model.predict(profile)[0]
        pred_proba_full = model.predict_proba(profile)
        pred_proba = float(np.max(pred_proba_full) * 100)

        if isinstance(pred_idx, (int, np.integer)) and 0 <= pred_idx < len(classes):
            disease_name = classes[int(pred_idx)]
            specialist = SPECIALIST_MAP.get(disease_name, "General Physician")
            diagnosis_dict = {
                "disease": disease_name,
                "confidence": round(pred_proba, 2),
                "specialist": specialist,
            }

    # User said done (OR Ollama detected it via intent)
    user_done = user_said_done and len(merged_symptoms) >= 1
    # Lowered: 1+ symptom triggers diagnosis_ready
    ready_to_diagnose = bool(diagnosis_dict) and (user_done or len(merged_symptoms) >= 1)
    conversation_state = "diagnosis_ready" if ready_to_diagnose else "collecting_symptoms"

    # Look up real doctor when ready to diagnose
    doctor_info = None
    if ready_to_diagnose and diagnosis_dict.get("specialist"):
        doctor_info = _find_doctor_by_specialty(db, diagnosis_dict["specialist"])

    # Single Ollama call with full context - AI generates response naturally
    ollama_response = await _call_ollama(
        _build_chat_prompt(request.message, merged_symptoms, diagnosis_dict, doctor_info, ready_to_diagnose),
        max_tokens=120
    )
    next_prompt = ollama_response if ollama_response else "Tell me more about how you're feeling."

    return {
        "assistant_message": next_prompt,
        "updated_symptoms": merged_symptoms,
        "current_diagnosis": diagnosis_dict,
        "recommended_doctor": doctor_info,
        "next_symptom_to_ask": None,
        "conversation_state": conversation_state,
        "recognized_keywords": regex_symptoms,
    }


@router.post("/chat-stream")
async def diagnosis_chat_stream(
    request: DiagnosisChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Streaming chat-based diagnosis. Ollama drives intent detection + response generation."""

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    model, meta = _load_symptom_model()
    known_symptoms = meta["symptoms"]
    classes = meta.get("diseases", meta.get("classes", []))

    # Use Ollama to understand user intent intelligently
    intent_result = await _detect_user_intent(request.message, request.last_asked_symptom)
    intent_type = intent_result.get("intent", "other")
    is_negative = intent_result.get("is_negative", False)
    user_said_done = intent_result.get("is_done", False)

    # Extract symptoms from message
    regex_symptoms = _extract_symptoms_with_regex(request.message, known_symptoms)

    # Based on intent, handle differently:
    if intent_type == "yes_to_symptom" and request.last_asked_symptom and request.last_asked_symptom in known_symptoms:
        regex_symptoms = [request.last_asked_symptom] + regex_symptoms

    # Merge all symptom sources
    seen = set()
    merged_symptoms = []
    for s in request.selected_symptoms + regex_symptoms:
        if s in known_symptoms and s not in seen:
            merged_symptoms.append(s)
            seen.add(s)
    merged_symptoms.sort()

    # Run XGBoost prediction
    diagnosis_dict = {}
    if merged_symptoms:
        symptom_idx_map = {s: i for i, s in enumerate(known_symptoms)}
        profile = np.zeros(len(known_symptoms))
        for symp in merged_symptoms:
            profile[symptom_idx_map[symp]] = 1

        profile = profile.reshape(1, -1)
        pred_idx = model.predict(profile)[0]
        pred_proba_full = model.predict_proba(profile)
        pred_proba = float(np.max(pred_proba_full) * 100)

        if isinstance(pred_idx, (int, np.integer)) and 0 <= pred_idx < len(classes):
            disease_name = classes[int(pred_idx)]
            specialist = SPECIALIST_MAP.get(disease_name, "General Physician")
            diagnosis_dict = {
                "disease": disease_name,
                "confidence": round(pred_proba, 2),
                "specialist": specialist,
            }

    # User said done (Ollama detected via intent) OR have any symptom with diagnosis
    user_done = user_said_done and len(merged_symptoms) >= 1
    # Lowered: 1+ symptom triggers diagnosis_ready (user can book appointment immediately)
    ready_to_diagnose = bool(diagnosis_dict) and (user_done or len(merged_symptoms) >= 1)
    conversation_state = "diagnosis_ready" if ready_to_diagnose else "collecting_symptoms"

    # Look up real doctor when ready to diagnose
    doctor_info = None
    if ready_to_diagnose and diagnosis_dict.get("specialist"):
        doctor_info = _find_doctor_by_specialty(db, diagnosis_dict["specialist"])

    # AI handles everything - just give it context
    ollama_prompt = _build_chat_prompt(request.message, merged_symptoms, diagnosis_dict, doctor_info, ready_to_diagnose)
    import hashlib
    cache_key = hashlib.md5(ollama_prompt.encode()).hexdigest()
    cached_response = _ollama_cache.get(cache_key)

    async def stream_response() -> AsyncGenerator[str, None]:
        # Metadata first
        metadata = {
            "type": "metadata",
            "updated_symptoms": merged_symptoms,
            "current_diagnosis": diagnosis_dict,
            "recommended_doctor": doctor_info,
            "recognized_keywords": regex_symptoms,
            "conversation_state": conversation_state,
            "next_symptom_to_ask": None,
        }
        yield f"data: {json.dumps(metadata)}\n\n"

        if cached_response:
            # Instant: stream cached response
            for word in cached_response.split():
                yield f"data: {json.dumps({'type': 'text', 'chunk': word + ' '})}\n\n"
                await asyncio.sleep(0.015)
        else:
            # Stream Ollama tokens as generated (fastest perceived speed)
            full_text = ""
            async for chunk in _stream_ollama(ollama_prompt, max_tokens=120):
                if chunk:
                    full_text += chunk
                    yield f"data: {json.dumps({'type': 'text', 'chunk': chunk})}\n\n"
            # Cache cleaned response for future repeats
            if full_text:
                cleaned = _clean_ollama_response(full_text)
                if len(_ollama_cache) >= _ollama_cache_max:
                    _ollama_cache.pop(next(iter(_ollama_cache)))
                _ollama_cache[cache_key] = cleaned

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")


# ── X-Ray Analysis (ResNet50 stub) ────────────────────────────────────────────

class XrayRequest(BaseModel):
    image_base64: str
    save_record: bool = False


class XrayResponse(BaseModel):
    predicted_condition: str
    confidence: float
    severity: str
    recommended_action: str
    record_id: Optional[str] = None


XRAY_MODEL_FILE = os.path.join(settings.ML_MODEL_PATH, "xray_analysis", "resnet50_model.h5")


@router.post("/xray", response_model=XrayResponse)
def analyze_xray(
    request: XrayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ADMIN)),
):

    if not request.image_base64:
        raise HTTPException(status_code=400, detail="No image provided.")

    # ResNet50 model not yet trained — return structured stub response
    if not os.path.exists(XRAY_MODEL_FILE):
        result = {
            "predicted_condition": "Model Not Available",
            "confidence": 0.0,
            "severity": "unknown",
            "recommended_action": "X-ray analysis model is not yet deployed. Please consult a radiologist.",
            "record_id": None,
        }
        return result

    # When model is available, run inference here
    raise HTTPException(status_code=501, detail="X-ray inference not yet implemented.")


# ── Clinical Report Analysis (BERT stub) ─────────────────────────────────────

class ReportRequest(BaseModel):
    report_text: str
    save_record: bool = False


class ReportResponse(BaseModel):
    summary: str
    detected_conditions: List[str]
    urgency: str
    recommended_specialist: str
    record_id: Optional[str] = None


BERT_MODEL_FILE = os.path.join(settings.ML_MODEL_PATH, "report_analysis", "bert_model")


@router.post("/report", response_model=ReportResponse)
def analyze_report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ADMIN)),
):

    if not request.report_text or len(request.report_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Report text is too short.")

    # BERT model not yet trained — return structured stub response
    if not os.path.exists(BERT_MODEL_FILE):
        return {
            "summary": "BERT clinical NLP model is not yet deployed.",
            "detected_conditions": [],
            "urgency": "unknown",
            "recommended_specialist": "Please consult a physician for manual review.",
            "record_id": None,
        }

    raise HTTPException(status_code=501, detail="Report analysis not yet implemented.")

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import joblib
import json
import os
import uuid
import numpy as np
import re

from app.core.config import settings
from app.core.security import get_current_user, require_role
from app.core.constants import SPECIALIST_MAP
from app.db.session import get_db
from app.models.models import User, MedicalRecord, UserRole

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


def _get_next_symptom_prompt(
    selected_symptoms: List[str],
    known_symptoms: List[str],
    asked_symptoms: List[str] = [],
) -> tuple:
    """Generate next turn-based prompt and return (prompt_text, next_symptom_name)."""
    answered = set(selected_symptoms) | set(asked_symptoms)
    unasked = [s for s in known_symptoms if s not in answered]

    if not unasked:
        return "I've gathered enough information. Ready for your diagnosis?", None

    next_symptom = unasked[0]
    prompt = f"Do you have {next_symptom.replace('_', ' ')}?"

    return prompt, next_symptom


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
def diagnosis_chat(
    request: DiagnosisChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat-based diagnosis supporting turn-based prompts and free-form symptom input."""

    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    model, meta = _load_symptom_model()
    known_symptoms = meta["symptoms"]
    classes = meta.get("diseases", meta.get("classes", []))

    # Parse symptoms from free-form text
    parsed_symptoms = _parse_symptoms_from_text(request.message, known_symptoms)

    # Handle "yes" confirmation of last asked symptom
    YES_WORDS = {"yes", "yeah", "y", "yep", "yup", "sure", "correct", "right"}
    NO_WORDS = {"no", "nope", "nah", "n", "not", "dont", "don't"}
    message_tokens = set(request.message.lower().strip().split())
    confirmed_symptom = []
    if (
        request.last_asked_symptom
        and request.last_asked_symptom in known_symptoms
        and message_tokens & YES_WORDS
        and not (message_tokens & NO_WORDS)
    ):
        confirmed_symptom = [request.last_asked_symptom]

    # Merge parsed symptoms with client-provided symptoms, deduplicate and validate
    seen = set()
    merged_symptoms = []
    for s in request.selected_symptoms + parsed_symptoms + confirmed_symptom:
        if s in known_symptoms and s not in seen:
            merged_symptoms.append(s)
            seen.add(s)
    merged_symptoms.sort()

    # Run XGBoost prediction if symptoms present
    diagnosis_dict = {}
    if merged_symptoms:
        # Cache symptom indices for O(1) lookup
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

    # Determine conversation state
    message_lower = request.message.lower().strip()
    ready_keywords = ["ready", "yes tell me", "show me diagnosis", "what do i have"]

    trigger_ready = len(merged_symptoms) >= 5 or any(kw in message_lower for kw in ready_keywords)
    if trigger_ready and diagnosis_dict:
        conversation_state = "diagnosis_ready"
        next_prompt = f"Based on your symptoms, I predict: {diagnosis_dict['disease']} (Confidence: {diagnosis_dict['confidence']}%). Consider seeing a {diagnosis_dict['specialist']}."
        next_symptom = None
    else:
        conversation_state = "collecting_symptoms"
        next_prompt, next_symptom = _get_next_symptom_prompt(
            merged_symptoms, known_symptoms, request.asked_symptoms
        )

    return {
        "assistant_message": next_prompt,
        "updated_symptoms": merged_symptoms,
        "current_diagnosis": diagnosis_dict,
        "next_symptom_to_ask": next_symptom,
        "conversation_state": conversation_state,
        "recognized_keywords": parsed_symptoms,
    }


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

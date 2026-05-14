from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
import joblib
import json
import os
import uuid
import numpy as np

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.models import User, MedicalRecord

router = APIRouter()

ML_PATH = os.path.join(settings.ML_MODEL_PATH, "symptom_analysis")
MODEL_FILE = os.path.join(ML_PATH, "symptom_rf_model.joblib")
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


specialist_map = {
    "COVID-19": "Infectious Disease Specialist / Pulmonologist",
    "Pneumonia": "Pulmonologist",
    "Flu": "General Physician",
    "Common Cold": "General Physician",
    "Healthy": "None required",
}


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
    classes = meta.get("classes", [])

    recognized_symptoms = [s for s in request.symptoms if s in known_symptoms]
    unknown_symptoms = [s for s in request.symptoms if s not in known_symptoms]

    if not recognized_symptoms:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "None of the submitted symptoms were recognized.",
                "unknown_symptoms": unknown_symptoms,
                "available_symptoms": known_symptoms,
            },
        )

    profile = np.zeros(len(known_symptoms))
    for symp in recognized_symptoms:
        idx = known_symptoms.index(symp)
        profile[idx] = 1

    profile = profile.reshape(1, -1)
    pred_idx = model.predict(profile)[0]
    pred_proba = np.max(model.predict_proba(profile)) * 100

    if isinstance(pred_idx, (int, np.integer)) and classes:
        disease_name = classes[pred_idx] if pred_idx < len(classes) else str(pred_idx)
    else:
        disease_name = str(pred_idx)

    specialist = specialist_map.get(disease_name, "General Physician")
    confidence = round(float(pred_proba), 2)

    record_id = None
    if request.save_record:
        record = MedicalRecord(
            id=uuid.uuid4(),
            patient_id=current_user.id,
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
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
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

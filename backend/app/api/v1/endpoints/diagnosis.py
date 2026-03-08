from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import joblib
import json
import os
import numpy as np

router = APIRouter()

# Define paths
ML_PATH = os.path.join(os.path.dirname(__file__), "../../../../../ml-models/symptom_analysis")
MODEL_FILE = os.path.join(ML_PATH, "symptom_rf_model.joblib")
META_FILE = os.path.join(ML_PATH, "model_metadata.json")

class SymptomRequest(BaseModel):
    symptoms: List[str]

class PredictionResponse(BaseModel):
    predicted_disease: str
    confidence: float
    recommended_specialist: str

specialist_map = {
    "COVID-19": "Infectious Disease Specialist / Pulmonologist",
    "Pneumonia": "Pulmonologist",
    "Flu": "General Physician",
    "Common Cold": "General Physician",
    "Healthy": "None required"
}

@router.post("/symptoms", response_model=PredictionResponse)
def analyze_symptoms(request: SymptomRequest):
    if not os.path.exists(MODEL_FILE) or not os.path.exists(META_FILE):
        raise HTTPException(status_code=500, detail="ML Model not initialized.")
        
    model = joblib.load(MODEL_FILE)
    
    with open(META_FILE, 'r') as f:
        meta = json.load(f)
        
    known_symptoms = meta["symptoms"]
    profile = np.zeros(len(known_symptoms))
    
    for user_symp in request.symptoms:
        if user_symp in known_symptoms:
            idx = known_symptoms.index(user_symp)
            profile[idx] = 1
            
    # Reshape for prediction
    profile = profile.reshape(1, -1)
    
    pred_idx = model.predict(profile)[0]
    pred_proba = np.max(model.predict_proba(profile)) * 100
    
    return {
        "predicted_disease": pred_idx,
        "confidence": round(pred_proba, 2),
        "recommended_specialist": specialist_map.get(pred_idx, "General Physician")
    }

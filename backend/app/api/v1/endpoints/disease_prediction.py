"""
Disease Prediction API using XGBoost
Handles symptom-to-disease prediction with confidence scores
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
import json
import os
from xgboost import XGBClassifier
import numpy as np
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["disease-prediction"])

# Get absolute path to model files
# __file__ is at app/api/v1/endpoints/disease_prediction.py
# Go up 5 directories to reach the backend root where model files are
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
MODEL_PATH = os.path.join(BACKEND_DIR, "disease_model.json")
METADATA_PATH = os.path.join(BACKEND_DIR, "disease_model_metadata.json")

model = None
metadata = None
le_dict = {}  # Disease label mapping

def load_model():
    global model, metadata, le_dict

    try:
        # Load XGBoost model
        model = XGBClassifier()
        model.load_model(MODEL_PATH)

        # Load metadata
        with open(METADATA_PATH, 'r') as f:
            metadata = json.load(f)

        # Create disease-index mapping
        for idx, disease in enumerate(metadata['diseases']):
            le_dict[idx] = disease

        logger.info("Disease prediction model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Error loading disease prediction model: {e}")
        return False

# Load model on startup
load_model()

class PredictionRequest(BaseModel):
    """Request body for disease prediction"""
    symptoms: List[str] = Field(..., example=["Fever", "Cough", "Fatigue"])

    class Config:
        schema_extra = {
            "example": {
                "symptoms": ["Fever", "Cough", "Shortness_of_Breath"]
            }
        }

class DiseaseInfo(BaseModel):
    """Single disease prediction"""
    disease: str
    confidence: float = Field(..., description="Confidence percentage (0-100)")
    probability: float = Field(..., description="Raw probability (0-1)")

class PredictionResponse(BaseModel):
    """Response with top predictions and symptom importance"""
    top_predictions: List[DiseaseInfo]
    primary_disease: str
    confidence_score: float
    symptom_analysis: Dict[str, float]
    message: str

@router.post("/predict", response_model=PredictionResponse)
async def predict_disease(request: PredictionRequest):
    """
    Predict diseases based on provided symptoms

    Returns top 5 diseases with confidence scores and symptom analysis
    """

    if not model or not metadata:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        symptoms = request.symptoms
        all_symptoms = metadata['symptoms']

        # Validate symptoms
        invalid_symptoms = [s for s in symptoms if s not in all_symptoms]
        if invalid_symptoms:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid symptoms: {', '.join(invalid_symptoms)}"
            )

        # Create feature vector
        X = np.zeros((1, len(all_symptoms)))
        for symptom in symptoms:
            idx = all_symptoms.index(symptom)
            X[0, idx] = 1

        # Get predictions
        prediction_proba = model.predict_proba(X)[0]

        # Get top 5 predictions
        top_indices = np.argsort(prediction_proba)[::-1][:5]

        predictions = []
        for idx in top_indices:
            disease_name = le_dict[idx]
            probability = float(prediction_proba[idx])
            confidence = probability * 100

            predictions.append(DiseaseInfo(
                disease=disease_name,
                confidence=round(confidence, 2),
                probability=round(probability, 4)
            ))

        # Symptom importance for top disease
        primary_disease = predictions[0].disease
        primary_idx = metadata['diseases'].index(primary_disease)

        # Calculate symptom contribution to prediction
        symptom_analysis = {}
        feature_importance = metadata['feature_importance']

        for symptom in symptoms:
            symptom_analysis[symptom] = round(
                float(feature_importance.get(symptom, 0)) * 100, 2
            )

        symptom_analysis = dict(sorted(
            symptom_analysis.items(),
            key=lambda x: x[1],
            reverse=True
        ))

        return PredictionResponse(
            top_predictions=predictions,
            primary_disease=primary_disease,
            confidence_score=round(predictions[0].confidence, 2),
            symptom_analysis=symptom_analysis,
            message=f"AI predicts {primary_disease} with {predictions[0].confidence:.1f}% confidence"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")

@router.get("/symptoms")
async def get_symptoms():
    """Get list of all available symptoms"""
    if not metadata:
        raise HTTPException(status_code=500, detail="Model not loaded")

    return {
        "symptoms": metadata['symptoms'],
        "count": len(metadata['symptoms'])
    }

@router.get("/diseases")
async def get_diseases():
    """Get list of all disease predictions"""
    if not metadata:
        raise HTTPException(status_code=500, detail="Model not loaded")

    return {
        "diseases": metadata['diseases'],
        "count": len(metadata['diseases']),
        "model_accuracy": metadata['accuracy']
    }

@router.get("/model-info")
async def get_model_info():
    """Get model information and stats"""
    if not metadata:
        raise HTTPException(status_code=500, detail="Model not loaded")

    top_symptoms = sorted(
        metadata['feature_importance'].items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]

    return {
        "accuracy": round(metadata['accuracy'] * 100, 2),
        "symptoms_count": len(metadata['symptoms']),
        "diseases_count": len(metadata['diseases']),
        "top_important_symptoms": dict(top_symptoms),
        "status": "ready"
    }

# Health check
@router.get("/health")
async def health_check():
    """Check if disease prediction service is running"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "metadata_loaded": metadata is not None
    }

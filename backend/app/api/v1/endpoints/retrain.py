"""
Continuous Learning & Model Retraining Endpoints
Handles prediction corrections and model retraining pipeline
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.models.models import Prediction, Correction, User, UserRole
from app.core.security import get_current_user, require_role
from app.services.retrain_service import get_retrain_service
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


# ═════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ═════════════════════════════════════════════════════════════════════════

class CorrectPredictionRequest(BaseModel):
    actual_label: str
    was_correct: bool
    notes: Optional[str] = None


class CorrectionResponse(BaseModel):
    id: str
    prediction_id: str
    actual_label: str
    was_correct: bool
    created_at: str
    analyst_email: str

    class Config:
        from_attributes = True


class CorrectionStats(BaseModel):
    total_corrections: int
    correction_rate: float  # % of predictions corrected
    model_accuracy: float  # % of corrections that matched predictions
    labeled_samples: int  # Total samples available for retraining


class PredictionForReview(BaseModel):
    id: str
    src_ip: str
    dst_ip: str
    predicted_label: str
    confidence: float
    flag: str
    service: str
    created_at: str


class DataForRetrain(BaseModel):
    predictions: List[dict]
    corrections: List[dict]
    ready_count: int  # Corrections ready to use for retraining


# ═════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════

@router.get("/corrections/recent", response_model=List[CorrectionResponse])
def get_recent_corrections(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent prediction corrections"""
    corrections = (
        db.query(Correction)
        .order_by(desc(Correction.created_at))
        .limit(limit)
        .all()
    )
    return corrections


@router.get("/corrections/stats", response_model=CorrectionStats)
def get_correction_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get correction statistics"""
    total_corrections = db.query(Correction).count()
    total_predictions = db.query(Prediction).count()
    correct_count = db.query(Correction).filter(Correction.was_correct == True).count()
    labeled_samples = db.query(Prediction).filter(Prediction.is_reviewed == True).count()

    correction_rate = (total_corrections / max(total_predictions, 1)) * 100
    model_accuracy = (correct_count / max(total_corrections, 1)) * 100

    return CorrectionStats(
        total_corrections=total_corrections,
        correction_rate=correction_rate,
        model_accuracy=model_accuracy,
        labeled_samples=labeled_samples,
    )


@router.get("/predictions/awaiting-review", response_model=List[PredictionForReview])
def get_predictions_awaiting_review(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get predictions awaiting analyst review"""
    predictions = (
        db.query(Prediction)
        .filter(Prediction.is_reviewed == False)
        .order_by(desc(Prediction.created_at))
        .limit(limit)
        .all()
    )
    return predictions


@router.post("/correct/{prediction_id}")
def submit_correction(
    prediction_id: str,
    body: CorrectPredictionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a correction to a prediction (analyst feedback for continuous learning)"""
    # Find prediction
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    # Create correction
    correction = Correction(
        id=str(uuid.uuid4()),
        prediction_id=prediction_id,
        analyst_id=current_user.id,
        actual_label=body.actual_label,
        was_correct=body.was_correct,
        notes=body.notes,
    )

    # Mark prediction as reviewed
    prediction.is_reviewed = True
    prediction.is_correct = body.was_correct
    prediction.reviewed_at = datetime.now(timezone.utc)

    db.add(correction)
    db.add(prediction)
    db.commit()

    return {
        "id": correction.id,
        "prediction_id": prediction_id,
        "message": "Correction recorded successfully",
        "ready_for_retrain": True,
    }


@router.get("/data-for-retrain", response_model=DataForRetrain)
def get_data_for_retrain(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Get data ready for model retraining (corrections not yet used)"""
    # Get corrections not yet used in retraining
    ready_corrections = (
        db.query(Correction)
        .filter(Correction.used_in_retrain == False)
        .all()
    )

    # Get associated predictions
    prediction_data = []
    correction_data = []

    for correction in ready_corrections:
        pred = db.query(Prediction).filter(Prediction.id == correction.prediction_id).first()
        if pred:
            prediction_data.append({
                "id": pred.id,
                "src_ip": pred.src_ip,
                "dst_ip": pred.dst_ip,
                "protocol_type": pred.protocol_type,
                "service": pred.service,
                "src_bytes": pred.src_bytes,
                "srv_count": pred.srv_count,
                "serror_rate": pred.serror_rate,
                "flag": pred.flag,
                "label": correction.actual_label,  # Ground truth
            })
            correction_data.append({
                "prediction_id": correction.prediction_id,
                "actual_label": correction.actual_label,
                "analyst_id": correction.analyst_id,
            })

    return DataForRetrain(
        predictions=prediction_data,
        corrections=correction_data,
        ready_count=len(ready_corrections),
    )


@router.post("/mark-retrained")
def mark_corrections_as_retrained(
    correction_ids: List[str],
    batch_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Mark corrections as used in retraining (call after model retrain completes)"""
    for corr_id in correction_ids:
        correction = db.query(Correction).filter(Correction.id == corr_id).first()
        if correction:
            correction.used_in_retrain = True
            correction.retrain_batch_id = batch_id
            db.add(correction)

    db.commit()
    return {"message": f"Marked {len(correction_ids)} corrections as retrained"}


@router.post("/trigger-retrain")
def trigger_model_retrain(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Trigger model retraining with all available corrections.
    Retrains XGBoost model and returns updated metrics.
    """
    # Get data ready for retraining
    ready_corrections = (
        db.query(Correction)
        .filter(Correction.used_in_retrain == False)
        .all()
    )

    if len(ready_corrections) == 0:
        return {
            "status": "skipped",
            "message": "No new corrections to retrain with",
            "corrections_available": 0,
        }

    # Collect prediction data
    prediction_data = []
    correction_data = []

    for correction in ready_corrections:
        pred = db.query(Prediction).filter(Prediction.id == correction.prediction_id).first()
        if pred:
            prediction_data.append({
                "id": pred.id,
                "src_bytes": pred.src_bytes,
                "srv_count": pred.srv_count,
                "serror_rate": pred.serror_rate,
                "flag": pred.flag,
                "protocol_type": pred.protocol_type,
                "service": pred.service,
            })
            correction_data.append({
                "prediction_id": correction.prediction_id,
                "actual_label": correction.actual_label,
            })

    # Retrain model
    retrain_service = get_retrain_service()
    retrain_result = retrain_service.retrain_model(prediction_data, correction_data)

    if retrain_result.get("status") == "success":
        # Mark corrections as used
        batch_id = str(uuid.uuid4())
        for correction in ready_corrections:
            correction.used_in_retrain = True
            correction.retrain_batch_id = batch_id
            db.add(correction)
        db.commit()

        return {
            "status": "success",
            "message": "Model retrained successfully",
            "batch_id": batch_id,
            "samples_used": retrain_result.get("samples_used"),
            "new_accuracy": retrain_result.get("accuracy"),
            "corrections_applied": len(ready_corrections),
        }
    else:
        return {
            "status": retrain_result.get("status", "error"),
            "message": retrain_result.get("message", "Retrain failed"),
        }

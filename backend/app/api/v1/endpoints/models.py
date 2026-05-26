"""
ML Models Endpoints - Mock data for development/testing
Returns model metrics, confusion matrix, and feature importance
"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.models import User
from typing import Dict, Any

router = APIRouter()


@router.get("/metrics")
def get_model_metrics(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Get XGBoost model metrics (accuracy, confusion matrix, model info)"""
    return {
        "accuracy": {
            "overall_accuracy": 95.92,
            "confusion_matrix": [
                [60123, 312, 89, 34, 12],
                [45, 17823, 234, 12, 8],
                [23, 156, 4521, 89, 45],
                [12, 8, 34, 228, 18],
                [5, 3, 12, 45, 189]
            ],
            "confusion_labels": ["Normal", "DoS", "Probe", "U2R", "R2L"],
            "by_class": {
                "Normal": {
                    "precision": 0.994,
                    "recall": 0.989,
                    "f1_score": 0.991,
                    "support": 60569
                },
                "DoS": {
                    "precision": 0.973,
                    "recall": 0.979,
                    "f1_score": 0.976,
                    "support": 18122
                },
                "Probe": {
                    "precision": 0.961,
                    "recall": 0.952,
                    "f1_score": 0.956,
                    "support": 4734
                },
                "U2R": {
                    "precision": 0.869,
                    "recall": 0.844,
                    "f1_score": 0.856,
                    "support": 281
                },
                "R2L": {
                    "precision": 0.912,
                    "recall": 0.807,
                    "f1_score": 0.856,
                    "support": 242
                }
            }
        },
        "model": {
            "type": "XGBoost",
            "n_estimators": 100,
            "max_depth": 6,
            "n_features": 12,
            "feature_importances": {
                "count": 0.234,
                "protocol_type": 0.198,
                "same_srv_rate": 0.156,
                "dst_bytes": 0.142,
                "src_bytes": 0.118,
                "serror_rate": 0.089,
                "service": 0.076,
                "diff_srv_rate": 0.065,
                "srv_count": 0.054,
                "rerror_rate": 0.032,
                "flag": 0.018,
                "duration": 0.009
            },
            "feature_descriptions": {
                "duration": "Connection duration in seconds",
                "protocol_type": "TCP, UDP, or ICMP",
                "service": "Network service (http, ftp, ssh, etc.)",
                "src_bytes": "Bytes sent from source",
                "dst_bytes": "Bytes sent to destination",
                "flag": "TCP connection status flag",
                "land": "1 if connection from/to same host and port",
                "wrong_fragment": "Number of wrong fragments",
                "urgent": "Number of urgent packets",
                "hot": "Number of hot indicators",
                "num_failed_logins": "Number of failed login attempts",
                "logged_in": "1 if successfully logged in, 0 otherwise"
            }
        }
    }


@router.get("/preprocessed")
def get_preprocessed_packets(limit: int = 15, current_user: User = Depends(get_current_user)):
    """Get preprocessed traffic packets"""
    return {
        "packets": [
            {
                "id": f"pkt_{i}",
                "timestamp": f"2026-05-26T08:{10+i}:{45-i%60}Z",
                "src_ip": f"192.168.{i}.{100+i}",
                "dst_ip": "10.0.0.1",
                "protocol_type": ["tcp", "udp", "icmp"][i % 3],
                "service": ["http", "ftp", "ssh", "smtp", "telnet"][i % 5],
                "flag": ["S0", "S1", "SF", "REJ"][i % 4],
                "src_bytes": (i + 1) * 512,
                "srv_count": (i + 5),
                "serror_rate": (i % 3) * 0.1,
                "label": ["normal", "normal", "normal", "dos", "probe"][i % 5],
                "confidence": 92.5 + (i % 5)
            }
            for i in range(limit)
        ]
    }


@router.get("/feature-importance")
def get_feature_importance(current_user: User = Depends(get_current_user)):
    """Get feature importance ranking (1-12)"""
    return {
        "features": [
            {"name": "duration", "value": 0.234, "type": "numeric", "rank": 1},
            {"name": "src_bytes", "value": 0.198, "type": "numeric", "rank": 2},
            {"name": "dst_bytes", "value": 0.156, "type": "numeric", "rank": 3},
            {"name": "flag", "value": 0.142, "type": "categorical", "rank": 4},
            {"name": "service", "value": 0.118, "type": "categorical", "rank": 5},
            {"name": "protocol_type", "value": 0.089, "type": "categorical", "rank": 6},
            {"name": "wrong_fragment", "value": 0.032, "type": "numeric", "rank": 7},
            {"name": "urgent", "value": 0.018, "type": "numeric", "rank": 8},
            {"name": "hot", "value": 0.009, "type": "numeric", "rank": 9},
            {"name": "num_failed_logins", "value": 0.002, "type": "numeric", "rank": 10},
            {"name": "logged_in", "value": 0.001, "type": "numeric", "rank": 11},
            {"name": "land", "value": 0.0005, "type": "numeric", "rank": 12},
        ]
    }


@router.post("/predict")
def run_inference(features: Dict[str, float], current_user: User = Depends(get_current_user)):
    """Run inference on packet features"""
    import random

    threat_types = ["normal", "dos", "probe", "u2r", "r2l"]
    predicted = random.choice(threat_types)

    return {
        "prediction": predicted,
        "confidence": round(85 + random.random() * 15, 2),
        "probabilities": {
            "normal": round(0.65 + random.random() * 0.2, 4),
            "dos": round(0.15 + random.random() * 0.1, 4),
            "probe": round(0.12 + random.random() * 0.08, 4),
            "u2r": round(0.05 + random.random() * 0.03, 4),
            "r2l": round(0.03 + random.random() * 0.02, 4),
        },
        "reasoning": "Based on feature importance analysis and model training",
        "timestamp": "2026-05-26T08:15:45Z"
    }

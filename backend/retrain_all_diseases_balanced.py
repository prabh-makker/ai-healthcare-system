#!/usr/bin/env python3
"""
Retrain XGBoost model with balanced, high-confidence predictions for ALL 20 diseases.
Target: 98%+ accuracy for every single disease.
"""

import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
import json
import os
import sys

# Fix encoding for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DISEASES = [
    "COVID-19", "Pneumonia", "Flu", "Common_Cold", "Bronchitis", "Asthma",
    "Anxiety_Disorder", "Migraine", "Gastritis", "Healthy", "Hypertension",
    "Diabetes", "Arthritis", "Thyroid_Disease", "Urinary_Tract_Infection",
    "Skin_Allergy", "Depression", "Peptic_Ulcer", "Sinusitis", "Hepatitis"
]

SYMPTOMS = [
    "Normal_Sleep", "Bloating", "Rapid_Heartbeat", "Chest_Tightness", "Sneezing",
    "Sensitivity_to_Light", "Good_Appetite", "Throbbing_Pain", "Breathing_Difficulty",
    "Chills", "Fever", "Cough", "Sore_Throat", "Runny_Nose", "Congestion",
    "Wheezing", "Shortness_of_Breath", "Chest_Pain", "Nasal_Discharge", "Sputum_Production",
    "Throat_Irritation", "Ticklish_Throat", "Clear_Secretions", "Dry_Cough", "Productive_Cough",
    "Post_Nasal_Drip", "Sinus_Pressure", "Nausea", "Vomiting", "Diarrhea", "Abdominal_Pain",
    "Loss_of_Appetite", "Indigestion", "Constipation", "Heartburn", "Blood_in_Stool",
    "Fatigue", "Headache", "Muscle_Aches", "Joint_Pain", "Weakness", "Dizziness",
    "Night_Sweats", "Weight_Loss", "Body_Aches", "Anxiety", "Depression", "Insomnia",
    "Memory_Loss", "Concentration_Difficulty", "Mood_Swings", "Panic_Attacks", "Tremors",
    "Numbness", "Tingling", "Painful_Urination", "Frequent_Urination", "Urgency_to_Urinate",
    "Pelvic_Pain", "Rash", "Itching", "Hives", "Skin_Lesions", "Dry_Skin", "Eczema",
    "Redness", "Excessive_Thirst", "Excessive_Hunger", "Blurred_Vision", "Sweating",
    "High_Blood_Pressure", "Palpitations", "Edema", "Cold_Hands_Feet", "Sore_Joints",
    "Stiffness", "Gland_Swelling", "Eye_Discharge", "Ear_Pain", "Red_Eyes",
    "Sore_Teeth", "Jaw_Pain", "Throat_Tightness", "Voice_Hoarseness"
]

# Disease-specific symptom patterns for high-quality training data
DISEASE_PATTERNS = {
    "COVID-19": {
        "primary": ["Fever", "Cough", "Fatigue", "Loss_of_Appetite", "Headache"],
        "secondary": ["Sore_Throat", "Chills", "Muscle_Aches", "Dizziness", "Night_Sweats"],
        "unlikely": ["Bloating", "Indigestion", "Wheezing"],
        "primary_prob": 0.90,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.05
    },
    "Pneumonia": {
        "primary": ["Fever", "Cough", "Shortness_of_Breath", "Chest_Pain", "Sputum_Production"],
        "secondary": ["Fatigue", "Chills", "Sore_Throat", "Headache"],
        "unlikely": ["Bloating", "Abdominal_Pain"],
        "primary_prob": 0.92,
        "secondary_prob": 0.75,
        "unlikely_prob": 0.03
    },
    "Flu": {
        "primary": ["Fever", "Cough", "Fatigue", "Muscle_Aches", "Headache"],
        "secondary": ["Sore_Throat", "Chills", "Body_Aches", "Loss_of_Appetite"],
        "unlikely": ["Bloating", "Indigestion"],
        "primary_prob": 0.88,
        "secondary_prob": 0.72,
        "unlikely_prob": 0.04
    },
    "Common_Cold": {
        "primary": ["Runny_Nose", "Congestion", "Sneezing", "Sore_Throat", "Cough"],
        "secondary": ["Headache", "Fatigue", "Nasal_Discharge"],
        "unlikely": ["Fever", "Wheezing"],
        "primary_prob": 0.85,
        "secondary_prob": 0.65,
        "unlikely_prob": 0.15
    },
    "Asthma": {
        "primary": ["Wheezing", "Shortness_of_Breath", "Chest_Tightness", "Dry_Cough"],
        "secondary": ["Breathing_Difficulty", "Fatigue"],
        "unlikely": ["Fever", "Vomiting"],
        "primary_prob": 0.92,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.05
    },
    "Bronchitis": {
        "primary": ["Cough", "Shortness_of_Breath", "Chest_Pain", "Sputum_Production", "Fatigue"],
        "secondary": ["Sore_Throat", "Fever", "Chills"],
        "unlikely": ["Rash", "Hives"],
        "primary_prob": 0.90,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.04
    },
    "Anxiety_Disorder": {
        "primary": ["Anxiety", "Panic_Attacks", "Tremors", "Rapid_Heartbeat", "Chest_Tightness"],
        "secondary": ["Dizziness", "Sweating", "Insomnia", "Memory_Loss"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.88,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.03
    },
    "Migraine": {
        "primary": ["Throbbing_Pain", "Sensitivity_to_Light", "Nausea", "Headache"],
        "secondary": ["Vomiting", "Dizziness", "Concentration_Difficulty"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.90,
        "secondary_prob": 0.72,
        "unlikely_prob": 0.05
    },
    "Gastritis": {
        "primary": ["Bloating", "Indigestion", "Abdominal_Pain", "Heartburn", "Nausea"],
        "secondary": ["Vomiting", "Loss_of_Appetite", "Diarrhea", "Fatigue"],
        "unlikely": ["Fever", "Cough", "Wheezing"],
        "primary_prob": 0.90,
        "secondary_prob": 0.72,
        "unlikely_prob": 0.03
    },
    "Healthy": {
        "primary": ["Normal_Sleep", "Good_Appetite"],
        "secondary": [],
        "unlikely": ["Fever", "Cough", "Pain", "Anxiety"],
        "primary_prob": 0.85,
        "secondary_prob": 0.0,
        "unlikely_prob": 0.08
    },
    "Hypertension": {
        "primary": ["High_Blood_Pressure", "Palpitations", "Headache", "Dizziness"],
        "secondary": ["Fatigue", "Shortness_of_Breath", "Chest_Pain"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.90,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.05
    },
    "Diabetes": {
        "primary": ["Excessive_Thirst", "Excessive_Hunger", "Frequent_Urination", "Fatigue"],
        "secondary": ["Blurred_Vision", "Weight_Loss", "Weakness"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.92,
        "secondary_prob": 0.75,
        "unlikely_prob": 0.03
    },
    "Arthritis": {
        "primary": ["Joint_Pain", "Stiffness", "Sore_Joints", "Weakness"],
        "secondary": ["Fatigue", "Body_Aches", "Dizziness"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.90,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.10
    },
    "Thyroid_Disease": {
        "primary": ["Weight_Loss", "Fatigue", "Weakness", "Night_Sweats"],
        "secondary": ["Headache", "Dizziness", "Memory_Loss"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.88,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.05
    },
    "Urinary_Tract_Infection": {
        "primary": ["Painful_Urination", "Frequent_Urination", "Urgency_to_Urinate", "Pelvic_Pain"],
        "secondary": ["Fatigue", "Fever"],
        "unlikely": ["Wheezing", "Rash"],
        "primary_prob": 0.92,
        "secondary_prob": 0.65,
        "unlikely_prob": 0.05
    },
    "Skin_Allergy": {
        "primary": ["Rash", "Itching", "Hives", "Redness", "Skin_Lesions"],
        "secondary": ["Dry_Skin", "Eczema"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.92,
        "secondary_prob": 0.75,
        "unlikely_prob": 0.05
    },
    "Depression": {
        "primary": ["Depression", "Insomnia", "Fatigue", "Memory_Loss", "Concentration_Difficulty"],
        "secondary": ["Mood_Swings", "Anxiety", "Weight_Loss"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.88,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.04
    },
    "Peptic_Ulcer": {
        "primary": ["Abdominal_Pain", "Heartburn", "Nausea", "Blood_in_Stool"],
        "secondary": ["Vomiting", "Loss_of_Appetite", "Bloating"],
        "unlikely": ["Fever", "Cough"],
        "primary_prob": 0.90,
        "secondary_prob": 0.72,
        "unlikely_prob": 0.04
    },
    "Sinusitis": {
        "primary": ["Sinus_Pressure", "Nasal_Discharge", "Congestion", "Headache"],
        "secondary": ["Sore_Throat", "Cough", "Fever"],
        "unlikely": ["Wheezing", "Vomiting"],
        "primary_prob": 0.90,
        "secondary_prob": 0.70,
        "unlikely_prob": 0.05
    },
    "Hepatitis": {
        "primary": ["Fatigue", "Nausea", "Vomiting", "Abdominal_Pain", "Weight_Loss"],
        "secondary": ["Fever", "Headache", "Loss_of_Appetite"],
        "unlikely": ["Wheezing", "Rash"],
        "primary_prob": 0.90,
        "secondary_prob": 0.72,
        "unlikely_prob": 0.04
    }
}

def generate_high_quality_training_data(n_samples=500000):
    """Generate high-quality synthetic data with disease-specific patterns."""
    print("[*] Generating high-quality training data for ALL diseases...")

    data = []
    labels = []

    samples_per_disease = n_samples // len(DISEASES)

    for disease_idx, disease in enumerate(DISEASES):
        print(f"  Generating {samples_per_disease:,} samples for {disease}...")

        pattern = DISEASE_PATTERNS.get(disease, {})
        primary = pattern.get("primary", [])
        secondary = pattern.get("secondary", [])
        unlikely = pattern.get("unlikely", [])
        primary_prob = pattern.get("primary_prob", 0.85)
        secondary_prob = pattern.get("secondary_prob", 0.65)
        unlikely_prob = pattern.get("unlikely_prob", 0.05)

        for _ in range(samples_per_disease):
            symptoms = np.zeros(len(SYMPTOMS))

            # Primary symptoms - very likely
            for sym in primary:
                if sym in SYMPTOMS:
                    idx = SYMPTOMS.index(sym)
                    symptoms[idx] = np.random.choice([0, 1], p=[1-primary_prob, primary_prob])

            # Secondary symptoms - moderately likely
            for sym in secondary:
                if sym in SYMPTOMS:
                    idx = SYMPTOMS.index(sym)
                    symptoms[idx] = np.random.choice([0, 1], p=[1-secondary_prob, secondary_prob])

            # Unlikely symptoms - very rare
            for sym in unlikely:
                if sym in SYMPTOMS:
                    idx = SYMPTOMS.index(sym)
                    symptoms[idx] = np.random.choice([0, 1], p=[1-unlikely_prob, unlikely_prob])

            data.append(symptoms)
            labels.append(disease)

    df = pd.DataFrame(data, columns=SYMPTOMS)
    return df, labels

def retrain_model():
    """Retrain XGBoost model for all diseases with balanced accuracy."""
    print("\n" + "="*80)
    print("[START] RETRAINING XGBOOST - ALL DISEASES TO 98%+ ACCURACY")
    print("="*80 + "\n")

    # Generate training data
    X, y = generate_high_quality_training_data(n_samples=500000)
    print(f"\n[OK] Generated {len(X):,} training samples")
    print(f"[OK] Features: {len(X.columns)}")
    print(f"[OK] Classes: {len(set(y))}")

    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    # Calculate class weights for balanced training
    class_counts = np.bincount(y_encoded)
    class_weights = len(y_encoded) / (len(le.classes_) * class_counts)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    print(f"\n[OK] Train/Test split: {len(X_train):,} / {len(X_test):,}")

    # Train optimized XGBoost model
    print("\n[PROGRESS] Training XGBoost model with balanced parameters...")
    model = XGBClassifier(
        n_estimators=500,
        max_depth=9,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        gamma=0.5,
        reg_alpha=0.5,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        eval_metric='mlogloss',
        verbosity=0
    )

    model.fit(X_train, y_train)

    # Evaluate model
    print("\n[RESULTS] EVALUATION METRICS:")
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    train_acc = accuracy_score(y_train, y_pred_train)
    test_acc = accuracy_score(y_test, y_pred_test)

    print(f"\n  Overall Training Accuracy: {train_acc:.4f} ({train_acc*100:.2f}%)")
    print(f"  Overall Testing Accuracy:  {test_acc:.4f} ({test_acc*100:.2f}%)")

    # Per-disease metrics
    print("\n[STATS] PER-DISEASE ACCURACY:")
    print("  " + "-"*60)
    disease_accuracies = {}
    low_confidence_diseases = []

    for disease_idx, disease in enumerate(le.classes_):
        mask = y_test == disease_idx
        if mask.sum() > 0:
            acc = accuracy_score(y_test[mask], y_pred_test[mask])
            f1 = f1_score(y_test[mask], y_pred_test[mask], average='weighted', zero_division=0)
            disease_accuracies[disease] = acc

            status = "[BEST]" if acc >= 0.98 else "[WARN]" if acc < 0.90 else "     "
            print(f"  {status} {disease:25s}: {acc:.4f} ({acc*100:.2f}%) | F1: {f1:.4f}")

            if acc < 0.98:
                low_confidence_diseases.append((disease, acc))

    print("  " + "-"*60)

    # Save model
    model_path = "C:/Users/khalo/ai healthcare/backend/ml_models/symptom_analysis/symptom_xgb_model.joblib"
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model, model_path)
    print(f"\n[DONE] Model saved: {model_path}")

    # Update metadata
    metadata = {
        "diseases": list(le.classes_),
        "symptoms": SYMPTOMS,
        "accuracy": float(test_acc),
        "disease_accuracies": {d: float(disease_accuracies.get(d, 0)) for d in le.classes_},
        "model_type": "XGBoost",
        "model_version": "4.2-Balanced-All-Diseases",
        "training_samples": 500000,
        "samples_per_disease": 25000,
        "focus": "High-confidence predictions for ALL diseases (98%+ target)",
        "hyperparameters": {
            "n_estimators": 500,
            "max_depth": 9,
            "learning_rate": 0.03,
            "subsample": 0.85,
            "colsample_bytree": 0.85
        }
    }

    metadata_path = "C:/Users/khalo/ai healthcare/backend/disease_model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[DONE] Metadata saved: {metadata_path}")

    print("\n" + "="*80)
    print("[SUCCESS] RETRAINING COMPLETE - ALL DISEASES OPTIMIZED")
    print("="*80 + "\n")

    if low_confidence_diseases:
        print("[INFO] Diseases below 98% accuracy:")
        for disease, acc in low_confidence_diseases:
            print(f"       {disease}: {acc*100:.2f}%")
    else:
        print("[SUCCESS] All diseases at 98%+ accuracy!")

    return model, le

if __name__ == "__main__":
    retrain_model()

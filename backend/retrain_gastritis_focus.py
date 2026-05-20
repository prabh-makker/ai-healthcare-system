#!/usr/bin/env python3
"""
Retrain XGBoost model with focus on improving Gastritis prediction for GI symptoms.
Emphasis on: bloating, indigestion, abdominal pain, heartburn, nausea, vomiting
"""

import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
import json
import os
from datetime import datetime
import sys

# Fix encoding for Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# GI symptoms that strongly indicate Gastritis
GI_SYMPTOMS = [
    "Bloating", "Indigestion", "Abdominal_Pain", "Heartburn",
    "Nausea", "Vomiting", "Loss_of_Appetite", "Diarrhea", "Constipation"
]

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

def generate_synthetic_data_with_gastritis_focus(n_samples=400000):
    """Generate synthetic training data with focus on Gastritis accuracy."""
    print("[*] Generating synthetic training data with Gastritis focus...")

    data = []
    labels = []

    # Base samples per disease
    samples_per_disease = n_samples // len(DISEASES)

    # Extra samples for Gastritis to improve accuracy
    gastritis_extra = samples_per_disease * 2  # 2x more Gastritis samples

    for disease_idx, disease in enumerate(DISEASES):
        # Determine number of samples for this disease
        if disease == "Gastritis":
            n_disease_samples = samples_per_disease + gastritis_extra
        else:
            n_disease_samples = samples_per_disease

        print(f"  Generating {n_disease_samples:,} samples for {disease}...")

        for _ in range(n_disease_samples):
            symptoms = np.zeros(len(SYMPTOMS))

            if disease == "Gastritis":
                # Strong GI symptom patterns for Gastritis
                # Primary GI symptoms - very likely to appear
                gi_core = ["Bloating", "Indigestion", "Abdominal_Pain", "Heartburn", "Nausea"]
                for sym in gi_core:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.15, 0.85])  # 85% present

                # Secondary GI symptoms
                gi_secondary = ["Vomiting", "Loss_of_Appetite", "Diarrhea"]
                for sym in gi_secondary:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.3, 0.7])  # 70% present

                # Associated symptoms (fatigue, etc)
                assoc = ["Fatigue", "Weakness", "Weight_Loss"]
                for sym in assoc:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.4, 0.6])  # 60% present

                # Very unlikely respiratory/other symptoms
                unlikely = ["Fever", "Cough", "Sore_Throat", "Wheezing", "Rash"]
                for sym in unlikely:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.95, 0.05])  # 5% present

            elif disease == "Peptic_Ulcer":
                # Similar to Gastritis but slightly different pattern
                ulcer_syms = ["Abdominal_Pain", "Heartburn", "Nausea", "Blood_in_Stool"]
                for sym in ulcer_syms:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.2, 0.8])

            elif disease == "COVID-19":
                covid_syms = ["Fever", "Cough", "Fatigue", "Loss_of_Appetite", "Headache"]
                for sym in covid_syms:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.1, 0.9])

            elif disease == "Asthma":
                asthma_syms = ["Wheezing", "Shortness_of_Breath", "Chest_Tightness", "Dry_Cough"]
                for sym in asthma_syms:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.1, 0.9])

            elif disease == "Anxiety_Disorder":
                anxiety_syms = ["Anxiety", "Panic_Attacks", "Tremors", "Rapid_Heartbeat", "Chest_Tightness"]
                for sym in anxiety_syms:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.1, 0.9])

            elif disease == "Diabetes":
                diabetes_syms = ["Excessive_Thirst", "Excessive_Hunger", "Frequent_Urination", "Fatigue", "Blurred_Vision"]
                for sym in diabetes_syms:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.1, 0.9])

            elif disease == "Healthy":
                # Mostly healthy symptoms
                healthy_syms = ["Normal_Sleep", "Good_Appetite"]
                for sym in healthy_syms:
                    if sym in SYMPTOMS:
                        idx = SYMPTOMS.index(sym)
                        symptoms[idx] = np.random.choice([0, 1], p=[0.1, 0.9])

            else:
                # Random symptom pattern for other diseases
                n_symptoms_to_add = np.random.randint(3, 8)
                random_indices = np.random.choice(len(SYMPTOMS), n_symptoms_to_add, replace=False)
                symptoms[random_indices] = 1

            data.append(symptoms)
            labels.append(disease)

    df = pd.DataFrame(data, columns=SYMPTOMS)
    return df, labels

def retrain_model():
    """Retrain XGBoost model with Gastritis focus."""
    print("\n" + "="*70)
    print("[START] RETRAINING XGBOOST MODEL - GASTRITIS FOCUS")
    print("="*70 + "\n")

    # Generate new training data
    X, y = generate_synthetic_data_with_gastritis_focus(n_samples=400000)
    print(f"\n[OK] Generated {len(X):,} training samples")
    print(f"[OK] Features: {len(X.columns)}")
    print(f"[OK] Classes: {len(set(y))}")

    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    print(f"\n[OK] Train/Test split: {len(X_train):,} / {len(X_test):,}")

    # Train model with optimized parameters for Gastritis
    print("\n[PROGRESS] Training XGBoost model...")
    model = XGBClassifier(
        n_estimators=300,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        scale_pos_weight=1,
        eval_metric='mlogloss'
    )

    model.fit(X_train, y_train)

    # Evaluate
    print("\n[RESULTS] EVALUATION RESULTS:")
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    train_acc = accuracy_score(y_train, y_pred_train)
    test_acc = accuracy_score(y_test, y_pred_test)

    print(f"\n  Training Accuracy: {train_acc:.4f} ({train_acc*100:.2f}%)")
    print(f"  Testing Accuracy:  {test_acc:.4f} ({test_acc*100:.2f}%)")

    # Per-disease accuracy
    print("\n[STATS] PER-DISEASE ACCURACY:")
    disease_accuracies = {}
    for disease_idx, disease in enumerate(le.classes_):
        mask = y_test == disease_idx
        if mask.sum() > 0:
            acc = accuracy_score(y_test[mask], y_pred_test[mask])
            disease_accuracies[disease] = acc
            star = "[BEST]" if disease == "Gastritis" else "  "
            print(f"  {star} {disease:25s}: {acc:.4f} ({acc*100:.2f}%)")

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
        "model_version": "4.1-Gastritis-Focus",
        "training_samples": 400000,
        "focus": "Improved Gastritis prediction for GI symptoms (bloating, indigestion, abdominal pain)"
    }

    metadata_path = "C:/Users/khalo/ai healthcare/backend/disease_model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[DONE] Metadata saved: {metadata_path}")

    print("\n" + "="*70)
    print("[SUCCESS] RETRAINING COMPLETE - GASTRITIS FOCUS APPLIED")
    print("="*70 + "\n")

    return model, le

if __name__ == "__main__":
    retrain_model()

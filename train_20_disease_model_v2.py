"""
Improved 20-disease XGBoost model - Version 2
Increases samples and refines disease patterns for better accuracy
"""

import json
import os
import random
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, accuracy_score, classification_report

# Set random seeds
random.seed(42)
np.random.seed(42)

ORIGINAL_DISEASES = [
    "COVID-19",
    "Pneumonia",
    "Flu",
    "Common_Cold",
    "Bronchitis",
    "Asthma",
    "Anxiety_Disorder",
    "Migraine",
    "Gastritis",
    "Healthy"
]

NEW_DISEASES = [
    "Hypertension",
    "Diabetes",
    "Arthritis",
    "Thyroid_Disease",
    "Urinary_Tract_Infection",
    "Skin_Allergy",
    "Depression",
    "Peptic_Ulcer",
    "Sinusitis",
    "Hepatitis"
]

DISEASES = ORIGINAL_DISEASES + NEW_DISEASES

SYMPTOMS = [
    # Respiratory
    "Fever", "Cough", "Sore_Throat", "Runny_Nose", "Congestion", "Wheezing",
    "Shortness_of_Breath", "Chest_Pain", "Sneezing", "Nasal_Discharge",

    # Digestive
    "Nausea", "Vomiting", "Diarrhea", "Abdominal_Pain", "Loss_of_Appetite",
    "Indigestion", "Bloating", "Constipation", "Heartburn", "Blood_in_Stool",

    # General
    "Fatigue", "Chills", "Headache", "Muscle_Aches", "Joint_Pain",
    "Weakness", "Dizziness", "Night_Sweats", "Weight_Loss",

    # Neurological/Mental
    "Anxiety", "Depression", "Insomnia", "Memory_Loss", "Concentration_Difficulty",
    "Mood_Swings", "Panic_Attacks", "Tremors",

    # Urinary/Reproductive
    "Painful_Urination", "Frequent_Urination", "Urgency_to_Urinate", "Pelvic_Pain",

    # Dermatological
    "Rash", "Itching", "Hives", "Skin_Lesions", "Dry_Skin", "Eczema",

    # Metabolic
    "Excessive_Thirst", "Excessive_Hunger", "Blurred_Vision", "Numbness", "Tingling",

    # Cardiovascular
    "High_Blood_Pressure", "Palpitations", "Edema", "Cold_Hands_Feet",

    # Other
    "Sore_Joints", "Stiffness", "Gland_Swelling", "Eye_Discharge", "Ear_Pain", "Red_Eyes"
]

# Improved disease-symptom patterns with stronger distinguishing features
DISEASE_PATTERNS = {
    # Original diseases - RESPIRATORY FOCUSED
    "COVID-19": {
        "primary": ["Fever", "Cough", "Fatigue", "Shortness_of_Breath", "Loss_of_Appetite"],
        "secondary": ["Muscle_Aches", "Headache", "Chills", "Night_Sweats"],
        "primary_prob": 0.85,
        "secondary_prob": 0.50
    },
    "Pneumonia": {
        "primary": ["Fever", "Cough", "Chest_Pain", "Shortness_of_Breath", "Fatigue"],
        "secondary": ["Chills", "Muscle_Aches", "Nausea", "Sputum_Production"],
        "primary_prob": 0.90,
        "secondary_prob": 0.60
    },
    "Flu": {
        "primary": ["Fever", "Cough", "Sore_Throat", "Fatigue", "Muscle_Aches"],
        "secondary": ["Chills", "Headache", "Runny_Nose", "Congestion"],
        "primary_prob": 0.85,
        "secondary_prob": 0.55
    },
    "Common_Cold": {
        "primary": ["Runny_Nose", "Congestion", "Sore_Throat", "Sneezing", "Nasal_Discharge"],
        "secondary": ["Cough", "Headache", "Fatigue"],
        "primary_prob": 0.90,
        "secondary_prob": 0.40
    },
    "Bronchitis": {
        "primary": ["Cough", "Shortness_of_Breath", "Fatigue", "Chest_Pain", "Wheezing"],
        "secondary": ["Fever", "Sputum_Production", "Sore_Throat", "Chills"],
        "primary_prob": 0.88,
        "secondary_prob": 0.60
    },
    "Asthma": {
        "primary": ["Wheezing", "Shortness_of_Breath", "Cough", "Chest_Tightness"],
        "secondary": ["Fatigue", "Anxiety", "Breathing_Difficulty", "Throat_Tightness"],
        "primary_prob": 0.90,
        "secondary_prob": 0.50
    },

    # Mental Health
    "Anxiety_Disorder": {
        "primary": ["Anxiety", "Panic_Attacks", "Tremors", "Palpitations", "Dizziness"],
        "secondary": ["Sweating", "Chest_Pain", "Shortness_of_Breath", "Concentration_Difficulty"],
        "primary_prob": 0.90,
        "secondary_prob": 0.55
    },
    "Depression": {
        "primary": ["Depression", "Insomnia", "Loss_of_Appetite", "Fatigue", "Mood_Swings"],
        "secondary": ["Memory_Loss", "Concentration_Difficulty", "Weight_Loss", "Hopelessness"],
        "primary_prob": 0.85,
        "secondary_prob": 0.60
    },

    # Neurological
    "Migraine": {
        "primary": ["Headache", "Nausea", "Vomiting", "Light_Sensitivity"],
        "secondary": ["Weakness", "Dizziness", "Vision_Changes"],
        "primary_prob": 0.90,
        "secondary_prob": 0.50
    },

    # Digestive
    "Gastritis": {
        "primary": ["Abdominal_Pain", "Nausea", "Heartburn", "Loss_of_Appetite"],
        "secondary": ["Vomiting", "Bloating", "Indigestion", "Fatigue"],
        "primary_prob": 0.85,
        "secondary_prob": 0.55
    },
    "Peptic_Ulcer": {
        "primary": ["Abdominal_Pain", "Heartburn", "Nausea", "Blood_in_Stool"],
        "secondary": ["Vomiting", "Loss_of_Appetite", "Bloating", "Anemia"],
        "primary_prob": 0.88,
        "secondary_prob": 0.60
    },

    # New diseases
    "Hypertension": {
        "primary": ["High_Blood_Pressure", "Headache", "Dizziness", "Fatigue"],
        "secondary": ["Chest_Pain", "Shortness_of_Breath", "Blurred_Vision", "Palpitations"],
        "primary_prob": 0.85,
        "secondary_prob": 0.50
    },
    "Diabetes": {
        "primary": ["Excessive_Thirst", "Excessive_Hunger", "Frequent_Urination", "Fatigue"],
        "secondary": ["Blurred_Vision", "Numbness", "Tingling", "Weight_Loss"],
        "primary_prob": 0.90,
        "secondary_prob": 0.55
    },
    "Arthritis": {
        "primary": ["Joint_Pain", "Stiffness", "Muscle_Aches", "Sore_Joints"],
        "secondary": ["Swelling", "Redness", "Warmth_at_Joint", "Weakness"],
        "primary_prob": 0.90,
        "secondary_prob": 0.60
    },
    "Thyroid_Disease": {
        "primary": ["Fatigue", "Weight_Loss", "Cold_Hands_Feet", "Hair_Loss"],
        "secondary": ["Mood_Swings", "Insomnia", "Dry_Skin", "Concentration_Difficulty"],
        "primary_prob": 0.85,
        "secondary_prob": 0.55
    },
    "Urinary_Tract_Infection": {
        "primary": ["Painful_Urination", "Frequent_Urination", "Urgency_to_Urinate", "Fever"],
        "secondary": ["Pelvic_Pain", "Nausea", "Urine_Discoloration", "Abdominal_Pain"],
        "primary_prob": 0.88,
        "secondary_prob": 0.60
    },
    "Skin_Allergy": {
        "primary": ["Rash", "Itching", "Hives", "Skin_Lesions"],
        "secondary": ["Dry_Skin", "Redness", "Swelling", "Eczema"],
        "primary_prob": 0.90,
        "secondary_prob": 0.60
    },
    "Sinusitis": {
        "primary": ["Congestion", "Headache", "Nasal_Discharge", "Sore_Throat"],
        "secondary": ["Cough", "Fatigue", "Facial_Pain", "Fever"],
        "primary_prob": 0.85,
        "secondary_prob": 0.55
    },
    "Hepatitis": {
        "primary": ["Fever", "Nausea", "Abdominal_Pain", "Fatigue"],
        "secondary": ["Vomiting", "Jaundice", "Loss_of_Appetite", "Dark_Urine"],
        "primary_prob": 0.85,
        "secondary_prob": 0.60
    },

    "Healthy": {
        "primary": [],
        "secondary": [],
        "primary_prob": 0.0,
        "secondary_prob": 0.0
    }
}

def generate_training_data(n_samples_per_disease=2000):
    """Generate improved training data with stronger patterns"""
    print("Generating improved synthetic training data...")

    X = []
    y = []

    for disease in DISEASES:
        print(f"  Generating {n_samples_per_disease} samples for {disease}...")

        pattern = DISEASE_PATTERNS.get(disease, {})
        primary_symptoms = pattern.get("primary", [])
        secondary_symptoms = pattern.get("secondary", [])
        primary_prob = pattern.get("primary_prob", 0.8)
        secondary_prob = pattern.get("secondary_prob", 0.5)

        for _ in range(n_samples_per_disease):
            sample = [0] * len(SYMPTOMS)

            # Add primary symptoms with high probability
            for symptom in primary_symptoms:
                if symptom in SYMPTOMS and random.random() < primary_prob:
                    idx = SYMPTOMS.index(symptom)
                    sample[idx] = 1

            # Add secondary symptoms with medium probability
            for symptom in secondary_symptoms:
                if symptom in SYMPTOMS and random.random() < secondary_prob:
                    idx = SYMPTOMS.index(symptom)
                    sample[idx] = 1

            # Add minimal random noise (very low probability)
            if random.random() < 0.1:  # Only 10% of samples get extra random symptom
                remaining = [s for s in SYMPTOMS if s not in primary_symptoms + secondary_symptoms]
                if remaining:
                    symptom = random.choice(remaining)
                    idx = SYMPTOMS.index(symptom)
                    sample[idx] = 1

            X.append(sample)
            y.append(disease)

    print(f"Generated {len(X)} total samples")
    return np.array(X), np.array(y)

def encode_labels(y):
    """Encode disease names to numeric labels"""
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    label_mapping = {idx: disease for idx, disease in enumerate(le.classes_)}
    return y_encoded, le, label_mapping

def train_model(X, y_encoded, label_mapping):
    """Train optimized XGBoost model"""
    print("\nSplitting data (80/20 train/test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    print("\nTraining optimized XGBoost model...")
    model = XGBClassifier(
        n_estimators=800,
        max_depth=12,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=1,
        gamma=0,
        random_state=42,
        n_jobs=-1,
        eval_metric='mlogloss',
        objective='multi:softprob'
    )

    model.fit(X_train, y_train, verbose=False)

    print("\nEvaluating model...")
    y_pred = model.predict(X_test)

    overall_accuracy = accuracy_score(y_test, y_pred)
    print(f"Overall Accuracy: {overall_accuracy * 100:.2f}%")

    disease_accuracies = {}
    disease_f1_scores = {}

    print("\nPer-Disease Performance:")
    print("-" * 70)

    for idx, disease in label_mapping.items():
        y_test_binary = (y_test == idx).astype(int)
        y_pred_binary = (y_pred == idx).astype(int)

        f1 = f1_score(y_test_binary, y_pred_binary, zero_division=0)
        disease_f1_scores[disease] = round(f1, 4)

        disease_samples = y_test == idx
        if disease_samples.sum() > 0:
            acc = accuracy_score(y_test[disease_samples], y_pred[disease_samples])
            disease_accuracies[disease] = round(acc, 4)
        else:
            disease_accuracies[disease] = 0.0

        status = "[PASS]" if f1 >= 0.90 else "[NEEDS WORK]"
        print(f"{disease:30} F1: {f1:.4f} | Acc: {disease_accuracies[disease]:.4f} {status}")

    print("-" * 70)

    feature_importance = {}
    for idx, importance in enumerate(model.feature_importances_):
        if importance > 0:
            feature_importance[SYMPTOMS[idx]] = round(float(importance), 6)

    feature_importance = dict(sorted(
        feature_importance.items(),
        key=lambda x: x[1],
        reverse=True
    ))

    print("\nTop 20 Important Symptoms:")
    print("-" * 70)
    for idx, (symptom, importance) in enumerate(list(feature_importance.items())[:20], 1):
        print(f"{idx:2}. {symptom:30} {importance:.6f}")

    return model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance

def save_model(model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance):
    """Save model and metadata"""
    backend_dir = os.path.dirname(os.path.abspath(__file__)) + "/backend"

    model_path = os.path.join(backend_dir, "disease_model.json")
    metadata_path = os.path.join(backend_dir, "disease_model_metadata.json")

    print(f"\nSaving model to {model_path}...")
    model.save_model(model_path)

    metadata = {
        "diseases": DISEASES,
        "symptoms": SYMPTOMS,
        "accuracy": round(overall_accuracy, 4),
        "disease_accuracies": disease_accuracies,
        "disease_f1_scores": disease_f1_scores,
        "feature_importance": feature_importance,
        "model_type": "XGBoost",
        "model_version": "2.0",
        "n_diseases": len(DISEASES),
        "n_symptoms": len(SYMPTOMS),
        "total_training_samples": len(DISEASES) * 2000
    }

    print(f"Saving metadata to {metadata_path}...")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print("\nModel and metadata saved successfully!")
    return model_path, metadata_path

def main():
    print("=" * 70)
    print("XGBoost 20-Disease Model Training - Version 2 (Improved)")
    print("=" * 70)
    print(f"Total diseases: {len(DISEASES)}")
    print(f"Total symptoms: {len(SYMPTOMS)}")
    print(f"Samples per disease: 2000 (increased from 1000)")
    print(f"Total training samples: {len(DISEASES) * 2000}")
    print("=" * 70)

    X, y = generate_training_data(n_samples_per_disease=2000)
    y_encoded, le, label_mapping = encode_labels(y)
    model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance = train_model(X, y_encoded, label_mapping)
    save_model(model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance)

    print("\n" + "=" * 70)
    print("Training Complete!")
    print("=" * 70)

    passing_diseases = sum(1 for f1 in disease_f1_scores.values() if f1 >= 0.90)
    print(f"Diseases meeting 90% accuracy target: {passing_diseases}/{len(DISEASES)}")

    if passing_diseases == len(DISEASES):
        print("[SUCCESS] All diseases meet 90% accuracy target!")
    else:
        print(f"[INFO] {len(DISEASES) - passing_diseases} diseases below 90% target")
        failing = [d for d, f1 in disease_f1_scores.items() if f1 < 0.90]
        print(f"Failing diseases: {', '.join(failing)}")

if __name__ == "__main__":
    main()

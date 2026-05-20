"""
XGBoost 20-Disease Model - Version 3 (Large Dataset)
Ultra-large training set (10,000 samples per disease = 200,000 total)
Optimized for maximum accuracy with critical symptom prioritization
"""

import json
import os
import random
import numpy as np
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, accuracy_score

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

# Extended symptom list with critical symptoms prioritized
SYMPTOMS = [
    # Critical Top 10 Symptoms (highest importance)
    "Normal_Sleep", "Bloating", "Rapid_Heartbeat", "Chest_Tightness",
    "Sneezing", "Sensitivity_to_Light", "Good_Appetite", "Throbbing_Pain",
    "Breathing_Difficulty", "Chills",

    # Respiratory
    "Fever", "Cough", "Sore_Throat", "Runny_Nose", "Congestion", "Wheezing",
    "Shortness_of_Breath", "Chest_Pain", "Nasal_Discharge", "Sputum_Production",

    # Digestive
    "Nausea", "Vomiting", "Diarrhea", "Abdominal_Pain", "Loss_of_Appetite",
    "Indigestion", "Constipation", "Heartburn", "Blood_in_Stool",

    # General
    "Fatigue", "Headache", "Muscle_Aches", "Joint_Pain", "Weakness",
    "Dizziness", "Night_Sweats", "Weight_Loss", "Body_Aches",

    # Neurological/Mental
    "Anxiety", "Depression", "Insomnia", "Memory_Loss", "Concentration_Difficulty",
    "Mood_Swings", "Panic_Attacks", "Tremors", "Numbness", "Tingling",

    # Urinary/Reproductive
    "Painful_Urination", "Frequent_Urination", "Urgency_to_Urinate", "Pelvic_Pain",

    # Dermatological
    "Rash", "Itching", "Hives", "Skin_Lesions", "Dry_Skin", "Eczema", "Redness",

    # Metabolic
    "Excessive_Thirst", "Excessive_Hunger", "Blurred_Vision", "Sweating",

    # Cardiovascular
    "High_Blood_Pressure", "Palpitations", "Edema", "Cold_Hands_Feet",

    # Other
    "Sore_Joints", "Stiffness", "Gland_Swelling", "Eye_Discharge", "Ear_Pain",
    "Red_Eyes", "Sore_Teeth", "Jaw_Pain", "Throat_Tightness", "Voice_Hoarseness"
]

# Ultra-refined disease-symptom patterns with STRONG distinguishing features
DISEASE_PATTERNS = {
    # RESPIRATORY DISEASES
    "COVID-19": {
        "critical": ["Fever", "Cough", "Fatigue", "Shortness_of_Breath"],
        "primary": ["Loss_of_Appetite", "Muscle_Aches", "Chills", "Night_Sweats"],
        "secondary": ["Headache", "Sore_Throat", "Diarrhea"],
        "critical_prob": 0.95,
        "primary_prob": 0.80,
        "secondary_prob": 0.30
    },
    "Pneumonia": {
        "critical": ["Fever", "Cough", "Chest_Pain", "Shortness_of_Breath"],
        "primary": ["Fatigue", "Chills", "Sputum_Production", "Muscle_Aches"],
        "secondary": ["Nausea", "Headache"],
        "critical_prob": 0.95,
        "primary_prob": 0.85,
        "secondary_prob": 0.35
    },
    "Flu": {
        "critical": ["Fever", "Cough", "Muscle_Aches", "Fatigue"],
        "primary": ["Sore_Throat", "Chills", "Headache", "Runny_Nose"],
        "secondary": ["Nausea", "Diarrhea", "Congestion"],
        "critical_prob": 0.92,
        "primary_prob": 0.80,
        "secondary_prob": 0.35
    },
    "Common_Cold": {
        "critical": ["Runny_Nose", "Congestion", "Sneezing", "Nasal_Discharge"],
        "primary": ["Sore_Throat", "Cough", "Headache", "Fatigue"],
        "secondary": ["Low_Fever"],
        "critical_prob": 0.95,
        "primary_prob": 0.70,
        "secondary_prob": 0.20
    },
    "Bronchitis": {
        "critical": ["Cough", "Shortness_of_Breath", "Breathing_Difficulty", "Chest_Tightness"],
        "primary": ["Fatigue", "Wheezing", "Chest_Pain", "Sputum_Production"],
        "secondary": ["Fever", "Sore_Throat", "Chills"],
        "critical_prob": 0.95,
        "primary_prob": 0.85,
        "secondary_prob": 0.40
    },
    "Asthma": {
        "critical": ["Wheezing", "Shortness_of_Breath", "Breathing_Difficulty", "Chest_Tightness"],
        "primary": ["Cough", "Chest_Pain", "Anxiety"],
        "secondary": ["Fatigue", "Throat_Tightness"],
        "critical_prob": 0.95,
        "primary_prob": 0.75,
        "secondary_prob": 0.35
    },
    "Sinusitis": {
        "critical": ["Congestion", "Sneezing", "Headache", "Sensitivity_to_Light"],
        "primary": ["Nasal_Discharge", "Sore_Throat", "Cough", "Facial_Pain"],
        "secondary": ["Fever", "Fatigue", "Ear_Pain"],
        "critical_prob": 0.92,
        "primary_prob": 0.80,
        "secondary_prob": 0.35
    },

    # MENTAL HEALTH
    "Anxiety_Disorder": {
        "critical": ["Anxiety", "Panic_Attacks", "Tremors", "Rapid_Heartbeat"],
        "primary": ["Chest_Tightness", "Breathing_Difficulty", "Dizziness", "Sweating"],
        "secondary": ["Insomnia", "Concentration_Difficulty", "Muscle_Tension"],
        "critical_prob": 0.95,
        "primary_prob": 0.80,
        "secondary_prob": 0.40
    },
    "Depression": {
        "critical": ["Depression", "Insomnia", "Loss_of_Appetite", "Fatigue"],
        "primary": ["Mood_Swings", "Memory_Loss", "Concentration_Difficulty", "Weight_Loss"],
        "secondary": ["Headache", "Muscle_Aches"],
        "critical_prob": 0.92,
        "primary_prob": 0.80,
        "secondary_prob": 0.35
    },

    # NEUROLOGICAL
    "Migraine": {
        "critical": ["Throbbing_Pain", "Sensitivity_to_Light", "Nausea", "Headache"],
        "primary": ["Vomiting", "Fatigue", "Dizziness"],
        "secondary": ["Blurred_Vision", "Numbness"],
        "critical_prob": 0.95,
        "primary_prob": 0.80,
        "secondary_prob": 0.40
    },

    # DIGESTIVE
    "Gastritis": {
        "critical": ["Abdominal_Pain", "Nausea", "Bloating", "Heartburn"],
        "primary": ["Loss_of_Appetite", "Vomiting", "Indigestion"],
        "secondary": ["Fatigue", "Black_Stools"],
        "critical_prob": 0.92,
        "primary_prob": 0.80,
        "secondary_prob": 0.35
    },
    "Peptic_Ulcer": {
        "critical": ["Abdominal_Pain", "Bloating", "Heartburn", "Nausea"],
        "primary": ["Vomiting", "Blood_in_Stool", "Loss_of_Appetite"],
        "secondary": ["Fatigue", "Weight_Loss"],
        "critical_prob": 0.95,
        "primary_prob": 0.85,
        "secondary_prob": 0.40
    },

    # METABOLIC & ENDOCRINE
    "Diabetes": {
        "critical": ["Excessive_Thirst", "Excessive_Hunger", "Frequent_Urination", "Fatigue"],
        "primary": ["Blurred_Vision", "Numbness", "Tingling", "Weight_Loss"],
        "secondary": ["Weakness", "Dry_Skin"],
        "critical_prob": 0.95,
        "primary_prob": 0.80,
        "secondary_prob": 0.35
    },
    "Thyroid_Disease": {
        "critical": ["Fatigue", "Weight_Loss", "Cold_Hands_Feet", "Insomnia"],
        "primary": ["Mood_Swings", "Hair_Loss", "Dry_Skin", "Sensitivity_to_Light"],
        "secondary": ["Muscle_Aches", "Concentration_Difficulty"],
        "critical_prob": 0.92,
        "primary_prob": 0.80,
        "secondary_prob": 0.35
    },

    # CARDIOVASCULAR
    "Hypertension": {
        "critical": ["High_Blood_Pressure", "Headache", "Rapid_Heartbeat", "Chest_Tightness"],
        "primary": ["Dizziness", "Fatigue", "Chest_Pain", "Anxiety"],
        "secondary": ["Blurred_Vision", "Shortness_of_Breath"],
        "critical_prob": 0.92,
        "primary_prob": 0.75,
        "secondary_prob": 0.30
    },

    # RHEUMATOLOGIC
    "Arthritis": {
        "critical": ["Joint_Pain", "Stiffness", "Sore_Joints", "Limited_Movement"],
        "primary": ["Muscle_Aches", "Swelling", "Redness", "Warmth_at_Joint"],
        "secondary": ["Fatigue", "Weakness"],
        "critical_prob": 0.95,
        "primary_prob": 0.85,
        "secondary_prob": 0.35
    },

    # URINARY
    "Urinary_Tract_Infection": {
        "critical": ["Painful_Urination", "Frequent_Urination", "Urgency_to_Urinate", "Fever"],
        "primary": ["Pelvic_Pain", "Cloudy_Urine", "Nausea", "Abdominal_Pain"],
        "secondary": ["Chills", "Fatigue"],
        "critical_prob": 0.95,
        "primary_prob": 0.85,
        "secondary_prob": 0.40
    },

    # DERMATOLOGIC
    "Skin_Allergy": {
        "critical": ["Rash", "Itching", "Hives", "Redness"],
        "primary": ["Skin_Lesions", "Dry_Skin", "Swelling", "Eczema"],
        "secondary": ["Sensitivity_to_Light", "Burning_Sensation"],
        "critical_prob": 0.95,
        "primary_prob": 0.85,
        "secondary_prob": 0.40
    },

    # HEPATIC
    "Hepatitis": {
        "critical": ["Fever", "Nausea", "Abdominal_Pain", "Fatigue"],
        "primary": ["Vomiting", "Loss_of_Appetite", "Jaundice", "Dark_Urine"],
        "secondary": ["Joint_Pain", "Muscle_Aches"],
        "critical_prob": 0.92,
        "primary_prob": 0.85,
        "secondary_prob": 0.35
    },

    "Healthy": {
        "critical": ["Normal_Sleep", "Good_Appetite"],
        "primary": [],
        "secondary": [],
        "critical_prob": 0.90,
        "primary_prob": 0.0,
        "secondary_prob": 0.0
    }
}

def generate_training_data(n_samples_per_disease=10000):
    """Generate ultra-large training data with refined patterns"""
    print(f"Generating {n_samples_per_disease:,} samples per disease...")
    print(f"Total samples: {n_samples_per_disease * len(DISEASES):,}")

    X = []
    y = []

    for idx, disease in enumerate(DISEASES):
        if idx % 5 == 0 or idx == 0:
            print(f"  {disease}: {n_samples_per_disease:,} samples")
        elif len(X) % (n_samples_per_disease * 5) == 0 and len(X) > 0:
            print(f"  {disease}: {n_samples_per_disease:,} samples (progress: {len(X):,} total)")

        pattern = DISEASE_PATTERNS.get(disease, {})
        critical_symptoms = pattern.get("critical", [])
        primary_symptoms = pattern.get("primary", [])
        secondary_symptoms = pattern.get("secondary", [])
        critical_prob = pattern.get("critical_prob", 0.9)
        primary_prob = pattern.get("primary_prob", 0.7)
        secondary_prob = pattern.get("secondary_prob", 0.3)

        for _ in range(n_samples_per_disease):
            sample = [0] * len(SYMPTOMS)

            # Critical symptoms (HIGHEST priority - almost always present)
            for symptom in critical_symptoms:
                if symptom in SYMPTOMS and random.random() < critical_prob:
                    idx = SYMPTOMS.index(symptom)
                    sample[idx] = 1

            # Primary symptoms (HIGH priority)
            for symptom in primary_symptoms:
                if symptom in SYMPTOMS and random.random() < primary_prob:
                    idx = SYMPTOMS.index(symptom)
                    sample[idx] = 1

            # Secondary symptoms (MEDIUM priority)
            for symptom in secondary_symptoms:
                if symptom in SYMPTOMS and random.random() < secondary_prob:
                    idx = SYMPTOMS.index(symptom)
                    sample[idx] = 1

            X.append(sample)
            y.append(disease)

    print(f"\nGenerated {len(X):,} total samples")
    return np.array(X), np.array(y)

def encode_labels(y):
    """Encode disease names to numeric labels"""
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    label_mapping = {idx: disease for idx, disease in enumerate(le.classes_)}
    return y_encoded, le, label_mapping

def train_model(X, y_encoded, label_mapping):
    """Train ultra-optimized XGBoost model"""
    print("\nSplitting data (80/20 train/test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print(f"Training set: {len(X_train):,} samples")
    print(f"Test set: {len(X_test):,} samples")

    print("\nTraining ultra-optimized XGBoost model (aiming for near 100% accuracy)...")
    model = XGBClassifier(
        n_estimators=1200,
        max_depth=10,
        learning_rate=0.03,
        subsample=0.90,
        colsample_bytree=0.90,
        min_child_weight=2,
        gamma=0.1,
        reg_alpha=0.01,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        eval_metric='mlogloss',
        objective='multi:softprob'
    )

    model.fit(X_train, y_train, verbose=False)

    print("\nEvaluating model...")
    y_pred = model.predict(X_test)

    overall_accuracy = accuracy_score(y_test, y_pred)
    print(f"\n{'='*70}")
    print(f"Overall Accuracy: {overall_accuracy * 100:.4f}%")
    print(f"{'='*70}")

    disease_accuracies = {}
    disease_f1_scores = {}

    print("\nPer-Disease Performance:")
    print("-" * 80)
    print(f"{'Disease':<30} {'F1-Score':>10} {'Accuracy':>10} {'Status':>20}")
    print("-" * 80)

    for idx, disease in label_mapping.items():
        y_test_binary = (y_test == idx).astype(int)
        y_pred_binary = (y_pred == idx).astype(int)

        f1 = f1_score(y_test_binary, y_pred_binary, zero_division=0)
        disease_f1_scores[disease] = round(f1, 6)

        disease_samples = y_test == idx
        if disease_samples.sum() > 0:
            acc = accuracy_score(y_test[disease_samples], y_pred[disease_samples])
            disease_accuracies[disease] = round(acc, 6)
        else:
            disease_accuracies[disease] = 0.0

        # Status based on accuracy
        if f1 >= 0.99:
            status = "[EXCELLENT: 99%+]"
        elif f1 >= 0.98:
            status = "[VERY GOOD: 98%+]"
        elif f1 >= 0.95:
            status = "[GOOD: 95%+]"
        elif f1 >= 0.90:
            status = "[PASS: 90%+]"
        else:
            status = "[NEEDS WORK]"

        print(f"{disease:<30} {f1:>10.4f} {disease_accuracies[disease]:>10.4f} {status:>20}")

    print("-" * 80)

    # Feature importance
    feature_importance = {}
    for idx, importance in enumerate(model.feature_importances_):
        if importance > 0:
            feature_importance[SYMPTOMS[idx]] = round(float(importance), 8)

    feature_importance = dict(sorted(
        feature_importance.items(),
        key=lambda x: x[1],
        reverse=True
    ))

    print("\nTop 25 Most Important Symptoms (for diagnosis):")
    print("-" * 80)
    for idx, (symptom, importance) in enumerate(list(feature_importance.items())[:25], 1):
        print(f"{idx:2}. {symptom:<30} {importance:.8f}")

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
        "accuracy": round(overall_accuracy, 6),
        "disease_accuracies": disease_accuracies,
        "disease_f1_scores": disease_f1_scores,
        "feature_importance": feature_importance,
        "model_type": "XGBoost",
        "model_version": "3.0",
        "dataset_size": "LARGE (200,000 samples)",
        "n_diseases": len(DISEASES),
        "n_symptoms": len(SYMPTOMS),
        "total_training_samples": len(DISEASES) * 10000,
        "samples_per_disease": 10000
    }

    print(f"Saving metadata to {metadata_path}...")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print("Model and metadata saved successfully!")
    return model_path, metadata_path

def main():
    print("\n" + "=" * 80)
    print("XGBoost 20-Disease Model Training - Version 3 (Ultra-Large Dataset)")
    print("=" * 80)
    print(f"Target: Achieve near-100% accuracy with large dataset")
    print(f"Total diseases: {len(DISEASES)}")
    print(f"Total symptoms: {len(SYMPTOMS)}")
    print(f"Samples per disease: 10,000 (5x increase from v2)")
    print(f"Total training samples: {len(DISEASES) * 10000:,}")
    print("=" * 80)

    X, y = generate_training_data(n_samples_per_disease=10000)
    y_encoded, le, label_mapping = encode_labels(y)
    model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance = train_model(X, y_encoded, label_mapping)
    save_model(model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance)

    print("\n" + "=" * 80)
    print("TRAINING COMPLETE!")
    print("=" * 80)

    passing_diseases = sum(1 for f1 in disease_f1_scores.values() if f1 >= 0.99)
    passing_99_plus = sum(1 for f1 in disease_f1_scores.values() if f1 >= 0.99)
    passing_95_plus = sum(1 for f1 in disease_f1_scores.values() if f1 >= 0.95)

    print(f"\nAccuracy Tiers:")
    print(f"  99%+ accuracy: {passing_99_plus} diseases")
    print(f"  95%+ accuracy: {passing_95_plus} diseases")
    print(f"  Overall accuracy: {overall_accuracy * 100:.4f}%")

    if overall_accuracy >= 0.99:
        print(f"\n[SUCCESS] Model achieved 99%+ accuracy!")
    elif overall_accuracy >= 0.98:
        print(f"\n[EXCELLENT] Model achieved 98%+ accuracy!")
    elif overall_accuracy >= 0.95:
        print(f"\n[VERY GOOD] Model achieved 95%+ accuracy!")

if __name__ == "__main__":
    main()

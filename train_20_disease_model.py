"""
Train 20-disease XGBoost model with synthetic symptom data
Includes 10 original diseases + 10 new diseases from user request
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

# Set random seeds for reproducibility
random.seed(42)
np.random.seed(42)

# Define 20 diseases (10 original + 10 new)
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

# Extended symptom list (~65 symptoms)
SYMPTOMS = [
    # Respiratory
    "Fever", "Cough", "Sore_Throat", "Runny_Nose", "Congestion", "Wheezing",
    "Shortness_of_Breath", "Chest_Pain", "Sneezing", "Nasal_Discharge",

    # Digestive
    "Nausea", "Vomiting", "Diarrhea", "Abdominal_Pain", "Loss_of_Appetite",
    "Indigestion", "Bloating", "Constipation", "Heartburn", "Blood_in_Stool",

    # General
    "Fatigue", "Chills", "Headache", "Muscle_Aches", "Joint_Pain",
    "Weakness", "Dizziness", "Night_Sweats", "Weight_Loss", "Fever",

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

# Disease-symptom patterns (which symptoms are likely for each disease)
DISEASE_PATTERNS = {
    # Original diseases
    "COVID-19": ["Fever", "Cough", "Fatigue", "Loss_of_Appetite", "Shortness_of_Breath", "Chest_Pain"],
    "Pneumonia": ["Fever", "Cough", "Chest_Pain", "Shortness_of_Breath", "Chills", "Muscle_Aches"],
    "Flu": ["Fever", "Cough", "Sore_Throat", "Fatigue", "Chills", "Muscle_Aches", "Headache"],
    "Common_Cold": ["Runny_Nose", "Congestion", "Sore_Throat", "Cough", "Sneezing", "Nasal_Discharge"],
    "Bronchitis": ["Cough", "Fatigue", "Shortness_of_Breath", "Chest_Pain", "Wheezing", "Fever"],
    "Asthma": ["Wheezing", "Shortness_of_Breath", "Chest_Tightness", "Cough", "Breathing_Difficulty"],
    "Anxiety_Disorder": ["Anxiety", "Panic_Attacks", "Tremors", "Palpitations", "Dizziness", "Insomnia"],
    "Migraine": ["Headache", "Nausea", "Vomiting", "Photophobia", "Visual_Disturbances"],
    "Gastritis": ["Abdominal_Pain", "Nausea", "Vomiting", "Heartburn", "Loss_of_Appetite", "Bloating"],
    "Healthy": [],

    # New diseases
    "Hypertension": ["High_Blood_Pressure", "Headache", "Dizziness", "Chest_Pain", "Fatigue"],
    "Diabetes": ["Excessive_Thirst", "Excessive_Hunger", "Frequent_Urination", "Fatigue", "Blurred_Vision"],
    "Arthritis": ["Joint_Pain", "Stiffness", "Muscle_Aches", "Swelling", "Reduced_Range_of_Motion"],
    "Thyroid_Disease": ["Fatigue", "Weight_Loss", "Cold_Hands_Feet", "Hair_Loss", "Mood_Swings"],
    "Urinary_Tract_Infection": ["Painful_Urination", "Frequent_Urination", "Urgency_to_Urinate", "Fever", "Pelvic_Pain"],
    "Skin_Allergy": ["Rash", "Itching", "Hives", "Skin_Lesions", "Dry_Skin", "Redness"],
    "Depression": ["Depression", "Insomnia", "Loss_of_Appetite", "Fatigue", "Mood_Swings", "Memory_Loss"],
    "Peptic_Ulcer": ["Abdominal_Pain", "Heartburn", "Nausea", "Vomiting", "Blood_in_Stool"],
    "Sinusitis": ["Congestion", "Headache", "Nasal_Discharge", "Sore_Throat", "Cough"],
    "Hepatitis": ["Fever", "Nausea", "Vomiting", "Abdominal_Pain", "Jaundice", "Fatigue"]
}

def generate_training_data(n_samples_per_disease=1000):
    """Generate synthetic training data for all diseases"""
    print("Generating synthetic training data...")

    X = []
    y = []

    for disease in DISEASES:
        print(f"  Generating {n_samples_per_disease} samples for {disease}...")

        # Get disease-specific symptoms
        disease_symptoms = DISEASE_PATTERNS.get(disease, [])

        for _ in range(n_samples_per_disease):
            # Create feature vector (binary: 0 or 1 for each symptom)
            sample = [0] * len(SYMPTOMS)

            # Add disease-specific symptoms
            for symptom in disease_symptoms:
                if symptom in SYMPTOMS:
                    idx = SYMPTOMS.index(symptom)
                    # 80% probability to include disease-specific symptom
                    if random.random() < 0.8:
                        sample[idx] = 1

            # Add some random symptoms (noise)
            n_random = random.randint(0, 3)
            remaining_symptoms = [s for s in SYMPTOMS if s not in disease_symptoms]
            if remaining_symptoms:
                for _ in range(n_random):
                    symptom = random.choice(remaining_symptoms)
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

    # Create mapping
    label_mapping = {idx: disease for idx, disease in enumerate(le.classes_)}

    return y_encoded, le, label_mapping

def train_model(X, y_encoded, label_mapping):
    """Train XGBoost model"""
    print("\nSplitting data (80/20 train/test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")

    print("\nTraining XGBoost model...")
    model = XGBClassifier(
        n_estimators=500,
        max_depth=15,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        eval_metric='mlogloss'
    )

    model.fit(X_train, y_train, verbose=False)

    # Evaluate
    print("\nEvaluating model...")
    y_pred = model.predict(X_test)

    # Overall accuracy
    overall_accuracy = accuracy_score(y_test, y_pred)
    print(f"Overall Accuracy: {overall_accuracy * 100:.2f}%")

    # Per-disease accuracy
    disease_accuracies = {}
    disease_f1_scores = {}

    print("\nPer-Disease Performance:")
    print("-" * 60)

    for idx, disease in label_mapping.items():
        # Calculate F1-score for this disease (one-vs-rest)
        y_test_binary = (y_test == idx).astype(int)
        y_pred_binary = (y_pred == idx).astype(int)

        f1 = f1_score(y_test_binary, y_pred_binary, zero_division=0)
        disease_f1_scores[disease] = round(f1, 4)

        # Also calculate accuracy for this disease
        disease_samples = y_test == idx
        if disease_samples.sum() > 0:
            acc = accuracy_score(y_test[disease_samples], y_pred[disease_samples])
            disease_accuracies[disease] = round(acc, 4)
        else:
            disease_accuracies[disease] = 0.0

        status = "[PASS]" if f1 >= 0.90 else "[NEEDS WORK]"
        print(f"{disease:30} F1: {f1:.4f} | Accuracy: {disease_accuracies[disease]:.4f} {status}")

    print("-" * 60)

    # Feature importance
    feature_importance = {}
    for idx, importance in enumerate(model.feature_importances_):
        if importance > 0:
            feature_importance[SYMPTOMS[idx]] = round(float(importance), 6)

    # Sort by importance
    feature_importance = dict(sorted(
        feature_importance.items(),
        key=lambda x: x[1],
        reverse=True
    ))

    print("\nTop 15 Important Symptoms:")
    print("-" * 60)
    for idx, (symptom, importance) in enumerate(list(feature_importance.items())[:15], 1):
        print(f"{idx:2}. {symptom:30} {importance:.6f}")

    return model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance

def save_model(model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance):
    """Save model and metadata"""
    backend_dir = os.path.dirname(os.path.abspath(__file__)) + "/backend"

    model_path = os.path.join(backend_dir, "disease_model.json")
    metadata_path = os.path.join(backend_dir, "disease_model_metadata.json")

    print(f"\nSaving model to {model_path}...")
    model.save_model(model_path)

    # Create metadata
    metadata = {
        "diseases": DISEASES,
        "symptoms": SYMPTOMS,
        "accuracy": round(overall_accuracy, 4),
        "disease_accuracies": disease_accuracies,
        "disease_f1_scores": disease_f1_scores,
        "feature_importance": feature_importance,
        "model_type": "XGBoost",
        "n_diseases": len(DISEASES),
        "n_symptoms": len(SYMPTOMS),
        "total_training_samples": len(DISEASES) * 1000
    }

    print(f"Saving metadata to {metadata_path}...")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print("\nModel and metadata saved successfully!")
    return model_path, metadata_path

def main():
    print("=" * 60)
    print("XGBoost 20-Disease Model Training")
    print("=" * 60)
    print(f"Total diseases: {len(DISEASES)}")
    print(f"Total symptoms: {len(SYMPTOMS)}")
    print(f"Samples per disease: 1000")
    print(f"Total training samples: {len(DISEASES) * 1000}")
    print("=" * 60)

    # Generate data
    X, y = generate_training_data(n_samples_per_disease=1000)

    # Encode labels
    y_encoded, le, label_mapping = encode_labels(y)

    # Train model
    model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance = train_model(X, y_encoded, label_mapping)

    # Save model
    save_model(model, overall_accuracy, disease_accuracies, disease_f1_scores, feature_importance)

    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)

    # Count diseases meeting 90% target
    passing_diseases = sum(1 for f1 in disease_f1_scores.values() if f1 >= 0.90)
    print(f"Diseases meeting 90% accuracy target: {passing_diseases}/{len(DISEASES)}")

    if passing_diseases == len(DISEASES):
        print("[SUCCESS] All diseases meet 90% accuracy target!")
    else:
        print(f"[INFO] {len(DISEASES) - passing_diseases} diseases below 90% target")

if __name__ == "__main__":
    main()

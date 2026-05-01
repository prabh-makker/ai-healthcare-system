import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import json

def train_symptom_model():
    print("Generating synthetic dataset for testing...")
    
    # Generate simple synthetic dataset for the mockup
    symptoms = ['fever', 'cough', 'fatigue', 'difficulty_breathing', 'loss_of_taste_smell', 'headache', 'sore_throat']
    diseases = ['COVID-19', 'Flu', 'Common Cold', 'Pneumonia', 'Healthy']
    
    # Generate 1000 random samples
    np.random.seed(42)
    n_samples = 1000
    
    data = []
    labels = []
    
    for _ in range(n_samples):
        # Create random symptom profile
        profile = np.random.binomial(1, 0.3, len(symptoms))
        data.append(profile)
        
        # Simple rule-based labeling for the dummy dataset
        if profile[3] == 1 and profile[0] == 1:
            labels.append('Pneumonia')
        elif profile[4] == 1:
            labels.append('COVID-19')
        elif profile[0] == 1 and profile[2] == 1:
            labels.append('Flu')
        elif profile[1] == 1 or profile[6] == 1:
            labels.append('Common Cold')
        else:
            labels.append('Healthy')
            
    df = pd.DataFrame(data, columns=symptoms)
    df['disease'] = labels
    
    X = df.drop('disease', axis=1)
    y = df['disease']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest model...")
    # Using RandomForest instead of XGBoost for zero-config dummy training to avoid C-level errors, can upgrade later
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Model accuracy: {acc * 100:.2f}%")
    
    # Save model and artifacts
    joblib.dump(model, 'symptom_rf_model.joblib')
    
    metadata = {
        'symptoms': symptoms,
        'classes': list(model.classes_),
        'accuracy': acc
    }
    
    with open('model_metadata.json', 'w') as f:
        json.dump(metadata, f)
        
    print("Model saved to symptom_rf_model.joblib")

if __name__ == '__main__':
    train_symptom_model()

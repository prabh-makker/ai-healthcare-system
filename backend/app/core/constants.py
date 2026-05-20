"""Application constants and mappings."""

# Disease to specialist mapping for diagnosis recommendations
# Original 10 diseases
SPECIALIST_MAP = {
    "COVID-19": "Infectious Disease Specialist / Pulmonologist",
    "Pneumonia": "Pulmonologist",
    "Flu": "General Physician",
    "Common Cold": "General Physician",
    "Bronchitis": "Pulmonologist",
    "Asthma": "Pulmonologist",
    "Anxiety Disorder": "Psychiatrist",
    "Migraine": "Neurologist",
    "Gastritis": "Gastroenterologist",
    "Healthy": "None required",

    # Extended 10 diseases from XGBoost model
    "Hypertension": "Cardiologist / Internal Medicine Specialist",
    "Diabetes": "Endocrinologist / Internal Medicine Specialist",
    "Arthritis": "Rheumatologist / Orthopedic Specialist",
    "Thyroid_Disease": "Endocrinologist",
    "Urinary_Tract_Infection": "Urologist / General Physician",
    "Skin_Allergy": "Dermatologist / Allergist",
    "Depression": "Psychiatrist / Psychologist",
    "Peptic_Ulcer": "Gastroenterologist",
    "Sinusitis": "ENT Specialist / Otolaryngologist",
    "Hepatitis": "Hepatologist / Gastroenterologist / Infectious Disease Specialist",
}

# Allowed medical record statuses
RECORD_STATUS_ALLOWED = {"pending", "approved", "reviewed", "rejected"}

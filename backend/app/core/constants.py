"""Application constants and mappings."""

# Disease to specialist mapping for diagnosis recommendations
SPECIALIST_MAP = {
    "COVID-19": "Infectious Disease Specialist / Pulmonologist",
    "Pneumonia": "Pulmonologist",
    "Flu": "General Physician",
    "Common Cold": "General Physician",
    "Healthy": "None required",
}

# Allowed medical record statuses
RECORD_STATUS_ALLOWED = {"pending", "approved", "reviewed"}

# AI Healthcare Diagnosis System — Architecture & Design Document

## 1. Overview

The **AI Healthcare Diagnosis System** is a next-generation medical platform that integrates multiple AI modalities (Tabular, Vision, NLP) to provide clinical-grade insights. It features a premium glassmorphic dashboard for patients and doctors, facilitating seamless symptom analysis, medical image review, and automated reporting.

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 AI Healthcare Diagnosis System                  │
├─────────────┬──────────────────┬────────────────────────────────┤
│  AI ENGINE  │    BACKEND API   │         FRONTEND               │
│  (Python)   │    (FastAPI)     │         (Next.js 15)           │
│             │                  │                                │
│  XGBoost    │  Auth (JWT)      │  Dashboard (/)                │
│  (Symptoms) │  Users/Profiles  │  ├─ Health Stats              │
│      │      │       │          │  ├─ Appointment Calendar      │
│      ▼      │       ▼          │  └─ AI Triage Overview        │
│  ResNet50   │  PostgreSQL      │                                │
│  (Vision)   │  (SQLAlchemy)    │  Symptom Checker (/symptoms)  │
│      │      │       │          │  ├─ Interactive Form          │
│      ▼      │       ▼          │  ├─ Real-time Prediction     │
│  BERT       │  Redis/Celery    │  └─ Specialist Matching       │
│  (Reports)  │  (Async Jobs)    │                                │
│             │                  │  Imaging (/imaging)           │
│  Inference  │  REST v1 APIs    │  ├─ DICOM/X-Ray Upload       │
│  Service    │  /api/v1/*       │  └─ Heatmap Visualization     │
└─────────────┴──────────────────┴────────────────────────────────┘
```

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15, React 19, TypeScript | Premium Patient/Doctor UI |
| Styling | Tailwind CSS, Framer Motion | Glassmorphism & Micro-animations |
| Charts | Recharts | Patient vitals & disease trends |
| Backend | FastAPI (Python 3.12) | Asynchronous RESTful API |
| Database | PostgreSQL + SQLAlchemy | Persistent medical records & auth |
| Async Queue | Redis + Celery | Long-running ML inference tasks |
| AI (Symptoms)| XGBoost / Scikit-learn | Multi-class disease classification |
| AI (Vision) | TensorFlow / ResNet50 | Lung pathology (Pneumonia) detection |
| AI (NLP) | HuggingFace (BERT) | Medical report summarization |
| Storage | Cloudinary / Local | X-Ray image & PDF report storage |

## 4. Directory Structure

```
ai-healthcare-system/
├── README.md                    # Project overview
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # Entry point
│   │   ├── core/                # Config, Security, JWT
│   │   ├── api/v1/              # Endpoint modules
│   │   │   ├── auth.py          # Login/Register
│   │   │   ├── diagnosis.py     │ Symptoms & Image processing
│   │   │   └── users.py         # Profile management
│   │   ├── db/                  │ Session & Base classes
│   │   ├── models/              │ SQLAlchemy models (User, Record)
│   │   └── schemas/             │ Pydantic validation models
│   ├── alembic/                 # DB migrations
│   └── requirements.txt         # Backend dependencies
├── frontend/                    # Next.js frontend
│   ├── src/app/
│   │   ├── dashboard/           # Main entry for logged-in users
│   │   ├── symptoms/           # Symptom checker flow
│   │   ├── imaging/             # Vision processing UI
│   │   └── auth/                # Login & Registration pages
│   ├── src/components/          # Shared UI (Cards, GlassNavbar)
│   └── package.json
├── ml-models/                   # AI Training & Serving
│   ├── symptom_classifier/      # XGBoost training scripts
│   ├── vision_processor/       # ResNet50 fine-tuning
│   └── saved_models/            # Serialized (.pkl, .h5) files
└── docs/                        # Comprehensive Documentation
    ├── architecture.md          # This file
    ├── implementation_plan.md   # Feature roadmap
    ├── task_tracker.md          # Real-time progress
    └── enhancements.md          # Proposed premium features
```

## 5. Key API Endpoints (v1)

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create a new Patient or Doctor account |
| POST | `/login` | Authenticate and receive JWT |

### Diagnosis (`/api/v1/diagnosis`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/symptoms` | Predict disease based on symptom list |
| POST | `/upload-scan` | Upload X-Ray for AI vision analysis |
| GET | `/status/{id}` | Check async ML task status |

### User Profile (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current user profile & history |
| PUT | `/me` | Update medical preferences/allergies |

## 6. Data Model

The system uses a relational PostgreSQL schema to ensure HIPAA-level data integrity:

- **Users**: Central authentication table with roles (Patient/Doctor).
- **PatientProfiles**: Extended info like blood group, chronic issues.
- **MedicalRecords**: Stores symptoms (JSONB), AI predictions, confidence, and links to image scans.
- **Appointments**: Tracks doctor-patient consultations.

## 7. Key Design Decisions

1. **Async Inference**: Heavy ML models (Vision/NLP) are processed via Celery/Redis to prevent blocking the API.
2. **Glassmorphic UI**: High-end aesthetic using semi-transparent surfaces and blurred backdrops to evoke a "modern clinic" feel.
3. **JSONB for Symptoms**: Flexible storage for varying symptom counts while maintaining SQL relational power.
4. **ResNet50 Transfer Learning**: Leveraging pre-trained weights for high accuracy in chest X-ray classification with limited medical data.

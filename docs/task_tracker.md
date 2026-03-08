# AI Healthcare Diagnosis System: Master Task Tracker

This file tracks the overarching progress of the application. The project is initialized as a Monorepo with a Next.js frontend, FastAPI backend, and a dedicated folder for ML Models.

## ✅ Phase 1: Foundation (COMPLETE)
- [x] Identify first project and core requirements.
- [x] Initialize FastAPI project structure (`/backend`).
- [x] Configure Base SQL Schema for `User`, `Patient`, `Doctor`, and `MedicalRecord` using SQLAlchemy & Alembic.
- [x] Initialize Next.js 15 + Tailwind CSS project (`/frontend`).
- [x] Build out the core Glassmorphic Medical Dashboard UI.
- [x] Create the first AI mock endpoint for "Symptom Analysis" built with `scikit-learn`.
- [x] Initialize main GitHub repository and link it.

---

## 🚀 Phase 2: Next Steps (START HERE IN NEXT SESSION)

### Backend & API
- [ ] **Database Connection**: Set up a live PostgreSQL instance (local or clouded via Supabase/Neon) and update `.env` `DATABASE_URL`.
- [ ] **Authentication**: Implement JWT-based user login and registration (`/api/v1/auth`) for Patients and Doctors using `passlib` and `python-jose`.
- [ ] **User Sessions**: Attach current logged-in user context to the API endpoints to create distinct profiles.

### Frontend Integration
- [ ] **API Connection**: Use `fetch`/`axios` in Next.js to dynamically fetch dashboard stats from the FastAPI backend.
- [ ] **Symptom Checker UI**: Build the actual frontend form/flow for patients to enter their symptoms and submit them to the `/api/v1/diagnosis/symptoms` endpoint.
- [ ] **Login & Registration Pages**: Create the UI views for onboarding.

### AI Model Integration
- [ ] **Real Symptom Model Transition**: Transition the mockup `RandomForest` symptom model to train on a real Kaggle Disease-Symptom dataset using XGBoost or Scikit-learn.
- [ ] **Vision Processing**: Begin designing the Computer Vision model (ResNet50) for processing X-Ray lung scans.

---

## 🔮 Phase 3: Future Expansion
- [ ] Implement Medical Report viewer with PDF export.
- [ ] Integrate Text Summarization (BERT) for condensing long patient histories.
- [ ] Setup Docker Compose for seamless localized booting of Postgres, Redis, FastAPI, and Next.js simultaneously.
- [ ] Configure Redis and Celery for async heavy ML task queues.

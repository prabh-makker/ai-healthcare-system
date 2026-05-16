# AI Healthcare API Reference

**Generated:** 2026-05-16 12:22:18
**Version:** 0.1.0

## Overview

Healthcare diagnosis and management API

---

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require JWT authentication via httpOnly cookie (`auth_token`) or Authorization header.

**Authorization Header:**
```
Authorization: Bearer <access_token>
```

---

## Endpoints by Category

### Admin

#### PATCH /api/v1/admin/users/{user_id}/status

**Summary:** Update User Status

**Parameters:**

- `user_id` (path, string) *required: 

**Request Body:**

```json
// See schema: UserStatusUpdate
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### PATCH /api/v1/admin/users/{user_id}/role

**Summary:** Update User Role

**Parameters:**

- `user_id` (path, string) *required: 

**Request Body:**

```json
// See schema: UserRoleUpdate
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### DELETE /api/v1/admin/users/{user_id}

**Summary:** Delete User

**Parameters:**

- `user_id` (path, string) *required: 

**Responses:**

- **204**: Successful Response
- **422**: Validation Error


#### GET /api/v1/admin/audit-log

**Summary:** Get Audit Log

**Parameters:**

- `skip` (query, integer): 
- `limit` (query, integer): 
- `action` (query, string): 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### GET /api/v1/admin/doctor-performance

**Summary:** Doctor Performance

**Description:** Per-doctor metrics: avg approval time, total approved, pending count.

**Responses:**

- **200**: Successful Response


#### POST /api/v1/admin/bulk-assign-patients

**Summary:** Bulk Assign

**Request Body:**

```json
// See schema: BulkAssign
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### GET /api/v1/admin/system-health

**Summary:** System Health

**Responses:**

- **200**: Successful Response


#### GET /api/v1/admin/diagnoses-distribution

**Summary:** Diagnoses Distribution

**Responses:**

- **200**: Successful Response


#### GET /api/v1/admin/export/users

**Summary:** Export Users

**Responses:**

- **200**: Successful Response


#### GET /api/v1/admin/export/records

**Summary:** Export Records

**Responses:**

- **200**: Successful Response


#### GET /api/v1/admin/export/appointments

**Summary:** Export Appointments

**Responses:**

- **200**: Successful Response


### Appointments

#### GET /api/v1/appointments/

**Summary:** List Appointments

**Parameters:**

- `skip` (query, integer): 
- `limit` (query, integer): 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### POST /api/v1/appointments/

**Summary:** Create Appointment

**Request Body:**

```json
// See schema: AppointmentCreate
```

**Responses:**

- **201**: Successful Response
- **422**: Validation Error


#### PUT /api/v1/appointments/{appt_id}

**Summary:** Update Appointment

**Parameters:**

- `appt_id` (path, string) *required: 

**Request Body:**

```json
// See schema: AppointmentUpdate
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### DELETE /api/v1/appointments/{appt_id}

**Summary:** Cancel Appointment

**Parameters:**

- `appt_id` (path, string) *required: 

**Responses:**

- **204**: Successful Response
- **422**: Validation Error


### Auth

#### POST /api/v1/auth/change-password

**Summary:** Change Password

**Description:** Change user password

**Request Body:**

```json
// See schema: ChangePasswordRequest
```

**Responses:**

- **204**: Successful Response
- **422**: Validation Error


#### POST /api/v1/auth/register

**Summary:** Register User

**Request Body:**

```json
// See schema: UserCreate
```

**Responses:**

- **201**: Successful Response
- **422**: Validation Error


#### POST /api/v1/auth/login

**Summary:** Login Access Token

**Request Body:**


**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### POST /api/v1/auth/logout

**Summary:** Logout

**Responses:**

- **204**: Successful Response


#### GET /api/v1/auth/me

**Summary:** Read Current User

**Responses:**

- **200**: Successful Response


### Diagnosis

#### POST /api/v1/diagnosis/symptoms

**Summary:** Analyze Symptoms

**Request Body:**

```json
// See schema: SymptomRequest
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### POST /api/v1/diagnosis/chat

**Summary:** Diagnosis Chat

**Description:** Chat-based diagnosis supporting turn-based prompts and free-form symptom input.

**Request Body:**

```json
// See schema: DiagnosisChatRequest
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### POST /api/v1/diagnosis/xray

**Summary:** Analyze Xray

**Request Body:**

```json
// See schema: XrayRequest
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### POST /api/v1/diagnosis/report

**Summary:** Analyze Report

**Request Body:**

```json
// See schema: ReportRequest
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


### Health

#### GET /api/v1/health

**Summary:** Health Check

**Responses:**

- **200**: Successful Response


### Messages

#### POST /api/v1/messages/

**Summary:** Send Message

**Description:** Send a message to another user (doctor-patient only).

**Request Body:**

```json
// See schema: MessageCreate
```

**Responses:**

- **201**: Successful Response
- **422**: Validation Error


#### GET /api/v1/messages/conversations

**Summary:** List Conversations

**Description:** List all conversations for the current user.

**Responses:**

- **200**: Successful Response


#### GET /api/v1/messages/{user_id}

**Summary:** Get Conversation

**Description:** Get all messages between current user and specified user.

**Parameters:**

- `user_id` (path, string) *required: 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


### Notifications

#### GET /api/v1/notifications/

**Summary:** List Notifications

**Description:** Get notifications for the current user.

**Parameters:**

- `skip` (query, integer): 
- `limit` (query, integer): 
- `unread_only` (query, boolean): 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### GET /api/v1/notifications/unread-count

**Summary:** Get Unread Count

**Description:** Get count of unread notifications.

**Responses:**

- **200**: Successful Response


#### PATCH /api/v1/notifications/{notification_id}/read

**Summary:** Mark As Read

**Description:** Mark a notification as read.

**Parameters:**

- `notification_id` (path, string) *required: 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### PATCH /api/v1/notifications/mark-all-read

**Summary:** Mark All Read

**Description:** Mark all notifications as read for the current user.

**Responses:**

- **200**: Successful Response


#### DELETE /api/v1/notifications/{notification_id}

**Summary:** Delete Notification

**Description:** Delete a notification.

**Parameters:**

- `notification_id` (path, string) *required: 

**Responses:**

- **204**: Successful Response
- **422**: Validation Error


### Patients

#### GET /api/v1/patients/me

**Summary:** Get My Profile

**Responses:**

- **200**: Successful Response


#### POST /api/v1/patients/me

**Summary:** Update My Profile

**Request Body:**

```json
// See schema: PatientProfileUpdate
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### GET /api/v1/patients/admin/doctors-overview

**Summary:** Admin Doctors Overview

**Description:** Admin: list all doctors with patient counts, record counts.

**Responses:**

- **200**: Successful Response


#### GET /api/v1/patients/admin/all-users

**Summary:** Admin All Users

**Description:** Admin: list all users grouped by role.

**Responses:**

- **200**: Successful Response


#### GET /api/v1/patients/list

**Summary:** List Patients

**Parameters:**

- `skip` (query, integer): 
- `limit` (query, integer): 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### GET /api/v1/patients/my-patients

**Summary:** Get My Patients

**Description:** Get all patients assigned to this doctor.
Only doctors can call this endpoint.

**Parameters:**

- `skip` (query, integer): 
- `limit` (query, integer): 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### POST /api/v1/patients/assign/{patient_id}/{doctor_id}

**Summary:** Assign Patient To Doctor

**Description:** Assign a patient to a doctor. Only admins can do this.

**Parameters:**

- `patient_id` (path, string) *required: 
- `doctor_id` (path, string) *required: 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


### Prescriptions

#### POST /api/v1/prescriptions/

**Summary:** Create Prescription

**Description:** Create a new prescription.
Only doctors can prescribe, and only to patients they're assigned to.

**Request Body:**

```json
// See schema: PrescriptionCreate
```

**Responses:**

- **201**: Successful Response
- **422**: Validation Error


#### GET /api/v1/prescriptions/

**Summary:** List Prescriptions

**Description:** List prescriptions. Filtered by role:
- Doctors see prescriptions they created
- Patients see their own prescriptions
- Admins see all prescriptions

**Parameters:**

- `skip` (query, integer): 
- `limit` (query, integer): 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### GET /api/v1/prescriptions/{prescription_id}

**Summary:** Get Prescription

**Description:** Get a specific prescription by ID.
Authorization: Doctor (if they created it), Patient (if it's theirs), or Admin

**Parameters:**

- `prescription_id` (path, string) *required: 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### PATCH /api/v1/prescriptions/{prescription_id}

**Summary:** Update Prescription

**Description:** Update a prescription. Only the prescribing doctor can update.
Can update: status, end_date, instructions

**Parameters:**

- `prescription_id` (path, string) *required: 

**Request Body:**

```json
// See schema: PrescriptionUpdate
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### DELETE /api/v1/prescriptions/{prescription_id}

**Summary:** Delete Prescription

**Description:** Delete a prescription. Only the prescribing doctor can delete.

**Parameters:**

- `prescription_id` (path, string) *required: 

**Responses:**

- **204**: Successful Response
- **422**: Validation Error


#### POST /api/v1/prescriptions/{prescription_id}/log

**Summary:** Log Medication Taken

**Description:** Patient marks a medication as taken.

**Parameters:**

- `prescription_id` (path, string) *required: 

**Request Body:**

```json
// See schema: MedicationLogCreate
```

**Responses:**

- **201**: Successful Response
- **422**: Validation Error


#### GET /api/v1/prescriptions/{prescription_id}/logs

**Summary:** Get Medication Logs

**Description:** Get medication intake logs for a prescription.

**Parameters:**

- `prescription_id` (path, string) *required: 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### GET /api/v1/prescriptions/adherence/summary

**Summary:** Get Adherence Summary

**Description:** Get adherence summary for the current patient (last 7 days).

**Responses:**

- **200**: Successful Response


### Records

#### POST /api/v1/records/test-simple

**Summary:** Test Simple

**Description:** Simple test endpoint to verify routing works.

**Responses:**

- **200**: Successful Response


#### GET /api/v1/records/stats/summary

**Summary:** Get Stats

**Responses:**

- **200**: Successful Response


#### GET /api/v1/records

**Summary:** Get Records

**Parameters:**

- `skip` (query, integer): 
- `limit` (query, integer): 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### POST /api/v1/records/

**Summary:** Create Record

**Request Body:**

```json
// See schema: RecordCreate
```

**Responses:**

- **201**: Successful Response
- **422**: Validation Error


#### GET /api/v1/records/{record_id}

**Summary:** Get Record

**Parameters:**

- `record_id` (path, string) *required: 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### PATCH /api/v1/records/{record_id}

**Summary:** Patch Record

**Parameters:**

- `record_id` (path, string) *required: 

**Request Body:**

```json
// See schema: RecordPatch
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### DELETE /api/v1/records/{record_id}

**Summary:** Delete Record

**Parameters:**

- `record_id` (path, string) *required: 

**Responses:**

- **204**: Successful Response
- **422**: Validation Error


#### POST /api/v1/records/bulk-approve

**Summary:** Bulk Approve Records

**Description:** Bulk approve multiple medical records.
Only the assigned doctor (or admin) can approve.

**Request Body:**

```json
// See schema: BulkApprove
```

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


#### GET /api/v1/records/pending/list

**Summary:** List Pending Records

**Description:** Get pending records for the doctor (records assigned to them, status=pending).
Used by the approval queue page.

**Parameters:**

- `skip` (query, integer): 
- `limit` (query, integer): 

**Responses:**

- **200**: Successful Response
- **422**: Validation Error


### Uncategorized

#### GET /metrics

**Summary:** Prometheus Metrics

**Responses:**

- **200**: Successful Response


#### GET /

**Summary:** Root

**Responses:**

- **200**: Successful Response


---

## Data Schemas

### AppointmentCreate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `specialist` | string | Yes |  |
| `date` | string | Yes |  |
| `time` | string | Yes |  |
| `reason` | object | No |  |

### AppointmentUpdate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `specialist` | object | No |  |
| `date` | object | No |  |
| `time` | object | No |  |
| `status` | object | No |  |
| `reason` | object | No |  |

### Body_login_access_token_api_v1_auth_login_post

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `grant_type` | object | No |  |
| `username` | string | Yes |  |
| `password` | string | Yes |  |
| `scope` | string | No |  |
| `client_id` | object | No |  |
| `client_secret` | object | No |  |

### BulkApprove

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `record_ids` | array | Yes |  |
| `notes` | object | No |  |
| `status` | object | No |  |

### BulkAssign

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `doctor_id` | string | Yes |  |
| `patient_ids` | array | Yes |  |

### ChangePasswordRequest

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `old_password` | string | Yes |  |
| `new_password` | string | Yes |  |

### DiagnosisChatRequest

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `message` | string | Yes |  |
| `selected_symptoms` | array | No |  |
| `asked_symptoms` | array | No |  |
| `last_asked_symptom` | object | No |  |
| `session_id` | object | No |  |

### DiagnosisChatResponse

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `assistant_message` | string | Yes |  |
| `updated_symptoms` | array | Yes |  |
| `current_diagnosis` | object | Yes |  |
| `next_symptom_to_ask` | object | No |  |
| `conversation_state` | string | Yes |  |
| `recognized_keywords` | array | No |  |

### HTTPValidationError

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `detail` | array | No |  |

### MedicationLogCreate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `notes` | string | No |  |

### MessageCreate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `receiver_id` | string | Yes |  |
| `content` | string | Yes |  |

### NotificationOut

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes |  |
| `user_id` | string | Yes |  |
| `type` | string | Yes |  |
| `title` | string | Yes |  |
| `message` | object | Yes |  |
| `is_read` | boolean | Yes |  |
| `related_id` | object | Yes |  |
| `related_url` | object | Yes |  |
| `created_at` | string | Yes |  |

### PatientProfileUpdate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `date_of_birth` | object | No |  |
| `blood_group` | object | No |  |
| `chronic_conditions` | object | No |  |
| `emergency_contact` | object | No |  |

### PredictionResponse

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `predicted_disease` | string | Yes |  |
| `confidence` | number | Yes |  |
| `recommended_specialist` | string | Yes |  |
| `recognized_symptoms` | array | Yes |  |
| `unknown_symptoms` | array | Yes |  |
| `record_id` | object | No |  |

### PrescriptionCreate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `patient_id` | string | Yes |  |
| `medication_name` | string | Yes |  |
| `dosage` | string | Yes |  |
| `frequency` | string | Yes |  |
| `instructions` | string | Yes |  |
| `start_date` | object | No |  |
| `end_date` | object | No |  |

### PrescriptionOut

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes |  |
| `patient_id` | string | Yes |  |
| `doctor_id` | string | Yes |  |
| `medication_name` | string | Yes |  |
| `dosage` | object | Yes |  |
| `frequency` | object | Yes |  |
| `instructions` | object | Yes |  |
| `start_date` | string | Yes |  |
| `end_date` | object | Yes |  |
| `status` | string | Yes |  |
| `created_at` | string | Yes |  |
| `updated_at` | string | Yes |  |

### PrescriptionUpdate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `status` | object | No |  |
| `end_date` | object | No |  |
| `instructions` | object | No |  |

### RecordCreate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `symptoms` | array | Yes |  |
| `ai_prediction` | object | No |  |
| `confidence_score` | object | No |  |
| `recommended_specialist` | object | No |  |

### RecordPatch

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `doctor_notes` | object | No |  |
| `status` | object | No |  |

### ReportRequest

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `report_text` | string | Yes |  |
| `save_record` | boolean | No |  |

### ReportResponse

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `summary` | string | Yes |  |
| `detected_conditions` | array | Yes |  |
| `urgency` | string | Yes |  |
| `recommended_specialist` | string | Yes |  |
| `record_id` | object | No |  |

### SymptomRequest

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `symptoms` | array | Yes |  |
| `save_record` | boolean | No |  |

### Token

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `access_token` | string | Yes |  |
| `token_type` | string | Yes |  |

### UserCreate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `email` | string | Yes |  |
| `password` | string | Yes |  |
| `role` | string | No |  |

### UserOut

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes |  |
| `email` | string | Yes |  |
| `role` | string | Yes |  |
| `is_active` | boolean | Yes |  |
| `created_at` | string | Yes |  |

### UserRole


### UserRoleUpdate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `role` | object | Yes |  |

### UserStatusUpdate

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `is_active` | boolean | Yes |  |

### ValidationError

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `loc` | array | Yes |  |
| `msg` | string | Yes |  |
| `type` | string | Yes |  |
| `input` | object | No |  |
| `ctx` | object | No |  |

### XrayRequest

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `image_base64` | string | Yes |  |
| `save_record` | boolean | No |  |

### XrayResponse

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `predicted_condition` | string | Yes |  |
| `confidence` | number | Yes |  |
| `severity` | string | Yes |  |
| `recommended_action` | string | Yes |  |
| `record_id` | object | No |  |

---

## Security

- **Authentication:** JWT via httpOnly cookie (httpOnly, SameSite=Lax, Secure in production)
- **Roles:** PATIENT, DOCTOR, ADMIN
- **HTTPS:** Required in production
- **CORS:** Restricted to configured origins
- **Rate Limiting:** Auth endpoints rate-limited

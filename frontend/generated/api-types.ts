// AI Healthcare API TypeScript Types & Client
// Auto-generated from FastAPI Pydantic schemas
// DO NOT EDIT - regenerate with: python generate_api_docs.py

/* ============================================================================
   ENUMS
   ============================================================================ */

export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
}

export enum RecordStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  ARCHIVED = 'archived',
}

export enum AppointmentStatus {
  UPCOMING = 'upcoming',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum PrescriptionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DISCONTINUED = 'discontinued',
}

/* ============================================================================
   AUTH TYPES
   ============================================================================ */

export interface UserCreate {
  email: string;
  password: string;
  role?: string;
}

export interface UserOut {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string; // ISO 8601 datetime
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface TokenPayload {
  sub?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

/* ============================================================================
   PATIENT TYPES
   ============================================================================ */

export interface PatientProfile {
  date_of_birth?: string | null; // ISO 8601 date
  blood_group?: string | null; // O+, O-, A+, A-, B+, B-, AB+, AB-
  chronic_conditions?: string[];
  emergency_contact?: string | null;
}

export interface PatientProfileUpdate {
  date_of_birth?: string | null;
  blood_group?: string | null;
  chronic_conditions?: string[] | null;
  emergency_contact?: string | null;
}

export interface PatientWithProfile extends UserOut {
  profile?: PatientProfile;
}

/* ============================================================================
   MEDICAL RECORD TYPES
   ============================================================================ */

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  symptoms: string[];
  ai_prediction?: string | null;
  confidence_score?: number | null; // 0-100
  recommended_specialist?: string | null;
  image_url?: string | null;
  status: RecordStatus;
  doctor_notes?: string | null;
  accuracy_feedback?: 'correct' | 'incorrect' | 'partial' | null;
  created_at: string; // ISO 8601 datetime
}

export interface RecordCreate {
  symptoms: string[];
  ai_prediction?: string;
  confidence_score?: number;
  recommended_specialist?: string;
}

export interface RecordPatch {
  doctor_notes?: string | null;
  status?: RecordStatus | null;
  accuracy_feedback?: 'correct' | 'incorrect' | 'partial' | null;
}

/* ============================================================================
   DIAGNOSIS TYPES
   ============================================================================ */

export interface DiagnosisRequest {
  symptoms: string[];
  duration_days?: number;
  severity?: number; // 1-10
  additional_notes?: string;
}

export interface DiagnosisSuggestion {
  diagnosis: string;
  confidence: number; // 0-100
}

export interface DiagnosisResponse {
  primary_diagnosis: string;
  confidence_score: number; // 0-100
  alternative_diagnoses: DiagnosisSuggestion[];
  recommended_specialist: string;
  severity_assessment: string;
  recommendations: string[];
  disclaimer: string;
  created_at: string;
}

/* ============================================================================
   APPOINTMENT TYPES
   ============================================================================ */

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string | null;
  specialist: string;
  date: string; // ISO 8601 date
  time: string; // HH:MM format
  status: AppointmentStatus;
  reason?: string | null;
  created_at: string;
}

export interface AppointmentCreate {
  specialist: string;
  date: string; // ISO 8601 date
  time: string; // HH:MM format
  reason?: string;
}

export interface AppointmentUpdate {
  date?: string;
  time?: string;
  reason?: string;
  status?: AppointmentStatus;
}

/* ============================================================================
   PRESCRIPTION TYPES
   ============================================================================ */

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  medication_name: string;
  dosage?: string | null;
  frequency?: string | null;
  instructions?: string | null;
  start_date: string; // ISO 8601 datetime
  end_date?: string | null;
  status: PrescriptionStatus;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionCreate {
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date?: string;
  end_date?: string;
}

export interface PrescriptionUpdate {
  status?: PrescriptionStatus;
  end_date?: string | null;
  instructions?: string | null;
}

/* ============================================================================
   NOTIFICATION TYPES
   ============================================================================ */

export interface NotificationCreate {
  user_id: string;
  type: string;
  title: string;
  message?: string | null;
  related_id?: string | null;
  related_url?: string | null;
}

export interface NotificationOut {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string | null;
  is_read: boolean;
  related_id?: string | null;
  related_url?: string | null;
  created_at: string;
}

/* ============================================================================
   MESSAGE TYPES
   ============================================================================ */

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
}

export interface MessageCreate {
  receiver_id: string;
  content: string;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  last_message?: Message;
  updated_at: string;
}

/* ============================================================================
   RESPONSE WRAPPER TYPES
   ============================================================================ */

export interface ErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ErrorInfo {
  message: string;
  status_code: number;
  details?: ErrorDetail[];
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: ErrorInfo;
  data: null;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}

export type APIResponse<T> = SuccessResponse<T> | ErrorResponse;

/* ============================================================================
   API CLIENT CONFIGURATION
   ============================================================================ */

export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  apiPrefix: '/api/v1',
  timeout: 30000,
  retries: 2,
};

export const API_ENDPOINT = `${API_CONFIG.baseURL}${API_CONFIG.apiPrefix}`;

/* ============================================================================
   API ERROR CLASS
   ============================================================================ */

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: ErrorDetail[],
    public originalResponse?: Response,
  ) {
    super(message);
    this.name = 'APIError';
  }

  static async fromResponse(response: Response): Promise<APIError> {
    try {
      const data: ErrorResponse = await response.json();
      return new APIError(
        data.error.status_code,
        data.error.message,
        data.error.details,
        response,
      );
    } catch {
      return new APIError(
        response.status,
        response.statusText,
        undefined,
        response,
      );
    }
  }
}

/* ============================================================================
   API CLIENT
   ============================================================================ */

export class APIClient {
  static async request<T>(
    method: string,
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_ENDPOINT}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for httpOnly auth
      ...options,
    });

    if (!response.ok) {
      throw await APIError.fromResponse(response);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as any;
    }

    return response.json();
  }

  static get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>('GET', endpoint, options);
  }

  static post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>('POST', endpoint, {
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  static put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>('PUT', endpoint, {
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  static delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>('DELETE', endpoint, options);
  }
}

/* ============================================================================
   AUTH API
   ============================================================================ */

export const authAPI = {
  register: (data: UserCreate) =>
    APIClient.post<SuccessResponse<UserOut>>('/auth/register', data),

  login: (email: string, password: string) =>
    APIClient.post<SuccessResponse<Token>>('/auth/login', {
      username: email,
      password,
    }),

  logout: () =>
    APIClient.post('/auth/logout', {}),

  getCurrentUser: () =>
    APIClient.get<SuccessResponse<UserOut>>('/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    APIClient.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    }),
};

/* ============================================================================
   PATIENT API
   ============================================================================ */

export const patientAPI = {
  getMyProfile: () =>
    APIClient.get<SuccessResponse<PatientWithProfile>>('/patients/me'),

  updateMyProfile: (data: PatientProfileUpdate) =>
    APIClient.post<SuccessResponse<PatientWithProfile>>('/patients/me', data),

  getPatient: (id: string) =>
    APIClient.get<SuccessResponse<PatientWithProfile>>(`/patients/{id}`),

  listPatients: (skip = 0, limit = 50) =>
    APIClient.get<PaginatedResponse<PatientWithProfile>>(
      `/patients?skip=${skip}&limit=${limit}`
    ),
};

/* ============================================================================
   DIAGNOSIS API
   ============================================================================ */

export const diagnosisAPI = {
  analyze: (data: DiagnosisRequest) =>
    APIClient.post<SuccessResponse<DiagnosisResponse>>('/diagnosis/analyze', data),

  getHistory: (skip = 0, limit = 50) =>
    APIClient.get<PaginatedResponse<MedicalRecord>>(
      `/diagnosis/history?skip=${skip}&limit=${limit}`
    ),

  validate: (recordId: string, data: RecordPatch) =>
    APIClient.post(`/diagnosis/validate/${recordId}`, data),
};

/* ============================================================================
   RECORDS API
   ============================================================================ */

export const recordsAPI = {
  getMyRecords: (skip = 0, limit = 50) =>
    APIClient.get<PaginatedResponse<MedicalRecord>>(
      `/records/me?skip=${skip}&limit=${limit}`
    ),

  getRecord: (id: string) =>
    APIClient.get<SuccessResponse<MedicalRecord>>(`/records/${id}`),

  listRecords: (skip = 0, limit = 50) =>
    APIClient.get<PaginatedResponse<MedicalRecord>>(
      `/records?skip=${skip}&limit=${limit}`
    ),

  createRecord: (data: RecordCreate) =>
    APIClient.post<SuccessResponse<MedicalRecord>>('/records', data),

  updateRecord: (id: string, data: RecordPatch) =>
    APIClient.put<SuccessResponse<MedicalRecord>>(`/records/${id}`, data),

  deleteRecord: (id: string) =>
    APIClient.delete(`/records/${id}`),

  getStats: () =>
    APIClient.get<SuccessResponse<any>>('/records/stats/summary'),
};

/* ============================================================================
   APPOINTMENT API
   ============================================================================ */

export const appointmentAPI = {
  listAppointments: (skip = 0, limit = 50) =>
    APIClient.get<PaginatedResponse<Appointment>>(
      `/appointments?skip=${skip}&limit=${limit}`
    ),

  getAppointment: (id: string) =>
    APIClient.get<SuccessResponse<Appointment>>(`/appointments/${id}`),

  createAppointment: (data: AppointmentCreate) =>
    APIClient.post<SuccessResponse<Appointment>>('/appointments', data),

  updateAppointment: (id: string, data: AppointmentUpdate) =>
    APIClient.put<SuccessResponse<Appointment>>(`/appointments/${id}`, data),

  cancelAppointment: (id: string) =>
    APIClient.delete(`/appointments/${id}`),
};

/* ============================================================================
   PRESCRIPTION API
   ============================================================================ */

export const prescriptionAPI = {
  listPrescriptions: (skip = 0, limit = 50) =>
    APIClient.get<PaginatedResponse<Prescription>>(
      `/prescriptions?skip=${skip}&limit=${limit}`
    ),

  getPrescription: (id: string) =>
    APIClient.get<SuccessResponse<Prescription>>(`/prescriptions/${id}`),

  createPrescription: (data: PrescriptionCreate) =>
    APIClient.post<SuccessResponse<Prescription>>('/prescriptions', data),

  updatePrescription: (id: string, data: PrescriptionUpdate) =>
    APIClient.put<SuccessResponse<Prescription>>(`/prescriptions/${id}`, data),

  discontinuePrescription: (id: string) =>
    APIClient.delete(`/prescriptions/${id}`),
};

/* ============================================================================
   NOTIFICATION API
   ============================================================================ */

export const notificationAPI = {
  listNotifications: (skip = 0, limit = 50) =>
    APIClient.get<PaginatedResponse<NotificationOut>>(
      `/notifications?skip=${skip}&limit=${limit}`
    ),

  markAsRead: (id: string) =>
    APIClient.post(`/notifications/${id}/read`, {}),

  deleteNotification: (id: string) =>
    APIClient.delete(`/notifications/${id}`),
};

/* ============================================================================
   MESSAGE API
   ============================================================================ */

export const messageAPI = {
  listConversations: (skip = 0, limit = 50) =>
    APIClient.get<PaginatedResponse<Conversation>>(
      `/messages?skip=${skip}&limit=${limit}`
    ),

  getConversation: (id: string) =>
    APIClient.get<SuccessResponse<Message[]>>(`/messages/${id}`),

  sendMessage: (data: MessageCreate) =>
    APIClient.post<SuccessResponse<Message>>('/messages', data),
};

/* ============================================================================
   EXPORT ALL TYPES FOR EXTERNAL USE
   ============================================================================ */

// All types are already exported individually above as interfaces
// Removed duplicate export type block to prevent TypeScript conflicts

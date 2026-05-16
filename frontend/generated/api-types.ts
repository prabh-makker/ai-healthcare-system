/**
 * Auto-generated TypeScript types from OpenAPI spec
 * Generated: 2026-05-16 12:22:18
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: { message: string; status_code: number } | null;
  timestamp: string;
}

export interface AppointmentCreate {
  specialist: string;
  date: string;
  time: string;
  reason?: any;
}

export interface AppointmentUpdate {
  specialist?: any;
  date?: any;
  time?: any;
  status?: any;
  reason?: any;
}

export interface Body_login_access_token_api_v1_auth_login_post {
  grant_type?: any;
  username: string;
  password: string;
  scope?: string;
  client_id?: any;
  client_secret?: any;
}

export interface BulkApprove {
  record_ids: string[];
  notes?: any;
  status?: any;
}

export interface BulkAssign {
  doctor_id: string;
  patient_ids: string[];
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface DiagnosisChatRequest {
  message: string;
  selected_symptoms?: string[];
  asked_symptoms?: string[];
  last_asked_symptom?: any;
  session_id?: any;
}

export interface DiagnosisChatResponse {
  assistant_message: string;
  updated_symptoms: string[];
  current_diagnosis: any;
  next_symptom_to_ask?: any;
  conversation_state: string;
  recognized_keywords?: string[];
}

export interface HTTPValidationError {
  detail?: any[];
}

export interface MedicationLogCreate {
  notes?: string;
}

export interface MessageCreate {
  receiver_id: string;
  content: string;
}

export interface NotificationOut {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: any;
  is_read: boolean;
  related_id: any;
  related_url: any;
  created_at: string;
}

export interface PatientProfileUpdate {
  date_of_birth?: any;
  blood_group?: any;
  chronic_conditions?: any;
  emergency_contact?: any;
}

export interface PredictionResponse {
  predicted_disease: string;
  confidence: number;
  recommended_specialist: string;
  recognized_symptoms: string[];
  unknown_symptoms: string[];
  record_id?: any;
}

export interface PrescriptionCreate {
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date?: any;
  end_date?: any;
}

export interface PrescriptionOut {
  id: string;
  patient_id: string;
  doctor_id: string;
  medication_name: string;
  dosage: any;
  frequency: any;
  instructions: any;
  start_date: string;
  end_date: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionUpdate {
  status?: any;
  end_date?: any;
  instructions?: any;
}

export interface RecordCreate {
  symptoms: string[];
  ai_prediction?: any;
  confidence_score?: any;
  recommended_specialist?: any;
}

export interface RecordPatch {
  doctor_notes?: any;
  status?: any;
}

export interface ReportRequest {
  report_text: string;
  save_record?: boolean;
}

export interface ReportResponse {
  summary: string;
  detected_conditions: string[];
  urgency: string;
  recommended_specialist: string;
  record_id?: any;
}

export interface SymptomRequest {
  symptoms: string[];
  save_record?: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  email: string;
  password: string;
  role?: string;
}

export interface UserOut {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface UserRole {
}

export interface UserRoleUpdate {
  role: any;
}

export interface UserStatusUpdate {
  is_active: boolean;
}

export interface ValidationError {
  loc: any[];
  msg: string;
  type: string;
  input?: any;
  ctx?: any;
}

export interface XrayRequest {
  image_base64: string;
  save_record?: boolean;
}

export interface XrayResponse {
  predicted_condition: string;
  confidence: number;
  severity: string;
  recommended_action: string;
  record_id?: any;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, role: string = 'PATIENT'): Promise<ApiResponse<UserOut>> {
    return this.request('POST', '/auth/register', { email, password, role });
  }

  async login(email: string, password: string): Promise<ApiResponse<Token>> {
    return this.request('POST', '/auth/login', { username: email, password });
  }

  async getCurrentUser(): Promise<ApiResponse<UserOut>> {
    return this.request('GET', '/auth/me');
  }

  // Diagnosis endpoints
  async analyzeSymptoms(symptoms: string[], saveRecord: boolean = false): Promise<ApiResponse<PredictionResponse>> {
    return this.request('POST', '/diagnosis/symptoms', { symptoms, save_record: saveRecord });
  }

  async diagnosisChat(message: string, selectedSymptoms: string[] = [], askedSymptoms: string[] = []): Promise<ApiResponse<DiagnosisChatResponse>> {
    return this.request('POST', '/diagnosis/chat', { message, selected_symptoms: selectedSymptoms, asked_symptoms: askedSymptoms });
  }

}
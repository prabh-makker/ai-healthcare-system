const REQUEST_TIMEOUT = 30000;

export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(path, {
      ...options,
      headers,
      credentials: "include", // send httpOnly cookie on every request
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error?.message || data.detail || "Your session has expired. Please login again.";
      throw new APIError(401, msg);
    }

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const msg = data.error?.message || data.detail || "Too many requests. Please try again later.";
      throw new APIError(429, msg);
    }

    if (res.status === 204) return null;

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errorMessage = data.error?.message || data.detail || `Request failed with status ${res.status}`;
      throw new APIError(res.status, errorMessage, data.error?.details);
    }

    return res.json();
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new APIError(0, "Request timeout. Please check your connection and try again.");
    }

    if (error instanceof TypeError) {
      throw new APIError(0, "Network error. Please check your connection.");
    }

    if (error instanceof APIError) throw error;

    throw new APIError(500, error instanceof Error ? error.message : "An unexpected error occurred");
  }
}

export const api = {
  // Auth
  login: (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);
    return request("/api/v1/auth/login", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },

  register: (email: string, password: string, role: string) =>
    request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, role: role.toUpperCase() }),
    }),

  getMe: () => request("/api/v1/auth/me"),

  logout: () => request("/api/v1/auth/logout", { method: "POST" }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),

  // Diagnosis
  analyzeSymptoms: (symptoms: string[], saveRecord: boolean = false) =>
    request("/api/v1/diagnosis/symptoms", {
      method: "POST",
      body: JSON.stringify({ symptoms, save_record: saveRecord }),
    }),

  analyzeXray: (imageBase64: string) =>
    request("/api/v1/diagnosis/xray", {
      method: "POST",
      body: JSON.stringify({ image_base64: imageBase64 }),
    }),

  analyzeReport: (reportText: string) =>
    request("/api/v1/diagnosis/report", {
      method: "POST",
      body: JSON.stringify({ report_text: reportText }),
    }),

  diagnosisChat: (
    message: string,
    selectedSymptoms: string[] = [],
    askedSymptoms: string[] = [],
    sessionId?: string,
    lastAskedSymptom?: string,
  ) =>
    request("/api/v1/diagnosis/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        selected_symptoms: selectedSymptoms,
        asked_symptoms: askedSymptoms,
        last_asked_symptom: lastAskedSymptom ?? null,
        session_id: sessionId,
      }),
    }),

  // Patients
  getMyProfile: () => request("/api/v1/patients/me"),

  updateMyProfile: (data: Record<string, unknown>) =>
    request("/api/v1/patients/me", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listPatients: (skip = 0, limit = 50) =>
    request(`/api/v1/patients/list?skip=${skip}&limit=${limit}`),

  // Admin
  getDoctorsOverview: () => request("/api/v1/patients/admin/doctors-overview"),

  getAllUsers: () => request("/api/v1/patients/admin/all-users"),

  setUserActive: (userId: string, isActive: boolean) =>
    request(`/api/v1/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    }),

  setUserRole: (userId: string, role: string) =>
    request(`/api/v1/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  deleteUser: (userId: string) =>
    request(`/api/v1/admin/users/${userId}`, { method: "DELETE" }),

  getAuditLog: (skip = 0, limit = 100) =>
    request(`/api/v1/admin/audit-log?skip=${skip}&limit=${limit}`),

  getDoctorPerformance: () => request("/api/v1/admin/doctor-performance"),

  bulkAssignPatients: (doctorId: string, patientIds: string[]) =>
    request("/api/v1/admin/bulk-assign-patients", {
      method: "POST",
      body: JSON.stringify({ doctor_id: doctorId, patient_ids: patientIds }),
    }),

  getSystemHealth: () => request("/api/v1/admin/system-health"),

  getDiagnosesDistribution: () =>
    request("/api/v1/admin/diagnoses-distribution"),

  exportUsersCSV: () => `/api/v1/admin/export/users`,
  exportRecordsCSV: () => `/api/v1/admin/export/records`,
  exportAppointmentsCSV: () => `/api/v1/admin/export/appointments`,

  // Records
  getRecords: (skip = 0, limit = 50) =>
    request(`/api/v1/records?skip=${skip}&limit=${limit}`),

  createRecord: (data: Record<string, unknown>) =>
    request("/api/v1/records/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getRecord: (id: string) => request(`/api/v1/records/${id}`),

  patchRecord: (id: string, data: { doctor_notes?: string; status?: string }) =>
    request(`/api/v1/records/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteRecord: (id: string) =>
    request(`/api/v1/records/${id}`, { method: "DELETE" }),

  getStats: () => request("/api/v1/records/stats/summary"),

  // Appointments
  getAppointments: (skip = 0, limit = 50) =>
    request(`/api/v1/appointments/?skip=${skip}&limit=${limit}`),

  createAppointment: (data: Record<string, unknown>) =>
    request("/api/v1/appointments/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateAppointment: (id: string, data: Record<string, unknown>) =>
    request(`/api/v1/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  cancelAppointment: (id: string) =>
    request(`/api/v1/appointments/${id}`, {
      method: "DELETE",
    }),

  // Bulk approve records
  bulkApproveRecords: (recordIds: string[], notes?: string, status: string = "approved") =>
    request("/api/v1/records/bulk-approve", {
      method: "POST",
      body: JSON.stringify({ record_ids: recordIds, notes, status }),
    }),

  getPendingRecords: (skip = 0, limit = 100) =>
    request(`/api/v1/records/pending/list?skip=${skip}&limit=${limit}`),

  // Prescriptions
  getPrescriptions: (skip = 0, limit = 50) =>
    request(`/api/v1/prescriptions/?skip=${skip}&limit=${limit}`),

  createPrescription: (data: Record<string, unknown>) =>
    request("/api/v1/prescriptions/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePrescription: (id: string, data: Record<string, unknown>) =>
    request(`/api/v1/prescriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deletePrescription: (id: string) =>
    request(`/api/v1/prescriptions/${id}`, { method: "DELETE" }),

  // Medication adherence
  logMedicationTaken: (prescriptionId: string, notes: string = "") =>
    request(`/api/v1/prescriptions/${prescriptionId}/log`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  getMedicationLogs: (prescriptionId: string) =>
    request(`/api/v1/prescriptions/${prescriptionId}/logs`),

  getAdherenceSummary: () => request("/api/v1/prescriptions/adherence/summary"),

  // Doctor's assigned patients
  getMyPatients: (skip = 0, limit = 50) =>
    request(`/api/v1/patients/my-patients?skip=${skip}&limit=${limit}`),

  assignPatientToDoctor: (patientId: string, doctorId: string) =>
    request(`/api/v1/patients/assign/${patientId}/${doctorId}`, {
      method: "POST",
    }),

  // Notifications
  getNotifications: (skip = 0, limit = 50, unreadOnly = false) =>
    request(`/api/v1/notifications/?skip=${skip}&limit=${limit}&unread_only=${unreadOnly}`),

  getUnreadCount: () => request("/api/v1/notifications/unread-count"),

  markNotificationRead: (id: string) =>
    request(`/api/v1/notifications/${id}/read`, { method: "PATCH" }),

  markAllNotificationsRead: () =>
    request("/api/v1/notifications/mark-all-read", { method: "PATCH" }),

  deleteNotification: (id: string) =>
    request(`/api/v1/notifications/${id}`, { method: "DELETE" }),

  // Messages
  sendMessage: (receiverId: string, content: string) =>
    request("/api/v1/messages/", {
      method: "POST",
      body: JSON.stringify({ receiver_id: receiverId, content }),
    }),

  getConversations: () => request("/api/v1/messages/conversations"),

  getConversation: (userId: string) =>
    request(`/api/v1/messages/${userId}`),
};

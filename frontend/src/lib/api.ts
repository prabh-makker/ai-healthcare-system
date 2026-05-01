const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const REQUEST_TIMEOUT = 30000; // 30 seconds

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
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  // Set up timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Handle 401 Unauthorized
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      const isLoginRequest = path.includes("/auth/login");
      if (!isLoginRequest && typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      throw new APIError(401, data.detail || "Your session has expired. Please login again.");
    }

    // Handle 429 Too Many Requests
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      throw new APIError(429, data.detail || "Too many requests. Please try again later.");
    }

    // Handle other error responses
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errorMessage = data.error?.message || data.detail || `Request failed with status ${res.status}`;
      throw new APIError(res.status, errorMessage, data.error?.details);
    }

    return res.json();
  } catch (error) {
    clearTimeout(timeout);

    // Handle network timeout
    if (error instanceof TypeError && error.name === "AbortError") {
      throw new APIError(0, "Request timeout. Please check your connection and try again.");
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new APIError(0, "Network error. Please check your connection.");
    }

    // Re-throw APIError
    if (error instanceof APIError) {
      throw error;
    }

    // Generic error handler
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

  // Diagnosis
  analyzeSymptoms: (symptoms: string[], saveRecord: boolean = false) =>
    request("/api/v1/diagnosis/symptoms", {
      method: "POST",
      body: JSON.stringify({ symptoms, save_record: saveRecord }),
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

  // Records
  getRecords: (skip = 0, limit = 50) =>
    request(`/api/v1/records/?skip=${skip}&limit=${limit}`),

  createRecord: (data: Record<string, unknown>) =>
    request("/api/v1/records/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getRecord: (id: string) => request(`/api/v1/records/${id}`),

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
};

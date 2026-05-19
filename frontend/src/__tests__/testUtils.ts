/**
 * Test utilities and helpers for AI Healthcare System frontend tests
 * Includes mock data, fixture generators, and testing helpers
 */

export interface MockUser {
  id: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  is_active: boolean;
  created_at: string;
  first_name?: string;
  last_name?: string;
}

export interface MockAppointment {
  id: string;
  patient_id: string;
  specialist: string;
  date: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
  reason?: string;
  created_at?: string;
  doctor_id?: string;
  first_name?: string;
  last_name?: string;
  patient_email?: string;
}

export interface MockAttendance {
  id: string;
  doctor_id: string;
  date: string;
  status: "present" | "absent" | "on_leave";
  notes?: string;
}

export interface MockLeaveApplication {
  id: string;
  doctor_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  comments?: string;
}

/**
 * Create mock patient user for testing
 */
export function createMockPatient(overrides?: Partial<MockUser>): MockUser {
  return {
    id: "patient-123",
    email: "patient@test.com",
    role: "PATIENT",
    is_active: true,
    created_at: new Date().toISOString(),
    first_name: "John",
    last_name: "Doe",
    ...overrides,
  };
}

/**
 * Create mock doctor user for testing
 */
export function createMockDoctor(overrides?: Partial<MockUser>): MockUser {
  return {
    id: "doctor-123",
    email: "doctor@test.com",
    role: "DOCTOR",
    is_active: true,
    created_at: new Date().toISOString(),
    first_name: "Jane",
    last_name: "Smith",
    ...overrides,
  };
}

/**
 * Create mock admin user for testing
 */
export function createMockAdmin(overrides?: Partial<MockUser>): MockUser {
  return {
    id: "admin-123",
    email: "admin@test.com",
    role: "ADMIN",
    is_active: true,
    created_at: new Date().toISOString(),
    first_name: "Admin",
    last_name: "User",
    ...overrides,
  };
}

/**
 * Create mock appointment for testing
 */
export function createMockAppointment(
  overrides?: Partial<MockAppointment>
): MockAppointment {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    id: "appt-123",
    patient_id: "patient-123",
    specialist: "General Physician",
    date: tomorrow.toISOString().split("T")[0],
    time: "10:00",
    status: "upcoming",
    reason: "General checkup",
    created_at: new Date().toISOString(),
    doctor_id: "doctor-123",
    first_name: "John",
    last_name: "Doe",
    patient_email: "patient@test.com",
    ...overrides,
  };
}

/**
 * Create multiple mock appointments for testing
 */
export function createMockAppointments(
  count: number,
  overrides?: Partial<MockAppointment>
): MockAppointment[] {
  const appointments: MockAppointment[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    appointments.push(
      createMockAppointment({
        id: `appt-${i + 1}`,
        date: date.toISOString().split("T")[0],
        ...overrides,
      })
    );
  }
  return appointments;
}

/**
 * Create mock attendance record for testing
 */
export function createMockAttendance(
  overrides?: Partial<MockAttendance>
): MockAttendance {
  return {
    id: "attend-123",
    doctor_id: "doctor-123",
    date: new Date().toISOString().split("T")[0],
    status: "present",
    notes: "Regular shift",
    ...overrides,
  };
}

/**
 * Create mock leave application for testing
 */
export function createMockLeaveApplication(
  overrides?: Partial<MockLeaveApplication>
): MockLeaveApplication {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 5);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3);

  return {
    id: "leave-123",
    doctor_id: "doctor-123",
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    reason: "Personal leave",
    status: "pending",
    ...overrides,
  };
}

/**
 * Helper to get date string in YYYY-MM-DD format
 */
export function getDateString(daysFromNow: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

/**
 * Helper to get time string in HH:MM format
 */
export function getTimeString(hours: number = 10, minutes: number = 0): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Mock API response wrapper
 */
export function createApiResponse<T>(data: T, status: number = 200): {
  data: T;
  status: number;
} {
  return { data, status };
}

/**
 * Mock API error response
 */
export function createApiError(
  message: string,
  status: number = 400
): { message: string; status: number } {
  return { message, status };
}

/**
 * Generate pagination test data
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number = 0,
  limit: number = 10
): { items: T[]; total: number; page: number; limit: number } {
  return {
    items: items.slice(page * limit, (page + 1) * limit),
    total: items.length,
    page,
    limit,
  };
}

/**
 * Helper to wait for async operations in tests
 */
export async function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Valid specialists for testing
 */
export const VALID_SPECIALISTS = [
  "General Physician",
  "Cardiologist",
  "Neurologist",
  "Dermatologist",
  "Pediatrician",
  "Endocrinologist",
  "Pulmonologist",
  "Orthopedist",
  "Psychiatrist",
  "Gastroenterologist",
  "Infectious Disease Specialist",
];

/**
 * Valid appointment status values
 */
export const VALID_STATUSES = ["upcoming", "completed", "cancelled"];

/**
 * Valid user roles
 */
export const USER_ROLES = ["PATIENT", "DOCTOR", "ADMIN"];

/**
 * Valid attendance statuses
 */
export const ATTENDANCE_STATUSES = ["present", "absent", "on_leave"];

/**
 * Valid leave statuses
 */
export const LEAVE_STATUSES = ["pending", "approved", "rejected"];

/**
 * Common test emails for different scenarios
 */
export const TEST_EMAILS = {
  patient: "patient@test.com",
  doctor: "doctor@test.com",
  admin: "admin@test.com",
  invalid: "invalid-email",
  duplicate: "duplicate@test.com",
};

/**
 * Common test passwords
 */
export const TEST_PASSWORDS = {
  valid: "Test@1234",
  strong: "MyP@ssw0rd",
  weak: "password",
  short: "Test@1",
};

/**
 * Mock time slots for appointments
 */
export const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

/**
 * Helper to create a range of dates
 */
export function getDateRange(startDaysFromNow: number, endDaysFromNow: number): string[] {
  const dates: string[] = [];
  for (let i = startDaysFromNow; i <= endDaysFromNow; i++) {
    dates.push(getDateString(i));
  }
  return dates;
}

/**
 * Mock doctor profile data
 */
export function createMockDoctorProfile(doctorId?: string) {
  return {
    user_id: doctorId || "doctor-123",
    specialization: "General Physician",
    license_number: "LICENSE123",
    years_of_experience: 5,
    availability_status: true,
  };
}

/**
 * Helper to validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper to validate password strength
 */
export function isStrongPassword(password: string): boolean {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);
  const isLongEnough = password.length >= 8;

  return hasUppercase && hasNumber && isLongEnough;
}

/**
 * Helper to generate random ID
 */
export function generateRandomId(prefix: string = "id"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create mock notification
 */
export function createMockNotification(overrides?: Record<string, any>) {
  return {
    id: "notif-123",
    type: "appointment",
    title: "Appointment Reminder",
    message: "Your appointment is tomorrow",
    read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Wait for element with specific text to appear
 */
export async function waitForText(text: string, timeout: number = 1000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (document.body.textContent?.includes(text)) {
      return true;
    }
    await waitForAsync(50);
  }
  return false;
}

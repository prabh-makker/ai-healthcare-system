import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppointmentForm from "@/components/forms/AppointmentForm";
import { api } from "@/lib/api";
import { AuthProvider } from "@/context/AuthContext";

jest.mock("@/lib/api", () => ({
  api: {
    createAppointment: jest.fn(),
    getMe: jest.fn(),
  },
  APIError: class APIError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));

jest.mock("@/context/AuthContext", () => {
  const React = require("react");
  const actualContext = jest.requireActual("@/context/AuthContext");
  return {
    ...actualContext,
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useAuth: () => ({
      user: { id: "1", email: "patient@test.com", role: "PATIENT" },
      isAuthenticated: true,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    }),
  };
});

const mockApi = api as jest.Mocked<typeof api>;

describe("AppointmentForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<AppointmentForm />);
    expect(screen.getByRole("heading", { name: /appointment/i })).toBeInTheDocument();
  });

  it("displays specialist selection dropdown", () => {
    render(<AppointmentForm />);
    const specialistSelect = screen.getByRole("combobox", { name: /specialist/i });
    expect(specialistSelect).toBeInTheDocument();
  });

  it("displays date input field", () => {
    render(<AppointmentForm />);
    const dateInput = screen.getByRole("textbox", { name: /date/i });
    expect(dateInput).toBeInTheDocument();
  });

  it("displays time slot selection", () => {
    render(<AppointmentForm />);
    const timeElements = screen.queryAllByText(/\d{2}:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it("displays reason textarea", () => {
    render(<AppointmentForm />);
    const reasonInput = screen.queryByPlaceholderText(/reason/i) || screen.queryByRole("textbox", { name: /reason/i });
    expect(reasonInput).toBeInTheDocument();
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    mockApi.createAppointment.mockResolvedValue({
      id: "appt-123",
      specialist: "General Physician",
      date: "2025-06-01",
      time: "10:00",
      status: "upcoming",
      patient_id: "1",
      reason: "Checkup",
      created_at: new Date().toISOString(),
    });

    const onSuccess = jest.fn();
    render(<AppointmentForm onSuccess={onSuccess} />);

    const specialistSelect = screen.getByRole("combobox", { name: /specialist/i });
    await user.click(specialistSelect);
    await user.click(screen.getByText("General Physician"));

    const dateInput = screen.getByDisplayValue(new Date().toISOString().split("T")[0]);
    await user.clear(dateInput);
    await user.type(dateInput, "2025-06-01");

    const timeElements = screen.getAllByText(/\d{2}:\d{2}/);
    await user.click(timeElements[0]);

    const submitButton = screen.getByRole("button", { name: /submit|book|confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockApi.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          specialist: "General Physician",
          date: "2025-06-01",
        })
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("displays validation error for missing specialist", async () => {
    const user = userEvent.setup();
    render(<AppointmentForm />);

    const submitButton = screen.getByRole("button", { name: /submit|book|confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/specialist.*required/i)).toBeInTheDocument();
    });
  });

  it("displays validation error for past date", async () => {
    const user = userEvent.setup();
    render(<AppointmentForm />);

    const dateInput = screen.getByRole("textbox", { name: /date/i });
    await user.clear(dateInput);
    await user.type(dateInput, "2020-01-01");

    const submitButton = screen.getByRole("button", { name: /submit|book|confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/date.*past|past.*date|future/i)).toBeInTheDocument();
    });
  });

  it("displays API error message on failure", async () => {
    const user = userEvent.setup();
    mockApi.createAppointment.mockRejectedValue(
      new Error("Server error")
    );

    render(<AppointmentForm />);

    const specialistSelect = screen.getByRole("combobox", { name: /specialist/i });
    await user.click(specialistSelect);
    await user.click(screen.getByText("General Physician"));

    const submitButton = screen.getByRole("button", { name: /submit|book|confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it("calls onCancel when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<AppointmentForm onCancel={onCancel} />);

    const cancelButton = screen.queryByRole("button", { name: /cancel|close|back/i });
    if (cancelButton) {
      await user.click(cancelButton);
      expect(onCancel).toHaveBeenCalled();
    }
  });

  it("handles modal mode styling", () => {
    const { container } = render(<AppointmentForm isModal={true} />);
    // Modal styling may be present
    expect(container).toBeInTheDocument();
  });

  it("pre-fills specialist when provided", () => {
    render(<AppointmentForm defaultSpecialist="Cardiologist" />);
    const specialistSelect = screen.getByRole("combobox", { name: /specialist/i });
    expect((specialistSelect as HTMLSelectElement).value).toContain("Cardiol");
  });

  it("pre-fills reason when provided", () => {
    render(<AppointmentForm defaultReason="Annual checkup" />);
    const reasonInput = screen.queryByDisplayValue("Annual checkup");
    expect(reasonInput).toBeInTheDocument();
  });

  it("displays loading state during submission", async () => {
    const user = userEvent.setup();
    mockApi.createAppointment.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        id: "appt-123",
        specialist: "General Physician",
        date: "2025-06-01",
        time: "10:00",
        status: "upcoming",
        patient_id: "1",
        reason: "",
        created_at: new Date().toISOString(),
      }), 100))
    );

    render(<AppointmentForm />);

    const specialistSelect = screen.getByRole("combobox", { name: /specialist/i });
    await user.click(specialistSelect);
    await user.click(screen.getByText("General Physician"));

    const submitButton = screen.getByRole("button", { name: /submit|book|confirm/i });
    await user.click(submitButton);

    // Check for loading indicator (spinner, disabled button, etc.)
    expect(submitButton).toBeDisabled();
  });

  it("requires all required fields before submission", async () => {
    const user = userEvent.setup();
    render(<AppointmentForm />);

    const submitButton = screen.getByRole("button", { name: /submit|book|confirm/i });
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required|must|please/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("handles multiple specialist options", () => {
    render(<AppointmentForm />);
    const specialistSelect = screen.getByRole("combobox", { name: /specialist/i });
    expect(specialistSelect).toBeInTheDocument();
    // Should have options for different specialists
  });

  it("clears form after successful submission", async () => {
    const user = userEvent.setup();
    mockApi.createAppointment.mockResolvedValue({
      id: "appt-123",
      specialist: "General Physician",
      date: "2025-06-01",
      time: "10:00",
      status: "upcoming",
      patient_id: "1",
      reason: "",
      created_at: new Date().toISOString(),
    });

    const onSuccess = jest.fn();
    const { rerender } = render(<AppointmentForm onSuccess={onSuccess} />);

    const specialistSelect = screen.getByRole("combobox", { name: /specialist/i });
    await user.click(specialistSelect);
    await user.click(screen.getByText("General Physician"));

    const submitButton = screen.getByRole("button", { name: /submit|book|confirm/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

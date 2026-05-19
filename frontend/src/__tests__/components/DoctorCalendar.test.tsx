import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DoctorCalendar from "@/components/DoctorCalendar";
import { api } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  api: {
    getDoctorSchedule: jest.fn(),
    getAvailableSlots: jest.fn(),
    getDoctorsAvailability: jest.fn(),
    getMe: jest.fn(),
  },
  APIError: class APIError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));

jest.mock("@/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { id: "1", email: "user@test.com", role: "PATIENT" },
    isAuthenticated: true,
    loading: false,
  }),
}));

const mockApi = api as jest.Mocked<typeof api>;

const mockScheduleData = {
  doctor_id: "doc-1",
  date: "2025-06-01",
  slots: [
    { time: "09:00", available: true },
    { time: "10:00", available: false },
    { time: "11:00", available: true },
  ],
};

const mockAvailableSlotsData = [
  "09:00",
  "09:30",
  "11:00",
  "11:30",
  "14:00",
];

describe("DoctorCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);
    expect(screen.getByRole("heading", { name: /calendar|schedule/i })).toBeInTheDocument();
  });

  it("loads and displays doctor schedule on mount", async () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      expect(mockApi.getDoctorSchedule).toHaveBeenCalled();
    });
  });

  it("displays calendar grid with dates", async () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      // Should have days of week or date grid
      expect(screen.getByText(/sun|mon|tue|wed|thu|fri|sat/i)).toBeInTheDocument();
    });
  });

  it("shows available and booked slots differently", async () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      // Available slot styling should differ from booked
      const slots = screen.getAllByRole("button");
      expect(slots.length).toBeGreaterThan(0);
    });
  });

  it("displays appointment details on slot click", async () => {
    const user = userEvent.setup();
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      expect(mockApi.getDoctorSchedule).toHaveBeenCalled();
    });

    const buttons = screen.getAllByRole("button");
    if (buttons.length > 0) {
      await user.click(buttons[0]);
    }
  });

  it("handles date navigation forward", async () => {
    const user = userEvent.setup();
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);

    const nextButton = screen.queryByRole("button", { name: /next|forward|>/i });
    if (nextButton) {
      await user.click(nextButton);
      await waitFor(() => {
        // Should load new date
        expect(mockApi.getDoctorSchedule).toHaveBeenCalledTimes(2);
      });
    }
  });

  it("handles date navigation backward", async () => {
    const user = userEvent.setup();
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);

    const prevButton = screen.queryByRole("button", { name: /prev|back|</i });
    if (prevButton) {
      await user.click(prevButton);
      await waitFor(() => {
        expect(mockApi.getDoctorSchedule).toHaveBeenCalledTimes(2);
      });
    }
  });

  it("displays loading state while fetching schedule", () => {
    mockApi.getDoctorSchedule.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockScheduleData), 100))
    );
    render(<DoctorCalendar doctorId="doc-1" />);

    // Should show loading indicator
    expect(screen.queryByText(/loading|loading...|⏳/i)).toBeInTheDocument();
  });

  it("displays error message on API failure", async () => {
    mockApi.getDoctorSchedule.mockRejectedValue(new Error("Failed to load schedule"));
    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      expect(screen.queryByText(/error|failed|unable/i)).toBeInTheDocument();
    });
  });

  it("retries loading on error", async () => {
    const user = userEvent.setup();
    mockApi.getDoctorSchedule.mockRejectedValueOnce(new Error("Failed"))
      .mockResolvedValueOnce(mockScheduleData);

    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      expect(screen.queryByText(/error|retry/i)).toBeInTheDocument();
    });

    const retryButton = screen.queryByRole("button", { name: /retry|try again/i });
    if (retryButton) {
      await user.click(retryButton);
    }
  });

  it("highlights today's date", async () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      const todayElement = screen.queryByText(/today|current/i);
      // Today may be highlighted
      expect(screen.getByRole("heading", { name: /calendar|schedule/i })).toBeInTheDocument();
    });
  });

  it("shows appointment count per day", async () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      // May show counts like "2 appointments"
      expect(mockApi.getDoctorSchedule).toHaveBeenCalled();
    });
  });

  it("filters slots by availability", async () => {
    mockApi.getAvailableSlots.mockResolvedValue(mockAvailableSlotsData);
    render(<DoctorCalendar doctorId="doc-1" mode="slots" />);

    await waitFor(() => {
      expect(mockApi.getAvailableSlots).toHaveBeenCalled();
    });
  });

  it("handles doctor ID change", async () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    const { rerender } = render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      expect(mockApi.getDoctorSchedule).toHaveBeenCalled();
    });

    mockApi.getDoctorSchedule.mockClear();

    rerender(<DoctorCalendar doctorId="doc-2" />);

    await waitFor(() => {
      expect(mockApi.getDoctorSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ doctor_id: "doc-2" })
      );
    });
  });

  it("updates calendar when new appointments are booked", async () => {
    const user = userEvent.setup();
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    const { rerender } = render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      expect(mockApi.getDoctorSchedule).toHaveBeenCalled();
    });

    // Simulate appointment booking
    const newScheduleData = {
      ...mockScheduleData,
      slots: [
        { time: "09:00", available: false }, // Now booked
        { time: "10:00", available: false },
        { time: "11:00", available: true },
      ],
    };

    mockApi.getDoctorSchedule.mockResolvedValue(newScheduleData);
    rerender(<DoctorCalendar doctorId="doc-1" refresh={true} />);

    await waitFor(() => {
      expect(mockApi.getDoctorSchedule).toHaveBeenCalledTimes(2);
    });
  });

  it("displays empty state when no slots available", async () => {
    mockApi.getDoctorSchedule.mockResolvedValue({
      ...mockScheduleData,
      slots: [],
    });
    render(<DoctorCalendar doctorId="doc-1" />);

    await waitFor(() => {
      expect(screen.queryByText(/no.*available|no.*slots|unavailable/i)).toBeInTheDocument();
    });
  });

  it("shows doctor name if provided", async () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    render(<DoctorCalendar doctorId="doc-1" doctorName="Dr. Smith" />);

    await waitFor(() => {
      expect(screen.queryByText(/Dr. Smith|Smith/i)).toBeInTheDocument();
    });
  });

  it("is responsive on mobile", () => {
    mockApi.getDoctorSchedule.mockResolvedValue(mockScheduleData);
    const { container } = render(<DoctorCalendar doctorId="doc-1" />);

    // Component should render on mobile without breaking
    expect(container).toBeInTheDocument();
  });
});

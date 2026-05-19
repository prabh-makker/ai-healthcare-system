import React from "react";
import { render, screen } from "@testing-library/react";
import { useAuth } from "@/context/AuthContext";

jest.mock("@/context/AuthContext");

// Mock component that requires ADMIN role
const AdminOnly = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth() as any;
  return user?.role === "ADMIN" ? <div data-testid="admin-content">{children}</div> : null;
};

// Mock component that requires DOCTOR role
const DoctorOnly = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth() as any;
  return user?.role === "DOCTOR" ? <div data-testid="doctor-content">{children}</div> : null;
};

// Mock component that requires PATIENT role
const PatientOnly = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth() as any;
  return user?.role === "PATIENT" ? <div data-testid="patient-content">{children}</div> : null;
};

// Mock component that requires any authenticated user
const AuthenticatedOnly = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth() as any;
  return isAuthenticated ? <div data-testid="auth-content">{children}</div> : null;
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("Role-based Component Visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Admin Role", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: "1", email: "admin@test.com", role: "ADMIN" },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      } as any);
    });

    it("AdminOnly component shows content for ADMIN", () => {
      render(
        <AdminOnly>
          <span>Admin Panel</span>
        </AdminOnly>
      );
      expect(screen.getByTestId("admin-content")).toBeInTheDocument();
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    it("DoctorOnly component hides content for ADMIN", () => {
      render(
        <DoctorOnly>
          <span>Doctor Panel</span>
        </DoctorOnly>
      );
      expect(screen.queryByTestId("doctor-content")).not.toBeInTheDocument();
    });

    it("PatientOnly component hides content for ADMIN", () => {
      render(
        <PatientOnly>
          <span>Patient Panel</span>
        </PatientOnly>
      );
      expect(screen.queryByTestId("patient-content")).not.toBeInTheDocument();
    });

    it("AuthenticatedOnly component shows content for ADMIN", () => {
      render(
        <AuthenticatedOnly>
          <span>Authenticated Content</span>
        </AuthenticatedOnly>
      );
      expect(screen.getByTestId("auth-content")).toBeInTheDocument();
    });
  });

  describe("Doctor Role", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: "2", email: "doctor@test.com", role: "DOCTOR" },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      } as any);
    });

    it("AdminOnly component hides content for DOCTOR", () => {
      render(
        <AdminOnly>
          <span>Admin Panel</span>
        </AdminOnly>
      );
      expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    });

    it("DoctorOnly component shows content for DOCTOR", () => {
      render(
        <DoctorOnly>
          <span>Doctor Panel</span>
        </DoctorOnly>
      );
      expect(screen.getByTestId("doctor-content")).toBeInTheDocument();
      expect(screen.getByText("Doctor Panel")).toBeInTheDocument();
    });

    it("PatientOnly component hides content for DOCTOR", () => {
      render(
        <PatientOnly>
          <span>Patient Panel</span>
        </PatientOnly>
      );
      expect(screen.queryByTestId("patient-content")).not.toBeInTheDocument();
    });

    it("AuthenticatedOnly component shows content for DOCTOR", () => {
      render(
        <AuthenticatedOnly>
          <span>Authenticated Content</span>
        </AuthenticatedOnly>
      );
      expect(screen.getByTestId("auth-content")).toBeInTheDocument();
    });
  });

  describe("Patient Role", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: "3", email: "patient@test.com", role: "PATIENT" },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      } as any);
    });

    it("AdminOnly component hides content for PATIENT", () => {
      render(
        <AdminOnly>
          <span>Admin Panel</span>
        </AdminOnly>
      );
      expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    });

    it("DoctorOnly component hides content for PATIENT", () => {
      render(
        <DoctorOnly>
          <span>Doctor Panel</span>
        </DoctorOnly>
      );
      expect(screen.queryByTestId("doctor-content")).not.toBeInTheDocument();
    });

    it("PatientOnly component shows content for PATIENT", () => {
      render(
        <PatientOnly>
          <span>Patient Panel</span>
        </PatientOnly>
      );
      expect(screen.getByTestId("patient-content")).toBeInTheDocument();
      expect(screen.getByText("Patient Panel")).toBeInTheDocument();
    });

    it("AuthenticatedOnly component shows content for PATIENT", () => {
      render(
        <AuthenticatedOnly>
          <span>Authenticated Content</span>
        </AuthenticatedOnly>
      );
      expect(screen.getByTestId("auth-content")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      } as any);
    });

    it("AdminOnly hides content when unauthenticated", () => {
      render(
        <AdminOnly>
          <span>Admin Panel</span>
        </AdminOnly>
      );
      expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    });

    it("AuthenticatedOnly hides content when unauthenticated", () => {
      render(
        <AuthenticatedOnly>
          <span>Authenticated Content</span>
        </AuthenticatedOnly>
      );
      expect(screen.queryByTestId("auth-content")).not.toBeInTheDocument();
    });
  });

  describe("Multiple Role-based Elements", () => {
    it("shows correct content for multiple role-based components together", () => {
      mockUseAuth.mockReturnValue({
        user: { id: "2", email: "doctor@test.com", role: "DOCTOR" },
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      } as any);

      render(
        <div>
          <AdminOnly>
            <span>Admin Only</span>
          </AdminOnly>
          <DoctorOnly>
            <span>Doctor Only</span>
          </DoctorOnly>
          <PatientOnly>
            <span>Patient Only</span>
          </PatientOnly>
          <AuthenticatedOnly>
            <span>Authenticated Only</span>
          </AuthenticatedOnly>
        </div>
      );

      // Doctor should see Doctor and Authenticated components
      expect(screen.getByText("Doctor Only")).toBeInTheDocument();
      expect(screen.getByText("Authenticated Only")).toBeInTheDocument();

      // Doctor should NOT see Admin and Patient components
      expect(screen.queryByText("Admin Only")).not.toBeInTheDocument();
      expect(screen.queryByText("Patient Only")).not.toBeInTheDocument();
    });
  });
});

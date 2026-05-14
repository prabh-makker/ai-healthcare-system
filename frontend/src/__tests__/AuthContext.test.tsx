import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { api, APIError } from "@/lib/api";

jest.mock("@/lib/api", () => ({
  api: {
    getMe: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
  APIError: class APIError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

function TestConsumer() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <span data-testid="role">{user?.role ?? "none"}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => jest.clearAllMocks());

  it("starts loading then resolves unauthenticated when getMe fails", async () => {
    mockApi.getMe.mockRejectedValue(new Error("401"));
    renderWithAuth();
    expect(screen.getByTestId("loading").textContent).toBe("true");
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("email").textContent).toBe("none");
  });

  it("resolves authenticated when getMe succeeds", async () => {
    mockApi.getMe.mockResolvedValue({ id: "1", email: "doc@test.com", role: "DOCTOR", is_active: true, created_at: "" });
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("email").textContent).toBe("doc@test.com");
    expect(screen.getByTestId("role").textContent).toBe("DOCTOR");
  });

  it("logout clears user state and calls api.logout", async () => {
    mockApi.getMe.mockResolvedValue({ id: "1", email: "u@test.com", role: "PATIENT", is_active: true, created_at: "" });
    mockApi.logout.mockResolvedValue(null);
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId("authenticated").textContent).toBe("true"));

    await act(async () => {
      await userEvent.click(screen.getByText("Logout"));
    });

    expect(mockApi.logout).toHaveBeenCalled();
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("email").textContent).toBe("none");
  });

  it("logout still clears state even if api.logout throws", async () => {
    mockApi.getMe.mockResolvedValue({ id: "1", email: "u@test.com", role: "PATIENT", is_active: true, created_at: "" });
    mockApi.logout.mockRejectedValue(new Error("network"));
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId("authenticated").textContent).toBe("true"));

    await act(async () => {
      await userEvent.click(screen.getByText("Logout"));
    });

    expect(screen.getByTestId("authenticated").textContent).toBe("false");
  });
});

import { api, APIError } from "@/lib/api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function mockResponse(status: number, body: unknown, ok = status < 400) {
  mockFetch.mockResolvedValueOnce({
    status,
    ok,
    json: async () => body,
    cookies: {},
  });
}

describe("api.login", () => {
  it("sends form-urlencoded and returns token", async () => {
    mockResponse(200, { access_token: "tok123", token_type: "bearer" });
    const result = await api.login("user@test.com", "Pass@123");
    expect(result.access_token).toBe("tok123");
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.credentials).toBe("include");
  });

  it("throws APIError on 401", async () => {
    mockResponse(401, { detail: "Incorrect email or password" }, false);
    await expect(api.login("bad@test.com", "wrong")).rejects.toBeInstanceOf(APIError);
  });

  it("throws APIError on 429", async () => {
    mockResponse(429, { detail: "Too many requests" }, false);
    await expect(api.login("x@test.com", "Pass@1")).rejects.toMatchObject({
      status: 429,
    });
  });
});

describe("api.getMe", () => {
  it("sends credentials include", async () => {
    mockResponse(200, { id: "1", email: "x@x.com", role: "PATIENT" });
    await api.getMe();
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.credentials).toBe("include");
  });
});

describe("api.logout", () => {
  it("calls POST /api/v1/auth/logout", async () => {
    mockFetch.mockResolvedValueOnce({ status: 204, ok: true, json: async () => null });
    await api.logout();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/auth/logout");
    expect(opts.method).toBe("POST");
  });
});

describe("api.analyzeSymptoms", () => {
  it("posts symptoms array", async () => {
    mockResponse(200, { predicted_disease: "Flu", confidence: 90, recommended_specialist: "GP", recognized_symptoms: ["fever"], unknown_symptoms: [] });
    const result = await api.analyzeSymptoms(["fever"]);
    expect(result.predicted_disease).toBe("Flu");
    const [, opts] = mockFetch.mock.calls[0];
    expect(JSON.parse(opts.body as string).symptoms).toEqual(["fever"]);
  });
});

describe("api.createAppointment", () => {
  it("posts to /appointments/ and returns created appointment", async () => {
    const appt = { id: "abc", specialist: "GP", date: "2026-06-01", time: "9 AM", status: "upcoming" };
    mockResponse(201, appt);
    const result = await api.createAppointment({ specialist: "GP", date: "2026-06-01", time: "9 AM" });
    expect(result.specialist).toBe("GP");
  });
});

describe("APIError", () => {
  it("is instanceof Error", () => {
    const err = new APIError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
  });
});

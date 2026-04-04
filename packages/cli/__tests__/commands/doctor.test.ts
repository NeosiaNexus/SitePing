// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doctorCommand } from "../../src/commands/doctor.js";
import { p } from "../../src/prompts.js";

// ---------------------------------------------------------------------------
// ExitError — thrown by mocked process.exit to halt execution cleanly
// ---------------------------------------------------------------------------

class ExitError extends Error {
  code: number;
  constructor(code: number) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

function mockFetchOk(body: unknown): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function mockFetchOkNonJson(): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.reject(new SyntaxError("Unexpected token")),
    text: () => Promise.resolve("not json"),
  });
}

function mockFetchHttpError(status: number, statusText: string, body?: string): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(body ?? ""),
  });
}

function mockFetchHttpErrorTextRejects(status: number, statusText: string): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    text: () => Promise.reject(new Error("stream error")),
  });
}

function allMessages(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call) => String(call[0]));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("doctorCommand", () => {
  const spinnerMock = { start: vi.fn(), stop: vi.fn(), message: vi.fn() };

  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new ExitError(code ?? 0);
    }) as never);
    vi.spyOn(p, "intro").mockImplementation(() => {});
    vi.spyOn(p, "outro").mockImplementation(() => {});
    vi.spyOn(p, "cancel").mockImplementation(() => {});
    vi.spyOn(p, "text").mockResolvedValue("http://localhost:3000");
    vi.spyOn(p, "isCancel").mockImplementation((v: unknown) => typeof v === "symbol");
    vi.spyOn(p, "spinner").mockReturnValue(spinnerMock);
    vi.spyOn(p.log, "error").mockImplementation(() => {});
    vi.spyOn(p.log, "success").mockImplementation(() => {});
    vi.spyOn(p.log, "warn").mockImplementation(() => {});
    vi.spyOn(p.log, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    spinnerMock.start.mockClear();
    spinnerMock.stop.mockClear();
    spinnerMock.message.mockClear();
  });

  // -------------------------------------------------------------------------
  // Success paths
  // -------------------------------------------------------------------------

  describe("fetch success", () => {
    it("shows success message when response has data.total", async () => {
      vi.stubGlobal("fetch", mockFetchOk({ total: 5, feedbacks: [] }));

      await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" });

      expect(p.intro).toHaveBeenCalledWith("siteping — Network diagnostics");
      expect(spinnerMock.start).toHaveBeenCalledWith("Testing connection to http://localhost:3000/api/siteping");
      expect(spinnerMock.stop).toHaveBeenCalledWith(expect.stringContaining("Connection successful"));
      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining("5 feedback(s) found"));
      expect(p.outro).toHaveBeenCalledWith("Diagnostics complete");
    });

    it("shows warning when response has no data.total", async () => {
      vi.stubGlobal("fetch", mockFetchOk({ something: "else" }));

      await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" });

      expect(spinnerMock.stop).toHaveBeenCalledWith(expect.stringContaining("Connection successful"));
      expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Unexpected response"));
    });

    it("shows warning when response is non-JSON", async () => {
      vi.stubGlobal("fetch", mockFetchOkNonJson());

      await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" });

      expect(spinnerMock.stop).toHaveBeenCalledWith(expect.stringContaining("Connection successful"));
      expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Unexpected response"));
    });
  });

  // -------------------------------------------------------------------------
  // HTTP error paths
  // -------------------------------------------------------------------------

  describe("HTTP errors", () => {
    it("shows error + body text for HTTP error with body", async () => {
      vi.stubGlobal("fetch", mockFetchHttpError(500, "Internal Server Error", "Something went wrong on the server"));

      const err = await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" }).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(spinnerMock.stop).toHaveBeenCalledWith(expect.stringContaining("HTTP error 500"));
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("500 Internal Server Error"));
      expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining("Something went wrong"));
    });

    it("shows error only for HTTP error with empty body", async () => {
      vi.stubGlobal("fetch", mockFetchHttpError(404, "Not Found", ""));

      const err = await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" }).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(spinnerMock.stop).toHaveBeenCalledWith(expect.stringContaining("HTTP error 404"));
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("404 Not Found"));
      expect(allMessages(vi.mocked(p.log.info))).toHaveLength(0);
    });

    it("shows error when text() rejects", async () => {
      vi.stubGlobal("fetch", mockFetchHttpErrorTextRejects(502, "Bad Gateway"));

      const err = await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" }).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(spinnerMock.stop).toHaveBeenCalledWith(expect.stringContaining("HTTP error 502"));
      expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("502 Bad Gateway"));
      expect(allMessages(vi.mocked(p.log.info))).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Network / catch errors
  // -------------------------------------------------------------------------

  describe("network errors", () => {
    it("shows timeout message for DOMException TimeoutError", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Signal timed out.", "TimeoutError")));

      const err = await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" }).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(spinnerMock.stop).toHaveBeenCalledWith("Connection failed");
      expect(p.log.error).toHaveBeenCalledWith("Request timed out after 10 seconds");
    });

    it("shows connectivity message for TypeError containing 'fetch'", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

      const err = await doctorCommand({ url: "http://localhost:9999", endpoint: "/api/siteping" }).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(spinnerMock.stop).toHaveBeenCalledWith("Connection failed");
      expect(p.log.error).toHaveBeenCalledWith("Unable to connect — is the server running?");
      expect(p.log.info).toHaveBeenCalledWith("Check that http://localhost:9999 is reachable");
    });

    it("shows generic error message for Error instances", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

      const err = await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" }).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(spinnerMock.stop).toHaveBeenCalledWith("Connection failed");
      expect(p.log.error).toHaveBeenCalledWith("Error: ECONNREFUSED");
    });

    it("uses String() for non-Error values in catch", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue("raw string error"));

      const err = await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" }).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(spinnerMock.stop).toHaveBeenCalledWith("Connection failed");
      expect(p.log.error).toHaveBeenCalledWith("Error: raw string error");
    });
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  describe("URL validation", () => {
    it("exits(1) for invalid URL without http(s) prefix", async () => {
      const err = await doctorCommand({ url: "ftp://example.com", endpoint: "/api/siteping" }).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(1);
      expect(p.log.error).toHaveBeenCalledWith("URL must start with http:// or https://");
    });
  });

  // -------------------------------------------------------------------------
  // Interactive (cancel handling)
  // -------------------------------------------------------------------------

  describe("interactive prompts", () => {
    it("exits(0) when URL prompt is cancelled", async () => {
      vi.mocked(p.text).mockResolvedValueOnce(Symbol("cancel") as any);

      const err = await doctorCommand({}).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(0);
      expect(p.cancel).toHaveBeenCalledWith("Cancelled.");
    });

    it("exits(0) when endpoint prompt is cancelled", async () => {
      vi.mocked(p.text)
        .mockResolvedValueOnce("http://localhost:3000")
        .mockResolvedValueOnce(Symbol("cancel") as any);

      const err = await doctorCommand({}).catch((e) => e);

      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(0);
      expect(p.cancel).toHaveBeenCalledWith("Cancelled.");
    });
  });

  // -------------------------------------------------------------------------
  // URL construction
  // -------------------------------------------------------------------------

  describe("URL construction", () => {
    it("builds correct URL with encoded project name", async () => {
      const fetchFn = mockFetchOk({ total: 0 });
      vi.stubGlobal("fetch", fetchFn);

      await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" });

      const calledUrl = fetchFn.mock.calls[0][0];
      expect(calledUrl).toBe("http://localhost:3000/api/siteping?projectName=__siteping_health_check__");
    });
  });

  // -------------------------------------------------------------------------
  // Options bypass prompts
  // -------------------------------------------------------------------------

  describe("options", () => {
    it("uses provided options without prompting", async () => {
      vi.stubGlobal("fetch", mockFetchOk({ total: 0 }));

      await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" });

      expect(p.text).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Spinner messages
  // -------------------------------------------------------------------------

  describe("spinner", () => {
    it("starts and stops spinner with correct messages on success", async () => {
      vi.stubGlobal("fetch", mockFetchOk({ total: 3 }));

      await doctorCommand({ url: "https://example.com", endpoint: "/api/sp" });

      expect(spinnerMock.start).toHaveBeenCalledWith("Testing connection to https://example.com/api/sp");
      expect(spinnerMock.stop).toHaveBeenCalledWith(expect.stringMatching(/Connection successful \(\d+ms\)/));
    });

    it("stops spinner with 'Connection failed' on network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));

      await doctorCommand({ url: "http://localhost:3000", endpoint: "/api/siteping" }).catch(() => {});

      expect(spinnerMock.stop).toHaveBeenCalledWith("Connection failed");
    });
  });
});

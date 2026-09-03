import { describe, expect, it } from "vitest";
import {
  feedbackCreateSchema,
  feedbackPatchSchema,
  formatValidationErrors,
  getQuerySchema,
} from "../src/validation.js";
import { validAnnotation, validPayload } from "./fixtures.js";

describe("feedbackCreateSchema", () => {
  it("accepts a valid payload", () => {
    const result = feedbackCreateSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts payload without annotations", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectName", () => {
    const { projectName, ...rest } = validPayload;
    const result = feedbackCreateSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty message", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message over 5000 chars", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      message: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      authorEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty url", () => {
    // Hosts override `getPageScope()` to return any string identifier
    // (pathname, full URL, opaque slug, …); we only require non-empty.
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      url: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only url (trimmed to empty)", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      url: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("accepts pathname url (default getPageScope output)", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      url: "/orders/42",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative annotation rect dimensions", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...validAnnotation,
          rect: { xPct: 0.1, yPct: 0.2, wPct: -0.5, hPct: 0.3 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("validates all four feedback types", () => {
    for (const type of ["question", "change", "bug", "other"]) {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects annotation missing fingerprint", () => {
    const { fingerprint, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects annotation missing textPrefix", () => {
    const { textPrefix, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects annotation missing textSnippet", () => {
    const { textSnippet, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects annotation missing textSuffix", () => {
    const { textSuffix, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects annotation missing neighborText", () => {
    const { neighborText, ...anchorWithout } = validAnnotation.anchor;
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [{ ...validAnnotation, anchor: anchorWithout }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty strings for text context fields", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...validAnnotation,
          anchor: {
            ...validAnnotation.anchor,
            textSnippet: "",
            textPrefix: "",
            textSuffix: "",
            fingerprint: "",
            neighborText: "",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  describe("screenshotRegion", () => {
    const validRegion = { xPct: 0.25, yPct: 0.4, wPct: 0.3, hPct: 0.1 };

    it("accepts a valid region", () => {
      const result = feedbackCreateSchema.safeParse({ ...validPayload, screenshotRegion: validRegion });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.screenshotRegion).toEqual(validRegion);
      }
    });

    it("accepts null and omitted (legacy clients)", () => {
      expect(feedbackCreateSchema.safeParse({ ...validPayload, screenshotRegion: null }).success).toBe(true);
      expect(feedbackCreateSchema.safeParse(validPayload).success).toBe(true);
    });

    it("accepts boundary fractions 0 and 1", () => {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        screenshotRegion: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
      });
      expect(result.success).toBe(true);
    });

    it("rejects fractions outside [0, 1]", () => {
      for (const bad of [
        { ...validRegion, xPct: -0.1 },
        { ...validRegion, yPct: 1.5 },
        { ...validRegion, wPct: 2 },
        { ...validRegion, hPct: -1 },
      ]) {
        expect(feedbackCreateSchema.safeParse({ ...validPayload, screenshotRegion: bad }).success).toBe(false);
      }
    });

    it("rejects a region missing a dimension", () => {
      const { hPct, ...partial } = validRegion;
      const result = feedbackCreateSchema.safeParse({ ...validPayload, screenshotRegion: partial });
      expect(result.success).toBe(false);
    });

    it("rejects unknown keys (strict — persisted verbatim to a JSON column)", () => {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        screenshotRegion: { ...validRegion, injected: "junk" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-object values", () => {
      expect(feedbackCreateSchema.safeParse({ ...validPayload, screenshotRegion: "0.1,0.2" }).success).toBe(false);
    });
  });

  // clientId is forwarded to `screenshotStorage.upload({ feedbackId })` and
  // becomes part of an S3 key prefix or local FS path. Anything outside the
  // alphanumeric + `_`/`-` alphabet must be rejected at the schema boundary.
  describe("clientId sanitization (path traversal hardening)", () => {
    it("rejects clientId with path traversal '../'", () => {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        clientId: "../../../tmp/owned",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatValidationErrors(result.error);
        expect(errors.some((e) => e.field === "clientId")).toBe(true);
      }
    });

    it("rejects clientId with forward slash", () => {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        clientId: "foo/bar",
      });
      expect(result.success).toBe(false);
    });

    it("rejects clientId with backslash", () => {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        clientId: "foo\\bar",
      });
      expect(result.success).toBe(false);
    });

    it("rejects clientId with NUL byte", () => {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        clientId: "foo bar",
      });
      expect(result.success).toBe(false);
    });

    it("rejects clientId with special chars (whitespace, dot, colon)", () => {
      for (const bad of ["foo bar", "foo.bar", "foo:bar", "foo@bar"]) {
        const result = feedbackCreateSchema.safeParse({ ...validPayload, clientId: bad });
        expect(result.success).toBe(false);
      }
    });

    it("accepts UUID-style clientId (matches crypto.randomUUID output)", () => {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        clientId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      });
      expect(result.success).toBe(true);
    });

    it("accepts the widget's randomUUID fallback shape (Date+base36)", () => {
      const result = feedbackCreateSchema.safeParse({
        ...validPayload,
        clientId: "1715698800000-abc123xyz",
      });
      expect(result.success).toBe(true);
    });

    it("accepts plain alphanumeric", () => {
      const result = feedbackCreateSchema.safeParse({ ...validPayload, clientId: "abc123XYZ_test-id" });
      expect(result.success).toBe(true);
    });
  });
});

describe("feedbackPatchSchema", () => {
  it("accepts valid resolve", () => {
    const result = feedbackPatchSchema.safeParse({
      id: "abc123",
      projectName: "test-project",
      status: "resolved",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid unresolve", () => {
    const result = feedbackPatchSchema.safeParse({
      id: "abc123",
      projectName: "test-project",
      status: "open",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all four statuses", () => {
    for (const status of ["open", "in_progress", "resolved", "wont_fix"]) {
      const result = feedbackPatchSchema.safeParse({
        id: "abc123",
        projectName: "test-project",
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = feedbackPatchSchema.safeParse({
      id: "abc123",
      status: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = feedbackPatchSchema.safeParse({ status: "resolved" });
    expect(result.success).toBe(false);
  });
});

describe("getQuerySchema", () => {
  it("accepts all four statuses as filters", () => {
    for (const status of ["open", "in_progress", "resolved", "wont_fix"]) {
      const result = getQuerySchema.safeParse({ projectName: "test-project", status });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(status);
      }
    }
  });

  it("rejects an unknown status filter", () => {
    const result = getQuerySchema.safeParse({ projectName: "test-project", status: "closed" });
    expect(result.success).toBe(false);
  });

  it("parses a statuses CSV bucket into an array", () => {
    const result = getQuerySchema.safeParse({ projectName: "test-project", statuses: "open,in_progress" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.statuses).toEqual(["open", "in_progress"]);
    }
  });

  it("accepts a single-value statuses CSV", () => {
    const result = getQuerySchema.safeParse({ projectName: "test-project", statuses: "resolved" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.statuses).toEqual(["resolved"]);
    }
  });

  it("rejects a statuses CSV containing an unknown value", () => {
    const result = getQuerySchema.safeParse({ projectName: "test-project", statuses: "open,bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects a statuses CSV with more than 4 values", () => {
    const result = getQuerySchema.safeParse({
      projectName: "test-project",
      statuses: "open,in_progress,resolved,wont_fix,open",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty statuses string", () => {
    const result = getQuerySchema.safeParse({ projectName: "test-project", statuses: "" });
    expect(result.success).toBe(false);
  });

  it("leaves statuses undefined when the param is absent", () => {
    const result = getQuerySchema.safeParse({ projectName: "test-project" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.statuses).toBeUndefined();
    }
  });
});

describe("formatValidationErrors", () => {
  it("formats errors as field + message pairs", () => {
    const result = feedbackCreateSchema.safeParse({ type: "invalid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty("field");
      expect(errors[0]).toHaveProperty("message");
    }
  });

  it("joins multi-segment paths with dots and surfaces messages verbatim", () => {
    // Annotation rect violation produces a multi-segment path
    // (`annotations.0.rect.wPct`). The mapper must dot-join the segments
    // to produce a stable field name and pass the message through unchanged.
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      annotations: [
        {
          ...validAnnotation,
          rect: { xPct: 0.1, yPct: 0.2, wPct: -0.5, hPct: 0.3 },
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = formatValidationErrors(result.error);
      const wPctError = errors.find((e) => e.field.includes("wPct"));
      expect(wPctError?.field).toBe("annotations.0.rect.wPct");
      expect(typeof wPctError?.message).toBe("string");
      expect(wPctError?.message.length).toBeGreaterThan(0);
    }
  });

  it("returns an empty array when the ZodError has no issues", () => {
    // Construct a minimal ZodError-like object — formatValidationErrors only
    // reads .issues and maps over them. An empty .issues array exercises the
    // map-over-empty branch without any side effects.
    const result = formatValidationErrors({ issues: [] } as unknown as Parameters<typeof formatValidationErrors>[0]);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// authorEmail — one pattern shared with the widget's identity modal
// ---------------------------------------------------------------------------

describe("feedbackCreateSchema — authorEmail", () => {
  it.each(["françois@exemple.fr", "user@münchen.de", "user+tag@example.co.uk", "o'brien@example.ie"])(
    "accepts %s (what the identity modal accepts, the server accepts)",
    (authorEmail) => {
      expect(feedbackCreateSchema.safeParse({ ...validPayload, authorEmail }).success).toBe(true);
    },
  );

  it.each(["not-email", "a@b.c", "user@exa_mple.com", ".lead@example.com", "john doe@example.com"])(
    "rejects %s",
    (authorEmail) => {
      const result = feedbackCreateSchema.safeParse({ ...validPayload, authorEmail });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(formatValidationErrors(result.error).map((i) => i.field)).toContain("authorEmail");
      }
    },
  );
});

import { describe, expect, it } from "vitest";
import { feedbackCreateSchema, feedbackPatchSchema, formatValidationErrors } from "../src/validation.js";
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

  it("rejects invalid URL", () => {
    const result = feedbackCreateSchema.safeParse({
      ...validPayload,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
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
});

describe("feedbackPatchSchema", () => {
  it("accepts valid resolve", () => {
    const result = feedbackPatchSchema.safeParse({
      id: "abc123",
      status: "resolved",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid unresolve", () => {
    const result = feedbackPatchSchema.safeParse({
      id: "abc123",
      status: "open",
    });
    expect(result.success).toBe(true);
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
});

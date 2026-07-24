import { describe, expect, it } from "vitest";
import { SITEPING_MODELS } from "../src/schema.js";
import type { FeedbackStatus, FeedbackType } from "../src/types.js";
import { CLOSED_FEEDBACK_STATUSES, FEEDBACK_STATUSES, FEEDBACK_TYPES, isClosedStatus } from "../src/types.js";

// ---------------------------------------------------------------------------
// Valid Prisma scalar types (non-relation)
// ---------------------------------------------------------------------------

const VALID_PRISMA_TYPES = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes",
]);

// ---------------------------------------------------------------------------
// Model structure
// ---------------------------------------------------------------------------

describe("SITEPING_MODELS structure", () => {
  it("contains exactly 2 models: SitepingFeedback and SitepingAnnotation", () => {
    const modelNames = Object.keys(SITEPING_MODELS);
    expect(modelNames).toHaveLength(2);
    expect(modelNames).toContain("SitepingFeedback");
    expect(modelNames).toContain("SitepingAnnotation");
  });
});

// ---------------------------------------------------------------------------
// SitepingFeedback model
// ---------------------------------------------------------------------------

describe("SitepingFeedback model", () => {
  const model = SITEPING_MODELS.SitepingFeedback;
  const fields = model.fields;

  it("has all expected fields", () => {
    const expectedFields = [
      "id",
      "projectName",
      "type",
      "message",
      "status",
      "url",
      "screenshotRegion",
      "viewport",
      "userAgent",
      "authorName",
      "authorEmail",
      "clientId",
      "resolvedAt",
      "createdAt",
      "updatedAt",
      "annotations",
    ];

    for (const field of expectedFields) {
      expect(fields).toHaveProperty(field);
    }
  });

  it("id is a String @id with cuid() default", () => {
    expect(fields.id.type).toBe("String");
    expect(fields.id.isId).toBe(true);
    expect(fields.id.default).toBe("cuid()");
  });

  it("projectName is a required String", () => {
    expect(fields.projectName.type).toBe("String");
    expect(fields.projectName.optional).toBeUndefined();
  });

  it("message has nativeType Text for long content", () => {
    expect(fields.message.type).toBe("String");
    expect(fields.message.nativeType).toBe("Text");
  });

  it("status defaults to open", () => {
    expect(fields.status.type).toBe("String");
    expect(fields.status.default).toBe('"open"');
  });

  it("clientId is unique (for deduplication)", () => {
    expect(fields.clientId.type).toBe("String");
    expect(fields.clientId.isUnique).toBe(true);
  });

  it("screenshotRegion is an optional Json field", () => {
    expect(fields.screenshotRegion.type).toBe("Json");
    expect(fields.screenshotRegion.optional).toBe(true);
  });

  it("resolvedAt is an optional DateTime", () => {
    expect(fields.resolvedAt.type).toBe("DateTime");
    expect(fields.resolvedAt.optional).toBe(true);
  });

  it("createdAt has now() default", () => {
    expect(fields.createdAt.type).toBe("DateTime");
    expect(fields.createdAt.default).toBe("now()");
  });

  it("updatedAt has isUpdatedAt flag", () => {
    expect(fields.updatedAt.type).toBe("DateTime");
    expect(fields.updatedAt.isUpdatedAt).toBe(true);
  });

  it("annotations is a 1-to-many relation to SitepingAnnotation", () => {
    expect(fields.annotations.type).toBe("SitepingAnnotation");
    expect(fields.annotations.relation).toBeDefined();
    expect(fields.annotations.relation!.kind).toBe("1-to-many");
    expect(fields.annotations.relation!.model).toBe("SitepingAnnotation");
  });

  it("has @@index([projectName]) for project-scoped queries", () => {
    expect(model.indexes).toBeDefined();
    const projectNameIndex = model.indexes!.find((idx) => idx.fields.length === 1 && idx.fields[0] === "projectName");
    expect(projectNameIndex).toBeDefined();
  });

  it("has @@index([projectName, status, createdAt]) for filtered listing", () => {
    expect(model.indexes).toBeDefined();
    const compositeIndex = model.indexes!.find(
      (idx) =>
        idx.fields.length === 3 &&
        idx.fields[0] === "projectName" &&
        idx.fields[1] === "status" &&
        idx.fields[2] === "createdAt",
    );
    expect(compositeIndex).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// SitepingAnnotation model
// ---------------------------------------------------------------------------

describe("SitepingAnnotation model", () => {
  const model = SITEPING_MODELS.SitepingAnnotation;
  const fields = model.fields;

  it("has all expected fields", () => {
    const expectedFields = [
      "id",
      "feedbackId",
      "feedback",
      "cssSelector",
      "xpath",
      "textSnippet",
      "elementTag",
      "elementId",
      "textPrefix",
      "textSuffix",
      "fingerprint",
      "neighborText",
      "xPct",
      "yPct",
      "wPct",
      "hPct",
      "scrollX",
      "scrollY",
      "viewportW",
      "viewportH",
      "devicePixelRatio",
      "createdAt",
    ];

    for (const field of expectedFields) {
      expect(fields).toHaveProperty(field);
    }
  });

  it("id is a String @id with cuid() default", () => {
    expect(fields.id.type).toBe("String");
    expect(fields.id.isId).toBe(true);
    expect(fields.id.default).toBe("cuid()");
  });

  it("feedback is a many-to-1 relation to SitepingFeedback with Cascade delete", () => {
    const rel = fields.feedback.relation;
    expect(rel).toBeDefined();
    expect(rel!.kind).toBe("many-to-1");
    expect(rel!.model).toBe("SitepingFeedback");
    expect(rel!.fields).toEqual(["feedbackId"]);
    expect(rel!.references).toEqual(["id"]);
    expect(rel!.onDelete).toBe("Cascade");
  });

  it("elementId is optional", () => {
    expect(fields.elementId.optional).toBe(true);
  });

  it("coordinate fields (xPct, yPct, wPct, hPct) are Float", () => {
    for (const field of ["xPct", "yPct", "wPct", "hPct"]) {
      expect(fields[field].type).toBe("Float");
    }
  });

  it("scroll fields (scrollX, scrollY) are Float", () => {
    expect(fields.scrollX.type).toBe("Float");
    expect(fields.scrollY.type).toBe("Float");
  });

  it("viewport dimensions (viewportW, viewportH) are Int", () => {
    expect(fields.viewportW.type).toBe("Int");
    expect(fields.viewportH.type).toBe("Int");
  });

  it("devicePixelRatio is Float with default 1", () => {
    expect(fields.devicePixelRatio.type).toBe("Float");
    expect(fields.devicePixelRatio.default).toBe("1");
  });

  it("text-heavy fields have nativeType Text", () => {
    const textFields = ["cssSelector", "xpath", "textSnippet", "textPrefix", "textSuffix", "neighborText"];
    for (const field of textFields) {
      expect(fields[field].nativeType).toBe("Text");
    }
  });

  it("has @@index([feedbackId]) for relation lookups", () => {
    expect(model.indexes).toBeDefined();
    const feedbackIdIndex = model.indexes!.find((idx) => idx.fields.length === 1 && idx.fields[0] === "feedbackId");
    expect(feedbackIdIndex).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Field type validation
// ---------------------------------------------------------------------------

describe("Field type validity", () => {
  for (const [modelName, modelDef] of Object.entries(SITEPING_MODELS)) {
    it(`all non-relation fields in ${modelName} use valid Prisma types`, () => {
      for (const [fieldName, fieldDef] of Object.entries(modelDef.fields)) {
        if (fieldDef.relation) continue;
        expect(
          VALID_PRISMA_TYPES.has(fieldDef.type),
          `${modelName}.${fieldName} has invalid type "${fieldDef.type}"`,
        ).toBe(true);
      }
    });
  }

  for (const [modelName, modelDef] of Object.entries(SITEPING_MODELS)) {
    it(`relation fields in ${modelName} reference existing models`, () => {
      for (const [fieldName, fieldDef] of Object.entries(modelDef.fields)) {
        if (!fieldDef.relation) continue;
        expect(
          SITEPING_MODELS,
          `${modelName}.${fieldName} references non-existent model "${fieldDef.relation.model}"`,
        ).toHaveProperty(fieldDef.relation.model);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// FEEDBACK_TYPES and FEEDBACK_STATUSES
// ---------------------------------------------------------------------------

describe("FEEDBACK_TYPES", () => {
  it("is a non-empty array", () => {
    expect(FEEDBACK_TYPES.length).toBeGreaterThan(0);
  });

  it("contains expected types", () => {
    expect(FEEDBACK_TYPES).toContain("bug");
    expect(FEEDBACK_TYPES).toContain("question");
    expect(FEEDBACK_TYPES).toContain("change");
    expect(FEEDBACK_TYPES).toContain("other");
  });

  it("has no duplicate entries", () => {
    const unique = new Set(FEEDBACK_TYPES);
    expect(unique.size).toBe(FEEDBACK_TYPES.length);
  });

  it("FeedbackType union matches array values (compile-time check)", () => {
    // This verifies at compile-time that the type is derived from the array.
    // If someone changes the array without updating the type (or vice versa),
    // the assignment below would cause a TypeScript error.
    const types: readonly FeedbackType[] = FEEDBACK_TYPES;
    expect(types).toBe(FEEDBACK_TYPES);
  });
});

describe("FEEDBACK_STATUSES", () => {
  it("is a non-empty array", () => {
    expect(FEEDBACK_STATUSES.length).toBeGreaterThan(0);
  });

  it("contains exactly the 4 expected statuses", () => {
    expect(FEEDBACK_STATUSES).toEqual(["open", "in_progress", "resolved", "wont_fix"]);
  });

  it("has no duplicate entries", () => {
    const unique = new Set(FEEDBACK_STATUSES);
    expect(unique.size).toBe(FEEDBACK_STATUSES.length);
  });

  it("FeedbackStatus union matches array values (compile-time check)", () => {
    const statuses: readonly FeedbackStatus[] = FEEDBACK_STATUSES;
    expect(statuses).toBe(FEEDBACK_STATUSES);
  });
});

describe("CLOSED_FEEDBACK_STATUSES / isClosedStatus", () => {
  it("closed statuses are exactly resolved and wont_fix", () => {
    expect(CLOSED_FEEDBACK_STATUSES).toEqual(["resolved", "wont_fix"]);
  });

  it("every closed status is a valid feedback status", () => {
    for (const status of CLOSED_FEEDBACK_STATUSES) {
      expect(FEEDBACK_STATUSES).toContain(status);
    }
  });

  it("isClosedStatus returns true only for terminal statuses", () => {
    expect(isClosedStatus("resolved")).toBe(true);
    expect(isClosedStatus("wont_fix")).toBe(true);
    expect(isClosedStatus("open")).toBe(false);
    expect(isClosedStatus("in_progress")).toBe(false);
  });
});

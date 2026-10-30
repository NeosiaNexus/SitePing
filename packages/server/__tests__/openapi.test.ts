import { MemoryStore } from "@siteping/adapter-memory";
import { SITEPING_PROTOCOL_VERSION } from "@siteping/core";
import { describe, expect, it } from "vitest";
import { generateOpenApiDocument, responseSchemas } from "../scripts/openapi.js";
import { LIST_QUERY_KEYS } from "../src/constants.js";
import { createSitepingHandler } from "../src/index.js";
import { validPayload } from "./fixtures.js";

const ENDPOINT = "http://localhost/api/siteping";
const PROJECT = validPayload.projectName;
const API_KEY = "a-secret-key";
const BEARER = { Authorization: `Bearer ${API_KEY}` };

function request(method: string, body: unknown): Request {
  return new Request(ENDPOINT, {
    method,
    headers: { "Content-Type": "application/json", ...BEARER },
    body: JSON.stringify(body),
  });
}

/** Every `$ref` string in `node`, at any depth. */
function refsIn(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(refsIn);
  if (typeof node !== "object" || node === null) return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key === "$ref" && typeof value === "string" ? [value] : refsIn(value),
  );
}

describe("OpenAPI document", () => {
  const document = generateOpenApiDocument();

  it("matches the committed openapi.json — after a protocol change, run `bun run openapi:update`", async () => {
    await expect(`${JSON.stringify(document, null, 2)}\n`).toMatchFileSnapshot("../openapi.json");
  });

  it("describes the protocol version the list response sends", () => {
    expect(document["x-siteping-protocol"]).toBe(SITEPING_PROTOCOL_VERSION);
    expect(document.info).toMatchObject({ version: String(SITEPING_PROTOCOL_VERSION) });
  });

  it("resolves every $ref to a component", () => {
    const components = document.components as Record<string, Record<string, unknown>>;
    const refs = refsIn(document);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      const [, section, name] = /^#\/components\/(schemas|responses)\/(.+)$/.exec(ref) ?? [];
      expect(section && name && components[section]?.[name], ref).toBeTruthy();
    }
  });

  it("lists exactly the query parameters the list endpoint reads", () => {
    const paths = document.paths as Record<string, { get: { parameters: Array<{ name: string }> } }>;
    const names = paths["/api/siteping"]?.get.parameters.map((parameter) => parameter.name);
    expect([...(names ?? [])].sort()).toEqual([...LIST_QUERY_KEYS].sort());
  });

  it("keeps the element schemas of length-checked arrays", () => {
    const { schemas } = document.components as { schemas: Record<string, { properties: Record<string, unknown> }> };
    expect(schemas.FeedbackCreate?.properties.annotations).toMatchObject({
      type: "array",
      maxItems: 50,
      items: { type: "object", required: expect.arrayContaining(["anchor", "rect"]) },
    });
  });
});

describe("responses match the OpenAPI schemas", () => {
  it("parses what every operation sends, and the list carries the protocol version", async () => {
    const handler = createSitepingHandler({ store: new MemoryStore(), apiKey: API_KEY });

    const created = await handler.POST(request("POST", validPayload));
    expect(created.status).toBe(201);
    const feedback = responseSchemas.feedback.parse(await created.json());

    const comment = await handler.POST(
      request("POST", {
        projectName: PROJECT,
        feedbackId: feedback.id,
        body: "Still there",
        authorName: "Bob",
        authorEmail: "bob@example.com",
        clientId: "openapi-comment",
      }),
    );
    expect(comment.status).toBe(201);
    const { id: commentId } = responseSchemas.comment.parse(await comment.json());

    const listed = await handler.GET(new Request(`${ENDPOINT}?projectName=${PROJECT}`, { headers: BEARER }));
    const list = responseSchemas.feedbackList.parse(await listed.json());
    expect(list.protocol).toBe(SITEPING_PROTOCOL_VERSION);
    expect(list.feedbacks[0]?.comments).toHaveLength(1);

    const patched = await handler.PATCH(
      request("PATCH", { id: feedback.id, projectName: PROJECT, status: "wont_fix" }),
    );
    expect(responseSchemas.feedback.parse(await patched.json()).resolvedAt).not.toBeNull();

    const removed = await handler.DELETE(
      request("DELETE", { projectName: PROJECT, feedbackId: feedback.id, commentId }),
    );
    responseSchemas.deleted.parse(await removed.json());

    const invalid = await handler.PATCH(request("PATCH", { id: feedback.id, projectName: PROJECT, status: "done" }));
    expect(invalid.status).toBe(400);
    responseSchemas.validationError.parse(await invalid.json());

    const missing = await handler.DELETE(request("DELETE", { id: "nope", projectName: PROJECT }));
    expect(missing.status).toBe(404);
    responseSchemas.error.parse(await missing.json());
  });
});

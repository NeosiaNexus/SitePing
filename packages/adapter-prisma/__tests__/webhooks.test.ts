import { createCollectionStore, type FeedbackRecord } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSitepingHandler } from "../src/index.js";
import { buildWebhookPayload, dispatchWebhook, dispatchWebhooks, type WebhookConfig } from "../src/webhooks.js";
import { validPayloadNoAnnotations } from "./fixtures.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const FEEDBACK: FeedbackRecord = {
  id: "fb-test-1",
  projectName: "test-project",
  type: "bug",
  message: "The button overlaps the modal close icon",
  status: "open",
  url: "https://example.com/orders/42",
  urlPattern: "/orders/:orderId",
  viewport: "1920x1080",
  userAgent: "Mozilla/5.0",
  authorName: "Alice",
  authorEmail: "alice@example.com",
  clientId: "client-uuid-1",
  resolvedAt: null,
  createdAt: new Date("2026-05-14T10:00:00Z"),
  updatedAt: new Date("2026-05-14T10:00:00Z"),
  annotations: [],
  screenshotUrl: null,
  screenshotRegion: null,
  diagnostics: null,
};

let fetchSpy: ReturnType<typeof vi.fn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Payload formatting
// ---------------------------------------------------------------------------

describe("buildWebhookPayload", () => {
  it("formats Slack payload with blocks + text fallback", () => {
    const payload = buildWebhookPayload("slack", FEEDBACK);
    expect(payload.text).toContain("Alice");
    expect(payload.text).toContain("bug");
    expect(payload.text).toContain("The button overlaps");
    expect(Array.isArray(payload.blocks)).toBe(true);
    expect(payload.blocks.length).toBeGreaterThan(0);
    expect(payload.blocks[0]).toEqual(expect.objectContaining({ type: "header" }));
  });

  it("formats Discord payload with content + embed", () => {
    const payload = buildWebhookPayload("discord", FEEDBACK);
    expect(payload.content).toContain("Alice");
    expect(payload.content).toContain("bug");
    expect(payload.embeds[0]?.title).toContain("test-project");
    expect(payload.embeds[0]?.description).toContain("button overlaps");
    // Bug type maps to the red palette colour.
    expect(payload.embeds[0]?.color).toBe(0xef4444);
  });

  it("returns the record minus clientId as generic payload", () => {
    const { clientId: _clientId, ...expected } = FEEDBACK;
    const payload = buildWebhookPayload("generic", FEEDBACK);
    expect(payload).toEqual(expected);
    // clientId is the browser-local dedup secret — it never leaves the server.
    expect("clientId" in payload).toBe(false);
  });

  it("truncates excessively long messages for chat platforms", () => {
    const long = { ...FEEDBACK, message: "x".repeat(2000) };
    const slack = buildWebhookPayload("slack", long);
    const discord = buildWebhookPayload("discord", long);
    // Headline + ': ' prefix + 300 char preview (with ellipsis) — stays
    // well below Slack's 3000-char block limit.
    expect(slack.text.length).toBeLessThan(500);
    expect(discord.embeds[0]?.description.length).toBeLessThan(500);
    expect(discord.embeds[0]?.description.endsWith("…")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Untrusted input — message and authorName come from anonymous visitors
// ---------------------------------------------------------------------------

describe("buildWebhookPayload — untrusted input", () => {
  it("escapes Slack control characters in every mrkdwn field", () => {
    const payload = buildWebhookPayload("slack", {
      ...FEEDBACK,
      message: "<!channel> the site is down & <https://evil.example/phish|Reset your password>",
      authorName: "<!here>",
      projectName: "a<b",
      url: "/orders?a=1&b=2",
    });
    const mrkdwn = JSON.stringify([payload.text, ...payload.blocks.filter((b) => b.type !== "header")]);

    expect(mrkdwn).not.toContain("<!channel>");
    expect(mrkdwn).not.toContain("<!here>");
    expect(mrkdwn).not.toContain("<https://evil.example/phish|");
    expect(mrkdwn).toContain(
      "&lt;!channel&gt; the site is down &amp; &lt;https://evil.example/phish|Reset your password&gt;",
    );
    expect(mrkdwn).toContain("*From:* &lt;!here&gt; (alice@example.com)");
    expect(mrkdwn).toContain("*Project:* a&lt;b");
    expect(mrkdwn).toContain("*URL:* /orders?a=1&amp;b=2");
  });

  it("keeps escaped Slack mrkdwn fields within Block Kit's 3000-char text limit", () => {
    // A valid 2000-char URL full of `&` grows past 3000 chars once `&` → `&amp;`.
    const url = `https://example.com/?${"a=1&".repeat(494)}`;
    expect(url.length).toBeLessThanOrEqual(2000);
    const payload = buildWebhookPayload("slack", { ...FEEDBACK, url, authorName: "&".repeat(3000) });
    const context = payload.blocks.find((b) => b.type === "context") as {
      elements: ReadonlyArray<{ text: string }>;
    };

    for (const { text } of context.elements) {
      expect(text.length).toBeLessThanOrEqual(3000);
      // Truncation never splits an entity (`&am…`).
      expect(text.replace(/&(amp|lt|gt);/g, "")).not.toContain("&");
    }
    expect(context.elements.find((e) => e.text.startsWith("*URL:*"))?.text.endsWith("…")).toBe(true);
  });

  it("keeps the plain_text header raw (Slack renders it verbatim) but within the 150-char Block Kit limit", () => {
    const payload = buildWebhookPayload("slack", { ...FEEDBACK, authorName: "Tom & Jerry <3" });
    const header = payload.blocks[0] as { type: "header"; text: { text: string } };
    expect(header.text.text).toBe("New bug feedback from Tom & Jerry <3");

    const long = buildWebhookPayload("slack", { ...FEEDBACK, authorName: "x".repeat(200) });
    const longHeader = long.blocks[0] as { type: "header"; text: { text: string } };
    expect(longHeader.text.text.length).toBeLessThanOrEqual(150);
  });

  it("disables Discord mention parsing so @everyone in an author name is text, not a ping", () => {
    const payload = buildWebhookPayload("discord", { ...FEEDBACK, authorName: "@everyone" });
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.content).toContain("@everyone");
  });

  it("escapes Discord markdown so a visitor can't send a disguised masked link", () => {
    const phish = "[Reset your password](https://evil.example/phish)";
    const escaped = "\\[Reset your password\\]\\(https://evil.example/phish\\)";
    const payload = buildWebhookPayload("discord", {
      ...FEEDBACK,
      message: `**urgent** ${phish}`,
      authorName: phish,
      projectName: "__proj__",
      url: phish,
      viewport: "[x](https://e.co)",
    });
    const embed = payload.embeds[0];
    const all = JSON.stringify(payload);

    expect(all).not.toMatch(/(?<!\\)\[Reset your password\]/);
    expect(payload.content).toBe(`New **bug** feedback from **${escaped}**`);
    expect(embed?.description).toBe(`\\*\\*urgent\\*\\* ${escaped}`);
    expect(embed?.title).toBe("bug — \\_\\_proj\\_\\_");
    expect(embed?.fields.find((f) => f.name === "URL")?.value).toBe(escaped);
    expect(embed?.fields.find((f) => f.name === "Author")?.value).toBe(`${escaped} (alice@example.com)`);
    expect(embed?.fields.find((f) => f.name === "Viewport")?.value).toBe("\\[x\\]\\(https://e.co\\)");
  });

  it("keeps every Discord value within the API limits, even after escaping", () => {
    // A 2000-char page URL is valid input; Discord rejects the whole webhook
    // when one field value exceeds 1024 characters.
    const payload = buildWebhookPayload("discord", {
      ...FEEDBACK,
      url: `https://example.com/${"a".repeat(1980)}`,
      projectName: "_".repeat(200),
      authorName: "*".repeat(3000),
    });
    const embed = payload.embeds[0];
    expect(payload.content.length).toBeLessThanOrEqual(2000);
    expect(embed?.title.length).toBeLessThanOrEqual(256);
    for (const field of embed?.fields ?? []) expect(field.value.length).toBeLessThanOrEqual(1024);
  });

  it("never cuts a Discord escape in half when truncating", () => {
    const payload = buildWebhookPayload("discord", { ...FEEDBACK, url: "_".repeat(2000) });
    const value = payload.embeds[0]?.fields.find((f) => f.name === "URL")?.value ?? "";
    expect(value.length).toBeLessThanOrEqual(1024);
    expect(value).toMatch(/^(\\_)+…$/);
  });

  describe("Discord URL field", () => {
    const urlField = (url: string) =>
      buildWebhookPayload("discord", { ...FEEDBACK, url }).embeds[0]?.fields.find((f) => f.name === "URL")?.value;

    it("keeps a full page URL linkable — no backslash lands inside Discord's autolink", () => {
      expect(urlField("https://example.com/docs/some_page_(v2)?q=a*b~c")).toBe(
        "https://example.com/docs/some_page_%28v2%29?q=a*b~c",
      );
    });

    it("percent-encodes brackets and parens so a URL can't smuggle in a masked link", () => {
      expect(urlField("https://ok.example/[Reset-password](https://evil.example)")).toBe(
        "https://ok.example/%5BReset-password%5D%28https://evil.example%29",
      );
    });

    it("escapes a value that is not a lone http(s) URL", () => {
      expect(urlField("/orders/__draft__")).toBe("/orders/\\_\\_draft\\_\\_");
      expect(urlField("https://ok.example [Reset](https://evil.example)")).toBe(
        "https://ok.example \\[Reset\\]\\(https://evil.example\\)",
      );
    });

    it("never cuts a percent-encoding in half when truncating", () => {
      const value = urlField(`https://example.com/${"(".repeat(2000)}`) ?? "";
      expect(value.length).toBeLessThanOrEqual(1024);
      expect(value).toMatch(/^https:\/\/example\.com\/(%28)+…$/);
    });
  });
});

// ---------------------------------------------------------------------------
// dispatchWebhook — golden + edge cases
// ---------------------------------------------------------------------------

describe("dispatchWebhook", () => {
  it("POSTs Slack payload to the configured URL", async () => {
    await dispatchWebhook({ url: "https://hooks.slack.com/T/B/X", type: "slack" }, FEEDBACK);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("https://hooks.slack.com/T/B/X");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    const sent = JSON.parse(init.body as string) as { text: string };
    expect(sent.text).toContain("Alice");
  });

  it("POSTs Discord payload to the configured URL", async () => {
    await dispatchWebhook({ url: "https://discord.com/api/webhooks/x", type: "discord" }, FEEDBACK);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const sent = JSON.parse(init.body as string) as { content: string; embeds: unknown[] };
    expect(sent.content).toContain("bug");
    expect(sent.embeds).toHaveLength(1);
  });

  it("POSTs raw feedback as generic JSON by default", async () => {
    await dispatchWebhook({ url: "https://hooks.example.com" }, FEEDBACK);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const sent = JSON.parse(init.body as string) as { id: string; type: string };
    expect(sent.id).toBe(FEEDBACK.id);
    expect(sent.type).toBe("bug");
  });

  it("merges custom headers on top of Content-Type default", async () => {
    await dispatchWebhook(
      {
        url: "https://hooks.example.com",
        headers: { "X-Signature": "abc", Authorization: "Bearer xyz" },
      },
      FEEDBACK,
    );
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(Object.fromEntries(new Headers(init.headers))).toEqual({
      "content-type": "application/json",
      "x-signature": "abc",
      authorization: "Bearer xyz",
    });
  });

  it("lets a user header override Content-Type case-insensitively (never sent twice)", async () => {
    await dispatchWebhook({ url: "https://hooks.example.com", headers: { "content-type": "text/plain" } }, FEEDBACK);
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    // A plain-object merge keeps both keys and fetch combines them into
    // "application/json, text/plain".
    expect(new Headers(init.headers).get("content-type")).toBe("text/plain");
  });

  it("invokes onError on a 500 response and does not throw", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    const onError = vi.fn();
    await expect(dispatchWebhook({ url: "https://hooks.example.com", onError }, FEEDBACK)).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
    const [err, id] = onError.mock.calls[0] as [Error, string];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/500/);
    expect(id).toBe(FEEDBACK.id);
  });

  it("invokes onError on a network failure and does not throw", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const onError = vi.fn();
    await expect(dispatchWebhook({ url: "https://hooks.example.com", onError }, FEEDBACK)).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
    expect((onError.mock.calls[0] as [Error, string])[0].message).toBe("Failed to fetch");
  });

  it("falls back to console.warn when no onError is provided", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("", { status: 502 }));
    await dispatchWebhook({ url: "https://hooks.example.com" }, FEEDBACK);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("502");
  });

  it("never rejects when building the payload throws — reports through onError instead", async () => {
    // Discord's embed timestamp calls toISOString(), which throws a RangeError
    // on an invalid date. The handler drops this promise (`void`), so a
    // rejection would be an unhandled rejection (fatal in Node by default).
    const onError = vi.fn();
    const broken = { ...FEEDBACK, createdAt: new Date("not a date") };
    await expect(
      dispatchWebhook({ url: "https://discord.com/api/webhooks/x", type: "discord", onError }, broken),
    ).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    const [err, id] = onError.mock.calls[0] as [Error, string];
    expect(err).toBeInstanceOf(RangeError);
    expect(id).toBe(FEEDBACK.id);
  });

  it("logs only the webhook origin — the Slack/Discord URL path is the credential", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("", { status: 404 }));
    await dispatchWebhook(
      { url: "https://hooks.slack.com/services/T0000/B0000/XXXXSECRETTOKEN", type: "slack" },
      FEEDBACK,
    );
    expect(warnSpy).toHaveBeenCalledOnce();
    const logged = String(warnSpy.mock.calls[0]?.[0]);
    expect(logged).toContain("https://hooks.slack.com");
    expect(logged).not.toContain("XXXXSECRETTOKEN");
    expect(logged).not.toContain("/services/");
  });

  it("aborts the fetch when the per-webhook timeout elapses", async () => {
    // Spy on fetch so we observe the signal and never resolve.
    let abortReason: unknown;
    fetchSpy.mockImplementationOnce(
      (_url: RequestInfo, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init.signal as AbortSignal;
          signal.addEventListener("abort", () => {
            abortReason = signal.reason;
            // Match real fetch behaviour: rejects with a DOMException-like
            // AbortError when aborted.
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );

    vi.useFakeTimers();
    const onError = vi.fn();
    const promise = dispatchWebhook({ url: "https://hooks.example.com", timeoutMs: 50, onError }, FEEDBACK);
    await vi.advanceTimersByTimeAsync(60);
    await promise;
    vi.useRealTimers();

    expect(onError).toHaveBeenCalledOnce();
    expect(abortReason).toBeDefined();
  });

  it("does not throw when the user-supplied onError itself throws", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("boom"));
    const onError = vi.fn(() => {
      throw new Error("user bug");
    });
    await expect(dispatchWebhook({ url: "https://hooks.example.com", onError }, FEEDBACK)).resolves.toBeUndefined();
    // The thrown user error is reported via console.warn so it isn't swallowed.
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("user bug");
  });
});

// ---------------------------------------------------------------------------
// dispatchWebhooks — parallelism
// ---------------------------------------------------------------------------

describe("dispatchWebhooks", () => {
  it("dispatches every configured webhook in parallel", async () => {
    let resolveCount = 0;
    fetchSpy.mockImplementation(
      () =>
        new Promise((resolve) => {
          // Tiny stagger to make sure they're actually concurrent — if these
          // ran sequentially, the sum of delays would exceed any single one.
          setTimeout(() => {
            resolveCount++;
            resolve(new Response("", { status: 200 }));
          }, 20);
        }),
    );

    const start = Date.now();
    await dispatchWebhooks(
      [
        { url: "https://slack.example.com", type: "slack" },
        { url: "https://discord.example.com", type: "discord" },
        { url: "https://generic.example.com" },
      ],
      FEEDBACK,
    );
    const elapsed = Date.now() - start;

    expect(resolveCount).toBe(3);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    // 3 × 20ms sequentially would be >= 60ms; in parallel it should land
    // well below 60ms. Generous bound to avoid flakes on CI.
    expect(elapsed).toBeLessThan(120);
  });

  it("returns immediately when no webhooks are configured", async () => {
    await dispatchWebhooks([], FEEDBACK);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Handler integration — webhook fires after successful POST
// ---------------------------------------------------------------------------

function mockPrisma() {
  const fbRecord = { ...FEEDBACK, createdAt: new Date(), updatedAt: new Date() };
  return {
    sitepingFeedback: {
      create: vi.fn().mockResolvedValue(fbRecord),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(fbRecord),
      delete: vi.fn().mockResolvedValue({ id: fbRecord.id }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

describe("createSitepingHandler — webhooks option", () => {
  it("dispatches a single webhook after a successful POST", async () => {
    const prisma = mockPrisma();
    const webhook: WebhookConfig = { url: "https://hooks.example.com" };
    const handler = createSitepingHandler({ prisma, webhooks: webhook });

    const req = new Request("http://localhost/api/siteping", {
      method: "POST",
      body: JSON.stringify(validPayloadNoAnnotations),
    });
    const res = await handler.POST(req);
    expect(res.status).toBe(201);

    // Wait one microtask tick for the fire-and-forget dispatch to fire.
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
  });

  it("dispatches every webhook in an array config", async () => {
    const prisma = mockPrisma();
    const handler = createSitepingHandler({
      prisma,
      webhooks: [
        { url: "https://slack.example.com", type: "slack" },
        { url: "https://discord.example.com", type: "discord" },
      ],
    });

    const req = new Request("http://localhost/api/siteping", {
      method: "POST",
      body: JSON.stringify(validPayloadNoAnnotations),
    });
    await handler.POST(req);

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    const urls = fetchSpy.mock.calls.map((c) => c[0]);
    expect(urls).toContain("https://slack.example.com");
    expect(urls).toContain("https://discord.example.com");
  });

  it("does not fire webhooks when POST fails validation", async () => {
    const prisma = mockPrisma();
    const handler = createSitepingHandler({
      prisma,
      webhooks: { url: "https://hooks.example.com" },
    });

    const req = new Request("http://localhost/api/siteping", {
      method: "POST",
      body: JSON.stringify({ type: "bug" }), // missing required fields
    });
    const res = await handler.POST(req);
    expect(res.status).toBe(400);
    // Give any erroneous fire-and-forget a chance to run before asserting.
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Handler integration — replays never notify twice
// ---------------------------------------------------------------------------

describe("createSitepingHandler — webhooks on clientId replays", () => {
  it("does not dispatch again when a store returns the existing record for a replayed clientId", async () => {
    // Snapshot stores (memory, localStorage, adapter-kit) are idempotent on
    // clientId: a replay resolves like a fresh insert. The handler must still
    // recognise it as a replay — the widget's retry queue replays after a
    // network flake even though the first POST was persisted.
    let feedbacks: FeedbackRecord[] = [];
    const store = createCollectionStore({
      load: () => feedbacks,
      persist: (next) => {
        feedbacks = next;
      },
      generateId: () => `id-${feedbacks.length + 1}`,
    });
    const handler = createSitepingHandler({ store, webhooks: { url: "https://hooks.example.com" } });
    const post = () =>
      handler.POST(
        new Request("http://localhost/api/siteping", {
          method: "POST",
          body: JSON.stringify({ ...validPayloadNoAnnotations, clientId: "replayed-once" }),
        }),
      );

    expect((await post()).status).toBe(201);
    expect((await post()).status).toBe(201);

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());
    // Give a stray second dispatch every chance to surface before asserting.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

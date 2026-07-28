import type {
  AnnotationRecord,
  AnnotationResponse,
  DiagnosticsSnapshot,
  FeedbackPage,
  FeedbackQuery,
  FeedbackRecord,
  FeedbackResponse,
  FeedbackStatus,
  ScreenshotRegion,
} from "@siteping/core";
import { isClosedStatus, StoreNotFoundError } from "@siteping/core";
import { type Mock, vi } from "vitest";
import type { InboxSource } from "../src/types.js";

// ---------------------------------------------------------------------------
// Record / response fixtures
// ---------------------------------------------------------------------------

let seq = 0;
/** Deterministic-ish unique id for a fixture record. */
function nextId(): string {
  seq += 1;
  return `fb-${seq.toString().padStart(4, "0")}-abcdef`;
}

export function makeAnnotation(overrides: Partial<AnnotationRecord> = {}): AnnotationRecord {
  return {
    id: `an-${seq}-${Math.random().toString(36).slice(2, 8)}`,
    feedbackId: "fb-x",
    cssSelector: "main > section.hero > h1",
    xpath: "/html/body/main/section/h1",
    textSnippet: "Welcome to the demo",
    elementTag: "H1",
    elementId: null,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "3:0:abc",
    neighborText: "",
    anchorKey: null,
    xPct: 0.1,
    yPct: 0.2,
    wPct: 0.3,
    hPct: 0.4,
    scrollX: 0,
    scrollY: 0,
    viewportW: 1280,
    viewportH: 800,
    devicePixelRatio: 2,
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    ...overrides,
  };
}

export function makeRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  const id = overrides.id ?? nextId();
  const annotations = overrides.annotations ?? [makeAnnotation({ feedbackId: id })];
  return {
    id,
    type: "bug",
    message: "The header overlaps the logo on mobile",
    status: "open",
    projectName: "demo",
    url: "https://demo.siteping.dev/pricing",
    urlPattern: null,
    authorName: "Alex Client",
    authorEmail: "alex@client.example",
    viewport: "1280×800",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120",
    clientId: "client-uuid-1",
    resolvedAt: null,
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    annotations,
    screenshotUrl: null,
    screenshotRegion: null,
    diagnostics: null,
    ...overrides,
  };
}

export function makeAnnotationResponse(overrides: Partial<AnnotationResponse> = {}): AnnotationResponse {
  return {
    id: "an-resp-1",
    feedbackId: "fb-resp-1",
    cssSelector: "main h1",
    xpath: "/html/body/main/h1",
    textSnippet: "Hi",
    elementTag: "H1",
    elementId: null,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "1:0:x",
    neighborText: "",
    anchorKey: null,
    xPct: 0.1,
    yPct: 0.1,
    wPct: 0.2,
    hPct: 0.2,
    scrollX: 0,
    scrollY: 0,
    viewportW: 1000,
    viewportH: 700,
    devicePixelRatio: 1,
    createdAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

export function makeResponse(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-resp-1",
    projectName: "demo",
    type: "bug",
    message: "Something is off",
    status: "open",
    url: "https://demo.siteping.dev/pricing",
    urlPattern: null,
    viewport: "1280×800",
    userAgent: "UA",
    authorName: "Alex",
    authorEmail: "alex@client.example",
    resolvedAt: null,
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-20T11:00:00.000Z",
    annotations: [makeAnnotationResponse()],
    screenshotUrl: null,
    screenshotRegion: null,
    diagnostics: null,
    ...overrides,
  };
}

export const REGION: ScreenshotRegion = { xPct: 0.25, yPct: 0.1, wPct: 0.5, hPct: 0.3 };

export function makeDiagnostics(overrides: Partial<DiagnosticsSnapshot> = {}): DiagnosticsSnapshot {
  return {
    console: [
      { level: "error", timestamp: "2026-07-20T10:00:02.000Z", message: "TypeError: undefined is not a function" },
      { level: "warn", timestamp: "2026-07-20T10:00:00.000Z", message: "Deprecated API used" },
    ],
    network: [
      {
        url: "https://api.example/orders",
        method: "GET",
        status: 500,
        durationMs: 812.4,
        timestamp: "2026-07-20T10:00:01.000Z",
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test InboxSource — in-memory filter + paginate + mutate, with failure hooks
// ---------------------------------------------------------------------------

function byCreatedDesc(a: FeedbackRecord, b: FeedbackRecord): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export interface TestSource extends InboxSource {
  list: Mock<InboxSource["list"]>;
  setStatus: Mock<InboxSource["setStatus"]>;
  remove: Mock<InboxSource["remove"]>;
  readonly records: FeedbackRecord[];
  control: { failNextSetStatus: Error | null; failNextRemove: Error | null };
}

/** In-memory InboxSource driving the hook the way the real store/endpoint would. */
export function makeSource(seed: FeedbackRecord[] = []): TestSource {
  let records = [...seed].sort(byCreatedDesc);
  const control = { failNextSetStatus: null as Error | null, failNextRemove: null as Error | null };

  const list = vi.fn(async (query: FeedbackQuery): Promise<FeedbackPage> => {
    let rs = records.filter((r) => r.projectName === query.projectName);
    if (query.status) rs = rs.filter((r) => r.status === query.status);
    if (query.type) rs = rs.filter((r) => r.type === query.type);
    if (query.search) {
      const s = query.search.toLowerCase();
      rs = rs.filter((r) => r.message.toLowerCase().includes(s));
    }
    const total = rs.length;
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const start = (page - 1) * limit;
    return { feedbacks: rs.slice(start, start + limit), total };
  });

  const setStatus = vi.fn(async (id: string, _projectName: string, status: FeedbackStatus): Promise<FeedbackRecord> => {
    if (control.failNextSetStatus) {
      const err = control.failNextSetStatus;
      control.failNextSetStatus = null;
      throw err;
    }
    const rec = records.find((r) => r.id === id);
    if (!rec) throw new StoreNotFoundError();
    const updated: FeedbackRecord = {
      ...rec,
      status,
      resolvedAt: isClosedStatus(status) ? new Date() : null,
      updatedAt: new Date(),
    };
    records = records.map((r) => (r.id === id ? updated : r));
    return updated;
  });

  const remove = vi.fn(async (id: string): Promise<void> => {
    if (control.failNextRemove) {
      const err = control.failNextRemove;
      control.failNextRemove = null;
      throw err;
    }
    records = records.filter((r) => r.id !== id);
  });

  return {
    list,
    setStatus,
    remove,
    control,
    get records() {
      return records;
    },
  };
}

// ---------------------------------------------------------------------------
// Fetch mocking for createEndpointSource
// ---------------------------------------------------------------------------

/** A `fetchFn` that always returns a 200 JSON `Response` and records its calls. */
export function jsonFetch(body: unknown): Mock<typeof fetch> {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: 200 }));
}

/** A `fetchFn` returning a non-OK `Response` with `status` and a text body. */
export function errorFetch(status: number, text = "boom"): Mock<typeof fetch> {
  return vi.fn<typeof fetch>(async () => new Response(text, { status }));
}

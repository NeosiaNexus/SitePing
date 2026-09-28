// @vitest-environment jsdom
// A send must always end, so the popup (which holds the user while it is
// submitting) always restores. Real launcher + Annotator + Popup + client;
// only the DOM anchor helpers are mocked (jsdom has no layout), as in
// annotator-popup-reentry.test.ts. Issue #342.
import { type SitepingConfig, SitepingError, type SitepingStore } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { launch } from "../../src/launcher.js";
import { mockMatchMedia } from "../helpers.js";

mockMatchMedia(false);

vi.mock(new URL("../../src/dom/anchor.js", import.meta.url).pathname, () => ({
  findAnchorElement: vi.fn().mockReturnValue(document.body),
  generateAnchor: vi.fn().mockReturnValue({
    cssSelector: "body",
    xpath: "/html/body",
    textSnippet: "",
    elementTag: "BODY",
    elementId: undefined,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "0:0:0",
    neighborText: "",
  }),
  rectToPercentages: vi.fn().mockReturnValue({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 }),
}));

const identity = { name: "Ada", email: "ada@example.com" };
const base = { projectName: "p", forceShow: true, identity } as const;
const flush = () => new Promise((r) => setTimeout(r, 30));
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const isSending = () => document.querySelector('[role="dialog"] button[aria-busy="true"]') !== null;
const emptyList = () => Promise.resolve(new Response(JSON.stringify({ feedbacks: [], total: 0 }), { status: 200 }));
/** Mock fetch: GET lists nothing, POST is delegated. */
const stubFetch = (post: (init: RequestInit) => Promise<Response>) =>
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: RequestInit) => (init.method === "POST" ? post(init) : emptyList())),
  );
const onAbort = (init: RequestInit, fn: () => void) => init.signal?.addEventListener("abort", fn);
/** Headers arrive with `status`, then the body stalls — erroring on abort, like real fetch. */
const stalledBody = (init: RequestInit, status: number) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id":'));
        onAbort(init, () => controller.error(new DOMException("aborted", "AbortError")));
      },
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );

let instance: ReturnType<typeof launch> | undefined;

/** Draw a rectangle through the FAB, fill the form, click Send. Fake timers start at Send. */
async function drawAndSend(config: SitepingConfig) {
  instance = launch(config);
  await flush();
  // NODE_ENV=test → the shadow root is open
  document
    .querySelector("siteping-widget")!
    .shadowRoot!.querySelector<HTMLButtonElement>('[data-item-id="annotate"]')!
    .click();
  await flush();
  const overlay = document.querySelector<HTMLElement>('div[role="application"]')!;
  overlay.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 100, bubbles: true }));
  overlay.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 200, bubbles: true }));
  await flush();
  dialog().querySelector<HTMLButtonElement>('button[data-type="bug"]')!.click();
  const textarea = dialog().querySelector("textarea")!;
  textarea.value = "the button is broken";
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  vi.useFakeTimers(); // any timer armed by the send is under test control
  [...dialog().querySelectorAll("button")].find((b) => b.textContent?.includes("Send"))!.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(isSending()).toBe(true);
}

/** Advance 1 s at a time until the popup leaves the submitting state. */
async function secondsUntilRestored(maxSeconds: number): Promise<number | null> {
  for (let s = 1; s <= maxSeconds; s++) {
    await vi.advanceTimersByTimeAsync(1000);
    if (!isSending()) return s;
  }
  return null;
}

const neverStore = {
  createFeedback: vi.fn(() => new Promise<never>(() => {})), // e.g. a remote call with no timeout
  getFeedbacks: vi.fn(async () => ({ feedbacks: [], total: 0 })),
  findByClientId: vi.fn(async () => null),
  updateFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
  deleteAllFeedbacks: vi.fn(),
} satisfies SitepingStore;

describe("a send that never settles", () => {
  afterEach(() => {
    instance?.destroy(); // also when an assertion failed, so the next launch() mounts
    instance = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("HTTP control, stall before the headers: the popup restores after the retry budget", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // zero backoff jitter
    stubFetch(
      (init) => new Promise((_, reject) => onAbort(init, () => reject(new DOMException("aborted", "AbortError")))),
    );
    const onError = vi.fn();
    await drawAndSend({ ...base, endpoint: "/api/siteping", onError });

    expect(await secondsUntilRestored(120)).toBe(47); // 4 x 10 s + 1 + 2 + 4 s backoff
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: "NETWORK", retryable: true });
  });

  it.each<[string, number, () => SitepingConfig]>([
    ["(a) store mode, createFeedback never settles", 30, () => ({ ...base, store: neverStore })],
    [
      "(b) HTTP, 201 headers arrive, then the body stalls",
      10,
      () => {
        stubFetch((init) => Promise.resolve(stalledBody(init, 201)));
        return { ...base, endpoint: "/api/siteping" };
      },
    ],
    [
      "(c) HTTP, the async headers factory never settles",
      10,
      () => {
        stubFetch(() => Promise.resolve(new Response("{}", { status: 201 })));
        // Resolves for the launch-time GET; hangs for the POST, which runs while the popup is busy.
        return {
          ...base,
          endpoint: "/api/siteping",
          headers: () => (isSending() ? new Promise(() => {}) : Promise.resolve({})),
        };
      },
    ],
  ])("%s: the popup restores at the bound and onError gets a retryable error", async (_name, bound, makeConfig) => {
    const onError = vi.fn();
    await drawAndSend({ ...makeConfig(), onError } as SitepingConfig);

    expect(await secondsUntilRestored(120), "seconds until the popup restores").toBe(bound);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(SitepingError);
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ retryable: true });
  });

  it("(d) HTTP, 400 headers arrive, then the body stalls: the popup restores with the validation error", async () => {
    stubFetch((init) => Promise.resolve(stalledBody(init, 400)));
    const onError = vi.fn();
    await drawAndSend({ ...base, endpoint: "/api/siteping", onError });

    expect(await secondsUntilRestored(120), "seconds until the popup restores").toBe(10);
    // The status is known: still the server's verdict (not retryable), only the detail is lost.
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: "VALIDATION", retryable: false });
  });
});

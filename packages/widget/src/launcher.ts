import type {
  DiagnosticsSnapshot,
  FeedbackPayload,
  PageScope,
  SitepingConfig,
  SitepingInstance,
  SitepingPublicEventListener,
  SitepingPublicEvents,
} from "@siteping/core";
import { Annotator } from "./annotator.js";
import { ApiClient, flushRetryQueue, type WidgetClient } from "./api-client.js";
import { MOBILE_BREAKPOINT, PAGE_SIZE, Z_INDEX_MAX } from "./constants.js";
import { ConsoleBuffer } from "./diagnostics/console-buffer.js";
import { NetworkBuffer } from "./diagnostics/network-buffer.js";
import { EventBus, type PublicWidgetEvents, type WidgetEvents } from "./events.js";
import { Fab } from "./fab.js";
import { createT, loadLocale, type TFunction } from "./i18n/index.js";
import { getIdentity, type Identity, saveIdentity } from "./identity.js";
import { MarkerManager } from "./markers.js";
import type { Panel as PanelType } from "./panel.js";
import { StoreClient } from "./store-client.js";
import { buildStyles } from "./styles/base.js";
import { buildThemeColors } from "./styles/theme.js";
import { Tooltip } from "./tooltip.js";

/** Singleton guard — prevents duplicate widgets from overlapping */
let instance: SitepingInstance | null = null;

interface NormalisedDiagnostics {
  console: boolean;
  network: boolean;
  maxConsoleEntries: number;
  maxNetworkEntries: number;
}

/**
 * Resolve `SitepingConfig.captureDiagnostics` into a normalised shape.
 *
 * - `undefined` / `false` → everything off (no monkey-patching).
 * - `true` → console + network on with the defaults (50 / 20).
 * - object → per-channel toggles + optional custom sizes; missing booleans
 *   default to `true` so users can pass `{ maxConsoleEntries: 200 }` and
 *   still get both channels.
 */
function normaliseDiagnosticsOptions(value: SitepingConfig["captureDiagnostics"]): NormalisedDiagnostics {
  if (value === undefined || value === false) {
    return { console: false, network: false, maxConsoleEntries: 50, maxNetworkEntries: 20 };
  }
  if (value === true) {
    return { console: true, network: true, maxConsoleEntries: 50, maxNetworkEntries: 20 };
  }
  return {
    console: value.console !== false,
    network: value.network !== false,
    maxConsoleEntries: typeof value.maxConsoleEntries === "number" ? value.maxConsoleEntries : 50,
    maxNetworkEntries: typeof value.maxNetworkEntries === "number" ? value.maxNetworkEntries : 20,
  };
}

/** Build a no-op SitepingInstance for when the widget is skipped */
function skippedInstance(): SitepingInstance {
  const noop = () => {};
  return {
    destroy: noop,
    open: noop,
    close: noop,
    refresh: noop,
    focusFeedback: () => false,
    on: () => noop,
    off: noop,
  };
}

interface NormalisedDeepLink {
  enabled: boolean;
  param: string;
}

/**
 * Resolve `SitepingConfig.deepLink` into a normalised shape.
 *
 * - `undefined` / `false` → disabled, no URL parsing.
 * - `true` → enabled with default param name `siteping`.
 * - object → enabled with optional custom param name. A bare empty object
 *   `{}` falls back to the default param so callers never need to repeat it.
 */
function normaliseDeepLinkOptions(value: SitepingConfig["deepLink"]): NormalisedDeepLink {
  if (value === undefined || value === false) return { enabled: false, param: "siteping" };
  if (value === true) return { enabled: true, param: "siteping" };
  return { enabled: true, param: value.param ?? "siteping" };
}

/**
 * Main widget launcher — orchestrates all UI components.
 *
 * Architecture:
 * - Creates a <siteping-widget> custom element in the document
 * - Attaches a closed Shadow DOM for CSS isolation
 * - FAB + Panel live inside the Shadow DOM
 * - Overlay, markers, tooltips live outside (appended to document.body)
 */
export function launch(config: SitepingConfig): SitepingInstance {
  // Debug helper — only logs when config.debug is true
  const log: (...args: unknown[]) => void = config.debug
    ? (...args: unknown[]) => console.debug("[siteping]", ...args)
    : () => {};

  // Guard: prevent duplicate initSiteping() calls
  if (instance) {
    log("initSiteping() called more than once — returning existing instance");
    return instance;
  }

  // Guard: only show in development (forceShow bypasses)
  if (!config.forceShow) {
    try {
      // Check for Node/bundler production environment — avoid import.meta
      // which causes "Critical dependency" warnings in Next.js webpack builds
      if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
        const reason = "production";
        console.info("[siteping] Widget not loaded: production mode detected. Use forceShow: true to override.");
        config.onSkip?.(reason);
        return skippedInstance();
      }
    } catch {
      // Silently ignore — browser or restricted environment
    }
  }

  // Guard: desktop only (< MOBILE_BREAKPOINT = hidden)
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    const reason = "mobile";
    console.info(`[siteping] Widget not loaded: viewport width < ${MOBILE_BREAKPOINT}px (mobile not supported).`);
    config.onSkip?.(reason);
    return skippedInstance();
  }

  // Guard: validate required config fields
  if (!config.store && (!config.endpoint || typeof config.endpoint !== "string")) {
    console.error(
      "[siteping] Missing 'endpoint' or 'store' in config. Provide an endpoint like '/api/siteping' or a SitepingStore instance.",
    );
    return skippedInstance();
  }
  if (!config.projectName || typeof config.projectName !== "string") {
    console.error("[siteping] Missing or invalid 'projectName' in config. Expected a non-empty string.");
    return skippedInstance();
  }

  const locale = config.locale ?? "en";
  // Kick off the locale fetch immediately so the panel can render in the
  // resolved language as soon as it mounts. English is bundled synchronously
  // and used as the fallback while the chunk is in flight.
  if (locale !== "en") {
    loadLocale(locale).catch(() => {
      /* fallback to English — already handled by createT */
    });
  }
  const t = createT(locale);

  // Page scope — concrete URL + optional template, used to keep annotations
  // and panel results scoped to the current page. The widget calls this on
  // every initial markers load and on `instance.refresh()`, so SPA hosts can
  // re-fetch when the route changes.
  const scopeAnnotationsByUrl = config.scopeAnnotationsByUrl ?? true;
  const getScope = (): PageScope => {
    try {
      const result = config.getPageScope?.();
      if (result) return result;
    } catch (e) {
      log("getPageScope() threw, falling back to pathname:", e);
    }
    return { url: window.location.pathname, urlPattern: null };
  };

  log("Initializing widget", {
    projectName: config.projectName,
    theme: config.theme ?? "light",
    locale,
    scopeAnnotationsByUrl,
  });

  // Diagnostics — capture console + failed network at submit time when
  // `captureDiagnostics` is set. Buffers are installed eagerly so they
  // cover the entire session, then snapshotted in the annotation handler
  // below. We default to `false` even in dev to avoid surprise side
  // effects; users opt in via the config flag.
  const diagnosticsOpts = normaliseDiagnosticsOptions(config.captureDiagnostics);
  const consoleBuffer = diagnosticsOpts.console ? new ConsoleBuffer(diagnosticsOpts.maxConsoleEntries) : null;
  const networkBuffer = diagnosticsOpts.network ? new NetworkBuffer(diagnosticsOpts.maxNetworkEntries) : null;

  const colors = buildThemeColors(config.accentColor, config.theme);
  const bus = new EventBus<WidgetEvents>();
  const publicBus = new EventBus<PublicWidgetEvents>();

  // Client-side mode (store) vs HTTP mode (endpoint).
  // The earlier guard guarantees one of `store` / `endpoint` is set; we
  // capture the chosen branch in a typed local so TypeScript narrows on
  // each side without resorting to a non-null assertion.
  const client: WidgetClient = (() => {
    if (config.store) return new StoreClient(config.store, config.projectName);
    const endpoint = config.endpoint;
    if (typeof endpoint !== "string" || endpoint.length === 0) {
      throw new Error("[siteping] internal invariant: endpoint must be a non-empty string in HTTP mode");
    }
    return new ApiClient(endpoint, config.projectName);
  })();

  // Wire config callbacks to event bus
  if (config.onOpen) bus.on("open", config.onOpen);
  if (config.onClose) bus.on("close", config.onClose);
  if (config.onFeedbackSent) bus.on("feedback:sent", config.onFeedbackSent);
  if (config.onError) bus.on("feedback:error", config.onError);
  if (config.onAnnotationStart) bus.on("annotation:start", config.onAnnotationStart);
  if (config.onAnnotationEnd) bus.on("annotation:end", config.onAnnotationEnd);

  // Bridge internal events to public bus
  bus.on("feedback:sent", (fb) => publicBus.emit("feedback:sent", fb));
  bus.on("feedback:deleted", (id) => publicBus.emit("feedback:deleted", id));
  bus.on("open", () => publicBus.emit("panel:open"));
  bus.on("close", () => publicBus.emit("panel:close"));

  // Debug logging for key lifecycle events
  bus.on("open", () => log("Panel opened"));
  bus.on("close", () => log("Panel closed"));
  bus.on("feedback:sent", (fb) => log("Feedback sent", fb.id));
  bus.on("feedback:error", (err) => log("Feedback failed", err.message));
  bus.on("annotation:start", () => log("Annotation started"));
  bus.on("annotation:end", () => log("Annotation ended"));

  // Create host element + Shadow DOM
  const host = document.createElement("siteping-widget");
  host.style.cssText = `position:fixed;z-index:${Z_INDEX_MAX};`;
  // Use open mode only for testing — closed in production for CSS isolation.
  // Shadow DOM mode is determined by environment, never by public config.
  let isTestEnv = false;
  try {
    // Dynamic key prevents bundlers (tsup/esbuild) from statically replacing
    // process.env.NODE_ENV at build time — the widget needs runtime detection
    // so E2E tests can set globalThis.process = { env: { NODE_ENV: 'test' } }
    const envKey = "NODE_" + "ENV";
    if (typeof process !== "undefined" && process.env?.[envKey] === "test") {
      isTestEnv = true;
    }
  } catch {
    // Silently ignore — browser or restricted environment
  }
  const shadowMode = isTestEnv ? ("open" as const) : ("closed" as const);
  const shadow = host.attachShadow({ mode: shadowMode });

  // Inject styles into Shadow DOM — adoptedStyleSheets with fallback for Safari < 16.4
  const supportsAdoptedStyleSheets = "adoptedStyleSheets" in ShadowRoot.prototype;
  if (supportsAdoptedStyleSheets) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(buildStyles(colors));
    shadow.adoptedStyleSheets = [sheet];
  } else {
    const style = document.createElement("style");
    style.textContent = buildStyles(colors);
    (shadow as unknown as DocumentFragment).appendChild(style);
  }

  document.body.appendChild(host);

  // Screen reader live region for feedback submission announcements
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.style.cssText =
    "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;";
  document.body.appendChild(liveRegion);

  // Components outside Shadow DOM
  const tooltip = new Tooltip(colors, locale);
  const markers = new MarkerManager(colors, tooltip, bus, t, liveRegion);

  // Components inside Shadow DOM
  const fab = new Fab(shadow, config, bus, t);

  // Lazy-load Panel on first use (FAB click, instance.open, etc.) to keep the
  // initial bundle small. Panel + sub-modules are ~14 KB gzip on their own.
  // Memoize the import promise so subsequent calls reuse the same instance.
  let panelInstance: PanelType | null = null;
  let panelPromise: Promise<PanelType> | null = null;
  let destroyed = false;
  async function loadPanel(): Promise<PanelType | null> {
    if (destroyed) return null;
    if (panelInstance) return panelInstance;
    if (!panelPromise) {
      panelPromise = import("./panel.js").then((mod) => {
        if (destroyed) return null as unknown as PanelType;
        panelInstance = new mod.Panel(shadow, colors, bus, client, config.projectName, markers, t, locale, {
          getScope,
          scopeAnnotationsByUrl,
        });
        return panelInstance;
      });
    }
    return panelPromise;
  }

  // Prefetch Panel in idle time so the first FAB click doesn't pay the
  // network/parse cost of the dynamic import. The chunk still ships lazily
  // (saves first-paint gzip), but it's already warming up by the time the
  // user is likely to click. Falls back to setTimeout in browsers without
  // requestIdleCallback (Safari before 17).
  if (typeof window !== "undefined") {
    const prefetch = () => {
      if (!destroyed) void loadPanel();
    };
    const ric = (window as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (typeof ric === "function") ric(prefetch);
    else setTimeout(prefetch, 200);
  }

  // The FAB emits `panel:toggle` on chat click — we intercept here so the
  // launcher (which holds the lazy loader) can drive the Panel lifecycle.
  // Panel itself also subscribes to `panel:toggle` once loaded; once the
  // dynamic import resolves we manually call `p.open()` because the missed
  // initial emit can't be replayed.
  let pendingOpen = false;
  const unsubToggle = bus.on("panel:toggle", (open) => {
    if (panelInstance) return; // Real Panel already handles subsequent toggles
    if (open) {
      pendingOpen = true;
      loadPanel()
        .then((p) => {
          if (p && pendingOpen) p.open();
          pendingOpen = false;
        })
        .catch((err) => log("Failed to lazy-load panel:", err));
    } else {
      pendingOpen = false;
    }
  });

  const annotator = new Annotator(colors, bus, t, config.enableScreenshot ?? false);

  // Handle annotation completion via event bus (not DOM events)
  // Concurrency guard: prevent duplicate submissions if user draws two annotations quickly
  let submitting = false;
  const unsubAnnotation = bus.on("annotation:complete", async (data) => {
    if (submitting) return;
    submitting = true;
    try {
      const { annotation, type, message, screenshotDataUrl } = data;

      // Ensure identity — config wins (host-provided), then localStorage,
      // then prompt the user as a last resort. Host-provided identity is
      // not persisted: the host stays the source of truth on every render.
      let identity = config.identity ?? getIdentity();
      if (!identity) {
        identity = await promptIdentity(shadow, t);
        if (!identity) {
          // User cancelled the identity prompt — emit `feedback:error` so any
          // pending annotation-submit listener (the popup spinner) unblocks.
          // Without this the popup would wait forever on the second-stage
          // outcome events, and the rectangle would stay drawn on screen.
          bus.emit(
            "feedback:error",
            Object.assign(new Error("Identity required to submit feedback"), { code: "identity-cancelled" }),
          );
          return;
        }
        saveIdentity(identity);
      }

      // crypto.randomUUID() throws in non-secure contexts (plain HTTP)
      const clientId = (() => {
        try {
          return crypto.randomUUID();
        } catch {
          return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
      })();

      // Use scope.url as the single source of truth — same identifier the
      // panel filter and marker filter use. If we stored full URLs here while
      // filtering by pathname, freshly-created feedbacks would never match
      // their own scope filter and would vanish from the UI immediately.
      // Default scope.url is `window.location.pathname` (no query string,
      // so token/key/secret query params can't leak by construction). Hosts
      // that need origin or query in the identifier override `getPageScope`.
      const scope = getScope();

      // Snapshot the buffers right before submit so the captured slice
      // matches the moment the user clicked "send", not some earlier point.
      let diagnostics: DiagnosticsSnapshot | null = null;
      if (consoleBuffer || networkBuffer) {
        diagnostics = {
          console: consoleBuffer?.getEntries() ?? [],
          network: networkBuffer?.getEntries() ?? [],
        };
      }

      const payload: FeedbackPayload = {
        projectName: config.projectName,
        type,
        message,
        url: scope.url,
        urlPattern: scope.urlPattern,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        authorName: identity.name,
        authorEmail: identity.email,
        annotations: [annotation],
        clientId,
        screenshotDataUrl: screenshotDataUrl ?? null,
        diagnostics,
      };

      try {
        const response = await client.sendFeedback(payload);
        bus.emit("feedback:sent", response);
        // Compare against the scope captured before submit (route may have
        // changed during the network round-trip — re-reading scope here
        // would race with SPA navigation).
        if (!scopeAnnotationsByUrl || response.url === scope.url) {
          markers.addFeedback(response, markers.count + 1);
        }
        liveRegion.textContent = t("feedback.sent.confirmation");
        // Only refresh the panel if it has been loaded — `refresh()` is a
        // no-op when the panel is closed, so skipping the dynamic import here
        // avoids loading 14 KB of code that would otherwise do nothing.
        if (panelInstance) await panelInstance.refresh();
      } catch (error) {
        bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
        liveRegion.textContent = t("feedback.error.message");
      }
    } finally {
      submitting = false;
    }
  });

  // Load markers immediately on page load. We always pass the current page URL
  // when scopeAnnotationsByUrl is enabled so the server narrows results to the
  // current page — preventing annotations from one page accidentally rendering
  // on another (when CSS selectors happen to match unrelated elements).
  const initialScope = getScope();
  const initialOptions = scopeAnnotationsByUrl ? { limit: PAGE_SIZE, url: initialScope.url } : { limit: PAGE_SIZE };
  const deepLinkOpts = normaliseDeepLinkOptions(config.deepLink);
  client
    .getFeedbacks(config.projectName, initialOptions)
    .then(({ feedbacks }) => {
      // Defensive client-side filter — backend may not yet support the `url` query.
      const visible = scopeAnnotationsByUrl ? feedbacks.filter((f) => f.url === initialScope.url) : feedbacks;
      markers.render(visible);
      // Apply deeplink focus once markers exist. Failures here are
      // non-fatal — a malformed URL or an unknown ID just leaves the page
      // as the user found it, so log and move on.
      if (deepLinkOpts.enabled) {
        try {
          const focusId = new URLSearchParams(window.location.search).get(deepLinkOpts.param);
          if (focusId) {
            const matched = markers.focusFeedback(focusId);
            log(
              `deepLink ?${deepLinkOpts.param}=${focusId} ${matched ? "focused" : "did not match a visible feedback"}`,
            );
          }
        } catch (e) {
          log("deepLink parsing failed:", e);
        }
      }
    })
    .catch((err) => {
      log("Failed to load initial markers:", err);
    });

  // Flush retry queue on load (HTTP mode only — store mode has no retry queue)
  if (config.endpoint) {
    flushRetryQueue(config.endpoint, config.identity ?? getIdentity())
      .then(() => log("Retry queue flushed"))
      .catch(() => {});
  }

  instance = {
    destroy: () => {
      log("Destroying widget");
      destroyed = true;
      pendingOpen = false;
      unsubAnnotation();
      unsubToggle();
      fab.destroy();
      panelInstance?.destroy();
      annotator.destroy();
      markers.destroy();
      tooltip.destroy();
      // Restore the original console / fetch / XHR so the host page isn't
      // left with patched globals after the widget tears itself down.
      consoleBuffer?.dispose();
      networkBuffer?.dispose();
      bus.removeAll();
      publicBus.removeAll();
      liveRegion.remove();
      host.remove();
      instance = null;
    },
    open: () => {
      // Emit synchronously so consumers wired through `onOpen` / `panel:open`
      // see the open event immediately, even before the Panel module has
      // finished loading on the first call.
      bus.emit("panel:toggle", true);
    },
    close: () => {
      if (panelInstance) {
        panelInstance.close();
      } else {
        // Cancel a pending open before the panel has loaded.
        pendingOpen = false;
      }
    },
    focusFeedback: (feedbackId: string) => {
      // Returns false when no entry matches — unknown ID, feedback filtered
      // out by `scopeAnnotationsByUrl`, or markers not yet loaded (the
      // initial getFeedbacks is async, and the widget exposes no public
      // "markers ready" event today). Hosts that race against initial load
      // can retry, or trigger focus from a user gesture instead.
      return markers.focusFeedback(feedbackId);
    },
    refresh: () => {
      // When the panel is open, its `refresh()` already runs `loadFeedbacks()`
      // which renders markers. Doing a second fetch here would race with that
      // one — the loser overwrites the winner's markers, off by a generation.
      // So: when the panel is open, delegate. When it's closed, fetch markers
      // ourselves (the panel won't, but SPA hosts still need the new page's
      // markers after a route change).
      if (panelInstance?.isCurrentlyOpen) {
        panelInstance.refresh();
        return;
      }

      const scope = getScope();
      const opts = scopeAnnotationsByUrl ? { limit: PAGE_SIZE, url: scope.url } : { limit: PAGE_SIZE };
      client
        .getFeedbacks(config.projectName, opts)
        .then(({ feedbacks }) => {
          const visible = scopeAnnotationsByUrl ? feedbacks.filter((f) => f.url === scope.url) : feedbacks;
          markers.render(visible);
        })
        .catch(() => {});
    },
    // `PublicWidgetEvents` is a structural alias of `SitepingPublicEvents`, so
    // these on/off forwarders compose without any runtime cast.
    on: <K extends keyof SitepingPublicEvents>(event: K, listener: SitepingPublicEventListener<K>) =>
      publicBus.on(event, listener),
    off: <K extends keyof SitepingPublicEvents>(event: K, listener: SitepingPublicEventListener<K>) => {
      publicBus.off(event, listener);
    },
  };

  return instance;
}

/**
 * Show a modal identity form inside the Shadow DOM.
 * Glassmorphism: frosted backdrop, glass modal, gradient CTA.
 * Returns null if the user cancels.
 */
function promptIdentity(shadowRoot: ShadowRoot, t: TFunction): Promise<Identity | null> {
  return new Promise((resolve) => {
    // Save the currently focused element to restore on close
    const previouslyFocused = (shadowRoot.activeElement ?? document.activeElement) as HTMLElement | null;

    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position:fixed;inset:0;
      background:var(--sp-identity-overlay);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;
      z-index:${Z_INDEX_MAX};
      opacity:0;transition:opacity 0.25s ease;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      width:340px;padding:28px;border-radius:var(--sp-radius-xl);
      background:var(--sp-identity-bg);
      backdrop-filter:blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter:blur(var(--sp-blur-heavy));
      border:1px solid var(--sp-glass-border);
      box-shadow:0 16px 48px var(--sp-shadow), 0 8px 16px var(--sp-shadow);
      font-family:var(--sp-font, "Inter",system-ui,-apple-system,sans-serif);
      color:var(--sp-text);
      transform:translateY(12px) scale(0.97);
      transition:transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      -webkit-font-smoothing:antialiased;
    `;

    const titleId = `sp-identity-title-${Date.now()}`;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", titleId);

    const title = document.createElement("div");
    title.className = "sp-identity-title";
    title.id = titleId;
    title.textContent = t("identity.title");
    title.style.marginBottom = "20px";

    const nameInputId = `sp-identity-name-${Date.now()}`;
    const emailInputId = `sp-identity-email-${Date.now()}`;

    const nameLabel = document.createElement("label");
    nameLabel.className = "sp-input-label";
    nameLabel.textContent = t("identity.nameLabel");
    nameLabel.setAttribute("for", nameInputId);
    const nameInput = document.createElement("input");
    nameInput.className = "sp-input";
    nameInput.id = nameInputId;
    nameInput.type = "text";
    nameInput.placeholder = t("identity.namePlaceholder");
    nameInput.style.marginBottom = "14px";

    const emailLabel = document.createElement("label");
    emailLabel.className = "sp-input-label";
    emailLabel.textContent = t("identity.emailLabel");
    emailLabel.setAttribute("for", emailInputId);
    const emailInput = document.createElement("input");
    emailInput.className = "sp-input";
    emailInput.id = emailInputId;
    emailInput.type = "email";
    emailInput.placeholder = t("identity.emailPlaceholder");

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:20px;";

    const closeModal = (result: Identity | null) => {
      backdrop.removeEventListener("keydown", onKeydown);
      backdrop.style.opacity = "0";
      modal.style.transform = "translateY(12px) scale(0.97)";
      setTimeout(() => {
        backdrop.remove();
        previouslyFocused?.focus();
        resolve(result);
      }, 250);
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "sp-btn-ghost";
    cancelBtn.textContent = t("identity.cancel");
    cancelBtn.addEventListener("click", () => closeModal(null));

    const submitBtn = document.createElement("button");
    submitBtn.className = "sp-btn-primary";
    submitBtn.textContent = t("identity.submit");
    submitBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      if (!name || !email) return;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        emailInput.style.borderColor = "var(--sp-type-bug, #ef4444)";
        return;
      }
      closeModal({ name, email });
    });

    // Focus trap: cycle Tab/Shift+Tab within the modal
    const focusableSelectors = 'input, button, [tabindex]:not([tabindex="-1"])';
    const onKeydown = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === "Escape") {
        closeModal(null);
        return;
      }
      if (ke.key === "Tab") {
        const focusableEls = Array.from(modal.querySelectorAll<HTMLElement>(focusableSelectors));
        if (focusableEls.length === 0) return;
        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];
        if (!first || !last) return;
        const active = shadowRoot.activeElement as HTMLElement | null;
        if (ke.shiftKey) {
          if (active === first || !modal.contains(active)) {
            ke.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !modal.contains(active)) {
            ke.preventDefault();
            first.focus();
          }
        }
      }
    };
    backdrop.addEventListener("keydown", onKeydown);

    // Close on backdrop click
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal(null);
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(submitBtn);

    modal.appendChild(title);
    modal.appendChild(nameLabel);
    modal.appendChild(nameInput);
    modal.appendChild(emailLabel);
    modal.appendChild(emailInput);
    modal.appendChild(btnRow);
    backdrop.appendChild(modal);

    shadowRoot.appendChild(backdrop);

    // Animate in
    requestAnimationFrame(() => {
      backdrop.style.opacity = "1";
      modal.style.transform = "translateY(0) scale(1)";
      nameInput.focus();
    });
  });
}

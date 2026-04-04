import type { FeedbackPayload, SitepingConfig, SitepingInstance, SitepingPublicEvents } from "@siteping/core";
import { Annotator } from "./annotator.js";
import { ApiClient, flushRetryQueue } from "./api-client.js";
import { EventBus, type PublicWidgetEvents, type WidgetEvents } from "./events.js";
import { Fab } from "./fab.js";
import { createT, type TFunction } from "./i18n/index.js";
import { getIdentity, type Identity, saveIdentity } from "./identity.js";
import { MarkerManager } from "./markers.js";
import { Panel } from "./panel.js";
import { buildStyles } from "./styles/base.js";
import { buildThemeColors } from "./styles/theme.js";
import { Tooltip } from "./tooltip.js";

/** Singleton guard — prevents duplicate widgets from overlapping */
let instance: SitepingInstance | null = null;

/** Build a no-op SitepingInstance for when the widget is skipped */
function skippedInstance(): SitepingInstance {
  const noop = () => {};
  return {
    destroy: noop,
    open: noop,
    close: noop,
    refresh: noop,
    on: () => noop,
    off: noop,
  };
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

  // Guard: desktop only (< 768px = hidden)
  if (window.innerWidth < 768) {
    const reason = "mobile";
    console.info("[siteping] Widget not loaded: viewport width < 768px (mobile not supported).");
    config.onSkip?.(reason);
    return skippedInstance();
  }

  // Guard: validate required config fields
  if (!config.endpoint || typeof config.endpoint !== "string") {
    console.error("[siteping] Missing or invalid 'endpoint' in config. Expected a string like '/api/siteping'.");
    return skippedInstance();
  }
  if (!config.projectName || typeof config.projectName !== "string") {
    console.error("[siteping] Missing or invalid 'projectName' in config. Expected a non-empty string.");
    return skippedInstance();
  }

  const locale = config.locale ?? "en";
  const t = createT(locale);

  log("Initializing widget", { projectName: config.projectName, theme: config.theme ?? "light", locale });

  const colors = buildThemeColors(config.accentColor, config.theme);
  const bus = new EventBus<WidgetEvents>();
  const publicBus = new EventBus<PublicWidgetEvents>();
  const apiClient = new ApiClient(config.endpoint, config.projectName);

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
  host.style.cssText = "position:fixed;z-index:2147483647;";
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
  const markers = new MarkerManager(colors, tooltip, bus, t);

  // Components inside Shadow DOM
  const fab = new Fab(shadow, config, bus, t);
  const panel = new Panel(shadow, colors, bus, apiClient, config.projectName, markers, t, locale);
  const annotator = new Annotator(colors, bus, t);

  // Handle annotation completion via event bus (not DOM events)
  // Concurrency guard: prevent duplicate submissions if user draws two annotations quickly
  let submitting = false;
  const unsubAnnotation = bus.on("annotation:complete", async (data) => {
    if (submitting) return;
    submitting = true;
    try {
      const { annotation, type, message } = data;

      // Ensure identity
      let identity = getIdentity();
      if (!identity) {
        identity = await promptIdentity(shadow, t);
        if (!identity) return; // User cancelled
        saveIdentity(identity);
      }

      // Sanitize URL — strip sensitive query params before sending
      const rawUrl = new URL(window.location.href);
      for (const key of [...rawUrl.searchParams.keys()]) {
        if (/token|key|secret|auth|session|password|code/i.test(key)) {
          rawUrl.searchParams.delete(key);
        }
      }
      const sanitizedUrl = rawUrl.toString();

      // crypto.randomUUID() throws in non-secure contexts (plain HTTP)
      const clientId = (() => {
        try {
          return crypto.randomUUID();
        } catch {
          return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
      })();

      const payload: FeedbackPayload = {
        projectName: config.projectName,
        type,
        message,
        url: sanitizedUrl,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        authorName: identity.name,
        authorEmail: identity.email,
        annotations: [annotation],
        clientId,
      };

      try {
        const response = await apiClient.sendFeedback(payload);
        bus.emit("feedback:sent", response);
        markers.addFeedback(response, markers.count + 1);
        liveRegion.textContent = t("feedback.sent.confirmation");
        await panel.refresh();
      } catch (error) {
        bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
        liveRegion.textContent = t("feedback.error.message");
      }
    } finally {
      submitting = false;
    }
  });

  // Load markers immediately on page load
  apiClient
    .getFeedbacks(config.projectName, { limit: 50 })
    .then(({ feedbacks }) => {
      markers.render(feedbacks);
    })
    .catch((err) => {
      log("Failed to load initial markers:", err);
    });

  // Flush retry queue on load
  flushRetryQueue(config.endpoint)
    .then(() => log("Retry queue flushed"))
    .catch(() => {});

  instance = {
    destroy: () => {
      log("Destroying widget");
      unsubAnnotation();
      fab.destroy();
      panel.destroy();
      annotator.destroy();
      markers.destroy();
      tooltip.destroy();
      bus.removeAll();
      publicBus.removeAll();
      liveRegion.remove();
      host.remove();
      instance = null;
    },
    open: () => {
      panel.open();
    },
    close: () => {
      panel.close();
    },
    refresh: () => {
      panel.refresh();
    },
    on: <K extends keyof SitepingPublicEvents>(event: K, listener: (...args: SitepingPublicEvents[K]) => void) => {
      // Safe cast: SitepingPublicEvents and PublicWidgetEvents have identical keys and value types
      type TargetKey = K & keyof PublicWidgetEvents;
      return publicBus.on(event as TargetKey, listener as unknown as (...args: PublicWidgetEvents[TargetKey]) => void);
    },
    off: <K extends keyof SitepingPublicEvents>(event: K, listener: (...args: SitepingPublicEvents[K]) => void) => {
      // Safe cast: SitepingPublicEvents and PublicWidgetEvents have identical keys and value types
      type TargetKey = K & keyof PublicWidgetEvents;
      publicBus.off(event as TargetKey, listener as unknown as (...args: PublicWidgetEvents[TargetKey]) => void);
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
      z-index:2147483647;
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

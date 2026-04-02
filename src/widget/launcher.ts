import type { FeedbackPayload, SitepingConfig, SitepingInstance } from "../types.js";
import { buildThemeColors, type ThemeColors } from "../styles/theme.js";
import { buildStyles } from "../styles/base.js";
import { EventBus, type WidgetEvents } from "./events.js";
import { Fab } from "./fab.js";
import { Panel } from "./panel.js";
import { Annotator } from "./annotator.js";
import { Tooltip } from "./tooltip.js";
import { MarkerManager } from "./markers.js";
import { ApiClient, flushRetryQueue } from "./api-client.js";
import { getIdentity, saveIdentity, type Identity } from "./identity.js";

/**
 * Main widget launcher — orchestrates all components.
 *
 * Architecture:
 * - Creates a <siteping-widget> custom element in the document
 * - Attaches a closed Shadow DOM for CSS isolation
 * - FAB + Panel live inside the Shadow DOM
 * - Overlay, markers, tooltips live outside (appended to document.body)
 */
export function launch(config: SitepingConfig): SitepingInstance {
  // Guard: only show in development (forceShow bypasses)
  if (!config.forceShow) {
    try {
      const meta = import.meta as unknown as { env?: { MODE?: string } };
      const proc = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process;
      const mode = meta.env?.MODE ?? proc?.env?.NODE_ENV;
      if (mode === "production") {
        return { destroy: () => {} };
      }
    } catch {
      // import.meta access may throw in non-ESM contexts — ignore
    }
  }

  // Guard: desktop only (< 768px = hidden)
  if (window.innerWidth < 768) {
    return { destroy: () => {} };
  }

  const colors = buildThemeColors(config.accentColor);
  const bus = new EventBus<WidgetEvents>();
  const apiClient = new ApiClient(config.endpoint);

  // Wire config callbacks to event bus
  if (config.onOpen) bus.on("open", config.onOpen);
  if (config.onClose) bus.on("close", config.onClose);
  if (config.onFeedbackSent) bus.on("feedback:sent", config.onFeedbackSent);
  if (config.onError) bus.on("feedback:error", config.onError);
  if (config.onAnnotationStart) bus.on("annotation:start", config.onAnnotationStart);
  if (config.onAnnotationEnd) bus.on("annotation:end", config.onAnnotationEnd);

  // Create host element + Shadow DOM
  const host = document.createElement("siteping-widget");
  host.style.cssText = "position:fixed;z-index:2147483647;";
  // Use open mode only for testing — closed in production for CSS isolation
  const shadowMode = (config as unknown as Record<string, unknown>).__testMode ? "open" as const : "closed" as const;
  const shadow = host.attachShadow({ mode: shadowMode });

  // Inject styles into Shadow DOM via adoptedStyleSheets
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(buildStyles(colors));
  shadow.adoptedStyleSheets = [sheet];

  document.body.appendChild(host);

  // Components outside Shadow DOM
  const tooltip = new Tooltip(colors);
  const markers = new MarkerManager(colors, tooltip, bus);

  // Components inside Shadow DOM
  const fab = new Fab(shadow, config, bus);
  const panel = new Panel(shadow, colors, bus, apiClient, config.projectName, markers);
  const annotator = new Annotator(config, colors, bus);

  // Handle annotation completion via event bus (not DOM events)
  const unsubAnnotation = bus.on("annotation:complete", async (data) => {
    const { annotation, type, message } = data;

    // Ensure identity
    let identity = getIdentity();
    if (!identity) {
      identity = await promptIdentity(shadow, colors);
      if (!identity) return; // User cancelled
      saveIdentity(identity);
    }

    const payload: FeedbackPayload = {
      projectName: config.projectName,
      type,
      message,
      url: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      authorName: identity.name,
      authorEmail: identity.email,
      annotations: [annotation],
      clientId: crypto.randomUUID(),
    };

    try {
      const response = await apiClient.sendFeedback(payload);
      bus.emit("feedback:sent", response);
      markers.addFeedback(response, markers.count + 1);
      await panel.refresh();
    } catch (error) {
      bus.emit("feedback:error", error instanceof Error ? error : new Error(String(error)));
    }
  });

  // Flush retry queue on load
  flushRetryQueue(config.endpoint);

  return {
    destroy: () => {
      unsubAnnotation();
      fab.destroy();
      panel.destroy();
      annotator.destroy();
      markers.destroy();
      tooltip.destroy();
      bus.removeAll();
      host.remove();
    },
  };
}

/**
 * Show a modal identity form inside the Shadow DOM.
 * Returns null if the user cancels.
 */
function promptIdentity(shadowRoot: ShadowRoot, colors: ThemeColors): Promise<Identity | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position:fixed;inset:0;
      background:rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      z-index:2147483647;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      width:320px;padding:24px;border-radius:12px;
      background:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.15);
      font-family:system-ui,-apple-system,sans-serif;
    `;

    const title = document.createElement("div");
    title.className = "sp-identity-title";
    title.textContent = "Identifiez-vous";

    const nameLabel = document.createElement("label");
    nameLabel.className = "sp-input-label";
    nameLabel.textContent = "Nom";
    const nameInput = document.createElement("input");
    nameInput.className = "sp-input";
    nameInput.type = "text";
    nameInput.placeholder = "Votre nom";

    const emailLabel = document.createElement("label");
    emailLabel.className = "sp-input-label";
    emailLabel.textContent = "Email";
    const emailInput = document.createElement("input");
    emailInput.className = "sp-input";
    emailInput.type = "email";
    emailInput.placeholder = "votre@email.com";

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:16px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "sp-btn-ghost";
    cancelBtn.textContent = "Annuler";
    cancelBtn.addEventListener("click", () => {
      backdrop.remove();
      resolve(null);
    });

    const submitBtn = document.createElement("button");
    submitBtn.className = "sp-btn-primary";
    submitBtn.textContent = "Continuer";
    submitBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      if (!name || !email) return;
      backdrop.remove();
      resolve({ name, email });
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
    nameInput.focus();
  });
}

import type { FeedbackPayload, SitepingConfig, SitepingInstance } from "@siteping/core";
import { Annotator } from "./annotator.js";
import { ApiClient, flushRetryQueue } from "./api-client.js";
import { EventBus, type WidgetEvents } from "./events.js";
import { Fab } from "./fab.js";
import { getIdentity, type Identity, saveIdentity } from "./identity.js";
import { MarkerManager } from "./markers.js";
import { Panel } from "./panel.js";
import { buildStyles } from "./styles/base.js";
import { buildThemeColors } from "./styles/theme.js";
import { Tooltip } from "./tooltip.js";

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
  const shadowMode = (config as unknown as Record<string, unknown>).__testMode
    ? ("open" as const)
    : ("closed" as const);
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
      identity = await promptIdentity(shadow);
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

  // Load markers immediately on page load
  apiClient
    .getFeedbacks(config.projectName, { limit: 50 })
    .then(({ feedbacks }) => {
      markers.render(feedbacks);
    })
    .catch(() => {
      // Silently fail — markers will load when panel opens
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
 * Glassmorphism: frosted backdrop, glass modal, gradient CTA.
 * Returns null if the user cancels.
 */
function promptIdentity(shadowRoot: ShadowRoot): Promise<Identity | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.style.cssText = `
      position:fixed;inset:0;
      background:rgba(15, 23, 42, 0.2);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;
      z-index:2147483647;
      opacity:0;transition:opacity 0.25s ease;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
      width:340px;padding:28px;border-radius:20px;
      background:rgba(255, 255, 255, 0.85);
      backdrop-filter:blur(32px);
      -webkit-backdrop-filter:blur(32px);
      border:1px solid rgba(255, 255, 255, 0.35);
      box-shadow:0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06);
      font-family:"Inter",system-ui,-apple-system,sans-serif;
      transform:translateY(12px) scale(0.97);
      transition:transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      -webkit-font-smoothing:antialiased;
    `;

    const title = document.createElement("div");
    title.className = "sp-identity-title";
    title.textContent = "Identifiez-vous";
    title.style.marginBottom = "20px";

    const nameLabel = document.createElement("label");
    nameLabel.className = "sp-input-label";
    nameLabel.textContent = "Nom";
    const nameInput = document.createElement("input");
    nameInput.className = "sp-input";
    nameInput.type = "text";
    nameInput.placeholder = "Votre nom";
    nameInput.style.marginBottom = "14px";

    const emailLabel = document.createElement("label");
    emailLabel.className = "sp-input-label";
    emailLabel.textContent = "Email";
    const emailInput = document.createElement("input");
    emailInput.className = "sp-input";
    emailInput.type = "email";
    emailInput.placeholder = "votre@email.com";

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:20px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "sp-btn-ghost";
    cancelBtn.textContent = "Annuler";
    cancelBtn.addEventListener("click", () => {
      backdrop.style.opacity = "0";
      modal.style.transform = "translateY(12px) scale(0.97)";
      setTimeout(() => {
        backdrop.remove();
        resolve(null);
      }, 250);
    });

    const submitBtn = document.createElement("button");
    submitBtn.className = "sp-btn-primary";
    submitBtn.textContent = "Continuer";
    submitBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      if (!name || !email) return;
      backdrop.style.opacity = "0";
      modal.style.transform = "translateY(12px) scale(0.97)";
      setTimeout(() => {
        backdrop.remove();
        resolve({ name, email });
      }, 250);
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

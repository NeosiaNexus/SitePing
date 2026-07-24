"use client";

import type { SitepingInstance } from "@siteping/widget";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "@/components/landing/copy-button";
import { DiagnosticsTriggers } from "./diagnostics-triggers";

// ---------------------------------------------------------------------------
// State model — the URL query is the single source of truth. Controls write
// non-default values via history.replaceState (Next.js syncs useSearchParams),
// so any configuration is shareable as a link, e.g. /demo?theme=dark&mode=local.
// ---------------------------------------------------------------------------

const LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

interface PlaygroundState {
  mode: "server" | "local";
  theme: "light" | "dark" | "auto";
  locale: LocaleCode;
  position: "bottom-right" | "bottom-left";
  accent: string;
  screenshot: boolean;
  diagnostics: boolean;
  rightClick: boolean;
  identity: boolean;
}

const DEFAULTS: PlaygroundState = {
  mode: "server",
  theme: "light",
  locale: "en",
  position: "bottom-right",
  accent: "#173CFF",
  screenshot: true,
  diagnostics: true,
  rightClick: false,
  identity: false,
};

const OWN_PARAMS = [
  "mode",
  "theme",
  "locale",
  "position",
  "accent",
  "screenshot",
  "diagnostics",
  "rightclick",
  "identity",
] as const;

/** Hex forms the widget accepts: #RGB, #RRGGBB, #RRGGBBAA (stored without the #). */
const HEX_RE = /^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** The widget's own default accent — options matching widget defaults drop out of the snippet. */
const WIDGET_DEFAULT_ACCENT = "#0066ff";

const LOCAL_STORE_KEY = "siteping_demo_local";

const DEMO_IDENTITY = { name: "Alex Client", email: "alex@client.example" };

const SWATCHES = [
  { hex: "#173CFF", name: "product blue" },
  { hex: "#7C3AED", name: "violet" },
  { hex: "#059669", name: "emerald" },
  { hex: "#E11D48", name: "rose" },
  { hex: "#EA580C", name: "orange" },
] as const;

interface ParamsLike {
  get(name: string): string | null;
}

function parseState(params: ParamsLike): PlaygroundState {
  const theme = params.get("theme");
  const locale = params.get("locale");
  const accent = params.get("accent");
  return {
    mode: params.get("mode") === "local" ? "local" : "server",
    theme: theme === "dark" || theme === "auto" ? theme : "light",
    locale: LOCALES.some((l) => l.code === locale) ? (locale as LocaleCode) : "en",
    position: params.get("position") === "bottom-left" ? "bottom-left" : "bottom-right",
    accent: accent && HEX_RE.test(accent) ? `#${accent}` : DEFAULTS.accent,
    screenshot: params.get("screenshot") !== "off",
    diagnostics: params.get("diagnostics") !== "off",
    rightClick: params.get("rightclick") === "on",
    identity: params.get("identity") === "on",
  };
}

/** Serialize non-default state into the query, preserving params we don't own (e.g. ?siteping=). */
function writeState(next: PlaygroundState): void {
  const sp = new URLSearchParams(window.location.search);
  for (const key of OWN_PARAMS) sp.delete(key);
  if (next.mode !== DEFAULTS.mode) sp.set("mode", next.mode);
  if (next.theme !== DEFAULTS.theme) sp.set("theme", next.theme);
  if (next.locale !== DEFAULTS.locale) sp.set("locale", next.locale);
  if (next.position !== DEFAULTS.position) sp.set("position", next.position);
  if (next.accent.toLowerCase() !== DEFAULTS.accent.toLowerCase()) sp.set("accent", next.accent.slice(1));
  if (!next.screenshot) sp.set("screenshot", "off");
  if (!next.diagnostics) sp.set("diagnostics", "off");
  if (next.rightClick) sp.set("rightclick", "on");
  if (next.identity) sp.set("identity", "on");
  const qs = sp.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

/** <input type="color"> only accepts #rrggbb — expand #RGB, truncate #RRGGBBAA. */
function toColorInputValue(hex: string): string {
  const raw = hex.slice(1);
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
  }
  return `#${raw.slice(0, 6)}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// Live config snippet — the playground doubles as living documentation
// ---------------------------------------------------------------------------

interface Token {
  key: string;
  text: string;
  cls: string;
}

interface SnippetLine {
  key: string;
  tokens: readonly Token[];
}

const KEYWORD = "text-purple-400";
const IDENT = "text-yellow-300";
const PROP = "text-blue-300";
const STR = "text-green-400";
const PUNCT = "text-gray-500";

interface RawToken {
  text: string;
  cls: string;
}

const str = (s: string): RawToken => ({ text: `'${s}'`, cls: STR });
const on = (): RawToken => ({ text: "true", cls: KEYWORD });
const punct = (text: string): RawToken => ({ text, cls: PUNCT });

function importLine(name: string, pkg: string): RawToken[] {
  return [
    { text: "import", cls: KEYWORD },
    punct(" { "),
    { text: name, cls: IDENT },
    punct(" } "),
    { text: "from", cls: KEYWORD },
    { text: ` '${pkg}'`, cls: STR },
  ];
}

/**
 * Option lines beyond endpoint/projectName appear only when they differ from
 * the widget's own defaults — exactly the call a real integration would ship.
 * The demo-only `forceShow` is deliberately left out; `deepLink: true` stays
 * because it pairs with the inbox's "Open on page" links.
 */
function buildOptionLines(state: PlaygroundState): { key: string; tokens: RawToken[] }[] {
  const lines: { key: string; tokens: RawToken[] }[] = [];
  if (state.mode === "local") {
    lines.push({
      key: "store",
      tokens: [
        { text: "new ", cls: KEYWORD },
        { text: "LocalStorageStore", cls: IDENT },
        punct("({ "),
        { text: "key", cls: PROP },
        punct(": "),
        str(LOCAL_STORE_KEY),
        punct(" })"),
      ],
    });
  } else {
    lines.push({ key: "endpoint", tokens: [str("/api/siteping")] });
  }
  lines.push({ key: "projectName", tokens: [str("demo")] });
  if (state.theme !== "light") lines.push({ key: "theme", tokens: [str(state.theme)] });
  if (state.locale !== "en") lines.push({ key: "locale", tokens: [str(state.locale)] });
  if (state.position !== "bottom-right") lines.push({ key: "position", tokens: [str(state.position)] });
  if (state.accent.toLowerCase() !== WIDGET_DEFAULT_ACCENT) {
    lines.push({ key: "accentColor", tokens: [str(state.accent)] });
  }
  if (state.screenshot) lines.push({ key: "enableScreenshot", tokens: [on()] });
  if (state.diagnostics) lines.push({ key: "captureDiagnostics", tokens: [on()] });
  if (state.rightClick) lines.push({ key: "enableRightClickComment", tokens: [on()] });
  if (state.identity) {
    lines.push({
      key: "identity",
      tokens: [
        punct("{ "),
        { text: "name", cls: PROP },
        punct(": "),
        str(DEMO_IDENTITY.name),
        punct(", "),
        { text: "email", cls: PROP },
        punct(": "),
        str(DEMO_IDENTITY.email),
        punct(" }"),
      ],
    });
  }
  lines.push({ key: "deepLink", tokens: [on()] });
  return lines;
}

function buildSnippet(state: PlaygroundState): { lines: SnippetLine[]; text: string } {
  const raw: { key: string; tokens: RawToken[] }[] = [];
  raw.push({ key: "import-widget", tokens: importLine("initSiteping", "@siteping/widget") });
  if (state.mode === "local") {
    raw.push({ key: "import-store", tokens: importLine("LocalStorageStore", "@siteping/adapter-localstorage") });
  }
  raw.push({ key: "blank", tokens: [] });
  raw.push({
    key: "open",
    tokens: [{ text: "initSiteping", cls: IDENT }, punct("({")],
  });
  for (const option of buildOptionLines(state)) {
    raw.push({
      key: `opt-${option.key}`,
      tokens: [punct("  "), { text: option.key, cls: PROP }, punct(": "), ...option.tokens, punct(",")],
    });
  }
  raw.push({ key: "close", tokens: [punct("})")] });

  const lines: SnippetLine[] = [];
  for (const line of raw) {
    const tokens: Token[] = [];
    let position = 0;
    for (const token of line.tokens) {
      position += 1;
      tokens.push({ key: `${line.key}.${position}`, ...token });
    }
    lines.push({ key: line.key, tokens });
  }
  const text = lines.map((line) => line.tokens.map((token) => token.text).join("")).join("\n");
  return { lines, text };
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

interface RadioRowProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

function RadioRow<T extends string>({ legend, name, value, options, onChange }: RadioRowProps<T>) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{legend}</legend>
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex-1 cursor-pointer rounded-md px-2 py-1.5 text-center text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 has-[:checked]:bg-white has-[:checked]:text-gray-900 has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent motion-reduce:transition-none"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  caption?: string;
}

function ToggleRow({ label, checked, onChange, caption }: ToggleRowProps) {
  return (
    <div>
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-gray-700">
        {label}
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>
      {caption ? <p className="mt-0.5 text-xs leading-snug text-gray-500">{caption}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Playground panel
// ---------------------------------------------------------------------------

const PANEL_ID = "siteping-playground";

export function Playground() {
  const params = useSearchParams();
  const state = useMemo(() => parseState(params), [params]);
  const { mode, theme, locale, position, accent, screenshot, diagnostics, rightClick, identity } = state;

  const [open, setOpen] = useState(true);
  const [draftAccent, setDraftAccent] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const toggledRef = useRef(false);

  // Start collapsed on narrow viewports so the panel doesn't cover the demo site.
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setOpen(false);
  }, []);

  // Keep keyboard focus on the visible toggle after expanding/collapsing.
  useEffect(() => {
    if (!toggledRef.current) return;
    toggledRef.current = false;
    (open ? collapseRef : tabRef).current?.focus();
  }, [open]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Any config change tears the widget down and rebuilds it — the singleton
  // guard requires destroy() before re-init.
  useEffect(() => {
    let cancelled = false;
    let instance: SitepingInstance | null = null;

    (async () => {
      const [{ initSiteping }, storeModule] = await Promise.all([
        import("@siteping/widget"),
        mode === "local" ? import("@siteping/adapter-localstorage") : Promise.resolve(null),
      ]);
      if (cancelled) return;
      instance = initSiteping({
        projectName: "demo",
        forceShow: true,
        // "Open on page" links from the inbox (?siteping=<id>) focus the annotation.
        deepLink: true,
        theme,
        locale,
        position,
        accentColor: accent,
        enableScreenshot: screenshot,
        captureDiagnostics: diagnostics,
        enableRightClickComment: rightClick,
        ...(identity ? { identity: DEMO_IDENTITY } : {}),
        ...(storeModule
          ? { store: new storeModule.LocalStorageStore({ key: LOCAL_STORE_KEY }) }
          : { endpoint: "/api/siteping" }),
      });
    })();

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [mode, theme, locale, position, accent, screenshot, diagnostics, rightClick, identity]);

  const patch = (partial: Partial<PlaygroundState>) => writeState({ ...state, ...partial });

  const shownAccent = draftAccent ?? accent;

  function handleAccentSelect(hex: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraftAccent(null);
    patch({ accent: hex });
  }

  function handleAccentInput(hex: string) {
    setDraftAccent(hex);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Color pickers fire on every drag tick — commit (and rebuild the widget)
    // only once the value settles.
    debounceRef.current = setTimeout(() => {
      setDraftAccent(null);
      writeState({ ...state, accent: hex });
    }, 150);
  }

  function handleReset() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDraftAccent(null);
    writeState(DEFAULTS);
  }

  function toggleOpen(next: boolean) {
    toggledRef.current = true;
    setOpen(next);
  }

  const snippet = buildSnippet(state);

  return (
    // data-siteping-ignore keeps the panel out of widget screenshots.
    <aside
      data-siteping-ignore="true"
      aria-label="Widget playground"
      className="fixed left-0 top-28 z-40 flex max-h-[calc(100vh-8.5rem)]"
    >
      {open ? (
        <div
          id={PANEL_ID}
          className="flex w-72 max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-r-xl border border-l-0 border-gray-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-gray-100 py-2 pl-4 pr-2">
            <h2 className="text-sm font-bold tracking-tight text-gray-900">Widget playground</h2>
            <button
              ref={collapseRef}
              type="button"
              onClick={() => toggleOpen(false)}
              aria-expanded="true"
              aria-controls={PANEL_ID}
              aria-label="Collapse the playground"
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <div>
              <RadioRow
                legend="Mode"
                name="pg-mode"
                value={mode}
                options={[
                  { value: "server", label: "Server API" },
                  { value: "local", label: "Local (this browser)" },
                ]}
                onChange={(value) => patch({ mode: value })}
              />
              <p className="mt-1.5 text-xs leading-snug text-gray-500">
                {mode === "local"
                  ? "Feedbacks stay in this browser — no server involved"
                  : "Feedbacks go to the demo API (resets every 10 minutes)"}
              </p>
            </div>

            <RadioRow
              legend="Theme"
              name="pg-theme"
              value={theme}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "auto", label: "Auto" },
              ]}
              onChange={(value) => patch({ theme: value })}
            />

            <div>
              <label
                htmlFor="pg-locale"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Locale
              </label>
              <select
                id="pg-locale"
                value={locale}
                onChange={(event) => patch({ locale: event.target.value as LocaleCode })}
                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {LOCALES.map((entry) => (
                  <option key={entry.code} value={entry.code}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>

            <RadioRow
              legend="Position"
              name="pg-position"
              value={position}
              options={[
                { value: "bottom-right", label: "Bottom right" },
                { value: "bottom-left", label: "Bottom left" },
              ]}
              onChange={(value) => patch({ position: value })}
            />

            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Accent color
              </legend>
              <div className="flex items-center gap-2">
                {SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => handleAccentSelect(swatch.hex)}
                    aria-label={`Accent ${swatch.name}`}
                    aria-pressed={shownAccent.toLowerCase() === swatch.hex.toLowerCase()}
                    style={{ backgroundColor: swatch.hex }}
                    className="h-7 w-7 rounded-full border border-black/10 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 aria-pressed:ring-2 aria-pressed:ring-gray-900 aria-pressed:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100"
                  />
                ))}
                <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                  <input
                    type="color"
                    value={toColorInputValue(shownAccent)}
                    onChange={(event) => handleAccentInput(event.target.value)}
                    aria-label="Custom accent color"
                    className="h-7 w-8 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                  />
                  Custom
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-2.5">
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Options</legend>
              <ToggleRow label="Screenshots" checked={screenshot} onChange={(value) => patch({ screenshot: value })} />
              <div>
                <ToggleRow
                  label="Capture diagnostics"
                  checked={diagnostics}
                  onChange={(value) => patch({ diagnostics: value })}
                />
                {diagnostics ? (
                  <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-2.5">
                    <p className="mb-2 text-xs leading-snug text-gray-500">
                      Fire fake events, then submit a feedback to see them captured.
                    </p>
                    <DiagnosticsTriggers />
                  </div>
                ) : null}
              </div>
              <ToggleRow
                label="Right-click to comment"
                checked={rightClick}
                onChange={(value) => patch({ rightClick: value })}
              />
              <ToggleRow
                label="Prefilled identity"
                checked={identity}
                onChange={(value) => patch({ identity: value })}
                caption="Skips the name/email prompt, like an SSO integration would"
              />
            </fieldset>

            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
            >
              Reset to defaults
            </button>

            <section aria-label="Generated widget code">
              <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
                <div className="flex items-center justify-between border-b border-gray-800 pl-3">
                  <span className="font-mono text-xs text-gray-500">The code you&apos;d ship</span>
                  <CopyButton text={snippet.text} />
                </div>
                <pre className="overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed">
                  <code>
                    {snippet.lines.map((line) => (
                      <Fragment key={line.key}>
                        {line.tokens.map((token) => (
                          <span key={token.key} className={token.cls}>
                            {token.text}
                          </span>
                        ))}
                        {"\n"}
                      </Fragment>
                    ))}
                  </code>
                </pre>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <button
          ref={tabRef}
          type="button"
          onClick={() => toggleOpen(true)}
          aria-expanded="false"
          aria-controls={PANEL_ID}
          className="rounded-r-lg border border-l-0 border-gray-200 bg-white px-1.5 py-4 text-xs font-semibold tracking-wide text-gray-700 shadow-lg transition-colors [writing-mode:vertical-rl] hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none"
        >
          Playground
        </button>
      )}
    </aside>
  );
}

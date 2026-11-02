"use client";

import type { SitepingInstance } from "@siteping/widget";
import { useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "@/components/landing/copy-button";
import { bricolage, jetbrains } from "@/components/landing/fonts";
import { LogoMark } from "@/components/landing/icons";
import { Coach, type CoachState, coachAlreadySeen, markCoachSeen } from "./coach";
import { Label, Section, Segmented, SwitchRow } from "./controls";
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
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
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

const KEYWORD = "text-[#b8a6ff]";
const IDENT = "text-paper";
const PROP = "text-cobalt-soft";
const STR = "text-[#8fe3b9]";
const PUNCT = "text-dim";

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
// Playground panel
// ---------------------------------------------------------------------------

const PANEL_ID = "siteping-playground";

export function Playground() {
  const params = useSearchParams();
  const state = useMemo(() => parseState(params), [params]);
  const { mode, theme, locale, position, accent, screenshot, diagnostics, rightClick, identity } = state;

  const [open, setOpen] = useState(false);
  const [coach, setCoach] = useState<CoachState>("hidden");
  const dismissCoach = useCallback(() => setCoach("hidden"), []);
  const [draftAccent, setDraftAccent] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const collapseRef = useRef<HTMLButtonElement>(null);
  const toggledRef = useRef(false);
  // Deep links (?siteping=<id>) focus their annotation on the FIRST init only —
  // playground rebuilds must not re-scroll the visitor back to it on every toggle.
  const firstInitRef = useRef(true);

  // Open by default only where the panel fits beside the client site (its
  // 72rem column plus the panel's 21.5rem on each side); elsewhere it waits as
  // a pill, so it never covers the page the visitor came to annotate.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1840px)").matches) setOpen(true);
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
    let hintTimer: number | undefined;

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
        deepLink: firstInitRef.current,
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
      firstInitRef.current = false;

      // Guidance: point at the button once per browser, and bridge to the
      // inbox after every note sent.
      instance.on("annotation:start", () => setCoach("hidden"));
      instance.on("panel:open", () => setCoach("hidden"));
      instance.on("feedback:sent", () => setCoach("sent"));
      if (!coachAlreadySeen()) {
        markCoachSeen();
        hintTimer = window.setTimeout(() => setCoach((c) => (c === "hidden" ? "hint" : c)), 1400);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(hintTimer);
      instance?.destroy();
    };
  }, [mode, theme, locale, position, accent, screenshot, diagnostics, rightClick, identity]);

  const patch = (partial: Partial<PlaygroundState>) => {
    // Fold in (and disarm) any pending debounced accent commit so it can't
    // fire later with a stale snapshot and revert this change.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const pending = draftAccent && HEX_RE.test(draftAccent.slice(1)) ? { accent: draftAccent } : {};
    setDraftAccent(null);
    writeState({ ...state, ...pending, ...partial });
  };

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
  const inboxHref = mode === "local" ? "/demo/inbox?mode=local" : "/demo/inbox";

  return (
    // data-siteping-ignore keeps the panel out of widget screenshots.
    <aside
      data-siteping-ignore="true"
      aria-label="Widget playground"
      className={`landing ${bricolage.variable} ${jetbrains.variable} !bg-transparent`}
    >
      {/* Phones: the pill sits in the bottom corner the widget's button doesn't use. */}
      <div
        className={`fixed z-40 sm:bottom-auto sm:left-4 sm:right-auto sm:top-[7.5rem] ${
          position === "bottom-left" ? "bottom-4 right-4" : "bottom-4 left-4"
        }`}
      >
        {/* Collapsed: a pill. Open: the panel grows out of the same corner (origin top-left, 200ms). */}
        <button
          ref={tabRef}
          type="button"
          onClick={() => toggleOpen(true)}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          tabIndex={open ? -1 : 0}
          className={`press focus-ring absolute bottom-0 flex h-11 sm:bottom-auto sm:left-0 sm:right-auto sm:top-0 ${position === "bottom-left" ? "right-0" : "left-0"} items-center gap-2.5 whitespace-nowrap rounded-full bg-ink py-1.5 pl-1.5 pr-4 text-[14px] font-medium text-paper shadow-[0_14px_36px_-12px_rgb(5_7_26/0.6),0_0_0_1px_rgb(148_163_255/0.16)] transition-[opacity,transform] duration-200 ease-out-strong ${
            open ? "pointer-events-none scale-95 opacity-0" : "opacity-100"
          }`}
        >
          <LogoMark className="h-8 w-8" />
          Playground
        </button>

        <div
          id={PANEL_ID}
          inert={!open}
          className={`flex max-h-[calc(100dvh-8.5rem)] w-[19.5rem] max-w-[calc(100vw-2rem)] flex-col sm:origin-top-left ${position === "bottom-left" ? "origin-bottom-right" : "origin-bottom-left"} overflow-hidden rounded-[1.4rem] bg-ink text-paper shadow-[0_30px_80px_-24px_rgb(5_7_26/0.75),0_0_0_1px_rgb(148_163_255/0.16)] transition-[opacity,transform] duration-200 ease-out-strong ${
            open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.96] opacity-0"
          } motion-reduce:transition-opacity`}
        >
          <div className="flex items-center gap-3 border-b border-line py-3 pl-3 pr-2.5">
            <LogoMark className="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold leading-tight">Playground</h2>
              <p className="text-[12.5px] leading-tight text-dim">Every change rebuilds the widget</p>
            </div>
            <button
              ref={collapseRef}
              type="button"
              onClick={() => toggleOpen(false)}
              aria-label="Collapse the playground"
              className="press focus-ring flex h-8 w-8 items-center justify-center rounded-full text-dim transition-colors duration-150 hover:bg-white/[0.06] hover:text-paper"
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

          <div className="flex-1 overflow-y-auto overscroll-contain [scrollbar-color:rgb(148_163_255/0.2)_transparent] [scrollbar-width:thin]">
            <Section title="Where notes go">
              <Segmented
                legend="Storage"
                name="pg-mode"
                value={mode}
                options={[
                  { value: "server", label: "Demo server" },
                  { value: "local", label: "This browser" },
                ]}
                onChange={(value) => patch({ mode: value })}
              />
              <p className="-mt-1 text-[12.5px] leading-snug text-dim">
                {mode === "local"
                  ? "Notes stay in this browser's localStorage, no server involved."
                  : "Notes go to the demo API, wiped every 10 minutes."}
              </p>
            </Section>

            <Section title="Look">
              <Segmented
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
              <Segmented
                legend="Button position"
                name="pg-position"
                value={position}
                options={[
                  { value: "bottom-right", label: "Right" },
                  { value: "bottom-left", label: "Left" },
                ]}
                onChange={(value) => patch({ position: value })}
              />
              <div>
                <Label htmlFor="pg-locale">Language</Label>
                <div className="relative">
                  <select
                    id="pg-locale"
                    value={locale}
                    onChange={(event) => patch({ locale: event.target.value as LocaleCode })}
                    className="focus-ring w-full cursor-pointer appearance-none rounded-xl bg-white/[0.04] px-3 py-2 pr-9 text-[14px] text-paper ring-1 ring-line"
                  >
                    {LOCALES.map((entry) => (
                      <option key={entry.code} value={entry.code} className="bg-ink">
                        {entry.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  >
                    <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-mist">Accent color</legend>
                <div className="flex items-center gap-2.5">
                  {SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => handleAccentSelect(swatch.hex)}
                      aria-label={`Accent ${swatch.name}`}
                      aria-pressed={shownAccent.toLowerCase() === swatch.hex.toLowerCase()}
                      style={{ backgroundColor: swatch.hex }}
                      className="press focus-ring h-7 w-7 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15)] transition-[box-shadow,transform] duration-150 aria-pressed:shadow-[0_0_0_2px_#05071a,0_0_0_4px_#eef1ff]"
                    />
                  ))}
                  <label className="press relative ml-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[conic-gradient(#ff5f6d,#ffc371,#8fe3b9,#7690ff,#b8a6ff,#ff5f6d)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cobalt-soft">
                    <input
                      type="color"
                      value={toColorInputValue(shownAccent)}
                      onChange={(event) => handleAccentInput(event.target.value)}
                      aria-label="Custom accent color"
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </fieldset>
            </Section>

            <Section title="Behaviour">
              <div className="space-y-2">
                <SwitchRow
                  label="Screenshots"
                  checked={screenshot}
                  onChange={(value) => patch({ screenshot: value })}
                />
                <SwitchRow
                  label="Capture diagnostics"
                  checked={diagnostics}
                  onChange={(value) => patch({ diagnostics: value })}
                />
                {diagnostics ? (
                  <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-line">
                    <p className="mb-2.5 text-[12.5px] leading-snug text-dim">
                      Fire a few events, then send a note: they ride along with it.
                    </p>
                    <DiagnosticsTriggers />
                  </div>
                ) : null}
                <SwitchRow
                  label="Right-click to comment"
                  checked={rightClick}
                  onChange={(value) => patch({ rightClick: value })}
                />
                <SwitchRow
                  label="Prefilled identity"
                  checked={identity}
                  onChange={(value) => patch({ identity: value })}
                  caption="Skips the name and email prompt, the way an SSO integration would."
                />
              </div>
            </Section>

            <Section title="The code you'd ship">
              <div className="overflow-hidden rounded-xl bg-[#03040f] ring-1 ring-line">
                <div className="flex h-9 items-center justify-between border-b border-line pl-3 pr-1">
                  <span className="font-code text-[11.5px] text-dim">app.ts</span>
                  <CopyButton
                    text={snippet.text}
                    className="press focus-ring flex h-7 w-7 items-center justify-center rounded-lg text-dim transition-[color,background-color,transform] duration-150 hover:bg-white/[0.06] hover:text-paper"
                  />
                </div>
                {/* Wraps instead of scrolling sideways: no scroll region to reach from the keyboard; Copy keeps the exact text. */}
                <pre className="whitespace-pre-wrap break-words px-3 py-3 font-code text-[11.5px] leading-[1.7]">
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
              <button
                type="button"
                onClick={handleReset}
                className="press focus-ring w-full rounded-xl py-2 text-[13px] text-mist ring-1 ring-line transition-colors duration-150 hover:bg-white/[0.04] hover:text-paper"
              >
                Reset to defaults
              </button>
            </Section>
          </div>
        </div>
      </div>

      <Coach state={coach} position={position} inboxHref={inboxHref} onDismiss={dismissCoach} />
    </aside>
  );
}

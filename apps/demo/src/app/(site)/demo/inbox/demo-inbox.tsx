"use client";

import { LocalStorageStore } from "@siteping/adapter-localstorage";
import { createStoreSource, SitepingInbox } from "@siteping/dashboard";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { Label, Segmented } from "../controls";

// Same key the /demo playground writes to in local mode.
const LOCAL_STORE_KEY = "siteping_demo_local";

/** In-copy link back to /demo — keeps ?mode=local so local-mode visitors stay on their store. */
export function DemoSiteLink({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const href = params.get("mode") === "local" ? "/demo?mode=local" : "/demo";
  return (
    <Link
      href={href}
      className="focus-ring rounded text-paper underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:decoration-paper/60"
    >
      {children}
    </Link>
  );
}

const LOCALES = [
  ["en", "English"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["es", "Español"],
  ["it", "Italiano"],
  ["pt", "Português"],
  ["ru", "Русский"],
  ["ja", "日本語"],
  ["ko", "한국어"],
] as const;

type LocaleCode = (typeof LOCALES)[number][0];

/** Write one query param via history.replaceState (no navigation) — defaults drop out of the URL. */
function setQueryParam(key: string, value: string, defaultValue: string): void {
  const next = new URLSearchParams(window.location.search);
  if (value === defaultValue) next.delete(key);
  else next.set(key, value);
  const qs = next.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

function LocaleSelect({ value }: { value: LocaleCode }) {
  return (
    <div className="w-40">
      <Label htmlFor="inbox-locale">Language</Label>
      <div className="relative">
        <select
          id="inbox-locale"
          value={value}
          onChange={(event) => setQueryParam("locale", event.target.value, "en")}
          className="focus-ring h-10 w-full cursor-pointer appearance-none rounded-xl bg-white/[0.04] px-3 pr-9 text-[14px] text-paper ring-1 ring-line"
        >
          {LOCALES.map(([code, label]) => (
            <option key={code} value={code} className="bg-ink">
              {label}
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
  );
}

export function DemoInbox() {
  // ?theme=, ?density=, ?locale= and ?mode=local — the URL is the source of
  // truth so any configuration stays shareable as a link.
  const params = useSearchParams();
  const themeParam = params.get("theme");
  const theme = themeParam === "light" || themeParam === "auto" ? themeParam : "dark";
  const density = params.get("density") === "compact" ? "compact" : "comfortable";
  const localeParam = params.get("locale");
  const locale = LOCALES.some(([code]) => code === localeParam) ? (localeParam as LocaleCode) : "en";
  const localMode = params.get("mode") === "local";

  const source = useMemo(
    () => (localMode ? createStoreSource(new LocalStorageStore({ key: LOCAL_STORE_KEY })) : null),
    [localMode],
  );

  const shared = {
    theme,
    density,
    accentColor: "#173CFF",
    locale,
    className: "h-full",
    // Who the demo replies as: without an author, threads are read-only.
    author: { name: "SitePing demo" },
  } as const;

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="w-56">
          <Segmented
            legend="Theme"
            name="inbox-theme"
            value={theme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "auto", label: "Auto" },
            ]}
            onChange={(value) => setQueryParam("theme", value, "dark")}
          />
        </div>
        <div className="w-60">
          <Segmented
            legend="Density"
            name="inbox-density"
            value={density}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
            onChange={(value) => setQueryParam("density", value, "comfortable")}
          />
        </div>
        <LocaleSelect value={locale} />
        {localMode ? (
          <p className="pb-2 text-[13px] text-dim">
            Showing the notes the demo&apos;s local mode stored in this browser.
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8),0_0_0_1px_rgb(148_163_255/0.14)]">
        {source ? (
          <SitepingInbox source={source} projects={["demo"]} {...shared} />
        ) : (
          <SitepingInbox endpoint="/api/siteping" projects={["demo", "landing"]} {...shared} />
        )}
      </div>
    </div>
  );
}

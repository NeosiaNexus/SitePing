"use client";

import { LocalStorageStore } from "@siteping/adapter-localstorage";
import { createStoreSource, SitepingInbox } from "@siteping/dashboard";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useMemo } from "react";

// Same key the /demo playground writes to in local mode.
const LOCAL_STORE_KEY = "siteping_demo_local";

/** In-copy link back to /demo — keeps ?mode=local so local-mode visitors stay on their store. */
export function DemoSiteLink({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const href = params.get("mode") === "local" ? "/demo?mode=local" : "/demo";
  return (
    <Link href={href} className="text-gray-200 underline underline-offset-2 hover:text-white">
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

interface SelectControlProps {
  label: string;
  id: string;
  value: string;
  defaultValue: string;
  queryKey: string;
  options: ReadonlyArray<readonly [string, string]>;
}

function SelectControl({ label, id, value, defaultValue, queryKey, options }: SelectControlProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-xs font-medium text-gray-400">
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => setQueryParam(queryKey, event.target.value, defaultValue)}
        className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
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
  } as const;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <SelectControl
          label="Theme"
          id="inbox-theme"
          value={theme}
          defaultValue="dark"
          queryKey="theme"
          options={[
            ["light", "Light"],
            ["dark", "Dark"],
            ["auto", "Auto"],
          ]}
        />
        <SelectControl
          label="Density"
          id="inbox-density"
          value={density}
          defaultValue="comfortable"
          queryKey="density"
          options={[
            ["comfortable", "Comfortable"],
            ["compact", "Compact"],
          ]}
        />
        <SelectControl
          label="Locale"
          id="inbox-locale"
          value={locale}
          defaultValue="en"
          queryKey="locale"
          options={LOCALES}
        />
        {localMode ? (
          <p className="text-xs text-gray-500">
            Viewing feedbacks stored in this browser by the demo&apos;s local mode.
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        {source ? (
          <SitepingInbox source={source} projects={["demo"]} {...shared} />
        ) : (
          <SitepingInbox endpoint="/api/siteping" projects={["demo", "landing"]} {...shared} />
        )}
      </div>
    </div>
  );
}

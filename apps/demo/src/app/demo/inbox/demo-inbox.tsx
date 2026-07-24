"use client";

import { SitepingInbox } from "@siteping/dashboard";
import { useSearchParams } from "next/navigation";

export function DemoInbox() {
  // ?theme=light|dark|auto and ?density=compact let visitors poke at the
  // customization surface without leaving the demo.
  const params = useSearchParams();
  const themeParam = params.get("theme");
  const theme = themeParam === "light" || themeParam === "auto" ? themeParam : "dark";
  const density = params.get("density") === "compact" ? "compact" : "comfortable";

  return (
    <SitepingInbox
      endpoint="/api/siteping"
      projects={["demo", "landing"]}
      theme={theme}
      density={density}
      accentColor="#173CFF"
      locale="en"
      className="h-full"
    />
  );
}

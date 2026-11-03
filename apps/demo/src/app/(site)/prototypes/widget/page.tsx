import type { Metadata } from "next";
import { DemoSite } from "@/components/demo/demo-site";
import { WidgetPrototypeHarness } from "./harness";

// PROTOTYPE ONLY: widget directions behind a picker, deleted once one is chosen.
export const metadata: Metadata = {
  title: "Widget prototypes",
  robots: { index: false, follow: false },
};

export default function WidgetPrototypesPage() {
  return (
    <>
      <WidgetPrototypeHarness />
      <DemoSite />
    </>
  );
}

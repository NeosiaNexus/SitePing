import type { Metadata } from "next";
import { Suspense } from "react";
import { bricolage, jetbrains } from "@/components/landing/fonts";
import { DemoInbox, DemoSiteLink } from "./demo-inbox";

export const metadata: Metadata = {
  title: "Demo inbox",
  description:
    "The freelancer side of SitePing: a Linear-style triage inbox with annotated screenshots, keyboard shortcuts, and deep links back to the page.",
};

const keys: [string, string][] = [
  ["j k", "move"],
  ["e", "resolve"],
  ["p", "in progress"],
  ["x", "won't fix"],
  ["Enter", "details"],
  ["?", "everything else"],
];

export default function InboxPage() {
  return (
    <main className={`landing ${bricolage.variable} ${jetbrains.variable} min-h-screen px-4 pb-10 pt-10 sm:px-6`}>
      <div className="mx-auto flex max-w-[78rem] flex-col gap-8">
        <header className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h1 className="type-title text-[clamp(2.2rem,4.6vw,3.6rem)] text-paper">Feedback inbox</h1>
            <p className="mt-4 max-w-[38rem] text-[16px] leading-relaxed text-mist">
              Everything clients draw on the{" "}
              <Suspense
                fallback={
                  <a href="/demo" className="text-paper underline decoration-line-strong underline-offset-4">
                    demo site
                  </a>
                }
              >
                <DemoSiteLink>demo site</DemoSiteLink>
              </Suspense>{" "}
              lands here, on the element it was drawn on, with its screenshot. Work through it from the keyboard.
            </p>
          </div>
          <ul aria-label="Keyboard shortcuts" className="flex flex-wrap gap-x-4 gap-y-2 lg:col-span-5 lg:justify-end">
            {keys.map(([combo, action]) => (
              <li key={action} className="flex items-center gap-1.5 text-[13px] text-dim">
                {combo.split(" ").map((k) => (
                  <kbd
                    key={k}
                    className="min-w-6 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-center font-code text-[11.5px] text-paper ring-1 ring-line"
                  >
                    {k}
                  </kbd>
                ))}
                {action}
              </li>
            ))}
          </ul>
        </header>
        <div className="h-[calc(100vh-15rem)] min-h-[560px]">
          {/* useSearchParams in DemoInbox requires a Suspense boundary for static rendering */}
          <Suspense fallback={null}>
            <DemoInbox />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

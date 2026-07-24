import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoInbox, DemoSiteLink } from "./demo-inbox";

export const metadata: Metadata = {
  title: "Feedback inbox — SitePing demo",
  description:
    "The freelancer side of SitePing: a Linear-style triage inbox with annotated screenshots, keyboard shortcuts, and deep links back to the page.",
};

export default function InboxPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-light">Triage demo</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Feedback inbox</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
              Everything clients draw on the{" "}
              <Suspense
                fallback={
                  <a href="/demo" className="text-gray-200 underline underline-offset-2 hover:text-white">
                    demo site
                  </a>
                }
              >
                <DemoSiteLink>demo site</DemoSiteLink>
              </Suspense>{" "}
              arrives here. Try the keyboard: <Kbd>j</Kbd>/<Kbd>k</Kbd> to move, <Kbd>e</Kbd> resolve, <Kbd>p</Kbd> in
              progress, <Kbd>x</Kbd> won&apos;t fix, <Kbd>Enter</Kbd> for details, <Kbd>?</Kbd> for everything else.
            </p>
          </div>
        </header>
        <div className="h-[calc(100vh-14rem)] min-h-[520px]">
          {/* useSearchParams in DemoInbox requires a Suspense boundary for static rendering */}
          <Suspense fallback={null}>
            <DemoInbox />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-gray-700 bg-gray-900 px-1.5 py-0.5 font-mono text-[11px] text-gray-300">
      {children}
    </kbd>
  );
}

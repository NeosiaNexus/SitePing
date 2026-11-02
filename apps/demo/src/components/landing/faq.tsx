import Link from "next/link";
import type { ReactNode } from "react";

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "What databases are supported?",
    a: "Any database supported by Prisma — PostgreSQL, MySQL, SQLite, MongoDB, CockroachDB, and more — or, with the Drizzle adapter, PostgreSQL and Turso / libSQL.",
  },
  {
    q: "Does it work with frameworks other than Next.js?",
    a: "The widget is framework-agnostic — it works with React, Vue, Svelte, Astro, or vanilla JavaScript. The CLI currently scaffolds Next.js API routes, but the server handler (@siteping/server) works with any framework that handles standard Request/Response — Hono, Express, Remix, SvelteKit and more.",
  },
  {
    q: "What happens when the page layout changes?",
    a: "Each annotation records several signals for the element it was drawn on — a CSS selector, an XPath, its text and the text around it, a structural fingerprint, and an optional data-feedback-anchor key you set. On reload, every element any of them matches is scored against all the signals, and the best match wins; a match it is unsure of is drawn as approximate. The rectangle is stored as percentages of that element, so it follows responsive layouts.",
  },
  {
    q: "Is there a dashboard to view feedback?",
    a: (
      <>
        Yes — install @siteping/dashboard and drop the {"<SitepingInbox />"} React component into your admin page. It is
        a Linear-style triage inbox with j/k keyboard shortcuts, four statuses, and the client&apos;s annotation
        re-drawn on the screenshot.{" "}
        <Link
          href="/demo/inbox"
          className="focus-ring rounded text-paper underline decoration-line-strong underline-offset-4 hover:decoration-paper/60"
        >
          See it working in the demo inbox
        </Link>
        .
      </>
    ),
  },
  {
    q: "How big is the widget bundle?",
    a: "About 59 kB gzipped on first load — the ESM entry and the chunk it imports, everything the browser fetches before the widget runs. The feedback panel (about 10 kB), screenshot capture, and non-English locales load on demand on top of that. CI fails any change that outgrows these budgets.",
  },
  {
    q: "What about the GDPR?",
    a: "SitePing stores feedback in your own database, and sends it nowhere else unless you turn that on: webhooks (Slack, Discord, your endpoints), GitHub or GitLab issue sync, a screenshot bucket you choose. Compliance itself — a lawful basis, retention, telling reviewers what you collect — is up to you as the site operator; a library cannot be GDPR-compliant on its own.",
  },
  {
    q: "Can I customize the widget appearance?",
    a: "Yes — accent color, position (bottom-right or bottom-left), theme (light, dark, auto), and 9 built-in locales (English, French, German, Spanish, Italian, Portuguese, Russian, Japanese, Korean) plus registerLocale for your own. Try every option live on the demo.",
  },
  {
    q: "Is it accessible?",
    a: "The widget and the inbox are designed for WCAG 2.1 AA, and every change runs an automated axe check of both, in light and dark themes, with no exclusions. The full flow works from the keyboard, including drawing an annotation: Tab to the element, press Enter. Actions are announced to screen readers.",
  },
  {
    q: "How is reviewers' data handled?",
    a: 'Feedback lives in your own database — SitePing is self-hosted. The API blanks reviewer emails on unauthenticated reads by default, and elements marked data-siteping-ignore="true" are masked out of screenshots.',
  },
  {
    q: "Do I need to create an account?",
    a: "No. SitePing is an npm package you install and configure. No SitePing account, no vendor key, no signup. It runs on your infrastructure.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="relative scroll-mt-16 py-24 lg:py-32">
      <div className="mx-auto grid max-w-[78rem] gap-12 px-6 lg:grid-cols-12 lg:gap-10 lg:px-10">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <h2 id="faq-title" className="type-title text-[clamp(2.4rem,5.4vw,4.6rem)] text-paper">
              Questions, answered.
            </h2>
            <p className="mt-6 max-w-[22rem] text-lg leading-relaxed text-mist">
              Something missing?{" "}
              <a
                href="https://github.com/NeosiaNexus/SitePing/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded text-paper underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:decoration-paper/60"
              >
                Ask on GitHub
              </a>
              .
            </p>
          </div>
        </div>

        {/* Native <details>: keyboard, find-in-page and no-JS work for free; the height animates where supported. */}
        <div className="border-b border-line lg:col-span-8">
          {faqs.map((item) => (
            <details key={item.q} className="faq-item group border-t border-line">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-6 text-left text-[18px] font-medium text-paper transition-colors duration-150 hover:text-white">
                {item.q}
                <span
                  aria-hidden="true"
                  className="faq-chevron flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-mist ring-1 ring-white/[0.06]"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" d="M8 3v10M3 8h10" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-[44rem] pb-7 pr-12 text-[16px] leading-relaxed text-mist">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

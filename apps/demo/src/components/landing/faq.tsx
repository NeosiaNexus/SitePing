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
          className="text-accent-light underline underline-offset-2 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-light"
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
    <section id="faq" className="bg-gray-950 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        {/* Section title */}
        <div data-gsap="section-title" className="text-center">
          <div className="mx-auto mb-4 h-px w-8 bg-accent/50" />
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Frequently asked questions</h2>
        </div>

        {/* FAQ grid */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-x-12 md:gap-y-10">
          {faqs.map((item) => (
            <div key={item.q} data-gsap="faq-item">
              <h3 className="font-medium text-white">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "What databases are supported?",
    a: "Any database supported by Prisma — PostgreSQL, MySQL, SQLite, MongoDB, CockroachDB, and more. A Drizzle adapter is on the roadmap.",
  },
  {
    q: "Does it work with frameworks other than Next.js?",
    a: "The widget is framework-agnostic — it works with React, Vue, Svelte, Astro, or vanilla JavaScript. The CLI currently scaffolds Next.js API routes, but the adapter works with any server that handles standard Request/Response.",
  },
  {
    q: "What happens when the page layout changes?",
    a: "Annotations use multi-selector anchoring — CSS selectors, XPath, text snippets, and structural fingerprints. If one selector breaks, the system falls back to the next. Positions are stored as percentages relative to the anchor element, so they adapt to responsive layouts.",
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
    a: "About 49 kB gzipped on the wire; the feedback panel, screenshot capture, and non-English locales load on demand on top of that. The widget loads asynchronously and never blocks your page rendering.",
  },
  {
    q: "Is it GDPR compliant?",
    a: "Fully. Since SitePing is self-hosted, all data stays on your infrastructure. No data is ever sent to third-party servers. You control storage, retention, and deletion.",
  },
  {
    q: "Can I customize the widget appearance?",
    a: "Yes — accent color, position (bottom-right or bottom-left), theme (light, dark, auto), and 7 built-in locales (English, French, German, Spanish, Italian, Portuguese, Russian) plus registerLocale for your own. Try every option live on the demo.",
  },
  {
    q: "Is it accessible?",
    a: "Yes — the widget and the inbox are audited against WCAG 2.1 AA. The full flow works from the keyboard, including drawing an annotation: Tab to the element, press Enter. Actions are announced to screen readers.",
  },
  {
    q: "How is reviewers' data handled?",
    a: 'Feedback lives in your own database — SitePing is self-hosted. The API blanks reviewer emails on unauthenticated reads by default, and elements marked data-siteping-ignore="true" are masked out of screenshots.',
  },
  {
    q: "Do I need to create an account?",
    a: "No. SitePing is an npm package you install and configure. No account, no API key, no signup. It runs entirely on your infrastructure.",
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

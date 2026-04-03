import Link from "next/link";
import { CopyButton } from "./copy-button";
import { HeroMockup } from "./hero-mockup";

export function Hero() {
  return (
    <section className="relative bg-gray-950 px-6 pb-16 pt-28 text-white sm:pb-20 sm:pt-36">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-2/3 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Eyebrow badge */}
        <div
          data-gsap="hero-badge"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-light"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <title>Open source</title>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Free &amp; Open Source
        </div>

        {/* Headline */}
        <h1 data-gsap="hero-title" className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
          Client feedback,
          <br />
          <span className="text-accent-light">pinned to the pixel.</span>
        </h1>

        {/* Subheadline */}
        <p
          data-gsap="hero-subtitle"
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl"
        >
          Stop chasing feedback across Slack, email, and Notion. Let your clients annotate your site directly —
          self-hosted, DOM-anchored, zero SaaS fees.
        </p>

        {/* CTAs */}
        <div data-gsap="hero-cta" className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {/* Primary: npm install code pill */}
          <div className="flex items-center overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
            <code className="px-4 py-2.5 font-mono text-sm text-gray-300">npm i @siteping/widget</code>
            <CopyButton text="npm i @siteping/widget" />
          </div>

          {/* Secondary: Try the Demo */}
          <Link
            href="/demo"
            className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
          >
            Try the Demo &rarr;
          </Link>
        </div>

        {/* Friction removers */}
        <p className="mt-6 text-sm text-gray-500">
          Free forever &middot; MIT Licensed &middot; Self-hosted &middot; 3 min setup
        </p>
      </div>

      {/* Browser mockup */}
      <div data-gsap="hero-mockup" className="relative mx-auto mt-16 max-w-4xl sm:mt-20">
        <HeroMockup />
      </div>

      {/* Price anchoring */}
      <p className="mt-10 text-center text-sm text-gray-500">
        Replaces Marker.io ($39/mo) &middot; BugHerd ($42/mo) &middot; Userback ($79/mo)
      </p>

      {/* Technical credibility badges */}
      <div data-gsap="hero-badges" className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-900/50 px-3 py-1 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          TypeScript
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-900/50 px-3 py-1 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          238 tests
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-900/50 px-3 py-1 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          &lt; 20 kB gzipped
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-900/50 px-3 py-1 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Shadow DOM
        </span>
      </div>

      {/* Widget dogfood callout */}
      <p className="mt-4 text-center text-xs text-gray-500">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        See the blue button in the corner? That&apos;s SitePing running on this page. Try it.
      </p>

      {/* Bottom fade transition to next section */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent to-gray-950" />
    </section>
  );
}

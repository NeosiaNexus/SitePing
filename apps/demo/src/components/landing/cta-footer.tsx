import Link from "next/link";

export function CtaFooter() {
  return (
    <section className="relative bg-gray-950 px-6 py-32">
      {/* Radial accent glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[700px] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div data-gsap="cta-section" className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to ditch screenshot emails?</h2>
        <p className="mt-4 text-lg text-gray-400">Get started in minutes. Free forever.</p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="https://github.com/NeosiaNexus/SitePing#getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white px-6 py-3 text-base font-medium text-accent transition-colors hover:bg-gray-100"
          >
            Get Started
          </a>
          <Link
            href="/demo"
            className="rounded-lg border border-gray-600 px-6 py-3 text-base font-medium text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
          >
            Try the Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

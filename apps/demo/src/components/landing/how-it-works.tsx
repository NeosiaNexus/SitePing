import { PackageManagerTabs } from "./package-manager-tabs";

function ClientMockup() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
        </div>
        <div className="ml-2 flex flex-1 items-center gap-1.5 rounded-md bg-gray-800/80 px-3 py-1">
          <svg
            className="h-2.5 w-2.5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <title>Lock</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="font-mono text-[10px] text-gray-500">mon-client.fr</span>
        </div>
      </div>

      {/* Mini website content */}
      <div className="relative aspect-[16/9] bg-white p-[4%]">
        {/* Navbar */}
        <div className="mb-[4%] flex items-center justify-between">
          <div className="h-[6px] w-[15%] rounded bg-gray-800" />
          <div className="flex gap-[2%]">
            <div className="h-[4px] w-[8%] rounded bg-gray-200" />
            <div className="h-[4px] w-[6%] rounded bg-gray-200" />
            <div className="h-[4px] w-[7%] rounded bg-gray-200" />
          </div>
        </div>

        {/* Hero section of fake site */}
        <div className="mb-[4%] text-center">
          <div className="mx-auto mb-[2%] h-[7px] w-[55%] rounded bg-gray-800" />
          <div className="mx-auto mb-[2%] h-[7px] w-[40%] rounded bg-gray-800" />
          <div className="mx-auto mb-[3%] h-[4px] w-[35%] rounded bg-gray-300" />
          <div className="mx-auto h-[6px] w-[14%] rounded bg-accent" />
        </div>

        {/* Content cards */}
        <div className="flex gap-[3%] px-[3%]">
          <div className="flex-1 rounded border border-gray-100 p-[2%]">
            <div className="mb-[6%] h-[4px] w-[40%] rounded bg-gray-300" />
            <div className="mb-[4%] h-[3px] w-full rounded bg-gray-100" />
            <div className="h-[3px] w-[70%] rounded bg-gray-100" />
          </div>
          <div className="flex-1 rounded border border-gray-100 p-[2%]">
            <div className="mb-[6%] h-[4px] w-[50%] rounded bg-gray-300" />
            <div className="mb-[4%] h-[3px] w-full rounded bg-gray-100" />
            <div className="h-[3px] w-[60%] rounded bg-gray-100" />
          </div>
          <div className="flex-1 rounded border border-gray-100 p-[2%]">
            <div className="mb-[6%] h-[4px] w-[35%] rounded bg-gray-300" />
            <div className="mb-[4%] h-[3px] w-full rounded bg-gray-100" />
            <div className="h-[3px] w-[80%] rounded bg-gray-100" />
          </div>
        </div>

        {/* Annotation rectangle on the hero area */}
        <div
          className="absolute rounded border-2 border-accent bg-accent/10"
          style={{ left: "12%", top: "22%", width: "76%", height: "28%" }}
        />

        {/* Comment popup */}
        <div
          className="absolute w-[52%] rounded-lg bg-white p-2.5 shadow-xl ring-1 ring-gray-200"
          style={{ left: "12%", top: "52%" }}
        >
          <span className="mb-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-semibold text-red-700">
            Bug
          </span>
          <p className="text-[10px] leading-relaxed text-gray-700">The hero image is blurry on retina</p>
          <p className="mt-1 text-[8px] text-gray-400">Sarah M.</p>
        </div>

        {/* FAB button */}
        <div
          className="absolute flex items-center justify-center rounded-full bg-accent shadow-lg"
          style={{ right: "4%", bottom: "5%", width: "7%", aspectRatio: "1" }}
        >
          <svg
            className="h-[55%] w-[55%] text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <title>Annotate</title>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-gray-950 px-6 py-24">
      {/* Subtle accent glow for section differentiation */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.04] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Header */}
        <div data-gsap="section-title" className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            From zero to client feedback in 3 commands
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Install, scaffold, and ship. Your clients annotate directly on the live site.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mt-16">
          {/* Vertical connector line */}
          <div
            className="absolute bottom-0 left-5 top-0 w-px border-l border-dashed border-gray-800 sm:left-6"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-12">
            {/* Steps 1-3: interactive package manager tabs */}
            <PackageManagerTabs />

            {/* Step 4: Client experience */}
            <div data-gsap="step" className="relative flex gap-6 sm:gap-8">
              {/* Result badge */}
              <div className="relative z-10 flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow-[0_0_16px_rgba(16,185,129,0.4)] sm:h-12 sm:w-12 sm:text-base">
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <title>Result</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                    />
                  </svg>
                </div>
              </div>

              {/* Card */}
              <div className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h3 className="text-lg font-bold text-white">Your clients see this</h3>

                <div className="mt-4">
                  <ClientMockup />
                </div>

                <p className="mt-4 leading-relaxed text-gray-400">
                  No login. No account. Just a floating button and pixel-perfect annotations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Friction contrast line */}
        <p className="mt-16 text-center text-sm text-gray-500">
          <span className="inline-flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 20 20" fill="currentColor">
              <title>Check</title>
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            No account required
          </span>
          <span className="mx-3">&middot;</span>
          <span className="inline-flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 20 20" fill="currentColor">
              <title>Check</title>
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            No API key
          </span>
          <span className="mx-3">&middot;</span>
          <span className="inline-flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 20 20" fill="currentColor">
              <title>Check</title>
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            No monthly bill
          </span>
        </p>
      </div>
    </section>
  );
}

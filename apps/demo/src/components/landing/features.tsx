interface Framework {
  name: string;
  color: string;
  icon: string;
}

const frameworks: Framework[] = [
  {
    name: "Next.js",
    color: "text-white",
    icon: "M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z",
  },
  {
    name: "React",
    color: "text-[#61DAFB]",
    icon: "M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z",
  },
  {
    name: "Vue",
    color: "text-[#4FC08D]",
    icon: "M24,1.61H14.06L12,5.16,9.94,1.61H0L12,22.39ZM12,14.08,5.16,2.23H9.59L12,6.41l2.41-4.18h4.43Z",
  },
  {
    name: "Svelte",
    color: "text-[#FF3E00]",
    icon: "M10.354 21.125a4.44 4.44 0 0 1-4.765-1.767 4.109 4.109 0 0 1-.703-3.107 3.898 3.898 0 0 1 .134-.522l.105-.321.287.21a7.21 7.21 0 0 0 2.186 1.092l.208.063-.02.208a1.253 1.253 0 0 0 .226.83 1.337 1.337 0 0 0 1.435.533 1.231 1.231 0 0 0 .343-.15l5.59-3.562a1.164 1.164 0 0 0 .524-.778 1.242 1.242 0 0 0-.211-.937 1.338 1.338 0 0 0-1.435-.533 1.23 1.23 0 0 0-.343.15l-2.133 1.36a4.078 4.078 0 0 1-1.135.499 4.44 4.44 0 0 1-4.765-1.766 4.108 4.108 0 0 1-.702-3.108 3.855 3.855 0 0 1 1.742-2.582l5.589-3.563a4.072 4.072 0 0 1 1.135-.499 4.44 4.44 0 0 1 4.765 1.767 4.109 4.109 0 0 1 .703 3.107 3.943 3.943 0 0 1-.134.522l-.105.321-.286-.21a7.204 7.204 0 0 0-2.187-1.093l-.208-.063.02-.207a1.255 1.255 0 0 0-.226-.831 1.337 1.337 0 0 0-1.435-.532 1.231 1.231 0 0 0-.343.15L8.62 9.368a1.162 1.162 0 0 0-.524.778 1.24 1.24 0 0 0 .211.937 1.338 1.338 0 0 0 1.435.533 1.235 1.235 0 0 0 .344-.151l2.132-1.36a4.067 4.067 0 0 1 1.135-.498 4.44 4.44 0 0 1 4.765 1.766 4.108 4.108 0 0 1 .702 3.108 3.857 3.857 0 0 1-1.742 2.583l-5.589 3.562a4.072 4.072 0 0 1-1.135.499m10.358-17.95C18.484-.015 14.082-.96 10.9 1.068L5.31 4.63a6.412 6.412 0 0 0-2.896 4.295 6.753 6.753 0 0 0 .666 4.336 6.43 6.43 0 0 0-.96 2.396 6.833 6.833 0 0 0 1.168 5.167c2.229 3.19 6.63 4.135 9.812 2.108l5.59-3.562a6.41 6.41 0 0 0 2.896-4.295 6.756 6.756 0 0 0-.665-4.336 6.429 6.429 0 0 0 .958-2.396 6.831 6.831 0 0 0-1.167-5.168Z",
  },
  {
    name: "Astro",
    color: "text-[#FF5D01]",
    icon: "M8.358 20.162c-1.186-1.07-1.532-3.316-1.038-4.944.856 1.026 2.043 1.352 3.272 1.535 1.897.283 3.76.177 5.522-.678.202-.098.388-.229.608-.36.166.473.209.95.151 1.437-.14 1.185-.738 2.1-1.688 2.794-.38.277-.782.525-1.175.787-1.205.804-1.531 1.747-1.078 3.119l.044.148a3.158 3.158 0 0 1-1.407-1.188 3.31 3.31 0 0 1-.544-1.815c-.004-.32-.004-.642-.048-.958-.106-.769-.472-1.113-1.161-1.133-.707-.02-1.267.411-1.415 1.09-.012.053-.028.104-.045.165h.002zm-5.961-4.445s3.24-1.575 6.49-1.575l2.451-7.565c.092-.366.36-.614.662-.614.302 0 .57.248.662.614l2.45 7.565c3.85 0 6.491 1.575 6.491 1.575L16.088.727C15.93.285 15.663 0 15.303 0H8.697c-.36 0-.615.285-.784.727l-5.516 14.99z",
  },
  {
    name: "Nuxt",
    color: "text-[#00DC82]",
    icon: "M13.4642 19.8295h8.9218c.2834 0 .5618-.0723.8072-.2098a1.5899 1.5899 0 0 0 .5908-.5732 1.5293 1.5293 0 0 0 .216-.783 1.529 1.529 0 0 0-.2167-.7828L17.7916 7.4142a1.5904 1.5904 0 0 0-.5907-.573 1.6524 1.6524 0 0 0-.807-.2099c-.2833 0-.5616.0724-.807.2098a1.5904 1.5904 0 0 0-.5907.5731L13.4642 9.99l-2.9954-5.0366a1.5913 1.5913 0 0 0-.591-.573 1.6533 1.6533 0 0 0-.8071-.2098c-.2834 0-.5617.0723-.8072.2097a1.5913 1.5913 0 0 0-.591.573L.2168 17.4808A1.5292 1.5292 0 0 0 0 18.2635c-.0001.2749.0744.545.216.783a1.59 1.59 0 0 0 .5908.5732c.2454.1375.5238.2098.8072.2098h5.6003c2.219 0 3.8554-.9454 4.9813-2.7899l2.7337-4.5922L16.3935 9.99l4.3944 7.382h-5.8586ZM7.123 17.3694l-3.9083-.0009 5.8586-9.8421 2.9232 4.921-1.9572 3.2892c-.7478 1.1967-1.5972 1.6328-2.9163 1.6328z",
  },
  {
    name: "Remix",
    color: "text-white",
    icon: "M21.511 18.508c.216 2.773.216 4.073.216 5.492H15.31c0-.309.006-.592.011-.878.018-.892.036-1.821-.109-3.698-.19-2.747-1.374-3.358-3.55-3.358H1.574v-5h10.396c2.748 0 4.122-.835 4.122-3.049 0-1.946-1.374-3.125-4.122-3.125H1.573V0h11.541c6.221 0 9.313 2.938 9.313 7.632 0 3.511-2.176 5.8-5.114 6.182 2.48.497 3.93 1.909 4.198 4.694ZM1.573 24v-3.727h6.784c1.133 0 1.379.84 1.379 1.342V24Z",
  },
  {
    name: "Express",
    color: "text-white",
    icon: "M24 18.588a1.529 1.529 0 01-1.895-.72l-3.45-4.771-.5-.667-4.003 5.444a1.466 1.466 0 01-1.802.708l5.158-6.92-4.798-6.251a1.595 1.595 0 011.9.666l3.576 4.83 3.596-4.81a1.435 1.435 0 011.788-.668L21.708 7.9l-2.522 3.283a.666.666 0 000 .994l4.804 6.412zM.002 11.576l.42-2.075c1.154-4.103 5.858-5.81 9.094-3.27 1.895 1.489 2.368 3.597 2.275 5.973H1.116C.943 16.447 4.005 19.009 7.92 17.7a4.078 4.078 0 002.582-2.876c.207-.666.548-.78 1.174-.588a5.417 5.417 0 01-2.589 3.957 6.272 6.272 0 01-7.306-.933 6.575 6.575 0 01-1.64-3.858c0-.235-.08-.455-.134-.666A88.33 88.33 0 010 11.577zm1.127-.286h9.654c-.06-3.076-2.001-5.258-4.59-5.278-2.882-.04-4.944 2.094-5.071 5.264z",
  },
  {
    name: "Hono",
    color: "text-[#FF5B11]",
    icon: "M12.445.002a45.529 45.529 0 0 0-5.252 8.146 8.595 8.595 0 0 1-.555-.53 27.796 27.796 0 0 0-1.205-1.542 8.762 8.762 0 0 0-1.251 2.12 20.743 20.743 0 0 0-1.448 5.88 8.867 8.867 0 0 0 .338 3.468c1.312 3.48 3.794 5.593 7.445 6.337 3.055.438 5.755-.333 8.097-2.312 2.677-2.59 3.359-5.634 2.047-9.132a33.287 33.287 0 0 0-2.988-5.59A91.34 91.34 0 0 0 12.615.053a.216.216 0 0 0-.17-.051Zm-.336 3.906a50.93 50.93 0 0 1 4.794 6.552c.448.767.817 1.57 1.108 2.41.606 2.386-.044 4.354-1.951 5.904-1.845 1.298-3.87 1.683-6.072 1.156-2.376-.737-3.75-2.335-4.121-4.794a5.107 5.107 0 0 1 .242-2.266c.358-.908.79-1.774 1.3-2.601l1.446-2.121a397.33 397.33 0 0 0 3.254-4.24Z",
  },
  {
    name: "JavaScript",
    color: "text-[#F7DF1E]",
    icon: "M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z",
  },
];

// Quadruple pour une bande bien remplie + boucle seamless
const row1 = Array.from({ length: 4 }, (_, setIdx) =>
  frameworks.map((fw) => ({ key: `a-${setIdx}-${fw.name}`, ...fw })),
).flat();
const row2 = Array.from({ length: 4 }, (_, setIdx) =>
  [...frameworks].reverse().map((fw) => ({ key: `b-${setIdx}-${fw.name}`, ...fw })),
).flat();

function FrameworkPill({ fw }: { fw: Framework }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-800 bg-gray-900/60 px-4 py-2 text-sm">
      <svg className={`h-4 w-4 ${fw.color}`} viewBox={fw.viewBox ?? "0 0 24 24"} fill="currentColor" aria-hidden="true">
        <path d={fw.icon} />
      </svg>
      <span className="text-gray-300">{fw.name}</span>
    </span>
  );
}

function FrameworkMarquee() {
  return (
    <div className="mt-16 -rotate-1">
      <p className="mb-5 text-center text-sm text-gray-500">Works with your stack</p>
      <div
        className="overflow-hidden"
        style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
      >
        {/* Row 1 — scrolls left */}
        <div className="mb-3 flex w-max animate-[marquee-left_40s_linear_infinite] gap-3">
          {row1.map((fw) => (
            <FrameworkPill key={fw.key} fw={fw} />
          ))}
        </div>
        {/* Row 2 — scrolls right */}
        <div className="flex w-max animate-[marquee-right_45s_linear_infinite] gap-3">
          {row2.map((fw) => (
            <FrameworkPill key={fw.key} fw={fw} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SelfHostedVisual() {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-gray-800/60 bg-gray-950/80 p-4 font-mono text-xs leading-relaxed sm:text-sm">
      <div className="flex items-center gap-2 text-gray-500">
        <span className="text-accent/70">$</span>
        <span className="text-gray-300">prisma db push</span>
      </div>
      <div className="mt-2 space-y-1 text-gray-600">
        <p>
          <span className="text-green-500/70">&#10003;</span> Datasource &quot;db&quot;: SQLite
        </p>
        <p>
          <span className="text-green-500/70">&#10003;</span> Schema synced — 3 models pushed
        </p>
        <p>
          <span className="text-green-500/70">&#10003;</span>{" "}
          <span className="text-gray-400">Your data stays on your server</span>
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2 text-gray-500">
        <span className="text-accent/70">$</span>
        <span className="text-gray-500/60 animate-pulse">_</span>
      </div>
    </div>
  );
}

function DomAnchoredVisual() {
  return (
    <div className="relative mt-6 h-28 overflow-hidden rounded-xl border border-gray-800/60 bg-gray-950/80 sm:h-32">
      {/* Mock page element that shifts around */}
      <div className="dom-anchor-target absolute top-6 left-5 h-8 rounded bg-gray-800 px-3 py-1.5 text-[10px] text-gray-500 sm:left-6 sm:h-9 sm:px-4 sm:text-xs">
        &lt;button&gt;Submit&lt;/button&gt;
      </div>

      {/* Annotation pin that tracks the element */}
      <div className="dom-anchor-pin absolute top-3 left-22 sm:left-28">
        <div className="flex items-center gap-1">
          <div className="h-5 w-5 rounded-full border-2 border-accent bg-accent/20 shadow-[0_0_8px_rgba(23,60,255,0.3)] sm:h-6 sm:w-6" />
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent-light sm:text-[10px]">
            Anchored
          </span>
        </div>
      </div>

      {/* CSS keyframe animation — static string, no user input */}
      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static CSS keyframes for DOM anchor demo, no user input involved
        dangerouslySetInnerHTML={{
          __html: `
            .dom-anchor-target {
              animation: dom-shift 4s ease-in-out infinite;
            }
            .dom-anchor-pin {
              animation: pin-shift 4s ease-in-out infinite;
            }
            @keyframes dom-shift {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(24px, 12px); }
            }
            @keyframes pin-shift {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(24px, 12px); }
            }
          `,
        }}
      />

      <p className="absolute right-3 bottom-2 text-[9px] text-gray-600 sm:right-4 sm:bottom-3 sm:text-[10px]">
        CSS + XPath + text fallback
      </p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="bg-gray-950 px-6 pb-24 pt-16">
      <div className="mx-auto max-w-6xl">
        {/* Section title */}
        <div data-gsap="section-title" className="text-center">
          <div className="mx-auto mb-4 h-px w-8 bg-accent/50" />
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Built different</h2>
          <p className="mt-4 text-lg text-gray-400">Everything you need, nothing you don&apos;t.</p>
        </div>

        {/* Bento grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          {/* ── Large card: Self-Hosted (spans 2 cols on desktop) ── */}
          <article
            data-gsap="feature-card-large"
            className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50 p-8 transition-all duration-300 hover:border-white/10 hover:bg-gray-900 sm:col-span-2 before:pointer-events-none before:absolute before:top-0 before:right-0 before:left-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-accent/50 before:to-transparent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12H3l9-9 9 9h-2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Self-Hosted</h3>
            <p className="mt-2 max-w-md leading-relaxed text-gray-400">
              Your database, your data. No vendor lock-in, no monthly fees. Deploy anywhere you run Node.js.
            </p>
            <SelfHostedVisual />
          </article>

          {/* ── Medium card: DOM-Anchored (single col, full row height on desktop) ── */}
          <article
            data-gsap="feature-card-large"
            data-gsap-dom-anchor="true"
            className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50 p-8 transition-all duration-300 hover:border-white/10 hover:bg-gray-900 lg:row-span-1 before:pointer-events-none before:absolute before:top-0 before:right-0 before:left-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-accent/50 before:to-transparent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">DOM-Anchored</h3>
            <p className="mt-2 leading-relaxed text-gray-400">
              Annotations survive layout changes. Multi-selector anchoring with CSS, XPath, and text fallback.
            </p>
            <DomAnchoredVisual />
          </article>

          {/* ── Row 2: npm Install (1) + Open Source (1) + CLI Scaffold (1) = 3 cols ── */}

          {/* npm Install & Go */}
          <article
            data-gsap="feature-card"
            className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50 p-6 transition-all duration-300 hover:border-white/10 hover:bg-gray-900"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">npm Install &amp; Go</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Three lines of code. Works with Next.js, any framework, or vanilla JavaScript.
            </p>
            <div className="mt-4 rounded-lg border border-gray-800/60 bg-gray-950/80 px-3 py-2">
              <code className="font-mono text-xs text-accent-light">npm i @siteping/widget</code>
            </div>
          </article>

          {/* Open Source */}
          <article
            data-gsap="feature-card"
            className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50 p-6 transition-all duration-300 hover:border-white/10 hover:bg-gray-900"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Open Source</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Full transparency, full control. Contribute, fork, or customize.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent-light">
              <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              MIT Licensed
            </div>
          </article>

          {/* CLI Scaffold */}
          <article
            data-gsap="feature-card"
            className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50 p-6 transition-all duration-300 hover:border-white/10 hover:bg-gray-900"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2 2 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">CLI Scaffold</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">Prisma schema and API route set up in seconds.</p>
            <div className="mt-4 rounded-lg border border-gray-800/60 bg-gray-950/80 px-3 py-2">
              <code className="font-mono text-xs">
                <span className="text-gray-500">$</span>{" "}
                <span className="text-accent-light">npx @siteping/cli init</span>
              </code>
            </div>
          </article>

          {/* ── Row 3: Shadow DOM Isolated (3 cols, bannière) ── */}
          <article
            data-gsap="feature-card"
            className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50 p-6 transition-all duration-300 hover:border-white/10 hover:bg-gray-900 sm:col-span-2 lg:col-span-3"
          >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
              <div className="shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">Shadow DOM Isolated</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Widget CSS never leaks into your site. Your site CSS never breaks the widget.
                </p>
              </div>
              {/* Wide visual: two layers side by side showing isolation */}
              <div className="flex flex-1 items-center justify-center gap-4 sm:gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-accent/20 bg-accent/5 sm:h-20 sm:w-36">
                    <span className="text-xs text-accent-light">Your site CSS</span>
                  </div>
                </div>
                <div className="text-gray-600">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/80 sm:h-20 sm:w-36">
                    <span className="text-xs text-gray-400">Widget CSS</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Framework marquee — full bleed outside max-w container */}
      <FrameworkMarquee />
    </section>
  );
}

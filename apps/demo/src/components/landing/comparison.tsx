function Check() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10">
      <svg aria-hidden="true" className="h-3.5 w-3.5 text-green-400" viewBox="0 0 16 16" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

function Cross() {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10">
      <svg aria-hidden="true" className="h-3 w-3 text-red-400" viewBox="0 0 16 16" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

function Partial({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-500">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/10">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
      </span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

const rows = [
  {
    feature: "Self-hosted",
    siteping: <Check />,
    markerio: <Cross />,
    bugherd: <Cross />,
    userback: <Cross />,
  },
  {
    feature: "npm package",
    siteping: <Check />,
    markerio: <Partial label="SDK only" />,
    bugherd: <Cross />,
    userback: <Cross />,
  },
  {
    feature: "Open source",
    siteping: (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
        MIT
      </span>
    ),
    markerio: <Cross />,
    bugherd: <Cross />,
    userback: <Cross />,
  },
  {
    feature: "Pricing",
    siteping: (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-bold text-green-400">
        Free
      </span>
    ),
    markerio: <span className="text-sm text-gray-500">$39/mo</span>,
    bugherd: <span className="text-sm text-gray-500">$42/mo</span>,
    userback: <span className="text-sm text-gray-500">$79/mo</span>,
  },
  {
    feature: "DOM-anchored",
    siteping: <Check />,
    markerio: <Partial label="Screenshot" />,
    bugherd: <Partial label="Pin only" />,
    userback: <Partial label="Screenshot" />,
  },
  {
    feature: "Survives layout changes",
    siteping: <Check />,
    markerio: <Cross />,
    bugherd: <Partial label="Partial" />,
    userback: <Cross />,
  },
  {
    feature: "Customizable",
    siteping: (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
        Full control
      </span>
    ),
    markerio: <span className="text-xs text-gray-500">Limited</span>,
    bugherd: <span className="text-xs text-gray-500">Limited</span>,
    userback: <span className="text-xs text-gray-500">Limited</span>,
  },
] as const;

const competitors = [
  { name: "Marker.io", key: "markerio" as const },
  { name: "BugHerd", key: "bugherd" as const },
  { name: "Userback", key: "userback" as const },
];

export function Comparison() {
  return (
    <section id="comparison" className="bg-gray-950 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div data-gsap="section-title" className="text-center">
          <div className="mx-auto mb-4 h-px w-8 bg-accent/50" />
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">SitePing vs. the alternatives</h2>
          <p className="mt-4 text-lg text-gray-400">Why pay $39-79/mo for features you can self-host for free?</p>
        </div>

        <div data-gsap="comparison" className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="w-[180px] px-5 py-4 text-left text-xs font-medium tracking-wider text-gray-600 uppercase" />
                {/* SitePing header — highlighted */}
                <th className="rounded-t-xl border-x border-t border-accent/20 bg-accent/[0.06] px-5 py-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-accent">SitePing</span>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-light">
                      Recommended
                    </span>
                  </div>
                </th>
                {competitors.map((c) => (
                  <th key={c.key} className="px-5 py-4 text-center text-sm font-medium text-gray-400">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isLast = i === rows.length - 1;
                return (
                  <tr key={row.feature} className="group">
                    <td className="border-b border-gray-800/40 px-5 py-4 text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      {row.feature}
                    </td>
                    {/* SitePing column — highlighted */}
                    <td
                      className={`border-x border-b border-accent/20 bg-accent/[0.06] px-5 py-4 text-center ${isLast ? "rounded-b-xl" : ""}`}
                    >
                      {row.siteping}
                    </td>
                    {competitors.map((c) => (
                      <td key={c.key} className="border-b border-gray-800/40 px-5 py-4 text-center">
                        {row[c.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

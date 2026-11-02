import { SectionHeader } from "./section-header";

function Yes({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[15px] text-paper">
      <svg aria-hidden="true" className="h-4 w-4 text-[#8fe3b9]" viewBox="0 0 16 16" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
          clipRule="evenodd"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function No({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center text-dim">
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z"
          clipRule="evenodd"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Partial({ label }: { label: string }) {
  return <span className="text-[13.5px] text-mist">{label}</span>;
}

// Competitor cells come from their pricing pages and the npm registry, checked
// on PRICES_CHECKED (see the sources line under the table). Keep only what a
// source shows; drop a row before guessing a cell.
const PRICES_CHECKED = "2026-10-30";

function Price({ children }: { children: string }) {
  return <span className="text-[13.5px] text-mist">{children}</span>;
}

const rows = [
  {
    feature: "Runs on your infrastructure",
    siteping: <Yes label="Yes" />,
    markerio: <No label="No" />,
    bugherd: <No label="No" />,
    userback: <No label="No" />,
  },
  {
    feature: "Open source",
    siteping: <span className="text-[15px] font-semibold text-paper">MIT</span>,
    markerio: <Partial label="Browser SDK only" />,
    bugherd: <No label="No" />,
    userback: <Partial label="Browser SDK only" />,
  },
  {
    feature: "Entry price",
    siteping: <span className="text-[15px] font-semibold text-paper">Free</span>,
    markerio: <Price>$39/mo billed yearly</Price>,
    bugherd: <Price>$42/mo billed yearly</Price>,
    userback: <Price>Free plan, $39/mo billed yearly</Price>,
  },
  {
    feature: "Hosted for you",
    siteping: <Partial label="You run it" />,
    markerio: <Yes label="Yes" />,
    bugherd: <Yes label="Yes" />,
    userback: <Yes label="Yes" />,
  },
] as const;

const competitors = [
  { name: "Marker.io", key: "markerio" as const },
  { name: "BugHerd", key: "bugherd" as const },
  { name: "Userback", key: "userback" as const },
];

const link = "underline decoration-line-strong underline-offset-2 transition-colors duration-150 hover:text-paper";

export function Comparison() {
  return (
    <section id="comparison" aria-labelledby="comparison-title" className="relative scroll-mt-16 py-24 lg:py-32">
      <div className="mx-auto max-w-[78rem] px-6 lg:px-10">
        <SectionHeader
          id="comparison-title"
          title="Next to the hosted tools."
          lede="Why pay $39–42 a month for feedback you can self-host for free?"
        />

        <div className="mt-16 overflow-x-auto lg:mt-24">
          <table className="w-full min-w-[680px] border-separate text-left" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                <th scope="col" className="w-[28%] pb-5">
                  <span className="sr-only">Feature</span>
                </th>
                {/* SitePing's column is lit, top to bottom, as one surface. */}
                <th
                  scope="col"
                  className="rounded-t-2xl bg-cobalt/[0.1] px-6 pb-5 pt-6 shadow-[inset_0_1px_0_rgb(118_144_255/0.35)]"
                >
                  <span className="text-[17px] font-semibold text-paper">SitePing</span>
                </th>
                {competitors.map((c) => (
                  <th key={c.key} scope="col" className="px-6 pb-5 pt-6 text-[15px] font-medium text-mist">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const last = i === rows.length - 1;
                return (
                  <tr key={row.feature}>
                    <th scope="row" className="border-t border-line py-5 pr-6 text-[15px] font-medium text-paper/90">
                      {row.feature}
                    </th>
                    <td
                      className={`border-t border-cobalt/20 bg-cobalt/[0.1] px-6 py-5 ${last ? "rounded-b-2xl" : ""}`}
                    >
                      {row.siteping}
                    </td>
                    {competitors.map((c) => (
                      <td key={c.key} className="border-t border-line px-6 py-5">
                        {row[c.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-8 max-w-[52rem] text-[13px] leading-relaxed text-dim">
          Entry paid plans as listed on{" "}
          <a href="https://marker.io/pricing" className={link}>
            marker.io
          </a>{" "}
          ($59 billed monthly, 3 members),{" "}
          <a href="https://bugherd.com/pricing" className={link}>
            bugherd.com
          </a>{" "}
          ($50 monthly, 5 members) and{" "}
          <a href="https://userback.io/pricing/" className={link}>
            userback.io
          </a>{" "}
          ($49 monthly; the free plan has 2 seats), checked on {PRICES_CHECKED}. The browser SDKs are MIT on npm; the
          services behind them are not. Vercel Comments is left out: it is free on every Vercel plan, but every reviewer
          needs a{" "}
          <a href="https://vercel.com/docs/comments" className={link}>
            Vercel account
          </a>
          .
        </p>
      </div>
    </section>
  );
}

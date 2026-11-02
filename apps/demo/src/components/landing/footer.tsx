import Link from "next/link";
import { GitHubIcon, LogoMark } from "./icons";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Live demo", href: "/demo" },
      { label: "Demo inbox", href: "/demo/inbox" },
      { label: "Pricing", href: "#comparison" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "npm", href: "https://www.npmjs.com/package/@siteping/widget" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: "https://github.com/NeosiaNexus/SitePing" },
      { label: "Issues", href: "https://github.com/NeosiaNexus/SitePing/issues" },
      { label: "MIT License", href: "https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE" },
    ],
  },
] as const;

const linkClass =
  "focus-ring rounded text-[15px] text-mist transition-colors duration-150 ease-[ease] hover:text-paper";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line">
      <div className="mx-auto max-w-[78rem] px-6 pt-16 lg:px-10 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="focus-ring inline-flex items-center gap-2.5 rounded-lg text-[17px] font-semibold text-paper"
            >
              <LogoMark className="h-7 w-7" />
              SitePing
            </Link>
            <p className="mt-4 max-w-[20rem] text-[15px] leading-relaxed text-mist">
              The open-source feedback widget for people who build sites for clients.
            </p>
            <a
              href="https://github.com/NeosiaNexus/SitePing"
              target="_blank"
              rel="noopener noreferrer"
              className="press focus-ring surface mt-6 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm text-paper"
            >
              <GitHubIcon className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-medium text-paper">{col.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.href.startsWith("http") ? (
                        <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href} className={linkClass}>
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-line py-6 text-[13px] text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>MIT License</span>
          <span>
            Built by{" "}
            <a
              href="https://github.com/NeosiaNexus"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded text-mist transition-colors duration-150 hover:text-paper"
            >
              @neosianexus
            </a>
          </span>
        </div>
      </div>

      {/* The wordmark as a horizon, cut by the bottom edge. */}
      <p
        aria-hidden="true"
        className="type-display pointer-events-none -mb-[0.24em] select-none text-center text-[clamp(5rem,21vw,19rem)] leading-none text-transparent"
        style={{
          backgroundImage: "linear-gradient(to bottom, rgb(148 163 255 / 0.16), rgb(148 163 255 / 0.02) 75%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
        }}
      >
        SitePing
      </p>
    </footer>
  );
}

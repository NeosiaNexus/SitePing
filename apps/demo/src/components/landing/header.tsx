import Link from "next/link";
import { MobileNav } from "./mobile-nav";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#comparison" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-gray-950/90 backdrop-blur-xl backdrop-saturate-150">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <title>SitePing</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
          </span>
          SitePing
        </Link>

        {/* Center nav */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className="hidden items-center gap-2.5 md:flex">
          <a
            href="https://github.com/NeosiaNexus/SitePing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-gray-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <title>GitHub</title>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
          <Link
            href="/demo"
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-accent-light hover:shadow-[0_0_20px_rgba(23,60,255,0.3)]"
          >
            Try Demo
          </Link>
        </div>

        {/* Mobile hamburger */}
        <MobileNav />
      </nav>
    </header>
  );
}

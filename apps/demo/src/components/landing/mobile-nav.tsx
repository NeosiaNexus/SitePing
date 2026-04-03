"use client";

import { useState } from "react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#comparison" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <title>Menu</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-gray-950/95 backdrop-blur-xl transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end px-6 py-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <title>Close</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav
          className={`flex flex-col items-center gap-6 pt-12 transition-transform duration-300 ${
            open ? "translate-y-0" : "-translate-y-4"
          }`}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-lg text-gray-300 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}

          <div className="mt-4 flex flex-col items-center gap-4">
            <a
              href="https://github.com/NeosiaNexus/SitePing"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm text-gray-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <title>GitHub</title>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
            <a
              href="/demo"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-accent-light hover:shadow-[0_0_20px_rgba(23,60,255,0.3)]"
            >
              Try Demo
            </a>
          </div>
        </nav>
      </div>
    </div>
  );
}

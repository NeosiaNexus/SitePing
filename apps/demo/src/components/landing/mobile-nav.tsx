"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bricolage } from "./fonts";
import { GitHubIcon } from "./icons";
import { navLinks } from "./nav-links";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  // Portaled to <body>: the header's backdrop-filter would otherwise become the
  // containing block of this fixed panel and clip it to the header's height.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="press focus-ring flex h-10 w-10 items-center justify-center rounded-full text-mist"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            inert={!open}
            className={`landing ${bricolage.variable} fixed inset-0 z-[60] flex flex-col bg-ink/95 px-6 backdrop-blur-xl transition-opacity duration-200 ease-out-strong ${
              open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="flex h-16 items-center justify-end">
              <button
                type="button"
                onClick={close}
                className="press focus-ring flex h-10 w-10 items-center justify-center rounded-full text-mist"
                aria-label="Close menu"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav
              aria-label="Mobile"
              className={`flex flex-1 flex-col gap-1 pt-6 transition-transform duration-200 ease-out-strong ${
                open ? "translate-y-0" : "translate-y-2"
              }`}
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  className="focus-ring type-title rounded-lg py-2 text-[2.5rem] text-paper"
                >
                  {link.label}
                </a>
              ))}

              <div className="mt-auto flex flex-col gap-3 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                <Link
                  href="/demo"
                  onClick={close}
                  className="press focus-ring flex h-12 items-center justify-center rounded-full bg-cobalt text-[15px] font-semibold text-white"
                >
                  Try the live demo
                </Link>
                <a
                  href="https://github.com/NeosiaNexus/SitePing"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="press focus-ring surface flex h-12 items-center justify-center gap-2 rounded-full text-[15px] text-paper"
                >
                  <GitHubIcon className="h-4 w-4" />
                  Star on GitHub
                </a>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}

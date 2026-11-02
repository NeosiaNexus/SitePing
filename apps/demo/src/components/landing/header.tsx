"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GitHubIcon, LogoMark } from "./icons";
import { MobileNav } from "./mobile-nav";
import { navLinks } from "./nav-links";

export function Header() {
  // Transparent over the hero; a surface once content scrolls underneath (state, not decoration).
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="fixed inset-x-0 top-0 z-50 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-200 ease-[ease] data-[scrolled=true]:border-line data-[scrolled=true]:bg-ink/75 data-[scrolled=true]:backdrop-blur-xl data-[scrolled=true]:backdrop-saturate-150"
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[78rem] items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          className="press focus-ring flex items-center gap-2.5 rounded-lg text-[17px] font-semibold tracking-[-0.02em] text-paper"
        >
          <LogoMark className="h-7 w-7" />
          SitePing
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="focus-ring rounded-full px-3.5 py-2 text-sm text-mist transition-colors duration-150 ease-[ease] hover:text-paper"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href="https://github.com/NeosiaNexus/SitePing"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="SitePing on GitHub"
            className="press focus-ring flex h-9 w-9 items-center justify-center rounded-full text-mist transition-colors duration-150 ease-[ease] hover:bg-white/[0.06] hover:text-paper"
          >
            <GitHubIcon className="h-[18px] w-[18px]" />
          </a>
          <Link
            href="/demo"
            className="press focus-ring flex h-9 items-center rounded-full bg-paper px-4 text-sm font-semibold text-ink transition-colors duration-150 ease-[ease] hover:bg-white"
          >
            Try the live demo
          </Link>
        </div>

        <MobileNav />
      </nav>
    </header>
  );
}

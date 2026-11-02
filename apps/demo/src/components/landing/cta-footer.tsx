"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

const RING_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * The closing call, under the brand's one motif: a pin and the rings it sends.
 * The rings play once when the section arrives, and again when the visitor
 * reaches for the main button (a rare, deliberate moment).
 */
export function CtaFooter() {
  const ringsRef = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);

  const ping = useCallback((count: number) => {
    const rings = ringsRef.current?.children;
    if (!rings || reduced.current) return;
    Array.from(rings)
      .slice(0, count)
      .forEach((ring, i) => {
        ring.animate(
          [
            { opacity: 0.55, transform: "translate(-50%, -50%) scale(0.35)" },
            { opacity: 0, transform: "translate(-50%, -50%) scale(1)" },
          ],
          { duration: 2200, delay: i * 260, easing: RING_EASE, fill: "backwards" },
        );
      });
  }, []);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = ringsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        ping(3);
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ping]);

  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden py-36 lg:py-52">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(50% 55% at 50% 50%, rgb(23 60 255 / 0.22), transparent 70%)" }}
        />
        <div ref={ringsRef} className="absolute left-1/2 top-1/2 h-0 w-0">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute left-0 top-0 h-[min(78rem,150vw)] w-[min(78rem,150vw)] rounded-full opacity-0"
              style={{ boxShadow: "inset 0 0 0 1px rgb(118 144 255 / 0.6)", transform: "translate(-50%, -50%)" }}
            />
          ))}
        </div>
        {/* Static rings: what reduced motion (and a still frame) shows. */}
        {[22, 38, 56].map((size) => (
          <span
            key={size}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `min(${size}rem, ${size * 2}vw)`,
              height: `min(${size}rem, ${size * 2}vw)`,
              boxShadow: `inset 0 0 0 1px rgb(148 163 255 / ${0.12 - size / 1000})`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-[78rem] px-6 text-center lg:px-10">
        <span className="mx-auto mb-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-cobalt shadow-[0_0_0_6px_rgb(23_60_255/0.15),0_20px_50px_-10px_rgb(23_60_255/0.8)]">
          <svg
            className="h-7 w-7 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
        </span>
        <h2 id="cta-title" className="type-display mx-auto max-w-[14ch] text-[clamp(2.8rem,7.5vw,6.2rem)] text-paper">
          Ready to ditch screenshot emails?
        </h2>
        <p className="mx-auto mt-7 max-w-[26rem] text-lg leading-relaxed text-mist">
          Get started in minutes. Free forever.
        </p>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/docs/quickstart"
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") ping(1);
            }}
            onFocus={() => ping(1)}
            className="press focus-ring inline-flex h-12 items-center rounded-full bg-paper px-7 text-[15px] font-semibold text-ink transition-[background-color,transform] duration-150 hover:bg-white"
          >
            Get started
          </Link>
          <Link
            href="/demo"
            className="press focus-ring surface inline-flex h-12 items-center rounded-full px-7 text-[15px] font-medium text-paper transition-[color,transform] duration-150"
          >
            Try the live demo
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CopyButton } from "./copy-button";
import { GitHubIcon } from "./icons";
import { prefersReducedMotion, SplitText, setupMotion } from "./motion";
import { requestPing } from "./ping-events";
import { PingField } from "./ping-field";

const INSTALL = "npm i @siteping/widget";

function Cursor() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 3L19 12L12 13.5L9 20L5 3Z" fill="white" stroke="#05071a" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const rectRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    const rect = rectRef.current;
    const track = trackRef.current;
    const cursor = cursorRef.current;
    const pin = pinRef.current;
    const card = cardRef.current;
    if (!section || !title || !rect || !track || !cursor || !pin || !card) return;

    const gsap = setupMotion();
    const rest = section.querySelectorAll("[data-intro]:not(h1)");

    // Reduced motion: the finished page, nothing travels.
    if (prefersReducedMotion()) {
      gsap.set([title, rest], { opacity: 1 });
      gsap.set(rect, { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" });
      gsap.set([pin, card], { opacity: 1 });
      return;
    }

    let cancelled = false;
    let split: SplitText | undefined;
    const ctx = gsap.context(() => {});

    // Split once the real face has loaded, or the words are measured in the fallback.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      ctx.add(() => {
        split = SplitText.create(title.querySelectorAll("[data-split]"), { type: "words", tag: "span", aria: "none" });
        const T = 1.05; // the annotation starts once the headline has landed

        const ringFromPin = () => {
          const box = pin.getBoundingClientRect();
          requestPing({
            clientX: box.left + box.width / 2,
            clientY: box.top + box.height / 2,
            kind: "ripple",
            strength: 1.7,
          });
        };

        gsap
          .timeline({ defaults: { ease: "out-strong" } })
          // One orchestrated entrance: words, then the rest, then a client marks the headline.
          .set(title, { opacity: 1 })
          .fromTo(
            split.words,
            { opacity: 0, yPercent: 38, filter: "blur(6px)" },
            {
              opacity: 1,
              yPercent: 0,
              filter: "blur(0px)",
              duration: 0.9,
              stagger: 0.07,
              clearProps: "filter,transform",
            },
            0,
          )
          // clearProps hands transform back to CSS, so :active press feedback works afterwards.
          .fromTo(
            rest,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, clearProps: "transform" },
            0.4,
          )
          .set(track, { xPercent: 120, yPercent: 190 }, 0)
          .to(cursor, { opacity: 1, duration: 0.25 }, T)
          .to(track, { xPercent: 0, yPercent: 0, duration: 0.8, ease: "in-out-strong" }, T)
          .to(cursor, { scale: 0.86, duration: 0.12 }, T + 0.8)
          .set(rect, { opacity: 1 }, T + 0.86)
          .fromTo(
            rect,
            { clipPath: "inset(0% 100% 100% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.85, ease: "in-out-strong" },
            T + 0.86,
          )
          .to(track, { xPercent: 100, yPercent: 100, duration: 0.85, ease: "in-out-strong" }, T + 0.86)
          .to(cursor, { scale: 1, duration: 0.16 }, T + 1.71)
          .fromTo(
            pin,
            { opacity: 0, scale: 0.9, y: -8 },
            { opacity: 1, scale: 1, y: 0, duration: 0.4, onStart: ringFromPin },
            T + 1.76,
          )
          .fromTo(card, { opacity: 0, scale: 0.96, y: 6 }, { opacity: 1, scale: 1, y: 0, duration: 0.4 }, T + 1.9)
          .to(cursor, { opacity: 0, duration: 0.3 }, T + 2.2);
      });
    });

    return () => {
      cancelled = true;
      ctx.revert();
      split?.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[100svh] cursor-crosshair flex-col overflow-hidden"
      aria-labelledby="hero-title"
    >
      {/* Backdrop: what you see before (or without) WebGL. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(120% 70% at 70% 105%, rgb(23 60 255 / 0.28), transparent 60%), radial-gradient(60% 50% at 10% 0%, rgb(118 144 255 / 0.08), transparent 70%)",
        }}
      />
      <div className="absolute inset-0 -z-10">
        <PingField hitArea={sectionRef} />
      </div>
      {/* Keeps the headline legible over the dots. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 60% at 18% 32%, rgb(5 7 26 / 0.86), rgb(5 7 26 / 0.35) 55%, transparent 80%), linear-gradient(to bottom, rgb(5 7 26 / 0.6), transparent 22%)",
        }}
      />

      <div className="pointer-events-none relative mx-auto flex w-full max-w-[78rem] flex-1 flex-col justify-center px-6 pb-28 pt-32 sm:pt-36 lg:px-10">
        <a
          data-intro
          href="https://github.com/NeosiaNexus/SitePing"
          target="_blank"
          rel="noopener noreferrer"
          className="press focus-ring pointer-events-auto mb-8 inline-flex w-fit cursor-pointer items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 text-sm text-mist transition-colors duration-150 ease-[ease] surface hover:text-paper"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06]">
            <GitHubIcon className="h-3.5 w-3.5" />
          </span>
          Open source, MIT licensed
        </a>

        <div className="relative w-fit">
          <h1
            id="hero-title"
            ref={titleRef}
            data-intro
            className="type-display pointer-events-auto cursor-text text-[clamp(3.4rem,10.5vw,8.6rem)] text-paper"
          >
            <span data-split className="block">
              Client feedback,
            </span>
            <span className="relative isolate inline-block">
              <span data-split>pinned to the page.</span>
              {/* The page reviewing itself: a client marks the headline. No text in here, it stays out of the h1. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-[0.09em] -bottom-[0.06em] -top-[0.02em] -z-10"
              >
                <span
                  ref={rectRef}
                  className="absolute inset-0 rounded-[0.08em] opacity-0"
                  style={{
                    border: "2px solid #7690ff",
                    background: "rgb(23 60 255 / 0.14)",
                    clipPath: "inset(0% 100% 100% 0%)",
                  }}
                />
                <span
                  ref={pinRef}
                  className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-cobalt font-sans text-xs font-semibold tracking-normal text-white opacity-0 shadow-[0_0_0_3px_#05071a,0_8px_24px_rgb(23_60_255/0.55)] after:content-['1']"
                />
                <span ref={trackRef} className="absolute inset-0 block">
                  <span ref={cursorRef} className="absolute left-0 top-0 -ml-[3px] -mt-[2px] block opacity-0">
                    <Cursor />
                  </span>
                </span>
              </span>
            </span>
          </h1>

          {/* The client's note: decorative, the real thing is the widget in the corner. */}
          <div
            ref={cardRef}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[0.55em] left-[calc(100%+2rem)] hidden w-[16rem] origin-top-left rounded-2xl bg-white p-4 font-sans opacity-0 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6),0_0_0_1px_rgb(255_255_255/0.6)] lg:block"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffd9c7] text-xs font-semibold text-[#8a3a12]">
                S
              </span>
              <p className="text-[13px] font-semibold leading-tight text-[#0b1030]">
                Sarah, your client
                <span className="block text-[11px] font-normal text-[#5b6382]">just now</span>
              </p>
            </div>
            <p className="mt-3 text-[14px] leading-snug text-[#1b2140]">Yes, this is the line. Ship it.</p>
          </div>
        </div>

        <p data-intro className="pointer-events-auto mt-9 max-w-[34rem] text-lg leading-relaxed text-mist sm:text-xl">
          Clients draw on your live site and leave a note. Each note stays attached to the element it was drawn on, and
          lands in an inbox you host yourself. Open source, no monthly bill.
        </p>

        <div data-intro className="pointer-events-auto mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/demo"
            className="press focus-ring inline-flex h-12 items-center rounded-full bg-cobalt px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgb(23_60_255/0.9),inset_0_1px_0_rgb(255_255_255/0.2)] transition-[background-color,transform] duration-150 hover:bg-[#2d50ff]"
          >
            Try the live demo
          </Link>
          <div className="surface flex h-12 items-center gap-3 rounded-full pl-5 pr-1.5 font-code text-[13px] text-paper/90">
            <span>
              <span className="select-none text-dim">$ </span>
              {INSTALL}
            </span>
            <CopyButton
              text={INSTALL}
              className="press focus-ring flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/[0.06] font-sans text-xs text-mist transition-colors duration-150 hover:bg-white/[0.1] hover:text-paper"
            />
          </div>
          <Link
            href="/docs"
            className="focus-ring rounded-full px-4 py-3 text-[15px] text-mist underline decoration-line-strong underline-offset-[6px] transition-colors duration-150 hover:text-paper hover:decoration-paper/60"
          >
            Read the docs
          </Link>
        </div>
      </div>

      <p
        data-intro
        className="pointer-events-auto absolute bottom-7 left-6 right-24 max-w-xl text-[13px] leading-snug text-dim lg:left-10"
      >
        <span className="mr-2 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-cobalt-soft align-middle" />
        The round button in the corner is SitePing, live on this page. Pin a note on anything, or click the dots.
      </p>
    </section>
  );
}

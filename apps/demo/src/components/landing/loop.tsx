"use client";

import { useEffect, useRef, useState } from "react";
import { LoopStage } from "./loop-stage";
import { gsap, ScrollTrigger, setupMotion } from "./motion";
import { SectionHeader } from "./section-header";

const steps = [
  {
    title: "Your client draws on the page",
    body: "A button sits in the corner of the live site. They draw a box around what's wrong, pick a type and write a line. No login, no account.",
  },
  {
    title: "The note stays on its element",
    body: "Each annotation records a CSS selector, an XPath, the text and the structure around it. When the layout changes, every match is scored and the best one wins.",
  },
  {
    title: "It lands in your inbox",
    body: "With a capture of the area they circled and, if you turn on diagnostics, the last console errors and failed requests. Slack, Discord or your own webhook tells the team.",
  },
  {
    title: "You close the loop",
    body: "Move through notes with j and k, answer in the thread, set one of four statuses. Synced to GitHub or GitLab, resolving a note closes its issue.",
  },
] as const;

/** A phone-width stage plays its step once it scrolls into view. */
function InlineStage({ step }: { step: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-8 lg:hidden">
      <LoopStage step={step} armed={armed} />
    </div>
  );
}

export function Loop() {
  const [active, setActive] = useState(0);
  // The sticky stage stays settled and silent until it is actually on screen.
  const [stageArmed, setStageArmed] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStageArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const listRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const fill = fillRef.current;
    if (!list || !fill) return;
    setupMotion();
    const mm = gsap.matchMedia();
    // Desktop only: the sticky stage follows whichever step crosses the middle of the screen.
    mm.add("(min-width: 1024px)", () => {
      const items = Array.from(list.querySelectorAll<HTMLElement>("[data-step]"));
      items.forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        });
      });
      // Progress is a constant, scroll-bound quantity: linear, no easing.
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: list, start: "top 55%", end: "bottom 55%", scrub: true },
        },
      );
    });
    // Trigger positions depend on the final face's metrics.
    let live = true;
    document.fonts.ready.then(() => {
      if (live) ScrollTrigger.refresh();
    });
    return () => {
      live = false;
      mm.revert();
    };
  }, []);

  return (
    <section id="loop" aria-labelledby="loop-title" className="relative scroll-mt-16 py-24 lg:py-32">
      <div className="mx-auto max-w-[78rem] px-6 lg:px-10">
        <SectionHeader
          id="loop-title"
          title="From their screen to your inbox, and back."
          lede="Four steps, and not one of them is an email with a screenshot attached."
        />

        <div className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-12 lg:gap-16">
          <ol ref={listRef} className="relative lg:col-span-5">
            <span aria-hidden="true" className="absolute bottom-0 left-[15px] top-0 hidden w-px bg-line lg:block" />
            <span
              ref={fillRef}
              aria-hidden="true"
              className="absolute bottom-0 left-[15px] top-0 hidden w-px origin-top scale-y-0 bg-cobalt-soft lg:block"
            />
            {steps.map((step, i) => {
              const on = i === active;
              return (
                <li
                  key={step.title}
                  data-step
                  className="relative pb-20 last:pb-0 lg:flex lg:min-h-[64vh] lg:flex-col lg:justify-center lg:pb-0 lg:pl-14"
                >
                  <span
                    aria-hidden="true"
                    className={`mb-5 flex h-8 w-8 items-center justify-center rounded-full font-code text-[13px] transition-colors duration-300 ease-[ease] lg:absolute lg:left-0 lg:top-1/2 lg:mb-0 lg:-translate-y-[calc(50%+3.2rem)] ${
                      on ? "bg-cobalt text-white" : "surface text-mist"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div data-on={on} className="group/step">
                    <h3 className="text-[1.6rem] font-semibold leading-tight tracking-[-0.015em] text-paper transition-colors duration-300 ease-[ease] [font-stretch:92%] lg:group-data-[on=false]/step:text-dim">
                      <span className="sr-only">Step {i + 1}: </span>
                      {step.title}
                    </h3>
                    {/* Inactive steps recede in color, never below 4.5:1. */}
                    <p className="mt-3 max-w-[27rem] text-[17px] leading-relaxed text-mist transition-colors duration-300 ease-[ease] lg:group-data-[on=false]/step:text-dim">
                      {step.body}
                    </p>
                  </div>
                  <InlineStage step={i} />
                </li>
              );
            })}
          </ol>

          <div className="hidden lg:col-span-7 lg:block">
            <div ref={stageRef} className="sticky top-[max(6rem,calc(50vh-17rem))]">
              <LoopStage step={active} armed={stageArmed} />
              <p className="mt-5 text-sm text-dim">
                Step {active + 1} of {steps.length}: {steps[active]?.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

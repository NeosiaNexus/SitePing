"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

function CursorSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <title>Cursor</title>
      <path d="M5 3L19 12L12 13.5L9 20L5 3Z" fill="white" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// Positions (percentages relative to the content area)
const FAB = { x: 92, y: 88 };
const DRAW_START = { x: 15, y: 28 };
const DRAW_END = { x: 67, y: 50 };
const RECT = { left: 15, top: 28, width: 52, height: 22 };
const POPUP = { left: 15, top: 52 };

export function HeroMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLDivElement>(null);
  const ripple1Ref = useRef<HTMLDivElement>(null);
  const ripple2Ref = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const rect = rectRef.current;
    const popup = popupRef.current;
    const dot = dotRef.current;
    const fab = fabRef.current;
    const ripple1 = ripple1Ref.current;
    const ripple2 = ripple2Ref.current;
    const glow = glowRef.current;
    const typing = typingRef.current;

    if (!cursor || !rect || !popup || !dot || !fab || !ripple1 || !ripple2 || !glow || !typing) return;

    const pct = (v: number) => `${v}%`;

    // Initial states
    gsap.set(cursor, { opacity: 0, left: pct(50), top: pct(60) });
    gsap.set(rect, { opacity: 0, width: 0, height: 0, left: pct(RECT.left), top: pct(RECT.top), borderRadius: 4 });
    gsap.set(popup, { opacity: 0, y: 10, scale: 0.96, left: pct(POPUP.left), top: pct(POPUP.top) });
    gsap.set(dot, {
      opacity: 0,
      scale: 0,
      left: pct(RECT.left + RECT.width),
      top: pct(RECT.top),
      xPercent: -50,
      yPercent: -50,
    });
    gsap.set(glow, { opacity: 0, left: pct(RECT.left), top: pct(RECT.top), width: 0, height: 0 });
    gsap.set([ripple1, ripple2], { opacity: 0, scale: 0 });
    gsap.set(typing, { width: 0 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    // ── Phase 1: Cursor appears & moves to FAB ──
    tl.to(cursor, { opacity: 1, duration: 0.3, ease: "power2.out" });
    tl.to(cursor, { left: pct(FAB.x), top: pct(FAB.y), duration: 0.6, ease: "power2.out" });

    // ── Phase 2: Click FAB (ripple + FAB highlight) ──
    tl.set(ripple1, { left: pct(FAB.x), top: pct(FAB.y), xPercent: -50, yPercent: -50 });
    tl.to(ripple1, { opacity: 0.6, scale: 1, duration: 0.15, ease: "power2.out" });
    tl.to(fab, { scale: 0.9, duration: 0.08, ease: "power2.in" }, "<");
    tl.to(fab, { scale: 1, duration: 0.2, ease: "back.out(3)" });
    tl.to(ripple1, { opacity: 0, scale: 1.8, duration: 0.35, ease: "power2.out" }, "<");

    // ── Phase 3: Cursor moves to draw start ──
    tl.to(cursor, { left: pct(DRAW_START.x), top: pct(DRAW_START.y), duration: 0.5, ease: "power2.inOut" });

    // ── Phase 4: Click to start draw (ripple) ──
    tl.set(ripple2, { left: pct(DRAW_START.x), top: pct(DRAW_START.y), xPercent: -50, yPercent: -50 });
    tl.to(ripple2, { opacity: 0.5, scale: 1, duration: 0.12, ease: "power2.out" });
    tl.to(ripple2, { opacity: 0, scale: 1.5, duration: 0.3, ease: "power2.out" });

    // ── Phase 5: Draw rectangle (cursor drags + rect grows + glow) ──
    tl.to(
      rect,
      { opacity: 1, width: pct(RECT.width), height: pct(RECT.height), duration: 1.2, ease: "power1.inOut" },
      "<",
    );
    tl.to(cursor, { left: pct(DRAW_END.x), top: pct(DRAW_END.y), duration: 1.2, ease: "power1.inOut" }, "<");
    tl.to(
      glow,
      { opacity: 1, width: pct(RECT.width), height: pct(RECT.height), duration: 1.2, ease: "power1.inOut" },
      "<",
    );

    // ── Phase 6: Release — glow fades, cursor moves to popup zone ──
    tl.to(glow, { opacity: 0, duration: 0.4, ease: "power2.out" });
    tl.to(cursor, { left: pct(22), top: pct(55), duration: 0.3, ease: "power2.out" }, "<");

    // ── Phase 7: Comment popup slides in ──
    tl.to(popup, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" });

    // ── Phase 8: Typing animation ──
    tl.to(typing, { width: "100%", duration: 1.2, ease: "steps(36)" });

    // ── Phase 9: Marker dot appears at top-right corner ──
    tl.to(dot, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(3)" }, "-=0.3");

    // ── Phase 10: Cursor fades (task done feeling) ──
    tl.to(cursor, { opacity: 0, duration: 0.3, ease: "power2.in" }, "-=0.1");

    // ── Phase 11: Hold visible ──
    tl.to({}, { duration: 2 });

    // ── Phase 12: Fade out everything ──
    tl.to([rect, popup, dot], { opacity: 0, duration: 0.5, ease: "power2.in" });

    // ── Phase 13: Reset all positions for next loop ──
    tl.set(cursor, { left: pct(50), top: pct(60) });
    tl.set(rect, { width: 0, height: 0 });
    tl.set(popup, { y: 10, scale: 0.96 });
    tl.set(dot, { scale: 0 });
    tl.set(glow, { width: 0, height: 0 });
    tl.set(typing, { width: 0 });
    tl.set(fab, { scale: 1 });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* Glow behind mockup */}
      <div className="pointer-events-none absolute inset-0 -z-10 translate-y-8 scale-90">
        <div className="h-full w-full rounded-3xl bg-accent/20 blur-3xl" />
      </div>

      {/* Browser frame */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          boxShadow: "0 28px 70px rgba(0,0,0,0.14), 0 14px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-2 bg-gray-800 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="ml-3 flex flex-1 items-center gap-1.5 rounded-md bg-gray-700/60 px-3 py-1">
            <svg
              className="h-3 w-3 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <title>Lock icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="text-xs text-gray-400">mon-client.fr</span>
          </div>
        </div>

        {/* Website content area */}
        <div ref={containerRef} className="relative aspect-[16/10] overflow-hidden bg-white">
          {/* Fake navbar */}
          <div className="flex items-center justify-between border-b border-gray-100 px-[5%] py-[2.5%]">
            <div className="h-[8px] w-[12%] rounded bg-gray-800" />
            <div className="flex gap-[3%]">
              <div className="h-[6px] w-[8%] rounded bg-gray-200" />
              <div className="h-[6px] w-[6%] rounded bg-gray-200" />
              <div className="h-[6px] w-[7%] rounded bg-gray-200" />
            </div>
          </div>

          {/* Fake hero area */}
          <div className="px-[5%] py-[5%]">
            <div className="mx-auto w-[70%]">
              <div className="mx-auto mb-[2%] h-[10px] w-[80%] rounded bg-gray-800" />
              <div className="mx-auto mb-[2%] h-[10px] w-[60%] rounded bg-gray-800" />
              <div className="mx-auto mb-[3%] h-[6px] w-[50%] rounded bg-gray-300" />
              <div className="mx-auto h-[8px] w-[18%] rounded bg-accent" />
            </div>
          </div>

          {/* Fake content grid - 3 cards */}
          <div className="flex gap-[3%] px-[5%]">
            <div className="flex-1 rounded-lg border border-gray-100 p-[3%]">
              <div className="mb-[8%] h-[6px] w-[40%] rounded bg-gray-300" />
              <div className="mb-[6%] h-[4px] w-full rounded bg-gray-100" />
              <div className="mb-[6%] h-[4px] w-[85%] rounded bg-gray-100" />
              <div className="h-[4px] w-[70%] rounded bg-gray-100" />
            </div>
            <div className="flex-1 rounded-lg border border-gray-100 p-[3%]">
              <div className="mb-[8%] h-[6px] w-[50%] rounded bg-gray-300" />
              <div className="mb-[6%] h-[4px] w-full rounded bg-gray-100" />
              <div className="mb-[6%] h-[4px] w-[90%] rounded bg-gray-100" />
              <div className="h-[4px] w-[60%] rounded bg-gray-100" />
            </div>
            <div className="flex-1 rounded-lg border border-gray-100 p-[3%]">
              <div className="mb-[8%] h-[6px] w-[35%] rounded bg-gray-300" />
              <div className="mb-[6%] h-[4px] w-full rounded bg-gray-100" />
              <div className="mb-[6%] h-[4px] w-[80%] rounded bg-gray-100" />
              <div className="h-[4px] w-[75%] rounded bg-gray-100" />
            </div>
          </div>

          {/* Fake text block */}
          <div className="px-[5%] py-[4%]">
            <div className="mb-[1.5%] h-[4px] w-full rounded bg-gray-100" />
            <div className="mb-[1.5%] h-[4px] w-[92%] rounded bg-gray-100" />
            <div className="mb-[1.5%] h-[4px] w-[88%] rounded bg-gray-100" />
            <div className="h-[4px] w-[45%] rounded bg-gray-100" />
          </div>

          {/* ── FAB button (SitePing widget button) ── */}
          <div
            ref={fabRef}
            className="absolute flex items-center justify-center rounded-full bg-accent shadow-lg"
            style={{ right: "4%", bottom: "5%", width: "7%", aspectRatio: "1" }}
          >
            <svg
              className="h-[55%] w-[55%] text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <title>Annotate</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>

          {/* ── Animated overlay elements ── */}

          {/* Selection rectangle */}
          <div
            ref={rectRef}
            className="pointer-events-none absolute rounded border-2 border-accent bg-accent/10"
            style={{ opacity: 0 }}
          />

          {/* Glow behind rectangle during draw */}
          <div
            ref={glowRef}
            className="pointer-events-none absolute rounded blur-md"
            style={{ opacity: 0, background: "rgba(23, 60, 255, 0.08)" }}
          />

          {/* Marker dot */}
          <div
            ref={dotRef}
            className="pointer-events-none absolute flex h-4 w-4 items-center justify-center rounded-full bg-accent shadow-sm"
            style={{ opacity: 0 }}
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-white" />
          </div>

          {/* Click ripples */}
          <div
            ref={ripple1Ref}
            className="pointer-events-none absolute h-8 w-8 rounded-full border-2 border-accent/60"
            style={{ opacity: 0 }}
          />
          <div
            ref={ripple2Ref}
            className="pointer-events-none absolute h-6 w-6 rounded-full border-2 border-accent/50"
            style={{ opacity: 0 }}
          />

          {/* Comment popup */}
          <div
            ref={popupRef}
            className="pointer-events-none absolute w-[55%] rounded-lg bg-white p-3 text-left shadow-xl ring-1 ring-gray-200"
            style={{ opacity: 0 }}
          >
            <span className="mb-1.5 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              Bug
            </span>
            <p className="overflow-hidden text-xs leading-relaxed text-gray-700">
              <span ref={typingRef} className="inline-block overflow-hidden whitespace-nowrap align-top">
                The CTA button is too small on mobile
              </span>
            </p>
            <p className="mt-1.5 text-[10px] text-gray-400">Sarah M.</p>
          </div>

          {/* Custom cursor */}
          <div ref={cursorRef} className="pointer-events-none absolute z-10" style={{ opacity: 0 }}>
            <CursorSvg />
          </div>
        </div>
      </div>
    </div>
  );
}

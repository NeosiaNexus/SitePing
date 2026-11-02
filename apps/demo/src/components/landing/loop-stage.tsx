"use client";

import { useEffect, useRef } from "react";
import { GitHubIcon } from "./icons";
import { gsap, prefersReducedMotion, setupMotion } from "./motion";

/*
 * The product, acted out in one browser frame. Every element is placed in
 * percentages of the frame and sized in container units, so the cursor's
 * path is the same at any width. Steps:
 *   0 the client draws on the page      2 the note lands in your inbox
 *   1 the layout changes, the pin stays 3 you triage, reply, resolve
 * Each step has a settled state; entering step n settles n - 1, then plays n.
 */

const SCORE = [0.94, 0.71, 0.88] as const;

// Cursor stops, as % of the frame (the track is the frame, so translate % = frame %).
const AT = {
  rest: [64, 86],
  fab: [92.8, 89.6],
  rectStart: [5.6, 47.4],
  rectEnd: [31.2, 58.6],
  send: [42, 79],
} as const;

type Stop = readonly [number, number];
const to = ([x, y]: Stop) => ({ xPercent: x, yPercent: y });

function buildSettle(q: (name: string) => Element[]) {
  return (n: number) => {
    const site = n <= 1;
    gsap.set(q("site"), { opacity: site ? 1 : 0, scale: site ? 1 : 0.98, filter: "blur(0px)" });
    gsap.set(q("inbox"), { opacity: site ? 0 : 1, scale: 1, filter: "blur(0px)" });
    gsap.set(q("url-site"), { opacity: site ? 1 : 0 });
    gsap.set(q("url-inbox"), { opacity: site ? 0 : 1 });
    gsap.set(q("cursor"), { opacity: 0, scale: 1 });
    gsap.set(q("track"), to(AT.rest));
    gsap.set(q("fab"), { scale: 1 });
    gsap.set(q("rect"), { opacity: n >= 0 ? 1 : 0, clipPath: `inset(0% ${n >= 0 ? "0% 0%" : "100% 100%"} 0%)` });
    gsap.set(q("marker"), { xPercent: -50, yPercent: -50, opacity: n >= 0 ? 1 : 0, scale: 1 });
    gsap.set(q("popup"), { opacity: 0, scale: 0.96, y: 6 });
    gsap.set(q("typed"), { clipPath: "inset(0% 100% 0% 0%)" });
    gsap.set(q("banner"), { visibility: "visible", y: 0, yPercent: n >= 1 ? 0 : -100 });
    gsap.set(q("content"), { yPercent: n >= 1 ? 8 : 0 });
    gsap.set(q("score"), { opacity: n === 1 ? 1 : 0, y: n === 1 ? 0 : 8 });
    gsap.set(q("bar"), { scaleX: (i: number) => (n >= 1 ? (SCORE[i] ?? 0) : 0) });
    gsap.set(q("winner"), { opacity: n >= 1 ? 1 : 0 });
    gsap.set(q("toast"), { opacity: n === 2 ? 1 : 0, y: n === 2 ? 0 : -10 });
    gsap.set(q("sel"), { yPercent: 0 });
    gsap.set(q("kbd"), { backgroundColor: "rgba(255,255,255,0.04)", color: "#a7afd4" });
    gsap.set(q("status-open"), { opacity: n >= 3 ? 0 : 1, filter: "blur(0px)" });
    gsap.set(q("status-resolved"), { opacity: n >= 3 ? 1 : 0, filter: "blur(0px)" });
    gsap.set(q("reply"), { opacity: n >= 3 ? 1 : 0, y: n >= 3 ? 0 : 6 });
    gsap.set(q("issue"), { opacity: n >= 3 ? 1 : 0, scale: n >= 3 ? 1 : 0.96 });
  };
}

function buildEnter(q: (name: string) => Element[]) {
  const press = (tl: gsap.core.Timeline, at: number, extra: Element[] = []) =>
    tl
      .to([...q("cursor"), ...extra], { scale: 0.88, duration: 0.1, ease: "out-strong" }, at)
      .to([...q("cursor"), ...extra], { scale: 1, duration: 0.2, ease: "out-strong" }, at + 0.12);

  return (n: number): gsap.core.Timeline => {
    const tl = gsap.timeline({ defaults: { ease: "out-strong" } });
    if (n === 0) {
      // The client opens the widget, draws around the button, writes, sends.
      tl.to(q("cursor"), { opacity: 1, duration: 0.2 }, 0.2);
      tl.to(q("track"), { ...to(AT.fab), duration: 0.7, ease: "in-out-strong" }, 0.2);
      press(tl, 0.92, q("fab"));
      tl.to(q("track"), { ...to(AT.rectStart), duration: 0.75, ease: "in-out-strong" }, 1.25);
      tl.set(q("rect"), { opacity: 1 }, 2.05);
      tl.to(q("rect"), { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "in-out-strong" }, 2.05);
      tl.to(q("track"), { ...to(AT.rectEnd), duration: 0.7, ease: "in-out-strong" }, 2.05);
      tl.to(q("popup"), { opacity: 1, scale: 1, y: 0, duration: 0.3 }, 2.85);
      tl.to(q("typed"), { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "steps(37)" }, 3.1);
      tl.to(q("track"), { ...to(AT.send), duration: 0.55, ease: "in-out-strong" }, 3.5);
      press(tl, 4.3);
      tl.to(q("popup"), { opacity: 0, scale: 0.97, duration: 0.2 }, 4.45);
      tl.fromTo(q("marker"), { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3 }, 4.5);
      tl.to(q("cursor"), { opacity: 0, duration: 0.25 }, 4.7);
    } else if (n === 1) {
      // Content shifts under a new banner; the pin rides along with its element.
      tl.to(q("banner"), { yPercent: 0, duration: 0.6, ease: "drawer" }, 0.25);
      tl.to(q("content"), { yPercent: 8, duration: 0.6, ease: "drawer" }, 0.25);
      tl.fromTo(q("marker"), { scale: 1.18 }, { scale: 1, duration: 0.45 }, 0.85);
      tl.to(q("score"), { opacity: 1, y: 0, duration: 0.35 }, 1.0);
      tl.to(q("bar"), { scaleX: (i: number) => SCORE[i] ?? 0, duration: 0.7, stagger: 0.08 }, 1.15);
      tl.to(q("winner"), { opacity: 1, duration: 0.25 }, 1.8);
    } else if (n === 2) {
      // From their page to your admin: a blurred cross-fade reads as one surface turning.
      tl.to(q("site"), { opacity: 0, scale: 0.98, filter: "blur(4px)", duration: 0.35 }, 0.1);
      tl.to(q("url-site"), { opacity: 0, duration: 0.2 }, 0.1);
      tl.fromTo(
        q("inbox"),
        { opacity: 0, scale: 1.02, filter: "blur(4px)" },
        { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.45 },
        0.3,
      );
      tl.to(q("url-inbox"), { opacity: 1, duration: 0.2 }, 0.3);
      tl.to(q("toast"), { opacity: 1, y: 0, duration: 0.35 }, 1.0);
    } else if (n === 3) {
      // j, k: the selection jumps, never glides (keyboard actions don't animate).
      tl.to(q("toast"), { opacity: 0, y: -8, duration: 0.2 }, 0.1);
      const [kj, kk] = q("kbd");
      const lit = { backgroundColor: "#173cff", color: "#ffffff", duration: 0.08 };
      const dim = { backgroundColor: "rgba(255,255,255,0.04)", color: "#a7afd4", duration: 0.2 };
      if (kj && kk) {
        tl.to(kj, lit, 0.5).set(q("sel"), { yPercent: 100 }, 0.5).to(kj, dim, 0.62);
        tl.to(kk, lit, 1.1).set(q("sel"), { yPercent: 0 }, 1.1).to(kk, dim, 1.22);
      }
      tl.to(q("reply"), { opacity: 1, y: 0, duration: 0.3 }, 1.6);
      tl.to(q("status-open"), { opacity: 0, filter: "blur(2px)", duration: 0.2 }, 2.2);
      tl.fromTo(
        q("status-resolved"),
        { opacity: 0, filter: "blur(2px)" },
        { opacity: 1, filter: "blur(0px)", duration: 0.25 },
        2.25,
      );
      tl.to(q("issue"), { opacity: 1, scale: 1, duration: 0.3 }, 2.5);
    }
    return tl;
  };
}

/**
 * `step` drives the scene. `armed` gates playback (an off-screen stage stays
 * settled and silent until it is scrolled into view).
 */
export function LoopStage({ step, armed = true }: { step: number; armed?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setupMotion();
    const q = (name: string) => Array.from(root.querySelectorAll(`[data-el="${name}"]`));
    const settle = buildSettle(q);
    tlRef.current?.kill();
    if (!armed || prefersReducedMotion()) {
      settle(armed ? step : step - 1);
      return;
    }
    settle(step - 1);
    tlRef.current = buildEnter(q)(step);
  }, [step, armed]);

  useEffect(() => () => void tlRef.current?.kill(), []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="relative select-none overflow-hidden rounded-[20px] bg-[#0b1028] shadow-[0_0_0_1px_rgb(148_163_255/0.14),0_40px_100px_-30px_rgb(0_0_0/0.8),0_0_80px_-20px_rgb(23_60_255/0.35)] [container-type:inline-size]"
    >
      {/* Browser chrome */}
      <div className="flex h-[6.2cqw] max-h-11 min-h-8 items-center gap-[1.6cqw] border-b border-white/[0.06] px-[2.6cqw]">
        <span className="flex gap-[0.9cqw]">
          <span className="h-[1.4cqw] w-[1.4cqw] rounded-full bg-white/15" />
          <span className="h-[1.4cqw] w-[1.4cqw] rounded-full bg-white/15" />
          <span className="h-[1.4cqw] w-[1.4cqw] rounded-full bg-white/15" />
        </span>
        <span className="relative ml-[1.5cqw] flex h-[3.6cqw] flex-1 items-center rounded-full bg-white/[0.05] px-[2cqw] font-sans text-[1.55cqw] text-mist">
          <span data-el="url-site" className="absolute">
            atelier-nord.fr
          </span>
          <span data-el="url-inbox" className="absolute opacity-0">
            atelier-nord.fr/admin/feedback
          </span>
        </span>
      </div>

      <div className="relative aspect-[16/11]">
        {/* ── The client's site ── */}
        <div data-el="site" className="absolute inset-0 overflow-hidden bg-[#fbf7f1] font-serif text-[#2b2119]">
          <div
            data-el="banner"
            className="invisible absolute inset-x-0 top-0 z-10 flex h-[8%] items-center justify-center bg-[#2b2119] font-sans text-[1.5cqw] text-[#fbf7f1]"
          >
            Spring hours: open from 7 am, every day
          </div>

          <div data-el="content" className="absolute inset-0">
            <div className="absolute left-[6%] right-[6%] top-[5%] flex items-center justify-between">
              <span className="text-[2.1cqw] font-bold tracking-tight">Atelier Nord</span>
              <span className="flex gap-[2.4cqw] font-sans text-[1.45cqw] text-[#6b5a4b]">
                <span>Breads</span>
                <span>Pastries</span>
                <span>Visit</span>
              </span>
            </div>
            <p className="absolute left-[6%] top-[19%] w-[46%] text-[4.4cqw] font-semibold leading-[1.02] tracking-tight">
              Bread worth waking up for.
            </p>
            <p className="absolute left-[6%] top-[37%] w-[40%] font-sans text-[1.5cqw] leading-snug text-[#6b5a4b]">
              Sourdough, viennoiseries and coffee, baked every morning in Lyon.
            </p>
            <span className="absolute left-[7%] top-[49.6%] flex h-[7.4%] w-[22.8%] items-center justify-center rounded-[0.9cqw] bg-[#2b2119] font-sans text-[1.45cqw] font-medium text-[#fbf7f1]">
              Order for pickup
            </span>
            <span
              className="absolute right-[6%] top-[16%] h-[45%] w-[38%] rounded-[1.6cqw]"
              style={{
                background:
                  "radial-gradient(60% 50% at 40% 60%, #f3d9b4 0%, transparent 70%), radial-gradient(45% 40% at 70% 35%, #d9a26b 0%, transparent 70%), linear-gradient(140deg, #e8c497, #b9733f)",
              }}
            />
            {[6, 36.5, 67].map((left, i) => (
              <span
                key={left}
                className="absolute top-[68%] flex h-[24%] w-[27%] flex-col gap-[0.9cqw] rounded-[1.2cqw] bg-white p-[1.5cqw] shadow-[0_1px_0_rgb(43_33_25/0.06),0_0_0_1px_rgb(43_33_25/0.06)]"
                style={{ left: `${left}%` }}
              >
                <span
                  className="h-[55%] rounded-[0.8cqw]"
                  style={{ background: ["#efd5b5", "#e7c0a0", "#ead9c0"][i] }}
                />
                <span className="h-[1.1cqw] w-[60%] rounded bg-[#2b2119]/70" />
                <span className="h-[0.9cqw] w-[40%] rounded bg-[#2b2119]/25" />
              </span>
            ))}

            {/* The annotation, inside the content so it moves with its element. */}
            <span
              data-el="rect"
              className="absolute left-[5.6%] top-[47.4%] h-[11.2%] w-[25.6%] rounded-[0.8cqw] opacity-0"
              style={{ border: "2px solid #173cff", background: "rgb(23 60 255 / 0.1)" }}
            />
            <span
              data-el="marker"
              className="absolute left-[31.2%] top-[47.4%] flex h-[4.6cqw] w-[4.6cqw] items-center justify-center rounded-full bg-[#173cff] font-sans text-[1.7cqw] font-semibold text-white opacity-0 shadow-[0_0_0_0.5cqw_#fff,0_0.6cqw_1.6cqw_rgb(23_60_255/0.45)]"
            >
              1
            </span>
          </div>

          {/* The widget's form */}
          <span
            data-el="popup"
            className="absolute left-[5.6%] top-[61%] z-20 flex w-[42%] origin-top-left flex-col gap-[1.2cqw] rounded-[1.4cqw] bg-white p-[1.8cqw] font-sans opacity-0 shadow-[0_2cqw_5cqw_-1cqw_rgb(20_20_40/0.35),0_0_0_1px_rgb(20_20_40/0.08)]"
          >
            <span className="flex gap-[0.8cqw] text-[1.3cqw] font-medium">
              <span className="rounded-full px-[1.2cqw] py-[0.4cqw] text-[#5b6382] ring-1 ring-[#e3e6f2]">
                Question
              </span>
              <span className="rounded-full bg-[#fde8e8] px-[1.2cqw] py-[0.4cqw] text-[#b42318] ring-1 ring-[#f7c7c4]">
                Bug
              </span>
              <span className="rounded-full px-[1.2cqw] py-[0.4cqw] text-[#5b6382] ring-1 ring-[#e3e6f2]">Change</span>
            </span>
            <span className="rounded-[0.9cqw] px-[1.3cqw] py-[1.1cqw] text-[1.5cqw] text-[#1b2140] ring-1 ring-[#e3e6f2]">
              <span data-el="typed" className="block whitespace-nowrap">
                The CTA button is too small on mobile
              </span>
            </span>
            <span className="flex justify-end">
              <span className="rounded-[0.8cqw] bg-[#173cff] px-[2cqw] py-[0.8cqw] text-[1.4cqw] font-semibold text-white">
                Send
              </span>
            </span>
          </span>

          {/* How the anchor was found again */}
          <span
            data-el="score"
            className="absolute bottom-[4%] left-[3.5%] z-20 flex w-[52%] flex-col gap-[0.9cqw] rounded-[1.4cqw] bg-[#0b1028] p-[1.8cqw] font-sans text-[1.35cqw] text-mist opacity-0 shadow-[0_2cqw_5cqw_-1cqw_rgb(0_0_0/0.5)]"
          >
            <span className="text-[1.3cqw] font-semibold text-paper">Re-anchored after the layout change</span>
            {[
              ["CSS selector", "main a.order"],
              ["XPath", "/main/section[1]/a"],
              ["Text", "“Order for pickup”"],
            ].map(([label, value], i) => (
              <span key={label} className="grid grid-cols-[30%_1fr_6%] items-center gap-[1cqw]">
                <span className="truncate">
                  {label} <span className="font-code text-[1.15cqw] text-dim">{value}</span>
                </span>
                <span className="h-[0.7cqw] overflow-hidden rounded-full bg-white/[0.06]">
                  <span
                    data-el="bar"
                    className={`block h-full origin-left rounded-full ${i === 0 ? "bg-[#7690ff]" : "bg-white/25"}`}
                  />
                </span>
                <span className="text-right font-code text-[1.15cqw] text-paper">{SCORE[i]?.toFixed(2)}</span>
              </span>
            ))}
            <span data-el="winner" className="text-[1.25cqw] text-[#7690ff] opacity-0">
              Best match wins, the pin follows its element.
            </span>
          </span>

          {/* SitePing's button */}
          <span
            data-el="fab"
            className="absolute bottom-[5%] right-[3.5%] z-20 flex aspect-square w-[7.4%] items-center justify-center rounded-full bg-[#173cff] shadow-[0_1cqw_2.5cqw_rgb(23_60_255/0.45)]"
          >
            <svg
              aria-hidden="true"
              className="h-[45%] w-[45%] text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </span>

          <span data-el="track" className="pointer-events-none absolute inset-0 z-30 block">
            <span data-el="cursor" className="absolute left-0 top-0 -ml-[0.4cqw] -mt-[0.3cqw] block opacity-0">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="h-[3.2cqw] w-[3.2cqw]"
                aria-hidden="true"
              >
                <path
                  d="M5 3L19 12L12 13.5L9 20L5 3Z"
                  fill="#111"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
        </div>

        {/* ── Your inbox ── */}
        <div
          data-el="inbox"
          className="absolute inset-0 grid grid-cols-[41%_1fr] bg-[#0b1028] font-sans text-[1.4cqw] text-mist opacity-0"
        >
          <div className="flex flex-col border-r border-white/[0.07]">
            <div className="flex h-[11%] items-center justify-between border-b border-white/[0.07] px-[2.2cqw]">
              <span className="text-[1.6cqw] font-semibold text-paper">Inbox</span>
              <span className="flex items-center gap-[0.6cqw]">
                <span
                  data-el="kbd"
                  className="rounded-[0.5cqw] px-[0.9cqw] py-[0.2cqw] font-code text-[1.2cqw] ring-1 ring-white/10"
                >
                  j
                </span>
                <span
                  data-el="kbd"
                  className="rounded-[0.5cqw] px-[0.9cqw] py-[0.2cqw] font-code text-[1.2cqw] ring-1 ring-white/10"
                >
                  k
                </span>
              </span>
            </div>
            <div className="relative">
              <span
                data-el="sel"
                className="absolute inset-x-0 top-0 h-[8.6cqw] border-l-[0.4cqw] border-[#173cff] bg-[#173cff]/[0.12]"
              />
              {[
                ["#f87171", "The CTA button is too small on mobile", "Bug, 2 min ago"],
                ["#fbbf24", "Swap the two hero buttons", "Change, 1 h ago"],
                ["#7690ff", "Can the hours show on mobile?", "Question, 3 h ago"],
                ["#34d399", "Footer links open in the same tab", "Bug, resolved"],
              ].map(([color, title, meta], i) => (
                <span key={title} className="relative flex h-[8.6cqw] flex-col justify-center gap-[0.4cqw] px-[2.2cqw]">
                  <span className="flex items-center gap-[1cqw]">
                    <span className="h-[1cqw] w-[1cqw] shrink-0 rounded-full" style={{ background: color }} />
                    <span className={`truncate ${i === 3 ? "text-dim line-through" : "text-paper"}`}>{title}</span>
                  </span>
                  <span className="pl-[2cqw] text-[1.2cqw] text-dim">{meta}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[1.8cqw] p-[2.4cqw]">
            <div className="flex items-start justify-between gap-[2cqw]">
              <span className="text-[1.9cqw] font-semibold leading-tight text-paper">
                The CTA button is too small on mobile
              </span>
              <span className="relative shrink-0 text-[1.2cqw] font-medium">
                <span
                  data-el="status-open"
                  className="block rounded-full bg-[#173cff]/20 px-[1.2cqw] py-[0.4cqw] text-[#a9b8ff]"
                >
                  Open
                </span>
                <span
                  data-el="status-resolved"
                  className="absolute right-0 top-0 block rounded-full bg-emerald-400/15 px-[1.2cqw] py-[0.4cqw] text-emerald-300 opacity-0"
                >
                  Resolved
                </span>
              </span>
            </div>

            {/* The capture, with the client's box re-drawn on it */}
            <span className="relative block h-[30%] overflow-hidden rounded-[1.2cqw] bg-[#fbf7f1]">
              <span className="absolute left-[8%] top-[18%] h-[1.6cqw] w-[40%] rounded bg-[#2b2119]/70" />
              <span className="absolute left-[8%] top-[34%] h-[1.1cqw] w-[30%] rounded bg-[#2b2119]/25" />
              <span className="absolute left-[8%] top-[56%] flex h-[24%] w-[30%] items-center justify-center rounded-[0.7cqw] bg-[#2b2119] text-[1.1cqw] text-[#fbf7f1]">
                Order for pickup
              </span>
              <span
                className="absolute left-[6%] top-[50%] h-[36%] w-[34%] rounded-[0.7cqw]"
                style={{ border: "2px solid #173cff", background: "rgb(23 60 255 / 0.1)" }}
              />
              <span className="absolute right-[6%] top-[14%] h-[72%] w-[38%] rounded-[1cqw] bg-gradient-to-br from-[#e8c497] to-[#b9733f]" />
            </span>

            <span className="flex flex-col gap-[0.6cqw] rounded-[1cqw] bg-white/[0.03] p-[1.4cqw] font-code text-[1.15cqw] ring-1 ring-white/[0.06]">
              <span className="text-[#f87171]">✗ TypeError: cart is undefined</span>
              <span className="text-[#f87171]">✗ POST /api/checkout → 500</span>
            </span>

            <span className="flex flex-col gap-[0.8cqw]">
              <span className="w-fit max-w-[80%] rounded-[1.2cqw] rounded-bl-[0.3cqw] bg-white/[0.05] px-[1.4cqw] py-[0.8cqw] text-paper">
                Tried it on my phone, hard to tap.
              </span>
              <span
                data-el="reply"
                className="ml-auto flex w-fit max-w-[80%] items-center gap-[0.8cqw] rounded-[1.2cqw] rounded-br-[0.3cqw] bg-[#173cff]/20 px-[1.4cqw] py-[0.8cqw] text-paper opacity-0"
              >
                <span className="rounded bg-[#173cff]/40 px-[0.6cqw] text-[1.05cqw] text-[#c9d3ff]">Team</span>
                Bumped it to 48 px, live now.
              </span>
            </span>

            <span
              data-el="issue"
              className="mt-auto flex w-fit items-center gap-[0.8cqw] rounded-full bg-white/[0.04] px-[1.4cqw] py-[0.6cqw] text-[1.2cqw] text-mist opacity-0 ring-1 ring-white/10"
            >
              <GitHubIcon className="h-[1.5cqw] w-[1.5cqw]" />
              Issue atelier-nord/site#128 closed
            </span>
          </div>

          {/* What your team sees in Slack when it lands */}
          <span
            data-el="toast"
            className="absolute right-[2.4cqw] top-[2.4cqw] flex w-[44%] flex-col gap-[0.4cqw] rounded-[1.2cqw] bg-white p-[1.6cqw] text-[1.3cqw] text-[#1b2140] opacity-0 shadow-[0_2cqw_5cqw_-1cqw_rgb(0_0_0/0.6)]"
          >
            <span className="font-semibold">#client-feedback, in Slack</span>
            <span className="leading-snug text-[#4a516e]">
              New bug on atelier-nord.fr: The CTA button is too small on mobile
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

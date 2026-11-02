"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "siteping_demo_coach_seen";

export type CoachState = "hidden" | "hint" | "sent";

/** First visit only: has this browser already been shown the hint? */
export function coachAlreadySeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markCoachSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode: the hint simply shows again next time.
  }
}

/**
 * Two moments of guidance, both rare by design:
 * - `hint`, on a first visit: a bubble that points at the widget's button;
 * - `sent`, right after a note is submitted: the bridge to the other side of
 *   the demo, the freelancer's inbox.
 * Both enter with 8px and opacity in 250ms (ease-out) and leave faster than
 * they came. The bubble sits next to the button whichever corner it is in.
 */
export function Coach({
  state,
  position,
  inboxHref,
  onDismiss,
}: {
  state: CoachState;
  position: "bottom-right" | "bottom-left";
  inboxHref: string;
  onDismiss: () => void;
}) {
  // Keep the last visible content mounted while it fades out.
  const [shown, setShown] = useState<CoachState>(state);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (state === "hidden") {
      setVisible(false);
      return;
    }
    setShown(state);
    // Next frame, so the entry transition has a start state to leave.
    const raf = requestAnimationFrame(() => setVisible(true));
    if (state === "sent") timer.current = window.setTimeout(onDismiss, 9000);
    return () => cancelAnimationFrame(raf);
  }, [state, onDismiss]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (shown === "hidden") return null;

  // Phones: above the button. Wider screens: beside it.
  const right = position === "bottom-right";
  const place = right ? "right-4 sm:right-[5.75rem]" : "left-4 sm:left-[5.75rem]";
  const arrow = right
    ? "-bottom-1.5 right-7 sm:bottom-[1.2rem] sm:-right-1.5 sm:left-auto"
    : "-bottom-1.5 left-7 sm:bottom-[1.2rem] sm:-left-1.5 sm:right-auto";

  return (
    <div
      data-siteping-ignore="true"
      role="status"
      onPointerEnter={() => window.clearTimeout(timer.current)}
      className={`landing fixed bottom-[5.5rem] z-[2147483000] w-[min(20rem,calc(100vw-2rem))] sm:bottom-[1.6rem] sm:w-[min(20rem,calc(100vw-7rem))] rounded-2xl bg-ink p-4 text-paper shadow-[0_20px_50px_-12px_rgb(5_7_26/0.7),0_0_0_1px_rgb(148_163_255/0.18)] transition-[opacity,transform] ${place} ${
        visible
          ? "translate-y-0 opacity-100 duration-[250ms] ease-out-strong"
          : "pointer-events-none translate-y-2 opacity-0 duration-150 ease-[ease]"
      } motion-reduce:translate-y-0`}
    >
      {/* The arrow points at the widget's button. */}
      <span
        aria-hidden="true"
        className={`absolute h-3 w-3 rotate-45 bg-ink shadow-[1px_1px_0_rgb(148_163_255/0.18)] ${arrow}`}
      />
      {shown === "hint" ? (
        <>
          <p className="text-[15px] font-semibold">Leave your first note</p>
          <p className="mt-1 text-[13.5px] leading-snug text-mist">
            Click this button, then draw a box around anything on the page. You are the client here.
          </p>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8fe3b9] text-ink">
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Note pinned
          </p>
          <p className="mt-1 text-[13.5px] leading-snug text-mist">
            Now switch sides: it is already waiting in the freelancer&apos;s inbox.
          </p>
          <Link
            href={inboxHref}
            className="press focus-ring mt-3 inline-flex h-9 items-center rounded-full bg-cobalt px-4 text-[13.5px] font-semibold text-white"
          >
            Open the inbox
          </Link>
        </>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="press focus-ring absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-dim transition-colors duration-150 hover:bg-white/[0.06] hover:text-paper"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

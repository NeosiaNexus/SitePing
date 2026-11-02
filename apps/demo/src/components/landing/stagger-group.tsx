"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * A grid that would otherwise pop in all at once arrives as a cascade, once:
 * 12px and opacity, 500ms ease-out, 50ms apart. Runs on WAAPI (off the main
 * thread), never hides content before it's on screen, never blocks a click,
 * and does nothing under reduced motion.
 */
export function StaggerGroup({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        Array.from(el.children).forEach((child, i) => {
          child.animate(
            [
              { opacity: 0, transform: "translateY(12px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 500, delay: i * 50, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" },
          );
        });
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}

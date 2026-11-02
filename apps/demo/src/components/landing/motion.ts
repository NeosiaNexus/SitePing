import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

let registered = false;

/**
 * Registers the plugins and the page's three curves once. The curves are the
 * same values as the CSS tokens (--ease-out-strong, --ease-in-out-strong), so
 * GSAP and CSS motion read as one system:
 * - `out-strong` for anything entering or answering the user,
 * - `in-out-strong` for things moving across the screen,
 * - `drawer` for panels that slide.
 */
export function setupMotion(): typeof gsap {
  if (!registered) {
    gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText);
    CustomEase.create("out-strong", "0.23,1,0.32,1");
    CustomEase.create("in-out-strong", "0.77,0,0.175,1");
    CustomEase.create("drawer", "0.32,0.72,0,1");
    registered = true;
  }
  return gsap;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger, SplitText };

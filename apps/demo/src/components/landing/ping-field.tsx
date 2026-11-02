"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * Mounts the WebGL ping field once the page is idle, so three.js never
 * competes with the first paint or the headline. Without WebGL the hero keeps
 * its CSS backdrop.
 */
export function PingField({ hitArea }: { hitArea: RefObject<HTMLElement | null> }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const area = hitArea.current;
    if (!host || !area) return;

    let disposed = false;
    let teardown: (() => void) | undefined;

    const boot = () => {
      import("./ping-field-scene").then(({ createPingField }) => {
        if (!disposed) teardown = createPingField(host, area);
      });
    };

    const idle = "requestIdleCallback" in window;
    const handle = idle ? window.requestIdleCallback(boot, { timeout: 1200 }) : window.setTimeout(boot, 300);

    return () => {
      disposed = true;
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      teardown?.();
    };
  }, [hitArea]);

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0" />;
}

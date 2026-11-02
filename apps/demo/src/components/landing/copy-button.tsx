"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_CLASS =
  "flex items-center gap-1.5 border-l border-gray-700 px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white";

export function CopyButton({ text, className = DEFAULT_CLASS }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers / insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }, [text]);

  // The two states cross-fade in place with a 2px blur, so the swap reads as
  // one control changing state rather than two icons trading places.
  const layer =
    "col-start-1 row-start-1 flex items-center gap-1.5 transition-[opacity,filter] duration-200 ease-[ease]";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      <span className="grid">
        <span className={layer} style={{ opacity: copied ? 0 : 1, filter: copied ? "blur(2px)" : "blur(0px)" }}>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </span>
        <span
          className={`${layer} text-green-400`}
          style={{ opacity: copied ? 1 : 0, filter: copied ? "blur(0px)" : "blur(2px)" }}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}

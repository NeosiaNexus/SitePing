"use client";

/**
 * Buttons that fire off console messages and failed network requests on
 * demand. Lets visitors see the diagnostics capture in action without having
 * to open devtools. Rendered inside the playground panel while "Capture
 * diagnostics" is on.
 */
export function DiagnosticsTriggers() {
  function logSequence() {
    console.log("[demo] user clicked the diagnostics trigger");
    console.info("[demo] fetching dashboard data…");
    console.warn("[demo] feature flag missing: experimental_panel");
  }

  function logError() {
    console.error(new TypeError("Cannot read property 'foo' of undefined"));
  }

  async function failedFetch() {
    try {
      // A request to a definitely-broken endpoint — captured as a 500 in
      // the network buffer.
      await fetch("/api/this-endpoint-does-not-exist", { method: "POST" });
    } catch {
      // The wrapper above re-throws on network errors. Swallow here so the
      // page doesn't surface an "Unhandled" overlay in the demo.
    }
  }

  const base =
    "press focus-ring flex h-8 items-center gap-2 rounded-lg px-2.5 text-left text-[12.5px] transition-colors duration-150 hover:bg-white/[0.06]";

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={logSequence} className={`${base} text-mist hover:text-paper`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cobalt-soft" />
        Log console messages
      </button>
      <button type="button" onClick={logError} className={`${base} text-[#ff9b9b]`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#ff6b6b]" />
        Trigger console.error
      </button>
      <button type="button" onClick={failedFetch} className={`${base} text-[#ff9b9b]`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#ff6b6b]" />
        Trigger failed fetch
      </button>
    </div>
  );
}

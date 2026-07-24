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

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={logSequence}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent motion-reduce:transition-none"
      >
        Log console messages
      </button>
      <button
        type="button"
        onClick={logError}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent motion-reduce:transition-none"
      >
        Trigger console.error
      </button>
      <button
        type="button"
        onClick={failedFetch}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent motion-reduce:transition-none"
      >
        Trigger failed fetch
      </button>
    </div>
  );
}

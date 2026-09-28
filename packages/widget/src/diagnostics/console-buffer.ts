/**
 * Console buffer — capture the last N `console.{log,info,warn,error}` calls
 * so they ship with every feedback submission.
 *
 * Why a ring buffer:
 *  - **bounded memory** even on chatty pages (1000s of logs/min during dev),
 *  - **last-N is the relevant slice** for debugging — what was happening just
 *    before the user noticed the bug, not the full session history.
 *
 * Why monkey-patching instead of `console.dir`/Performance Timeline:
 *  - host code already uses plain `console.*` everywhere, and many libraries
 *    only emit through console (no other observable),
 *  - patching is reversible via `dispose()` so the widget never leaves state
 *    behind on `destroy()`.
 */

/**
 * Default AND ceiling: adapter-prisma validates `diagnostics.console` at max
 * 50 entries, so a larger buffer would turn every submission into a 400.
 */
const MAX_ENTRIES = 50;
/** Under the server's 600-char `message` cap. */
const MAX_MESSAGE_LENGTH = 500;

/** Per-entry shape — sent to the server in the diagnostics payload. */
export interface ConsoleEntry {
  level: "log" | "info" | "warn" | "error";
  /** ISO 8601 timestamp captured at log time. */
  timestamp: string;
  /** Best-effort string representation of the console args. */
  message: string;
}

const LEVELS: Array<ConsoleEntry["level"]> = ["log", "info", "warn", "error"];

/**
 * Best-effort stringification that never throws.
 *
 * - `Error` → `Error: message\nstack` (capped to 500 chars overall).
 * - circular / huge objects → fall back to `Object#toString()` or `"[Unserializable]"`.
 * - all output is truncated to `MAX_MESSAGE_LENGTH` so a single 5MB log
 *   doesn't blow up the buffer (Slack-style 500 chars per row is plenty).
 */
function serializeArg(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "string") return arg;
  if (typeof arg === "number" || typeof arg === "boolean" || typeof arg === "bigint") {
    return String(arg);
  }
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ""}`;
  }
  try {
    // Replacer marks cycles and replaces functions with a placeholder (we
    // don't want random function bodies in a feedback payload). Cycles are
    // detected against the ANCESTOR chain, not every object seen so far: an
    // object referenced twice side by side (`{ a: s, b: s }`) is shared, not
    // circular. `this` is the object holding `value`, so ancestors past it
    // belong to a finished sibling. A shared object is serialized at every
    // reference, so a node budget keeps a diamond-shaped graph from growing
    // exponentially — past it, values are pruned, and what was already
    // emitted fills the MAX_MESSAGE_LENGTH the output is cut to anyway.
    const ancestors: unknown[] = [];
    let budget = MAX_MESSAGE_LENGTH;
    return JSON.stringify(arg, function (this: unknown, _key, value: unknown) {
      if (--budget < 0) return undefined;
      if (typeof value === "function") return "[Function]";
      if (typeof value === "symbol") return value.toString();
      if (typeof value !== "object" || value === null) return value;
      while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) ancestors.pop();
      if (ancestors.includes(value)) return "[Circular]";
      ancestors.push(value);
      return value;
    });
  } catch {
    try {
      return String(arg);
    } catch {
      return "[Unserializable]";
    }
  }
}

function formatArgs(args: readonly unknown[]): string {
  let out = "";
  for (let i = 0; i < args.length; i++) {
    if (i > 0) out += " ";
    out += serializeArg(args[i]);
    if (out.length >= MAX_MESSAGE_LENGTH) break;
  }
  if (out.length > MAX_MESSAGE_LENGTH) {
    out = `${out.slice(0, MAX_MESSAGE_LENGTH - 1)}…`;
  }
  return out;
}

/**
 * Bounded ring buffer of console messages.
 *
 * Construction installs the wrappers immediately. `dispose()` restores the
 * originals exactly once (calling it twice is a no-op). Designed to be safe
 * against re-entrant or interleaved instances — each wrapper closes over the
 * original method, not over any global, so multiple buffers can coexist
 * (each captures its own copy of the args).
 */
export class ConsoleBuffer {
  private readonly maxEntries: number;
  private readonly entries: ConsoleEntry[] = [];
  private originals = new Map<ConsoleEntry["level"], (...args: unknown[]) => void>();
  /** The wrappers we installed — `dispose()` only restores a level whose wrapper is still in place. */
  private wrappers = new Map<ConsoleEntry["level"], (...args: unknown[]) => void>();
  private disposed = false;

  constructor(maxEntries: number = MAX_ENTRIES) {
    // Guard against pathological values — 0 disables silently, NaN / Infinity
    // / negative numbers (untyped script-tag configs) fall back to the
    // default, and anything above the server cap is clamped to it.
    this.maxEntries =
      Number.isFinite(maxEntries) && maxEntries >= 0 ? Math.min(Math.floor(maxEntries), MAX_ENTRIES) : MAX_ENTRIES;

    if (typeof console === "undefined") return;

    for (const level of LEVELS) {
      const original = (console as unknown as Record<string, ((...args: unknown[]) => void) | undefined>)[level];
      if (typeof original !== "function") continue;
      this.originals.set(level, original);

      const buffer = this;
      const wrapped = function (this: unknown, ...args: unknown[]): void {
        try {
          buffer.push(level, args);
        } catch {
          // Capturing must never break the host's console — swallow any
          // unexpected error from serialization so the original call
          // (right below) always still runs.
        }
        original.apply(this ?? console, args);
      };
      // Preserve the function name so devtools still show "console.log"
      // (browsers display the wrapper's name in stack traces).
      try {
        Object.defineProperty(wrapped, "name", { value: level });
      } catch {
        // Older engines reject defineProperty on function name — best-effort only.
      }
      this.wrappers.set(level, wrapped);
      (console as unknown as Record<string, unknown>)[level] = wrapped;
    }
  }

  private push(level: ConsoleEntry["level"], args: readonly unknown[]): void {
    if (this.maxEntries === 0) return;
    if (this.entries.length >= this.maxEntries) {
      this.entries.shift();
    }
    this.entries.push({
      level,
      timestamp: new Date().toISOString(),
      message: formatArgs(args),
    });
  }

  /** Snapshot of captured entries — returns a new array each call. */
  getEntries(): ConsoleEntry[] {
    return this.entries.slice();
  }

  /**
   * Restore the original console methods. Idempotent.
   *
   * A level is restored only if our wrapper is still installed on it — when
   * another library wrapped `console.error` on top of us after init, writing
   * the original back would silently remove its wrapper. Ours then stays in
   * the chain but keeps forwarding to the original, so nothing is lost.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (typeof console === "undefined") return;
    const target = console as unknown as Record<string, unknown>;
    for (const [level, original] of this.originals) {
      if (target[level] !== this.wrappers.get(level)) continue;
      try {
        target[level] = original;
      } catch {
        // Console may be frozen in exotic environments — leave the wrapper
        // in place; it still proxies to the original via closure.
      }
    }
    this.originals.clear();
    this.wrappers.clear();
  }
}

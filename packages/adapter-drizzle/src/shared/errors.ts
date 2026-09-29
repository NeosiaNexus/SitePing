import { DrizzleQueryError } from "drizzle-orm";
import { DRIVER_ERROR_DIAGNOSTIC_FIELDS, DRIZZLE_QUERY_ERROR_MESSAGE_PREFIX } from "../constants/errors.js";
import type { SitepingSqlGateway } from "./gateway.js";

/**
 * Whether `error` is Drizzle's `DrizzleQueryError`, whose message lists the
 * statement and every bound parameter — the submission itself: author
 * emails, messages, inline screenshots — and loggers print an error's
 * `cause` chain. One thrown by another copy of drizzle-orm (its CommonJS
 * build next to the ESM one, a second install) fails `instanceof`, and the
 * class has neither an `entityKind` nor a name of its own: its message
 * gives it away.
 */
function isDrizzleQueryError(error: Error): boolean {
  return error instanceof DrizzleQueryError || error.message.startsWith(DRIZZLE_QUERY_ERROR_MESSAGE_PREFIX);
}

/**
 * The driver's error behind a failed query, without the statement: a
 * {@link isDrizzleQueryError | Drizzle query error} gives way to its `cause`,
 * and any other error to a copy that keeps what a diagnosis needs — its
 * name, message, stack, {@link DRIVER_ERROR_DIAGNOSTIC_FIELDS} and its
 * `cause` chain, copied the same way — and nothing else. Drivers attach the
 * failed statement and every bound parameter to their own errors: PGlite as
 * plain properties, postgres.js as hidden ones that its `debug` option
 * reveals and that cannot be deleted. The copy is a plain `Error`: an object
 * built on the driver's class would inherit accessors that throw on anything
 * but a genuine instance (`DOMException`'s `code`, when a fetch-based driver
 * times out).
 *
 * @param error - What a gateway call rejected with. Anything but an `Error` is returned as it is.
 * @param above - The errors above this one in the `cause` chain, which end a cycle.
 */
function withoutStatement(error: unknown, above: readonly unknown[] = []): unknown {
  if (!(error instanceof Error)) return error;
  const chain = [...above, error];
  const keepsCause = error.cause !== undefined && !chain.includes(error.cause);
  const cause = keepsCause ? withoutStatement(error.cause, chain) : undefined;
  if (isDrizzleQueryError(error)) return cause;
  const copy = new Error(error.message, keepsCause ? { cause } : undefined);
  const kept = (value: unknown): PropertyDescriptor => ({ value, writable: true, configurable: true });
  Object.defineProperties(copy, { name: kept(error.name), stack: kept(error.stack) });
  const diagnostics = DRIVER_ERROR_DIAGNOSTIC_FIELDS.map((field) => [field, Reflect.get(error, field)] as const);
  return Object.assign(copy, Object.fromEntries(diagnostics.filter(([, value]) => value !== undefined)));
}

/**
 * `gateway`, with every call rejecting with {@link withoutStatement} its
 * error: no error the store throws, or wraps as a `cause`, carries the
 * statement or its parameters.
 */
export function withDriverErrors(gateway: SitepingSqlGateway): SitepingSqlGateway {
  return new Proxy(gateway, {
    get(target, property, receiver) {
      const member: unknown = Reflect.get(target, property, receiver);
      if (typeof member !== "function") return member;
      return async (...args: unknown[]) => {
        try {
          return await member.apply(target, args);
        } catch (error) {
          throw withoutStatement(error);
        }
      };
    },
  });
}

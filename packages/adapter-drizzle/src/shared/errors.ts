import { DrizzleQueryError } from "drizzle-orm";
import { DRIVER_ERROR_DIAGNOSTIC_FIELDS } from "../constants/errors.js";
import type { SitepingSqlGateway } from "./gateway.js";

/**
 * A copy of a driver error that keeps what a diagnosis needs — its name,
 * message, stack, {@link DRIVER_ERROR_DIAGNOSTIC_FIELDS} and its `cause`
 * chain, copied the same way — and nothing else. Drivers attach the failed
 * statement and every bound parameter to their own errors: PGlite as plain
 * properties, postgres.js as hidden ones that its `debug` option reveals and
 * that cannot be deleted. The copy is a plain `Error`: an object built on
 * the driver's class would inherit accessors that throw on anything but a
 * genuine instance (`DOMException`'s `code`, when a fetch-based driver times
 * out).
 *
 * @param error - What a driver rejected with. Anything but an `Error` is returned as it is.
 * @param above - The errors above this one in the `cause` chain, which end a cycle.
 */
function withoutStatement(error: unknown, above: readonly unknown[] = []): unknown {
  if (!(error instanceof Error)) return error;
  const chain = [...above, error];
  const keepsCause = error.cause !== undefined && !chain.includes(error.cause);
  const copy = new Error(error.message, keepsCause ? { cause: withoutStatement(error.cause, chain) } : undefined);
  const kept = (value: unknown): PropertyDescriptor => ({ value, writable: true, configurable: true });
  Object.defineProperties(copy, { name: kept(error.name), stack: kept(error.stack) });
  const diagnostics = DRIVER_ERROR_DIAGNOSTIC_FIELDS.map((field) => [field, Reflect.get(error, field)] as const);
  return Object.assign(copy, Object.fromEntries(diagnostics.filter(([, value]) => value !== undefined)));
}

/**
 * The driver's error behind a failed query, without the statement. Drizzle
 * wraps it in a `DrizzleQueryError` whose message lists the statement and
 * every bound parameter — the submission itself: author emails, messages,
 * inline screenshots — and loggers print an error's `cause` chain.
 *
 * @param error - What a gateway call rejected with.
 */
function driverErrorOf(error: unknown): unknown {
  return withoutStatement(error instanceof DrizzleQueryError ? error.cause : error);
}

/**
 * `gateway`, with every call rejecting with {@link driverErrorOf} its error:
 * no error the store throws, or wraps as a `cause`, carries the statement or
 * its parameters.
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
          throw driverErrorOf(error);
        }
      };
    },
  });
}

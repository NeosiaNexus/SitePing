import { DrizzleQueryError } from "drizzle-orm";
import type { SitepingSqlGateway } from "./gateway.js";

/**
 * The driver's own error behind a failed query. Drizzle wraps it in a
 * `DrizzleQueryError` whose message lists the statement and every bound
 * parameter — the submission itself: author emails, messages, inline
 * screenshots — and loggers print an error's `cause` chain. The driver's
 * error keeps what a diagnosis needs: its message and code (a PostgreSQL
 * SQLSTATE, a `SQLITE_*` code).
 *
 * @param error - What a gateway call rejected with.
 */
function driverErrorOf(error: unknown): unknown {
  return error instanceof DrizzleQueryError && error.cause !== undefined ? error.cause : error;
}

/**
 * `gateway`, with every call rejecting with {@link driverErrorOf} its error:
 * no error the store throws, or wraps as a `cause`, carries the statement's
 * parameters.
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

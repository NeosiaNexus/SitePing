import { createRequire } from "node:module";
import { inspect } from "node:util";
import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { withDriverErrors } from "../src/shared/errors.js";
import type { SitepingSqlGateway } from "../src/shared/gateway.js";

describe("withDriverErrors", () => {
  it("keeps the parameters out of a query error thrown by another copy of drizzle-orm", async () => {
    // drizzle-orm's CommonJS build, next to the ESM one the store imports: a database built by
    // one copy of drizzle-orm throws a DrizzleQueryError that is no instance of the other's.
    const foreignDrizzle = createRequire(import.meta.url)("drizzle-orm") as {
      DrizzleQueryError: typeof DrizzleQueryError;
    };
    const parameters = ["jeanne.private@example.com", "private-message"];
    const driverError = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" });
    const queryError = new foreignDrizzle.DrizzleQueryError(
      "insert into feedbacks values ($1, $2)",
      parameters,
      driverError,
    );
    const gateway = withDriverErrors({
      findProjectName: () => Promise.reject(queryError),
    } as Partial<SitepingSqlGateway> as SitepingSqlGateway);

    const failure = await gateway.findProjectName("id").then(
      () => null,
      (error: unknown) => error,
    );

    expect(queryError).not.toBeInstanceOf(DrizzleQueryError);
    expect(failure).toMatchObject({ message: driverError.message, code: "ECONNREFUSED" });
    const logged = inspect(failure, { depth: null, showHidden: true });
    for (const secret of parameters) expect(logged).not.toContain(secret);
  });
});

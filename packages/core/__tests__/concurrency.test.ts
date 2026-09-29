import { describe, expect, it } from "vitest";
import { settleWithConcurrencyLimit } from "../src/index.js";

describe("settleWithConcurrencyLimit", () => {
  it("keeps at most `concurrency` calls in flight and settles each in the order of the items", async () => {
    let inFlight = 0;
    let peakInFlight = 0;

    const results = await settleWithConcurrencyLimit([5, 1, 4, 2, 3], 2, async (delay) => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, delay));
      inFlight -= 1;
      if (delay === 4) throw new Error("failed");
      return delay * 10;
    });

    expect(peakInFlight).toBe(2);
    expect(results).toEqual([
      { status: "fulfilled", value: 50 },
      { status: "fulfilled", value: 10 },
      { status: "rejected", reason: new Error("failed") },
      { status: "fulfilled", value: 20 },
      { status: "fulfilled", value: 30 },
    ]);
  });

  it("settles a task that throws synchronously as a rejection, without skipping the other items", async () => {
    const results = await settleWithConcurrencyLimit(["a", "b"], 1, ((item: string) => {
      if (item === "a") throw new Error("thrown before returning a promise");
      return Promise.resolve(item);
    }) as (item: string) => Promise<string>);

    expect(results).toEqual([
      { status: "rejected", reason: new Error("thrown before returning a promise") },
      { status: "fulfilled", value: "b" },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { createTaskQueue } from "../src/core/task-queue.js";

/** A macrotask: the queue forgets a task in callbacks that run once it has settled. */
const afterCallbacks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createTaskQueue", () => {
  it("holds nothing once its tasks have settled, failed ones included", async () => {
    const queue = createTaskQueue();
    const failed = () => Promise.reject(new Error("tracker down"));
    const tasks = [
      queue.forCreation("site", "fb-1", async () => {}),
      queue.forFeedback("site", "fb-1", failed),
      queue.forProject("site", async () => {}),
      queue.forFeedback("site", "fb-2", async () => {}),
      queue.forProject("other", failed),
    ];
    expect(queue.idle).toBe(false);

    await Promise.allSettled(tasks);
    await afterCallbacks();

    expect(queue.idle).toBe(true);
  });

  it("keeps a running task in line when an earlier task of its feedback is forgotten", async () => {
    const queue = createTaskQueue();
    const order: string[] = [];
    let release = () => {};
    const first = queue.forFeedback("site", "fb-1", async () => {});
    const running = queue.forFeedback(
      "site",
      "fb-1",
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    await first;
    await afterCallbacks();

    const next = queue.forFeedback("site", "fb-1", async () => {
      order.push("next");
    });
    await afterCallbacks();
    order.push("running ends");
    release();
    await Promise.all([running, next]);

    expect(order).toEqual(["running ends", "next"]);
  });
});

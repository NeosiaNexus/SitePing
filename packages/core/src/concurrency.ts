/**
 * Run `task` over every item with at most `concurrency` calls in flight and
 * settle each call on its own, like `Promise.allSettled` over a bounded pool.
 *
 * Each call runs inside its own promise, so a task that throws synchronously
 * is settled as a rejection instead of stopping the pool, and one failure
 * never skips the remaining items.
 *
 * @param items - Inputs, processed in order.
 * @param concurrency - Maximum number of simultaneous `task` calls (at least 1).
 * @param task - Operation to run for each item.
 * @returns The settled result of every call, in the order of `items`.
 */
export async function settleWithConcurrencyLimit<Item, Result>(
  items: readonly Item[],
  concurrency: number,
  task: (item: Item) => Promise<Result>,
): Promise<Array<PromiseSettledResult<Result>>> {
  const results: Array<PromiseSettledResult<Result>> = new Array(items.length);
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = { status: "fulfilled", value: await task(items[index] as Item) };
      } catch (error) {
        results[index] = { status: "rejected", reason: error };
      }
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}

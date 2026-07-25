/**
 * chevrotain@12 (bundled via @mrleebo/prisma-ast) calls `Object.groupBy` at
 * parser-initialization time, but the API only exists from Node 21 while this
 * package declares `engines.node >= 20`. Fill it in when missing — spec-shaped
 * and a no-op from Node 21 onward.
 *
 * Imported for its side effect at the top of every module that (transitively)
 * loads prisma-ast, so it runs before chevrotain regardless of entry point
 * (CLI binary, tests, programmatic import).
 */
const patchable = Object as typeof Object & {
  groupBy?: <T, K extends PropertyKey>(
    items: Iterable<T>,
    keySelector: (item: T, index: number) => K,
  ) => Partial<Record<K, T[]>>;
};

if (typeof patchable.groupBy !== "function") {
  Object.defineProperty(patchable, "groupBy", {
    value: <T, K extends PropertyKey>(
      items: Iterable<T>,
      keySelector: (item: T, index: number) => K,
    ): Partial<Record<K, T[]>> => {
      const groups = Object.create(null) as Record<K, T[]>;
      let index = 0;
      for (const item of items) {
        const key = keySelector(item, index);
        index += 1;
        const bucket = groups[key];
        if (bucket === undefined) {
          groups[key] = [item];
        } else {
          bucket.push(item);
        }
      }
      return groups;
    },
    writable: true,
    configurable: true,
  });
}

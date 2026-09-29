import { pushSchema } from "drizzle-kit/api";
import { describe, expect, it } from "vitest";
import { DEFAULT_SITEPING_TABLE_NAMES, type SitepingTableNames } from "../src/constants/table-names.js";
import { createSitepingPgTables } from "../src/pg/index.js";
import { createPgTestDatabase } from "./databases.js";

/** The longest names PostgreSQL keeps whole once each table's index and foreign-key suffixes are added. */
const LONGEST_ACCEPTED_NAMES: SitepingTableNames = {
  feedbacks: "f".repeat(36),
  annotations: "a".repeat(47),
  comments: "c".repeat(42),
};

describe("createSitepingPgTables", () => {
  // PostgreSQL silently truncates names past 63 bytes: a later push would drop and
  // recreate every constraint and index whose declared name it no longer finds.
  it.each([
    ["the default names", DEFAULT_SITEPING_TABLE_NAMES],
    ["the longest names it accepts", LONGEST_ACCEPTED_NAMES],
  ])(
    "leaves nothing for a second drizzle-kit push to change, with %s",
    async (_names, names) => {
      const database = await createPgTestDatabase(names);
      try {
        const { statementsToExecute } = await pushSchema(createSitepingPgTables(names), database.db as never);

        expect(statementsToExecute).toEqual([]);
      } finally {
        await database.close();
      }
    },
    30_000,
  );

  it.each([
    [
      "feedbacks",
      { ...LONGEST_ACCEPTED_NAMES, feedbacks: "f".repeat(37) },
      `${"f".repeat(37)}_project_status_created_idx`,
    ],
    ["annotations", { ...LONGEST_ACCEPTED_NAMES, annotations: "a".repeat(48) }, `${"a".repeat(48)}_feedback_id_idx`],
    ["comments", { ...LONGEST_ACCEPTED_NAMES, comments: "c".repeat(43) }, `${"c".repeat(43)}_feedback_created_idx`],
    // 19 characters, 38 bytes in UTF-8: PostgreSQL counts bytes.
    [
      "feedbacks, in bytes",
      { ...LONGEST_ACCEPTED_NAMES, feedbacks: "é".repeat(19) },
      `${"é".repeat(19)}_project_status_created_idx`,
    ],
  ])("refuses a %s name that would put an identifier past PostgreSQL's 63 bytes", (_table, names, identifier) => {
    expect(() => createSitepingPgTables(names)).toThrow(`"${identifier}" is`);
  });
});

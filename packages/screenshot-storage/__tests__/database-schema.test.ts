import { getTableConfig as getPgTableConfig } from "drizzle-orm/pg-core";
import { getTableConfig as getSqliteTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { createSitepingScreenshotsSqliteTable } from "../src/backends/drizzle-libsql.js";
import { createSitepingScreenshotsPgTable } from "../src/backends/drizzle-pg.js";
import { formatUnexpectedBinaryColumnDataMessage, SCREENSHOTS_TABLE_COLUMNS } from "../src/constants/database.js";
import { toBytes } from "../src/core/binary.js";

describe("screenshots table schema", () => {
  it("creates the same columns in every Drizzle dialect", () => {
    const expectedColumnNames = Object.values(SCREENSHOTS_TABLE_COLUMNS).sort();
    const pgColumnNames = getPgTableConfig(createSitepingScreenshotsPgTable())
      .columns.map((column) => column.name)
      .sort();
    const sqliteColumnNames = getSqliteTableConfig(createSitepingScreenshotsSqliteTable())
      .columns.map((column) => column.name)
      .sort();

    expect(pgColumnNames).toEqual(expectedColumnNames);
    expect(sqliteColumnNames).toEqual(expectedColumnNames);
  });
});

describe("toBytes", () => {
  it("normalizes ArrayBuffer and typed-array views into a standalone Uint8Array", () => {
    const backing = new Uint8Array([9, 1, 2, 3, 9]);
    const view = new Uint8Array(backing.buffer, 1, 3);

    expect(Array.from(toBytes(view))).toEqual([1, 2, 3]);
    expect(Array.from(toBytes(new Uint8Array([4, 5]).buffer))).toEqual([4, 5]);
  });

  it("rejects non-binary driver data with an actionable TypeError", () => {
    expect(() => toBytes("not-binary")).toThrow(new TypeError(formatUnexpectedBinaryColumnDataMessage("string")));
  });
});

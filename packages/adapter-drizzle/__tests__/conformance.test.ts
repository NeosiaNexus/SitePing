import { testSitepingStore } from "@siteping/core/testing";
import { afterAll, beforeAll, describe } from "vitest";
import { type AnyLibSQLDatabase, createLibSQLSitepingStore } from "../src/libsql/index.js";
import { type AnyPgDatabase, createPgSitepingStore } from "../src/pg/index.js";
import {
  createLibSQLTestDatabase,
  createPgTestDatabase,
  type TestDatabase,
  withoutInteractiveTransactions,
} from "./databases.js";

// The shared SitepingStore contract, run against both real engines.
// Warnings (inline screenshots) are expected here and silenced.
const silentLogger = { warn: () => {} };

describe("PostgreSQL (PGlite)", () => {
  let database: TestDatabase<AnyPgDatabase>;
  beforeAll(async () => {
    database = await createPgTestDatabase();
  });
  afterAll(() => database.close());

  testSitepingStore(async () => {
    await database.reset();
    return createPgSitepingStore(database.db, { logger: silentLogger });
  });
});

// Neon HTTP (and any driver without interactive transactions) must satisfy
// the whole contract too — every write is a single statement.
describe("PostgreSQL without interactive transactions (Neon HTTP semantics)", () => {
  let database: TestDatabase<AnyPgDatabase>;
  beforeAll(async () => {
    database = await createPgTestDatabase();
  });
  afterAll(() => database.close());

  testSitepingStore(async () => {
    await database.reset();
    return createPgSitepingStore(withoutInteractiveTransactions(database.db), { logger: silentLogger });
  });
});

describe("libSQL (Turso)", () => {
  let database: TestDatabase<AnyLibSQLDatabase>;
  beforeAll(async () => {
    database = await createLibSQLTestDatabase();
  });
  afterAll(() => database.close());

  testSitepingStore(async () => {
    await database.reset();
    return createLibSQLSitepingStore(database.db, { logger: silentLogger });
  });
});

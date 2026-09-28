import { type Column, type SQL, sql } from "drizzle-orm";
import type { GreatestValueFunction } from "../constants/sql.js";

/**
 * SQL for the `updatedAt` to store on an update: the wall-clock `updatedAt`,
 * raised to the row's own `createdAt` / `updatedAt` when those are later.
 *
 * Why: the row may have been written by another process whose clock runs
 * ahead of this one — an update must still not record `updatedAt < createdAt`
 * or move `updatedAt` backwards. Clamping in SQL holds across store instances
 * and processes, unlike an in-memory clock.
 *
 * @param table - Feedback table columns the clamp reads.
 * @param updatedAt - Wall-clock time of the update.
 * @param greatestFunction - The dialect's "largest argument" function.
 */
export function monotonicUpdatedAt(
  table: { createdAt: Column; updatedAt: Column },
  updatedAt: Date,
  greatestFunction: GreatestValueFunction,
): SQL<Date> {
  return sql<Date>`${sql.raw(greatestFunction)}(${sql.param(updatedAt, table.updatedAt)}, ${table.createdAt}, ${table.updatedAt})`;
}

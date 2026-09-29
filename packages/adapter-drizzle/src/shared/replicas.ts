/**
 * The primary of a database built with Drizzle's `withReplicas(primary,
 * replicas)`, or the database itself. Such a database sends `select` and
 * `with` to a replica: the PostgreSQL feedback insert (a data-modifying CTE)
 * would run on a read-only replica, and the store's reads of its own writes
 * (a `clientId` that lost an insert race, a screenshot still referenced)
 * would hit a lagging one. On libSQL it has no `batch` at all. So the store
 * runs everything on the primary.
 */
export function primaryOf<Database extends object>(db: Database): Database {
  return "$primary" in db ? (db.$primary as Database) : db;
}

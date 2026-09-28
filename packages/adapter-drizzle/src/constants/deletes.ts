/**
 * Most feedback rows one statement (or libSQL batch) of `deleteAllFeedbacks`
 * removes while it reads their screenshot URLs back for cleanup. Bounds every
 * driver response — HTTP drivers (Neon HTTP, Turso over HTTP) reject oversized
 * ones, possibly after the deletion committed — and the URLs held in memory
 * between a chunk and its cleanup, however large the project.
 */
export const PROJECT_DELETE_CHUNK_SIZE = 500;

/** Prefix of every error message and log line emitted by the Drizzle store. */
export const DRIZZLE_STORE_MESSAGE_PREFIX = "[siteping] DrizzleStore";

/** Store mutations whose database failures surface as `StorePersistenceError`. */
export type DrizzleStoreMutation = "createFeedback" | "updateFeedback" | "deleteFeedback" | "deleteAllFeedbacks";

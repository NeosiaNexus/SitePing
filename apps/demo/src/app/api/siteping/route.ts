import { createSitepingHandler } from "@siteping/adapter-prisma";
import { memoryStore } from "@/lib/memory-store";

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
  store: memoryStore,
});

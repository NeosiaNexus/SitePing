import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/docs/source";

// One index per locale. `localeMap` hands Orama the matching stemmer/stop-word
// set, so a French query matches French inflections ("annotations" → "annotation",
// "ancrées" → "ancrer") instead of falling back to English rules on French text.
export const { GET } = createFromSource(source, {
  localeMap: { fr: "french" },
});

/**
 * UTF-16 code units a JavaScript string may hold but PostgreSQL cannot store:
 * NUL (rejected in `text` and `jsonb`) and a surrogate without its pair — which
 * UTF-8 cannot encode, so `jsonb` rejects it and `text` turns it into U+FFFD.
 * A string cut inside an emoji ends with such an unpaired surrogate.
 */
export const UNSTORABLE_CODE_UNITS = /\0|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** U+FFFD, the Unicode replacement character — what stands for each unstorable code unit. */
export const REPLACEMENT_CHARACTER = "�";

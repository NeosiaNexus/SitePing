import { formatUnexpectedBinaryColumnDataMessage } from "../constants/database.js";

/**
 * Normalize what database drivers return for binary columns — Node `Buffer`
 * (node-postgres), `Uint8Array` (PGlite, postgres.js) or `ArrayBuffer`
 * (libSQL) — into a plain-`ArrayBuffer` `Uint8Array`.
 */
export function toBytes(value: unknown): Uint8Array<ArrayBuffer> {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
  }
  throw new TypeError(formatUnexpectedBinaryColumnDataMessage(typeof value));
}

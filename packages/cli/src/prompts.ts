/**
 * Re-export @clack/prompts through a mutable wrapper object.
 *
 * ESM namespace objects (`import * as p`) have immutable bindings in bun,
 * which prevents vitest from spying on or replacing individual exports.
 * Importing `{ p }` from this module gives tests full control via vi.spyOn().
 */
import { cancel, confirm, intro, isCancel, log, note, outro, spinner, text } from "@clack/prompts";

export const p = {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  spinner,
  text,
};

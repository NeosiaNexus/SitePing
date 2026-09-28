/**
 * Longest delay `setTimeout` honors, in ms (2^31 − 1, a signed 32-bit int).
 * Node.js and browsers clamp a larger delay to 1 ms, so a timer meant for
 * weeks from now would fire almost immediately.
 */
export const MAX_TIMER_DELAY_MS = 2_147_483_647;

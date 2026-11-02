/** Asks the hero's ping field to send a ripple (and drop a pin) under a screen point. */
export const PING_EVENT = "landing:ping";

export interface PingDetail {
  /** Viewport coordinates, as in a pointer event. */
  clientX: number;
  clientY: number;
  /** `pin` drops a 3D pin that rings on impact; `ripple` only rings. */
  kind: "pin" | "ripple";
  strength?: number;
}

export function requestPing(detail: PingDetail): void {
  window.dispatchEvent(new CustomEvent<PingDetail>(PING_EVENT, { detail }));
}

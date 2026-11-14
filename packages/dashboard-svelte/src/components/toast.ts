/** A queued toast message — `id` restarts the dismiss timer on every new toast. */
export interface ToastData {
  id: number;
  message: string;
  undoable: boolean;
}

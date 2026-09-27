// Host page with a real Radix Dialog (the base of shadcn/ui's Dialog), open on
// load. Radix modals set `body { pointer-events: none }`, trap focus, and close
// on outside pointer/focus interactions — the widget must stay usable on top.
// On top of Radix, the host also dismisses on an outside `click` (bubble phase,
// like click-away libraries) and on outside `pointerdown` / `focusin` observed
// in the capture phase (like focus-trap), so the widget is exercised against
// both listener phases. Like focus-trap, it also traps Tab with a capture-phase
// `keydown` listener on `document` that cancels the navigation and moves focus
// back into the dialog when the key is pressed outside it.
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

/** Dismiss listeners a non-Radix host modal commonly installs on `document`. */
const EXTRA_DISMISS_LISTENERS = [
  { type: "click", capture: false },
  { type: "pointerdown", capture: true },
  { type: "focusin", capture: true },
] as const;

function HostDialog() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const trapTabInsideDialog = (event: KeyboardEvent): void => {
      const dialog = document.getElementById("host-dialog");
      if (event.key !== "Tab" || !dialog || !(event.target instanceof Node) || dialog.contains(event.target)) return;
      event.preventDefault();
      document.getElementById("host-dialog-input")?.focus();
    };
    document.addEventListener("keydown", trapTabInsideDialog, true);
    const dismissOnOutsideInteraction = (event: Event): void => {
      const dialog = document.getElementById("host-dialog");
      if (dialog && event.target instanceof Node && !dialog.contains(event.target)) setOpen(false);
    };
    for (const { type, capture } of EXTRA_DISMISS_LISTENERS) {
      document.addEventListener(type, dismissOnOutsideInteraction, capture);
    }
    return () => {
      document.removeEventListener("keydown", trapTabInsideDialog, true);
      for (const { type, capture } of EXTRA_DISMISS_LISTENERS) {
        document.removeEventListener(type, dismissOnOutsideInteraction, capture);
      }
    };
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)" }} />
        <Dialog.Content
          id="host-dialog"
          aria-describedby={undefined}
          style={{ position: "fixed", top: 160, left: 200, width: 480, padding: 24, background: "#fff" }}
        >
          <Dialog.Title>Host dialog</Dialog.Title>
          <input id="host-dialog-input" aria-label="Host field" />
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const container = document.createElement("div");
document.body.appendChild(container);
createRoot(container).render(<HostDialog />);

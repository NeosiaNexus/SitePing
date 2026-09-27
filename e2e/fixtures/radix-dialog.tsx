// Host page with a real Radix Dialog (the base of shadcn/ui's Dialog), open on
// load. Radix modals set `body { pointer-events: none }`, trap focus, and close
// on outside pointer/focus interactions — the widget must stay usable on top.
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { createRoot } from "react-dom/client";

function HostDialog() {
  const [open, setOpen] = useState(true);
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

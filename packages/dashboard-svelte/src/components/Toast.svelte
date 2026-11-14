<!--
  Single toast slot at the bottom-center of the root. Auto-dismisses after 5s;
  the timer pauses while hovered or focused so the undo button stays reachable.

  The `role="status"` live region stays permanently mounted (an empty div when
  idle) so screen readers reliably announce each message — a region that only
  appears alongside its text is announced inconsistently. The visible pill
  renders inside it.
-->
<script lang="ts">
  import { useInboxUi } from "./context.js";
  import type { ToastData } from "./toast.js";

  /** How long a toast stays up before auto-dismissing. */
  const TOAST_MS = 5000;

  let {
    toast,
    onundo,
    ondismiss,
  }: { toast: ToastData | null; onundo: () => void; ondismiss: () => void } = $props();

  const ui = useInboxUi();
  let paused = $state(false);

  // A new toast always starts unpaused, even if the pointer still rests on the slot.
  $effect.pre(() => {
    void toast?.id;
    paused = false;
  });

  $effect(() => {
    if (!toast || paused) return;
    const dismiss = ondismiss;
    const timer = setTimeout(dismiss, TOAST_MS);
    return () => clearTimeout(timer);
  });
</script>

<div class="spd-toast-region" role="status" aria-live="polite">
  {#if toast}
    <!-- Hover/focus only pause the auto-dismiss timer; the live region role lives on the parent. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="spd-toast"
      onmouseenter={() => (paused = true)}
      onmouseleave={() => (paused = false)}
      onfocusin={() => (paused = true)}
      onfocusout={() => (paused = false)}
    >
      <span class="spd-toast-msg">{toast.message}</span>
      {#if toast.undoable}
        <button
          type="button"
          class="spd-btn-ghost"
          onclick={() => {
            onundo();
            // The button unmounts on undo; hand focus back to the listbox.
            ui.focusList();
          }}
        >
          {ui.t("inbox.undo")} <kbd class="spd-kbd">u</kbd>
        </button>
      {/if}
    </div>
  {/if}
</div>

<!-- Load failure — `.spd-empty` layout with a retry action. -->
<script lang="ts">
  import { useInboxUi } from "./context.js";

  let { error, onretry }: { error: Error; onretry: () => void } = $props();

  const ui = useInboxUi();
</script>

<div class="spd-empty spd-error">
  <div class="spd-empty-title">{ui.t("inbox.loadError")}</div>
  <div class="spd-empty-sub">{error.message}</div>
  <button type="button" class="spd-btn" onclick={onretry}>{ui.t("inbox.retry")}</button>
</div>

<!-- Native select filtering the list by feedback type. -->
<script lang="ts">
  import { FEEDBACK_TYPES } from "@siteping/core";
  import { getTypeLabel } from "../i18n/index.js";
  import type { InboxTypeFilter } from "../types.js";
  import { useInboxUi } from "./context.js";

  let { type, onchange }: { type: InboxTypeFilter; onchange: (type: InboxTypeFilter) => void } = $props();

  const ui = useInboxUi();
</script>

<select
  class="spd-type-filter"
  aria-label={ui.t("inbox.typeFilter")}
  value={type}
  onchange={(event) => onchange(event.currentTarget.value as InboxTypeFilter)}
>
  <option value="all">{ui.t("inbox.typeAll")}</option>
  {#each FEEDBACK_TYPES as value (value)}
    <option {value}>{getTypeLabel(value, ui.t)}</option>
  {/each}
</select>

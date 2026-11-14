<!-- Native select styled as a toolbar control — rendered only when more than one project is configured. -->
<script lang="ts">
  import { useInboxUi } from "./context.js";
  import Icon from "./Icon.svelte";

  let {
    projects,
    project,
    onchange,
  }: { projects: readonly string[]; project: string; onchange: (project: string) => void } = $props();

  const ui = useInboxUi();
</script>

<div class="spd-project">
  <select
    class="spd-project-select"
    aria-label={ui.t("inbox.project")}
    value={project}
    onchange={(event) => onchange(event.currentTarget.value)}
  >
    {#each projects as name (name)}
      <option value={name}>{name}</option>
    {/each}
  </select>
  <Icon name="chevron-down" />
</div>

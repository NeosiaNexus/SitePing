<!-- Five placeholder rows shown while the first page loads. Purely decorative. -->
<script lang="ts">
  const ROWS = [0, 1, 2, 3, 4];
  const BARS = [0, 1, 2];
</script>

<div class="spd-skeleton" aria-hidden="true">
  {#each ROWS as row (row)}
    <div class="spd-skel-row">
      {#each BARS as bar (bar)}
        <div class="spd-skel-bar"></div>
      {/each}
    </div>
  {/each}
</div>

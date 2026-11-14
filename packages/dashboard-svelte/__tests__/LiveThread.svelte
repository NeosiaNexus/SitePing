<!-- Test-only: a thread over its own record, which its callbacks update like the inbox does. -->
<script lang="ts">
  import type { CommentRecord } from "@siteping/core";
  import { untrack } from "svelte";
  import Thread from "../src/components/Thread.svelte";
  import { makeRecord } from "./helpers.js";

  let {
    initial,
    canComment,
    makeComment,
  }: {
    initial: CommentRecord[];
    canComment: boolean;
    /** The suite's comment factory — new replies are built like the React twin's. */
    makeComment: (overrides: Partial<CommentRecord>) => CommentRecord;
  } = $props();

  // Seeded once, like the React twin's useState(initial).
  let comments = $state.raw<CommentRecord[]>(untrack(() => [...initial]));
</script>

<Thread
  record={makeRecord({ id: "fb-1", comments })}
  {canComment}
  canDelete={() => true}
  onadd={async (body) => {
    comments = [...comments, makeComment({ id: `new-${comments.length}`, body, authorName: "Studio" })];
  }}
  ondelete={async (id) => {
    comments = comments.filter((comment) => comment.id !== id);
  }}
/>

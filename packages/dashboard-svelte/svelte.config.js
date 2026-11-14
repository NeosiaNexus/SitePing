// Svelte 5 strips `<script lang="ts">` type annotations natively — no
// preprocessor needed. Runes mode is forced so every component and
// `.svelte.ts` module is compiled the same way.
export default {
  compilerOptions: {
    runes: true,
  },
};

import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

export default defineConfig(sitepingLibrary({ platform: "neutral" }));

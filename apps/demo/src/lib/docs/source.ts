import { loader } from "fumadocs-core/source";
import { docs } from "../../../.source/server";
import { i18n } from "./i18n";

export const source = loader({
  i18n,
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

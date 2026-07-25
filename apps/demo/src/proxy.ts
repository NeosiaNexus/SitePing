import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { i18n } from "@/lib/docs/i18n";

export default createI18nMiddleware(i18n);

export const config = {
  // Only docs URLs are locale-aware — the landing and /demo stay untouched.
  matcher: ["/docs/:path*", "/en/docs/:path*", "/fr/docs/:path*"],
};

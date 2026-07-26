import type { MetadataRoute } from "next";
import { i18n } from "@/lib/docs/i18n";
import { source } from "@/lib/docs/source";
import { languageAlternates, pathWithoutLocale, SITE_URL } from "@/lib/docs/urls";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const marketing: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/demo`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/demo/inbox`, lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];

  const docs: MetadataRoute.Sitemap = i18n.languages.flatMap((lang) =>
    source.getPages(lang).map((page) => {
      const path = pathWithoutLocale(page.url, lang);
      return {
        url: `${SITE_URL}${page.url}`,
        lastModified,
        changeFrequency: "weekly" as const,
        // The docs index and the quickstart are the entry points we want ranked
        // highest; the rest of the tree sits one notch below.
        priority: path === "/docs" || path === "/docs/quickstart" ? 0.9 : 0.7,
        alternates: { languages: languageAlternates(path) },
      };
    }),
  );

  return [...marketing, ...docs];
}

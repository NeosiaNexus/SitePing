"use client";

import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import Link from "next/link";
import { useParams } from "next/navigation";

// A missing docs page stays inside the docs chrome: the sidebar and the search
// are right there to find the page that was meant (it used to be a bare,
// unstyled 404 outside the navigation).
const COPY = {
  en: {
    title: "This page is not in the docs",
    description: "It may have moved or been renamed. The sidebar and the search have every page.",
    home: "Go to the introduction",
    href: "/docs",
  },
  fr: {
    title: "Cette page n'est pas dans la doc",
    description:
      "Elle a peut-être été déplacée ou renommée. La barre latérale et la recherche listent toutes les pages.",
    home: "Aller à l'introduction",
    href: "/fr/docs",
  },
} as const;

export default function DocsNotFound() {
  const { lang } = useParams<{ lang?: string }>();
  const copy = lang === "fr" ? COPY.fr : COPY.en;

  return (
    <DocsPage>
      <DocsTitle>{copy.title}</DocsTitle>
      <DocsDescription>{copy.description}</DocsDescription>
      <DocsBody>
        <p>
          <Link href={copy.href}>{copy.home}</Link>
        </p>
      </DocsBody>
    </DocsPage>
  );
}

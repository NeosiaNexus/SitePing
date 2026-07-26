import { EditOnGitHub } from "fumadocs-ui/layouts/docs/page";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx-components";
import { source } from "@/lib/docs/source";
import { absoluteUrl, languageAlternates, pathWithoutLocale } from "@/lib/docs/urls";

interface PageProps {
  params: Promise<{ lang: string; slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { lang, slug } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full ?? false}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
      {/* The notebook DocsPage has no `editOnGithub` prop (that one belongs to
          the default layout's page) — render the link component directly.
          `page.path` is relative to the collection dir and resolves to the file
          backing this locale: the `.fr.mdx` twin when one exists, the English
          source when the page falls back. */}
      <EditOnGitHub
        href={`https://github.com/NeosiaNexus/SitePing/blob/main/apps/demo/content/docs/${page.path}`}
        className="mt-8"
      />
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const path = pathWithoutLocale(page.url, lang);
  const url = absoluteUrl(path, lang);
  const { title, description } = page.data;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(path),
    },
    openGraph: {
      type: "article",
      siteName: "SitePing",
      title,
      ...(description ? { description } : {}),
      url,
      locale: lang,
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(description ? { description } : {}),
    },
  };
}

import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { ReactNode } from "react";
import { source } from "@/lib/docs/source";
import { DocsWidget } from "./docs-widget";

export default async function Layout({ params, children }: { params: Promise<{ lang: string }>; children: ReactNode }) {
  const { lang } = await params;

  return (
    <DocsLayout
      tree={source.getPageTree(lang)}
      nav={{ title: "SitePing", mode: "top" }}
      githubUrl="https://github.com/NeosiaNexus/SitePing"
    >
      {children}
      <DocsWidget locale={lang} />
    </DocsLayout>
  );
}

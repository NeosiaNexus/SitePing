import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { source } from "@/lib/docs/source";
import { provider } from "@/lib/docs/ui";
import { DocsWidget } from "./docs-widget";
import "./docs.css";

export default async function Layout({ params, children }: { params: Promise<{ lang: string }>; children: ReactNode }) {
  const { lang } = await params;

  return (
    <RootProvider i18n={provider(lang)}>
      <DocsLayout
        tree={source.getPageTree(lang)}
        nav={{ title: "SitePing" }}
        githubUrl="https://github.com/NeosiaNexus/SitePing"
      >
        {children}
        <DocsWidget locale={lang} />
      </DocsLayout>
    </RootProvider>
  );
}

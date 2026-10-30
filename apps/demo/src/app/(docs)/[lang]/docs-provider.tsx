"use client";

import { type Framework, FrameworkProvider } from "fumadocs-core/framework";
import { RootProvider } from "fumadocs-ui/provider/base";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { i18n } from "@/lib/docs/i18n";

const hiddenPrefix = `/${i18n.defaultLanguage}`;

// Fumadocs' own Next.js provider passes `next/link` and `next/image` as they
// are. Their props only differ from Fumadocs' `<a>`/`<img>` shapes in what
// they require (`href`, `src`), which Fumadocs always passes.
const FrameworkLink = Link as unknown as NonNullable<Framework["Link"]>;
const FrameworkImage = Image as unknown as NonNullable<Framework["Image"]>;

/**
 * The pathname the browser shows. The proxy serves English docs at bare URLs
 * by rewriting `/docs/…` to `/en/docs/…`, so a prerendered English page is
 * rendered with the rewritten path on the server but hydrates at the bare
 * one. Every Fumadocs component that finds the current page by pathname —
 * the sidebar, the breadcrumb, the next/previous footer — then renders
 * differently on each side, and React throws a hydration error (#418).
 * Dropping the hidden prefix gives both sides the URL the page tree uses.
 */
function useDisplayedPathname(): string {
  const pathname = usePathname();
  if (pathname === hiddenPrefix) return "/";
  return pathname.startsWith(`${hiddenPrefix}/`) ? pathname.slice(hiddenPrefix.length) : pathname;
}

/** Fumadocs' Next.js `RootProvider`, with the pathname the browser shows. */
export function DocsProvider(props: ComponentProps<typeof RootProvider>) {
  return (
    <FrameworkProvider
      usePathname={useDisplayedPathname}
      useParams={useParams}
      useRouter={useRouter}
      Link={FrameworkLink}
      Image={FrameworkImage}
    >
      <RootProvider {...props} />
    </FrameworkProvider>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { bricolage } from "@/components/landing/fonts";
import { LogoMark } from "@/components/landing/icons";

/**
 * The SitePing bar above both sides of the demo. It says which side you are
 * on (the client's site or the freelancer's inbox) and takes you to the other.
 */
export function Banner() {
  const onInbox = usePathname() === "/demo/inbox";

  return (
    <header
      data-siteping-ignore="true"
      className={`landing ${bricolage.variable} relative z-50 border-b border-line bg-ink text-paper`}
    >
      <div className="mx-auto flex min-h-12 max-w-[90rem] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        {/* useSearchParams needs Suspense for static rendering; fall back to server-mode copy */}
        <Suspense fallback={<BannerContent onInbox={onInbox} localMode={false} />}>
          <ModeAwareBannerContent onInbox={onInbox} />
        </Suspense>
      </div>
    </header>
  );
}

function ModeAwareBannerContent({ onInbox }: { onInbox: boolean }) {
  // The playground writes ?mode=local: thread it through the links so both
  // sides of the demo look at the same store.
  const localMode = useSearchParams().get("mode") === "local";
  return <BannerContent onInbox={onInbox} localMode={localMode} />;
}

function BannerContent({ onInbox, localMode }: { onInbox: boolean; localMode: boolean }) {
  const modeQuery = localMode ? "?mode=local" : "";
  const side = onInbox ? "You are the freelancer" : "You are the client";
  const note = localMode
    ? "Local mode: notes stay in this browser."
    : "Notes reset every 10 minutes and are never saved to a database.";

  return (
    <>
      <div className="flex min-w-0 items-center gap-3 text-[13.5px]">
        <Link
          href="/"
          className="press focus-ring flex shrink-0 items-center gap-2 rounded-lg font-semibold text-paper"
        >
          <LogoMark className="h-6 w-6" />
          <span className="hidden sm:inline">SitePing</span>
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-line-strong" />
        <span className="flex items-center gap-2 whitespace-nowrap rounded-full bg-cobalt/15 px-2.5 py-0.5 text-[12.5px] font-medium text-[#a9b8ff]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cobalt-soft" />
          Live demo
        </span>
        <p className="min-w-0 truncate text-mist">
          <span className="text-paper">{side}.</span> <span className="hidden md:inline">{note}</span>
        </p>
      </div>
      <nav aria-label="Demo" className="flex shrink-0 items-center gap-1.5 text-[13.5px]">
        <Link
          href="/"
          className="focus-ring hidden rounded-full px-3 py-1.5 text-mist transition-colors duration-150 hover:text-paper sm:inline-flex"
        >
          Back to SitePing
        </Link>
        <Link
          href={onInbox ? `/demo${modeQuery}` : `/demo/inbox${modeQuery}`}
          className="press focus-ring inline-flex h-8 items-center gap-1.5 rounded-full bg-paper px-3.5 font-semibold text-ink transition-colors duration-150 hover:bg-white"
        >
          {onInbox ? "Back to the demo site" : "Open the inbox"}
        </Link>
      </nav>
    </>
  );
}

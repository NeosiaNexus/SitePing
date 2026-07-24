"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

export function Banner() {
  const onInbox = usePathname() === "/demo/inbox";

  return (
    <header className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-amber-900">
        {/* useSearchParams needs Suspense for static rendering — fall back to server-mode copy */}
        <Suspense fallback={<BannerContent onInbox={onInbox} localMode={false} />}>
          <ModeAwareBannerContent onInbox={onInbox} />
        </Suspense>
      </div>
    </header>
  );
}

function ModeAwareBannerContent({ onInbox }: { onInbox: boolean }) {
  // The playground writes ?mode=local — thread it through the inbox links so
  // both sides of the demo look at the same store.
  const localMode = useSearchParams().get("mode") === "local";
  return <BannerContent onInbox={onInbox} localMode={localMode} />;
}

function BannerContent({ onInbox, localMode }: { onInbox: boolean; localMode: boolean }) {
  const modeQuery = localMode ? "?mode=local" : "";

  let message: string;
  if (onInbox) {
    message = localMode
      ? "You're the freelancer now — feedbacks from the demo's local mode stay in this browser."
      : "You're the freelancer now — feedback drawn on the demo site lands here. Data resets every 10 minutes.";
  } else {
    message = localMode
      ? "Live demo, local mode — feedbacks stay in this browser. Every option in the playground is live — change it and the widget rebuilds."
      : "Live demo — data resets every 10 minutes and is not persisted to any database. Every option in the playground is live — change it and the widget rebuilds.";
  }

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <p>{message}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {onInbox ? (
          <Link
            href={`/demo${modeQuery}`}
            className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            Back to the demo site
          </Link>
        ) : (
          <Link
            href={`/demo/inbox${modeQuery}`}
            className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            Open the inbox
          </Link>
        )}
        <Link href="/" className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700">
          Back to SitePing
        </Link>
      </div>
    </>
  );
}

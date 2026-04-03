import Link from "next/link";

export function Banner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="relative mx-auto flex max-w-7xl items-center justify-center text-sm text-amber-900">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <p>Live demo — data resets every 10 minutes and is not persisted to any database.</p>
        </div>
        <Link
          href="/"
          className="absolute right-0 shrink-0 font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
        >
          Back to SitePing
        </Link>
      </div>
    </div>
  );
}

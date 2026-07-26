"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <p className="text-sm font-medium tracking-widest text-red-400/60 uppercase">Error</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Something went wrong</h1>
      <p className="mt-4 text-lg text-gray-400">An unexpected error occurred. Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-light"
      >
        Try again
      </button>
    </div>
  );
}

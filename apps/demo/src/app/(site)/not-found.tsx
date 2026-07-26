import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
      <p className="text-sm font-medium tracking-widest text-accent-light/60 uppercase">404</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Page not found</h1>
      <p className="mt-4 text-lg text-gray-400">This page doesn't exist or has been moved.</p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-light"
        >
          Back to home
        </Link>
        <Link
          href="/demo"
          className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:border-gray-500 hover:text-white"
        >
          Try the demo
        </Link>
      </div>
    </div>
  );
}

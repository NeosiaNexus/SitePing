"use client";

import { bricolage } from "@/components/landing/fonts";
import { LogoMark } from "@/components/landing/icons";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main
      className={`landing ${bricolage.variable} flex min-h-svh flex-col items-center justify-center px-6 text-center`}
    >
      <LogoMark className="h-10 w-10" />
      <h1 className="type-title mt-8 text-[clamp(2.4rem,7vw,3.6rem)] text-paper">Something went wrong.</h1>
      <p className="mt-4 max-w-[30rem] text-lg leading-relaxed text-mist">
        The page hit an unexpected error. Trying again usually fixes it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="press focus-ring mt-10 inline-flex h-11 items-center rounded-full bg-paper px-5 text-[15px] font-semibold text-ink transition-[color,background-color,border-color,transform] duration-150 hover:bg-white"
      >
        Try again
      </button>
    </main>
  );
}

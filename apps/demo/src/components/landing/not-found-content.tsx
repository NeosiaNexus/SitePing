import Link from "next/link";
import { bricolage, jetbrains } from "./fonts";
import { LogoMark } from "./icons";

/** The 404 in the landing's language: a route's notFound() and unmatched URLs share it. */
export function NotFoundContent() {
  return (
    <main
      className={`landing ${bricolage.variable} ${jetbrains.variable} flex min-h-svh flex-col items-center justify-center px-6 text-center`}
    >
      <LogoMark className="h-10 w-10" />
      <p className="mt-8 font-code text-[13px] text-dim">404</p>
      <h1 className="type-title mt-3 text-[clamp(2.4rem,7vw,3.6rem)] text-paper">This page has no pin.</h1>
      <p className="mt-4 max-w-[30rem] text-lg leading-relaxed text-mist">
        It does not exist, or it moved. The rest of the site is one click away.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="press focus-ring inline-flex h-11 items-center rounded-full bg-paper px-5 text-[15px] font-semibold text-ink transition-[color,background-color,border-color,transform] duration-150 hover:bg-white"
        >
          Back to the home page
        </Link>
        <Link
          href="/demo"
          className="press focus-ring surface inline-flex h-11 items-center rounded-full px-5 text-[15px] text-paper transition-[color,background-color,border-color,transform] duration-150"
        >
          Try the live demo
        </Link>
      </div>
    </main>
  );
}

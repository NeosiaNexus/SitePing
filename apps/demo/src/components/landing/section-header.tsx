import type { ReactNode } from "react";

/** Every section opens the same way: the claim on the left, the context on the right. */
export function SectionHeader({ id, title, lede }: { id: string; title: ReactNode; lede?: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
      <h2 id={id} className="type-title text-[clamp(2.4rem,5.4vw,4.6rem)] text-paper lg:col-span-7">
        {title}
      </h2>
      {lede ? (
        <p className="max-w-[30rem] text-lg leading-relaxed text-mist lg:col-span-5 lg:justify-self-end lg:pb-2">
          {lede}
        </p>
      ) : null}
    </div>
  );
}

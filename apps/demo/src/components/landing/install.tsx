"use client";

import { type ReactNode, useState } from "react";
import { CopyButton } from "./copy-button";
import { frameworks } from "./frameworks";
import { SectionHeader } from "./section-header";

const managers = ["npm", "bun", "yarn", "pnpm"] as const;
type Manager = (typeof managers)[number];

const install: Record<Manager, string> = {
  npm: "npm install @siteping/widget @siteping/adapter-prisma",
  bun: "bun add @siteping/widget @siteping/adapter-prisma",
  yarn: "yarn add @siteping/widget @siteping/adapter-prisma",
  pnpm: "pnpm add @siteping/widget @siteping/adapter-prisma",
};

const scaffold: Record<Manager, string> = {
  npm: "npx @siteping/cli init",
  bun: "bunx @siteping/cli init",
  yarn: "yarn dlx @siteping/cli init",
  pnpm: "pnpm dlx @siteping/cli init",
};

const SNIPPET = `import { initSiteping } from '@siteping/widget'

initSiteping({
  endpoint: '/api/siteping',
  projectName: 'my-project',
})`;

const TAB_WIDTH = 64; // px, equal tabs so the indicator only ever translates

function Tabs({ value, onChange }: { value: Manager; onChange: (m: Manager) => void }) {
  const index = managers.indexOf(value);
  return (
    <div role="tablist" aria-label="Package manager" className="surface relative flex rounded-full p-1">
      {/* Spatial: the pill slides to the chosen tab (transform only, 200ms ease-out). */}
      <span
        aria-hidden="true"
        className="absolute bottom-1 left-1 top-1 rounded-full bg-cobalt transition-transform duration-200 ease-out-strong"
        style={{ width: TAB_WIDTH, transform: `translateX(${index * TAB_WIDTH}px)` }}
      />
      {managers.map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={m === value}
          onClick={() => onChange(m)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const next = managers[(index + (e.key === "ArrowRight" ? 1 : managers.length - 1)) % managers.length];
            if (next) {
              onChange(next);
              const sibling = e.currentTarget.parentElement?.querySelectorAll("button")[managers.indexOf(next)];
              sibling?.focus();
            }
          }}
          tabIndex={m === value ? 0 : -1}
          style={{ width: TAB_WIDTH }}
          className={`focus-ring relative z-10 h-8 rounded-full font-code text-[13px] transition-colors duration-200 ease-[ease] ${
            m === value ? "text-white" : "text-mist hover:text-paper"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function Step({
  n,
  title,
  file,
  note,
  copy,
  children,
}: {
  n: number;
  title: string;
  file: string;
  note: string;
  copy: string;
  children: ReactNode;
}) {
  // Subgrid rows: titles, code cards and notes line up across the three columns.
  return (
    <li className="grid min-w-0 grid-rows-[auto_1fr_auto] lg:row-span-3 lg:grid-rows-subgrid">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] font-code text-xs text-paper">
          {n}
        </span>
        <h3 className="text-[17px] font-semibold text-paper">{title}</h3>
      </div>
      <div className="surface mt-5 flex min-w-0 flex-col overflow-hidden rounded-2xl bg-ink">
        <div className="flex h-10 items-center justify-between border-b border-line pl-5 pr-1.5">
          <span className="font-code text-xs text-dim">{file}</span>
          <CopyButton
            text={copy}
            className="press focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-dim transition-[color,background-color,transform] duration-150 hover:bg-white/[0.06] hover:text-paper"
          />
        </div>
        <pre className="flex-1 overflow-x-auto px-5 py-4 font-code text-[13px] leading-[1.75] text-paper/90">
          {children}
        </pre>
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-mist">{note}</p>
    </li>
  );
}

export function Install() {
  const [pm, setPm] = useState<Manager>("npm");
  const [bin = "", verb = "", ...pkgs] = install[pm].split(" ");
  const [runner = "", ...cli] = scaffold[pm].split(" ");

  return (
    <section id="install" aria-labelledby="install-title" className="relative scroll-mt-16 py-24 lg:py-32">
      <div className="mx-auto max-w-[78rem] px-6 lg:px-10">
        <SectionHeader
          id="install-title"
          title="Three steps to the first note."
          lede="Install two packages, let the CLI write the Prisma schema and the API route, then start the widget."
        />

        <div className="mt-14 flex justify-start lg:mt-20">
          <Tabs value={pm} onChange={setPm} />
        </div>

        <ol className="mt-8 grid gap-10 lg:grid-cols-[1fr_1fr_1.25fr] lg:gap-x-6 lg:gap-y-0">
          <Step
            n={1}
            title="Install"
            file="Terminal"
            copy={install[pm]}
            note="The widget, and the adapter that talks to your database."
          >
            <code>
              <span className="select-none text-dim">$ </span>
              <span className="text-cobalt-soft">
                {bin} {verb}
              </span>
              {pkgs.map((p) => (
                <span key={p}>
                  {"\n  "}
                  {p}
                </span>
              ))}
            </code>
          </Step>
          <Step
            n={2}
            title="Scaffold"
            file="Terminal"
            copy={scaffold[pm]}
            note="Adds the Prisma models and generates the API route."
          >
            <code>
              <span className="select-none text-dim">$ </span>
              <span className="text-cobalt-soft">{runner}</span> {cli.join(" ")}
              {"\n\n"}
              <span className="text-[#8fe3b9]">✓ Prisma schema updated</span>
              {"\n"}
              <span className="text-[#8fe3b9]">✓ API route generated</span>
            </code>
          </Step>
          <Step
            n={3}
            title="Start the widget"
            file="app.ts"
            copy={SNIPPET}
            note="Your clients can now draw on the site."
          >
            <code>
              <span className="text-[#b8a6ff]">import</span> {"{ "}
              <span className="text-paper">initSiteping</span>
              {" } "}
              <span className="text-[#b8a6ff]">from</span>{" "}
              <span className="text-[#8fe3b9]">&apos;@siteping/widget&apos;</span>
              {"\n\n"}
              <span className="text-cobalt-soft">initSiteping</span>
              <span className="text-dim">({"{"}</span>
              {"\n  "}endpoint<span className="text-dim">: </span>
              <span className="text-[#8fe3b9]">&apos;/api/siteping&apos;</span>
              <span className="text-dim">,</span>
              {"\n  "}projectName<span className="text-dim">: </span>
              <span className="text-[#8fe3b9]">&apos;my-project&apos;</span>
              <span className="text-dim">,</span>
              {"\n"}
              <span className="text-dim">{"})"}</span>
            </code>
          </Step>
        </ol>

        <div className="mt-20 flex flex-col gap-6 border-t border-line pt-10 lg:flex-row lg:items-center lg:gap-12">
          <p className="max-w-[16rem] shrink-0 text-[15px] leading-snug text-mist">
            The widget works with any framework, or none.
          </p>
          <ul className="flex flex-wrap gap-x-7 gap-y-4">
            {frameworks.map((fw) => (
              <li key={fw.name} className="flex items-center gap-2 text-[15px] text-paper/80">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill={fw.color} aria-hidden="true">
                  <path d={fw.icon} />
                </svg>
                {fw.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

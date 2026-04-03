"use client";

import { useState } from "react";

const packageManagers = ["npm", "bun", "yarn", "pnpm"] as const;
type PackageManager = (typeof packageManagers)[number];

const installCommands: Record<PackageManager, string> = {
  npm: "npm install @siteping/widget @siteping/adapter-prisma",
  bun: "bun add @siteping/widget @siteping/adapter-prisma",
  yarn: "yarn add @siteping/widget @siteping/adapter-prisma",
  pnpm: "pnpm add @siteping/widget @siteping/adapter-prisma",
};

const setupCommands: Record<PackageManager, string> = {
  npm: "npx @siteping/cli init",
  bun: "bunx @siteping/cli init",
  yarn: "yarn dlx @siteping/cli init",
  pnpm: "pnpm dlx @siteping/cli init",
};

function TabBar({ selected, onChange }: { selected: PackageManager; onChange: (pm: PackageManager) => void }) {
  return (
    <div className="inline-flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1">
      {packageManagers.map((pm) => (
        <button
          key={pm}
          type="button"
          onClick={() => onChange(pm)}
          className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-all ${
            pm === selected ? "bg-accent text-white shadow-sm" : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          }`}
        >
          {pm}
        </button>
      ))}
    </div>
  );
}

function CodeBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
      <div className="flex items-center border-b border-gray-800 px-4 py-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-700" aria-hidden="true" />
          <span className="h-2 w-2 rounded-full bg-gray-700" aria-hidden="true" />
          <span className="h-2 w-2 rounded-full bg-gray-700" aria-hidden="true" />
        </span>
        <span className="ml-3 font-mono text-xs text-gray-500">{label}</span>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-sm leading-relaxed">{children}</pre>
    </div>
  );
}

function InstallCode({ pm }: { pm: PackageManager }) {
  const cmd = installCommands[pm];
  const [bin, ...rest] = cmd.split(" ");
  const action = rest[0];
  const packages = rest.slice(1).join(" ");
  return (
    <code>
      <span className="text-gray-500">$</span>{" "}
      <span className="text-green-400">
        {bin} {action}
      </span>{" "}
      <span className="text-gray-300">{packages}</span>
    </code>
  );
}

function SetupCode({ pm }: { pm: PackageManager }) {
  const cmd = setupCommands[pm];
  const parts = cmd.split(" ");
  const bin = parts[0];
  const rest = parts.slice(1).join(" ");
  return (
    <code>
      <span className="text-gray-500">$</span> <span className="text-green-400">{bin}</span>{" "}
      <span className="text-gray-300">{rest}</span>
      {"\n"}
      {"\n"}
      <span className="text-green-400">{"✓"} Prisma schema updated</span>
      {"\n"}
      <span className="text-green-400">{"✓"} API route generated</span>
    </code>
  );
}

export function PackageManagerTabs() {
  const [selected, setSelected] = useState<PackageManager>("npm");

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs — centered above the timeline */}
      <div className="flex justify-center">
        <TabBar selected={selected} onChange={setSelected} />
      </div>

      {/* Step 1: Install */}
      <Step number={1} title="Install">
        <CodeBlock label="Terminal">
          <InstallCode pm={selected} />
        </CodeBlock>
        <p className="mt-4 leading-relaxed text-gray-400">Add both packages to your project in one command.</p>
      </Step>

      {/* Step 2: Setup */}
      <Step number={2} title="Setup">
        <CodeBlock label="Terminal">
          <SetupCode pm={selected} />
        </CodeBlock>
        <p className="mt-4 leading-relaxed text-gray-400">Generates Prisma schema + API route automatically.</p>
      </Step>

      {/* Step 3: Annotate */}
      <Step number={3} title="Annotate">
        <CodeBlock label="app.ts">
          <AnnotateCode />
        </CodeBlock>
        <p className="mt-4 leading-relaxed text-gray-400">Your clients can now draw on the site.</p>
      </Step>
    </div>
  );
}

function AnnotateCode() {
  return (
    <code>
      <span className="text-purple-400">import</span>
      <span className="text-gray-300"> {"{"} </span>
      <span className="text-yellow-300">initSiteping</span>
      <span className="text-gray-300"> {"}"} </span>
      <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@siteping/widget&apos;</span>
      {"\n"}
      {"\n"}
      <span className="text-yellow-300">initSiteping</span>
      <span className="text-gray-500">({"{"}</span>
      {"\n"}
      {"  "}
      <span className="text-blue-300">endpoint</span>
      <span className="text-gray-500">: </span>
      <span className="text-green-400">&apos;/api/siteping&apos;</span>
      <span className="text-gray-500">,</span>
      {"\n"}
      {"  "}
      <span className="text-blue-300">projectName</span>
      <span className="text-gray-500">: </span>
      <span className="text-green-400">&apos;my-project&apos;</span>
      <span className="text-gray-500">,</span>
      {"\n"}
      <span className="text-gray-500">{"})"}</span>
    </code>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div data-gsap="step" className="relative flex gap-6 sm:gap-8">
      {/* Number badge */}
      <div className="relative z-10 flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-[0_0_16px_rgba(23,60,255,0.4)] sm:h-12 sm:w-12 sm:text-base">
          {number}
        </div>
      </div>

      {/* Card */}
      <div className="min-w-0 flex-1 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

/*
 * The playground's controls, in SitePing's own language (ink, cobalt,
 * hairlines). Motion follows the landing's rules: state changes slide or fade
 * in 200ms with the strong ease-out, presses scale to 0.97, nothing loops.
 */

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return htmlFor ? (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-medium text-mist">
      {children}
    </label>
  ) : (
    <span className="mb-2 block text-[13px] font-medium text-mist">{children}</span>
  );
}

interface SegmentedProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Radio group as a segmented control; the cobalt pill slides to the choice (transform only). */
export function Segmented<T extends string>({ legend, name, value, options, onChange }: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-medium text-mist">{legend}</legend>
      <div
        className="relative grid rounded-xl bg-white/[0.04] p-1 ring-1 ring-line"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-1 top-1 rounded-[9px] bg-cobalt shadow-[0_4px_14px_-4px_rgb(23_60_255/0.8)] transition-transform duration-200 ease-out-strong motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
        {options.map((option) => (
          <label
            key={option.value}
            className="relative z-10 cursor-pointer rounded-[9px] px-2 py-1.5 text-center text-[13px] text-mist transition-colors duration-200 ease-[ease] hover:text-paper has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-cobalt-soft"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface SwitchRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  caption?: string;
}

/** A labelled switch. The knob travels on transform; the track's color answers in 200ms. */
export function SwitchRow({ label, checked, onChange, caption }: SwitchRowProps) {
  return (
    <div>
      <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-[14px] text-paper">
        {label}
        <span className="relative inline-flex">
          <input
            type="checkbox"
            role="switch"
            aria-checked={checked}
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="h-[22px] w-[38px] rounded-full bg-white/[0.12] ring-1 ring-inset ring-white/[0.06] transition-colors duration-200 ease-[ease] peer-checked:bg-cobalt peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cobalt-soft"
          />
          <span
            aria-hidden="true"
            className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.4)] transition-transform duration-200 ease-out-strong peer-checked:translate-x-4 motion-reduce:transition-none"
          />
        </span>
      </label>
      {caption ? <p className="mt-0.5 text-[12.5px] leading-snug text-dim">{caption}</p> : null}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-line px-5 py-5 first:border-t-0">
      <h3 className="text-[11px] font-semibold tracking-[0.02em] text-dim">{title}</h3>
      {children}
    </section>
  );
}

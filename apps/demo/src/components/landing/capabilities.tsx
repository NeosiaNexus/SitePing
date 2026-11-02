import { LineIcon } from "./icons";
import { SectionHeader } from "./section-header";
import { StaggerGroup } from "./stagger-group";

const items: { title: string; body: string; token?: string; icon: string | readonly string[] }[] = [
  {
    title: "Self-hosted",
    body: "Feedback goes to your own database through Prisma or Drizzle. No vendor in the middle, no monthly fee.",
    icon: ["M5 12H3l9-9 9 9h-2", "M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7", "M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6"],
  },
  {
    title: "Phones and tablets",
    body: "Clients tap an element to comment. On a phone, the form and the panel become bottom sheets, and the form stays above the keyboard.",
    icon: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3",
  },
  {
    title: "9 languages built in",
    body: "English, French, German, Spanish, Italian, Portuguese, Russian, Japanese and Korean, in the widget and the inbox.",
    token: "registerLocale(code, translations)",
    icon: "M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802",
  },
  {
    title: "Keyboard-first accessibility",
    body: "Designed for WCAG 2.1 AA and checked with axe on every change, in light and dark. Clients can annotate without a mouse: Tab to the element, press Enter.",
    icon: "M3.75 9h16.5m-16.5 6.75h16.5M5.25 5.25h13.5A1.5 1.5 0 0120.25 6.75v10.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z",
  },
  {
    title: "Access and reviewer mode",
    body: "An API key or your own login. Read-only mode keeps clients to commenting and replying, and reviewer emails stay blanked by default.",
    token: "readOnly: true",
    icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  },
  {
    title: "Isolated in Shadow DOM",
    body: "The widget's CSS never leaks into your site, and your site's CSS never breaks the widget.",
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
  {
    title: "Light on the page",
    body: "About 59 kB gzipped on first load. The panel, screenshot capture and other locales load when they're needed, and CI fails any change that outgrows the budget.",
    icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  },
  {
    title: "Typed and tested",
    body: "Written in TypeScript, so every option shows up in your editor with its type. Covered by more than 4,400 tests.",
    icon: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
  },
  {
    title: "Open source, MIT",
    body: "Read it, fork it, change it. No account, no vendor key, no signup.",
    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  },
];

export function Capabilities() {
  return (
    <section aria-labelledby="details-title" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[78rem] px-6 lg:px-10">
        <SectionHeader
          id="details-title"
          title="The details that make it hold up."
          lede="Built for the sites you hand over, and for the clients who review them."
        />

        {/* Hairline cells: the gap is the rule, no boxes. */}
        <StaggerGroup className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-line shadow-[0_0_0_1px_var(--color-line)] sm:grid-cols-2 lg:mt-24 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.title} className="flex flex-col bg-ink p-8 lg:p-10">
              <LineIcon d={item.icon} className="h-6 w-6 text-cobalt-soft" />
              <h3 className="mt-6 text-[19px] font-semibold tracking-[-0.01em] text-paper">{item.title}</h3>
              <p className="mt-2.5 text-[15.5px] leading-relaxed text-mist">{item.body}</p>
              {item.token ? (
                <code className="mt-5 w-fit rounded-lg bg-white/[0.04] px-2.5 py-1 font-code text-[12.5px] text-cobalt-soft ring-1 ring-white/[0.06]">
                  {item.token}
                </code>
              ) : null}
            </li>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

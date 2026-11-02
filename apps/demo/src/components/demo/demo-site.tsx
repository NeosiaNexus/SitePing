import type { CSSProperties, ReactNode } from "react";
import { instrumentSerif } from "./fonts";

/*
 * Horizon Studio: the fictional client site the widget is demonstrated on.
 * It has its own identity (bone paper, ink, ember, a serif display) so the
 * SitePing layer on top of it reads as a separate product. A few blocks carry
 * `data-feedback-anchor`, the attribute hosts use to give annotations a
 * stable, narrow anchor; the seeded feedback in lib/seed-anchors.ts was
 * generated against this markup, so regenerate it after changing the page.
 */

const theme = {
  "--h-bone": "#f7f4ef",
  "--h-paper": "#fffdf9",
  "--h-ink": "#17130e",
  "--h-muted": "#6c6358",
  "--h-line": "#e6dfd4",
  "--h-ember": "#c2410c",
  "--h-ember-hover": "#a8370a",
  "--h-ember-wash": "#f6e3d6",
} as CSSProperties;

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const services = [
  {
    key: "web-design",
    title: "Web Design",
    description: "Beautiful, responsive websites tailored to your brand",
    tags: ["Art direction", "Design systems", "Prototypes"],
    icon: "M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25",
  },
  {
    key: "development",
    title: "Development",
    description: "Scalable applications built with modern technologies",
    tags: ["Next.js", "Headless CMS", "Performance"],
    icon: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
  },
  {
    key: "branding",
    title: "Branding",
    description: "Visual identity systems that tell your story",
    tags: ["Naming", "Logos", "Guidelines"],
    icon: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42",
  },
  {
    key: "strategy",
    title: "Strategy",
    description: "Data-driven digital strategies for growth",
    tags: ["Research", "Analytics", "Roadmaps"],
    icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605",
  },
] as const;

const projects = [
  {
    key: "luminary-app",
    name: "Luminary App",
    category: "Mobile App",
    year: "2026",
    art: "phone",
    from: "#1f2a44",
    to: "#3b4a74",
    glow: "#8fb3ff",
  },
  {
    key: "vertex-saas",
    name: "Vertex SaaS",
    category: "Web Platform",
    year: "2025",
    art: "browser",
    from: "#0f3d3e",
    to: "#1b6b5f",
    glow: "#9be3c8",
  },
  {
    key: "greenfield-co",
    name: "Greenfield Co.",
    category: "Branding",
    year: "2025",
    art: "mark",
    from: "#3d5a1e",
    to: "#7a9a3a",
    glow: "#e6f0b8",
  },
  {
    key: "nova-dashboard",
    name: "Nova Dashboard",
    category: "UI/UX Design",
    year: "2024",
    art: "chart",
    from: "#2b1e4d",
    to: "#5b3fa0",
    glow: "#d3c4ff",
  },
  {
    key: "rosewood-hotel",
    name: "Rosewood Hotel",
    category: "Website",
    year: "2024",
    art: "arch",
    from: "#5c1f2b",
    to: "#a8475a",
    glow: "#ffd0d6",
  },
  {
    key: "suncrest-finance",
    name: "Suncrest Finance",
    category: "Web App",
    year: "2023",
    art: "cards",
    from: "#6b3a0c",
    to: "#c2410c",
    glow: "#ffd9a8",
  },
] as const;

const testimonials = [
  {
    key: "sarah-mitchell",
    quote:
      "Horizon Studio transformed our digital presence. The attention to detail and strategic thinking behind every design decision was remarkable.",
    name: "Sarah Mitchell",
    title: "CEO, Luminary Technologies",
  },
  {
    key: "david-park",
    quote:
      "Working with this team felt like having an in-house design department. They understood our vision from day one and delivered beyond expectations.",
    name: "David Park",
    title: "Founder, Vertex Software",
  },
  {
    key: "elena-rossi",
    quote:
      "The rebrand they delivered increased our conversion rate by 40%. Professional, responsive, and genuinely invested in our success.",
    name: "Elena Rossi",
    title: "Marketing Director, Greenfield Co.",
  },
] as const;

const clients = ["Luminary", "Vertex", "Greenfield", "Nova", "Rosewood", "Suncrest"] as const;

/** The studio's mark: a sun sitting on the horizon. */
function Logo() {
  return (
    <span className="flex items-center gap-2.5 text-[var(--h-ink)]">
      <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
        <circle cx="14" cy="15" r="7" fill="var(--h-ember)" />
        <rect x="2" y="15" width="24" height="11" fill="var(--h-bone)" />
        <path d="M3 16h22M6 20h16M10 24h8" stroke="var(--h-ink)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="font-[family-name:var(--font-horizon)] text-[1.45rem] leading-none tracking-[-0.01em]">
        Horizon Studio
      </span>
    </span>
  );
}

function HeroArt() {
  return (
    <div data-feedback-anchor="hero-art" className="relative mx-auto aspect-[4/5] w-full max-w-[26rem]">
      <div className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-[2rem] shadow-[0_40px_80px_-30px_rgb(87_42_14/0.45)]">
        <svg viewBox="0 0 400 500" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="hz-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2b1d3a" />
              <stop offset="0.45" stopColor="#b5442a" />
              <stop offset="0.7" stopColor="#f2a65a" />
              <stop offset="1" stopColor="#fbe3c0" />
            </linearGradient>
            <radialGradient id="hz-sun" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff4d6" />
              <stop offset="0.6" stopColor="#ffd08a" />
              <stop offset="1" stopColor="#ffb25c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="500" fill="url(#hz-sky)" />
          <circle cx="200" cy="300" r="120" fill="url(#hz-sun)" />
          <circle cx="200" cy="300" r="62" fill="#fff1d1" />
          <path d="M0 330 C 70 300, 140 318, 200 306 S 330 290, 400 312 L400 500 L0 500 Z" fill="#7a2f1f" />
          <path d="M0 372 C 90 340, 170 368, 250 352 S 350 340, 400 356 L400 500 L0 500 Z" fill="#4a1f1d" />
          <path d="M0 418 C 110 392, 210 420, 300 404 S 380 398, 400 404 L400 500 L0 500 Z" fill="#231313" />
          <g stroke="#fff1d1" strokeOpacity="0.35" strokeWidth="2">
            <path d="M140 300h120" />
            <path d="M120 312h160" />
          </g>
        </svg>
      </div>
      <div className="absolute -left-6 bottom-16 rounded-2xl bg-[var(--h-paper)] px-4 py-3 shadow-[0_18px_40px_-16px_rgb(23_19_14/0.35)] ring-1 ring-[var(--h-line)] sm:-left-10">
        <p className="font-[family-name:var(--font-horizon)] text-3xl leading-none text-[var(--h-ink)]">120+</p>
        <p className="mt-1 text-xs text-[var(--h-muted)]">launches since 2014</p>
      </div>
      <div className="absolute -right-4 top-24 rounded-2xl bg-[var(--h-ink)] px-4 py-3 text-[var(--h-bone)] shadow-[0_18px_40px_-16px_rgb(23_19_14/0.5)] sm:-right-8">
        <p className="text-xs text-[#d6cec3]">Average client rating</p>
        <p className="mt-1 text-lg font-semibold">4.9 / 5</p>
      </div>
    </div>
  );
}

function Cover({ project }: { project: (typeof projects)[number] }) {
  const art: Record<(typeof projects)[number]["art"], ReactNode> = {
    phone: (
      <div className="absolute bottom-0 left-1/2 h-[78%] w-[34%] -translate-x-1/2 translate-y-[12%] rounded-[1.4rem] border-[6px] border-black/40 bg-white/90 p-2">
        <div className="h-3 w-1/2 rounded-full bg-black/10" />
        <div className="mt-3 h-16 rounded-xl" style={{ background: project.glow }} />
        <div className="mt-2 h-2 w-3/4 rounded-full bg-black/15" />
        <div className="mt-1.5 h-2 w-1/2 rounded-full bg-black/10" />
      </div>
    ),
    browser: (
      <div className="absolute bottom-0 left-[12%] right-[-6%] top-[22%] rounded-tl-xl bg-white/95 shadow-2xl">
        <div className="flex gap-1.5 border-b border-black/5 p-2.5">
          <span className="h-2 w-2 rounded-full bg-black/15" />
          <span className="h-2 w-2 rounded-full bg-black/15" />
          <span className="h-2 w-2 rounded-full bg-black/15" />
        </div>
        <div className="grid grid-cols-3 gap-2 p-3">
          <div className="col-span-2 h-14 rounded-lg" style={{ background: project.glow }} />
          <div className="h-14 rounded-lg bg-black/5" />
          <div className="h-8 rounded-lg bg-black/5" />
          <div className="col-span-2 h-8 rounded-lg bg-black/5" />
        </div>
      </div>
    ),
    mark: (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: project.glow }}>
          <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
            <path d="M24 6c8 8 12 16 0 36C12 22 16 14 24 6z" fill={project.from} />
          </svg>
        </div>
      </div>
    ),
    chart: (
      <div className="absolute inset-x-[12%] bottom-[14%] top-[26%] flex items-end gap-2">
        {[38, 62, 46, 80, 58, 92, 70].map((h) => (
          <div
            key={h}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%`, background: project.glow, opacity: 0.35 + h / 160 }}
          />
        ))}
      </div>
    ),
    arch: (
      <div
        className="absolute bottom-0 left-1/2 h-[70%] w-[42%] -translate-x-1/2 rounded-t-full"
        style={{ background: `linear-gradient(to bottom, ${project.glow}, transparent)` }}
      />
    ),
    cards: (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-24 w-40">
          <div className="absolute inset-0 -rotate-6 rounded-xl bg-white/25" />
          <div className="absolute inset-0 rotate-3 rounded-xl p-3" style={{ background: project.glow }}>
            <div className="h-3 w-8 rounded bg-black/20" />
            <div className="mt-8 h-2 w-24 rounded-full bg-black/25" />
          </div>
        </div>
      </div>
    ),
  };
  return (
    <div
      className="relative h-60 overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03]"
      style={{ background: `radial-gradient(120% 90% at 20% 0%, ${project.to}, ${project.from})` }}
    >
      {art[project.art]}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium text-[var(--h-ember)]">{children}</p>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3 font-[family-name:var(--font-horizon)] text-[2.6rem] leading-[1.05] tracking-[-0.01em] text-[var(--h-ink)] sm:text-[3.4rem]">
      {children}
    </h2>
  );
}

const field =
  "mt-2 block w-full rounded-xl border border-[var(--h-line)] bg-[var(--h-paper)] px-4 py-3 text-[var(--h-ink)] placeholder:text-[#9b9186] focus:border-[var(--h-ember)] focus:outline-none focus:ring-4 focus:ring-[var(--h-ember-wash)]";

export function DemoSite() {
  return (
    <div
      style={theme}
      className={`${instrumentSerif.variable} min-h-screen bg-[var(--h-bone)] font-sans text-[var(--h-ink)] antialiased`}
    >
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-40 border-b border-[var(--h-line)] bg-[var(--h-bone)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <ul className="flex items-center gap-8 text-[15px] text-[var(--h-muted)]">
            <li className="hidden md:block">
              <a href="#work" className="transition-colors hover:text-[var(--h-ink)]">
                Work
              </a>
            </li>
            <li className="hidden md:block">
              <a href="#services" className="transition-colors hover:text-[var(--h-ink)]">
                Services
              </a>
            </li>
            <li className="hidden md:block">
              <a href="#about" className="transition-colors hover:text-[var(--h-ink)]">
                About
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="rounded-full bg-[var(--h-ink)] px-5 py-2.5 font-medium text-[var(--h-bone)] transition-colors hover:bg-black"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-16 sm:pt-24">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--h-paper)] px-3.5 py-1.5 text-sm text-[var(--h-muted)] ring-1 ring-[var(--h-line)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--h-ember)]" />
              Independent studio in Lyon, since 2014
            </p>
            <h1
              data-feedback-anchor="hero-title"
              className="mt-7 font-[family-name:var(--font-horizon)] text-[3.4rem] leading-[0.98] tracking-[-0.02em] sm:text-[4.6rem] lg:text-[5.4rem]"
            >
              We craft digital experiences <em className="whitespace-nowrap text-[var(--h-ember)]">that matter.</em>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--h-muted)]">
              Horizon Studio is a design and development agency helping startups and established brands ship polished
              digital products. From concept to launch, we handle every pixel.
            </p>
            <div data-feedback-anchor="hero-actions" className="mt-10 flex w-fit flex-wrap items-center gap-3">
              <a
                href="#work"
                className="rounded-full bg-[var(--h-ember)] px-7 py-3.5 text-base font-medium text-white shadow-[0_10px_24px_-10px_rgb(194_65_12/0.8)] transition-colors hover:bg-[var(--h-ember-hover)]"
              >
                View our work
              </a>
              <a
                href="#services"
                className="rounded-full px-7 py-3.5 text-base font-medium text-[var(--h-ink)] ring-1 ring-[var(--h-line)] transition-colors hover:bg-[var(--h-paper)] hover:ring-[#d3c9bb]"
              >
                Our services
              </a>
            </div>
          </div>
          <HeroArt />
        </div>
      </section>

      {/* ── Clients ── */}
      <section aria-label="Clients" className="border-y border-[var(--h-line)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-10 gap-y-4">
          <p className="text-sm text-[var(--h-muted)]">Trusted by teams at</p>
          {clients.map((name, i) => (
            <span
              key={name}
              className={`text-xl text-[var(--h-muted)] ${i % 2 ? "font-[family-name:var(--font-horizon)] italic" : "font-semibold tracking-tight"}`}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <Eyebrow>What we do</Eyebrow>
              <SectionTitle>Services</SectionTitle>
            </div>
            <p className="max-w-md text-lg leading-relaxed text-[var(--h-muted)] lg:justify-self-end">
              End-to-end capabilities to bring your vision to life.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {services.map((service, i) => (
              <div
                key={service.key}
                data-feedback-anchor={`service-${service.key}`}
                className="group rounded-3xl bg-[var(--h-paper)] p-8 ring-1 ring-[var(--h-line)] transition-shadow hover:shadow-[0_24px_50px_-28px_rgb(23_19_14/0.35)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--h-ember-wash)] text-[var(--h-ember)]">
                    <Icon d={service.icon} className="h-6 w-6" />
                  </div>
                  <span aria-hidden="true" className="font-[family-name:var(--font-horizon)] text-2xl text-[#8a8076]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-semibold tracking-tight">{service.title}</h3>
                <p className="mt-2 leading-relaxed text-[var(--h-muted)]">{service.description}</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {service.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full px-3 py-1 text-sm text-[var(--h-muted)] ring-1 ring-[var(--h-line)]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portfolio ── */}
      <section id="work" className="bg-[var(--h-ink)] px-6 py-28 text-[var(--h-bone)]">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-sm font-medium text-[#f2a65a]">Portfolio</p>
              <h2 className="mt-3 font-[family-name:var(--font-horizon)] text-[2.6rem] leading-[1.05] tracking-[-0.01em] sm:text-[3.4rem]">
                Selected Work
              </h2>
            </div>
            <p className="max-w-md text-lg leading-relaxed text-[#b9b0a5] lg:justify-self-end">
              A selection of projects we are proud to have been part of.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.key}
                data-feedback-anchor={`project-${project.key}`}
                className="group cursor-pointer overflow-hidden rounded-3xl bg-[#211c16] ring-1 ring-white/10"
              >
                <Cover project={project} />
                <div className="flex items-end justify-between gap-4 p-6">
                  <div>
                    <p className="text-sm text-[#b9b0a5]">{project.category}</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{project.name}</h3>
                  </div>
                  <span className="text-sm text-[#8f877d]">{project.year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="about" className="px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>Testimonials</Eyebrow>
          <SectionTitle>What our clients say</SectionTitle>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <blockquote
                key={testimonial.key}
                data-feedback-anchor={`testimonial-${testimonial.key}`}
                className="flex flex-col rounded-3xl bg-[var(--h-paper)] p-8 ring-1 ring-[var(--h-line)]"
              >
                <svg
                  className="h-8 w-8 text-[var(--h-ember)]/30"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.68 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.252 0-2.41-.61-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.68 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.252 0-2.41-.61-2.917-1.179z" />
                </svg>
                <p className="mt-5 flex-1 font-[family-name:var(--font-horizon)] text-[1.45rem] leading-snug text-[var(--h-ink)]">
                  {testimonial.quote}
                </p>
                <footer className="mt-8 flex items-center gap-3 border-t border-[var(--h-line)] pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--h-ember-wash)] text-sm font-semibold text-[var(--h-ember)]">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-[var(--h-muted)]">{testimonial.title}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="px-6 pb-28">
        <div className="mx-auto grid max-w-6xl gap-12 rounded-[2.5rem] bg-[var(--h-paper)] p-8 ring-1 ring-[var(--h-line)] sm:p-12 lg:grid-cols-[1fr_1.2fr] lg:p-16">
          <div>
            <Eyebrow>Contact</Eyebrow>
            <SectionTitle>Get in touch</SectionTitle>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-[var(--h-muted)]">
              Have a project in mind? We would love to hear about it.
            </p>
            <p className="mt-10 text-sm text-[var(--h-muted)]">Or write to us directly</p>
            <p className="mt-1 text-lg font-medium">hello@horizonstudio.example</p>
          </div>

          <form className="space-y-5" onSubmit={undefined} action="#" method="POST">
            <div className="grid gap-5 sm:grid-cols-2">
              <div data-feedback-anchor="contact-name">
                <label htmlFor="demo-name" className="block text-sm font-medium">
                  Name
                </label>
                <input type="text" id="demo-name" name="name" placeholder="John Doe" className={field} readOnly />
              </div>
              <div data-feedback-anchor="contact-email">
                <label htmlFor="demo-email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  type="email"
                  id="demo-email"
                  name="email"
                  placeholder="john@example.com"
                  className={field}
                  readOnly
                />
              </div>
            </div>
            <div data-feedback-anchor="contact-message">
              <label htmlFor="demo-message" className="block text-sm font-medium">
                Message
              </label>
              <textarea
                id="demo-message"
                name="message"
                rows={5}
                placeholder="Tell us about your project..."
                className={field}
                readOnly
              />
            </div>
            <button
              type="button"
              className="w-full rounded-full bg-[var(--h-ember)] px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-[var(--h-ember-hover)] sm:w-auto"
            >
              Send message
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--h-line)] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-[var(--h-muted)]">
              &copy; {new Date().getFullYear()} Horizon Studio. All rights reserved.
            </p>
          </div>
          <div data-feedback-anchor="footer-social" className="flex items-center gap-2">
            <a
              href="https://x.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-2.5 text-[var(--h-muted)] transition-colors hover:bg-[var(--h-paper)] hover:text-[var(--h-ink)]"
            >
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-2.5 text-[var(--h-muted)] transition-colors hover:bg-[var(--h-paper)] hover:text-[var(--h-ink)]"
            >
              <span className="sr-only">LinkedIn</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-2.5 text-[var(--h-muted)] transition-colors hover:bg-[var(--h-paper)] hover:text-[var(--h-ink)]"
            >
              <span className="sr-only">GitHub</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

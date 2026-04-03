const services = [
  {
    title: "Web Design",
    description: "Beautiful, responsive websites tailored to your brand",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
        />
      </svg>
    ),
  },
  {
    title: "Development",
    description: "Scalable applications built with modern technologies",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
        />
      </svg>
    ),
  },
  {
    title: "Branding",
    description: "Visual identity systems that tell your story",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
        />
      </svg>
    ),
  },
  {
    title: "Strategy",
    description: "Data-driven digital strategies for growth",
    icon: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
        />
      </svg>
    ),
  },
] as const;

const projects = [
  { name: "Luminary App", category: "Mobile App", color: "bg-slate-800" },
  { name: "Vertex SaaS", category: "Web Platform", color: "bg-blue-700" },
  { name: "Greenfield Co.", category: "Branding", color: "bg-emerald-700" },
  { name: "Nova Dashboard", category: "UI/UX Design", color: "bg-violet-700" },
  { name: "Rosewood Hotel", category: "Website", color: "bg-rose-700" },
  { name: "Suncrest Finance", category: "Web App", color: "bg-amber-700" },
] as const;

const testimonials = [
  {
    quote:
      "Horizon Studio transformed our digital presence. The attention to detail and strategic thinking behind every design decision was remarkable.",
    name: "Sarah Mitchell",
    title: "CEO, Luminary Technologies",
  },
  {
    quote:
      "Working with this team felt like having an in-house design department. They understood our vision from day one and delivered beyond expectations.",
    name: "David Park",
    title: "Founder, Vertex Software",
  },
  {
    quote:
      "The rebrand they delivered increased our conversion rate by 40%. Professional, responsive, and genuinely invested in our success.",
    name: "Elena Rossi",
    title: "Marketing Director, Greenfield Co.",
  },
] as const;

export function DemoSite() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Horizon
            <span className="text-accent">Studio</span>
          </span>
          <ul className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <li>
              <a href="#work" className="transition-colors hover:text-gray-900">
                Work
              </a>
            </li>
            <li>
              <a href="#services" className="transition-colors hover:text-gray-900">
                Services
              </a>
            </li>
            <li>
              <a href="#about" className="transition-colors hover:text-gray-900">
                About
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="rounded-lg bg-accent px-4 py-2 text-white transition-colors hover:bg-accent-dark"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50 px-6 py-28 sm:py-36">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #173CFF 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent">Digital agency</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            We craft digital experiences
            <br />
            <span className="text-accent">that matter.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            Horizon Studio is a design and development agency helping startups and established brands ship polished
            digital products. From concept to launch, we handle every pixel.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#work"
              className="rounded-lg bg-accent px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-accent-dark"
            >
              View our work
            </a>
            <a
              href="#services"
              className="rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
            >
              Our services
            </a>
          </div>
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────── */}
      <section id="services" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">What we do</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Services</h2>
            <p className="mt-4 text-lg text-gray-600">End-to-end capabilities to bring your vision to life.</p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.title}
                className="group rounded-xl border border-gray-200 p-8 transition-all hover:border-accent/30 hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  {service.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                <p className="mt-2 text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portfolio ───────────────────────────────────────────── */}
      <section id="work" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Portfolio</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Selected Work</h2>
            <p className="mt-4 text-lg text-gray-600">A selection of projects we are proud to have been part of.</p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.name}
                className="group cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`${project.color} flex h-56 items-end p-6 transition-transform group-hover:scale-[1.02]`}
                >
                  <div>
                    <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {project.category}
                    </span>
                    <h3 className="text-xl font-bold text-white">{project.name}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────── */}
      <section id="about" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Testimonials</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">What our clients say</h2>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <blockquote key={testimonial.name} className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
                <svg className="mb-4 h-8 w-8 text-accent/20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.68 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.252 0-2.41-.61-2.917-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.68 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.252 0-2.41-.61-2.917-1.179z" />
                </svg>
                <p className="text-gray-700 leading-relaxed">{testimonial.quote}</p>
                <footer className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.title}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────── */}
      <section id="contact" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">Contact</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Get in touch</h2>
            <p className="mt-4 text-lg text-gray-600">Have a project in mind? We would love to hear about it.</p>
          </div>

          <form className="mt-12 space-y-6" onSubmit={undefined} action="#" method="POST">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="demo-name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="demo-name"
                  name="name"
                  placeholder="John Doe"
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                  readOnly
                />
              </div>
              <div>
                <label htmlFor="demo-email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="demo-email"
                  name="email"
                  placeholder="john@example.com"
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                  readOnly
                />
              </div>
            </div>
            <div>
              <label htmlFor="demo-message" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="demo-message"
                name="message"
                rows={5}
                placeholder="Tell us about your project..."
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none"
                readOnly
              />
            </div>
            <div className="text-center">
              <button
                type="button"
                className="rounded-lg bg-accent px-8 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-accent-dark"
              >
                Send message
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              Horizon
              <span className="text-accent">Studio</span>
            </span>
            <p className="mt-1 text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Horizon Studio. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-5">
            {/* Twitter / X */}
            {/* biome-ignore lint/a11y/useValidAnchor: demo placeholder link */}
            <a href="#" className="text-gray-400 transition-colors hover:text-gray-600" aria-label="Twitter">
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* LinkedIn */}
            {/* biome-ignore lint/a11y/useValidAnchor: demo placeholder link */}
            <a href="#" className="text-gray-400 transition-colors hover:text-gray-600" aria-label="LinkedIn">
              <span className="sr-only">LinkedIn</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            {/* GitHub */}
            {/* biome-ignore lint/a11y/useValidAnchor: demo placeholder link */}
            <a href="#" className="text-gray-400 transition-colors hover:text-gray-600" aria-label="GitHub">
              <span className="sr-only">GitHub</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

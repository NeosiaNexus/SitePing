# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| latest  | :white_check_mark: |
| < latest | :x:               |

Only the latest published version of each `@siteping/*` package receives security updates.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please report vulnerabilities through one of these channels:

1. **GitHub Security Advisories** (preferred) -- [Report a vulnerability](https://github.com/NeosiaNexus/SitePing/security/advisories/new)
2. **Email** -- Send details to **security@neosianexus.dev**

### What to include

- Description of the vulnerability
- Steps to reproduce
- Affected package(s) and version(s)
- Potential impact

## Response Timeline

| Step | Timeline |
|------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 1 week |
| Fix release | Within 30 days (critical), 90 days (non-critical) |

## Disclosure Policy

- We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure).
- We will credit reporters in the release notes (unless you prefer to remain anonymous).
- We ask that you do not publicly disclose the vulnerability until a fix has been released.

## Scope

This policy applies to all packages in the `@siteping/*` scope:

- `@siteping/widget`
- `@siteping/adapter-prisma`
- `@siteping/adapter-memory`
- `@siteping/adapter-localstorage`
- `@siteping/cli`

## Hardening checklist for self-hosters

- **`apiKey` is required in production.** Starting `createSitepingHandler({ prisma })` with `NODE_ENV=production` and no `apiKey` throws at startup. Destructive endpoints (DELETE, PATCH) refuse to operate without authentication unless you explicitly opt out via `requireAuthForDestructive: false` (only safe behind your own auth middleware).
- **Set `allowedOrigins`.** Without it, no CORS headers are emitted and cross-origin browser requests are blocked. With `allowedOrigins: ["https://your-site.com"]`, only listed origins can call the API.
- **Rate-limit POST.** The widget submits from unauthenticated browser contexts. Apply rate limiting at the reverse proxy or middleware layer (Next.js middleware, Nginx, Cloudflare).
- **Run the CLI doctor.** `npx @siteping/cli doctor` flags missing `apiKey`, missing `allowedOrigins`, and other production red flags.

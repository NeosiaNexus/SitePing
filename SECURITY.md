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
- `@siteping/dashboard`
- `@siteping/server`
- `@siteping/adapter-prisma`
- `@siteping/adapter-drizzle`
- `@siteping/integration-issues`
- `@siteping/screenshot-storage`
- `@siteping/adapter-memory`
- `@siteping/adapter-localstorage`
- `@siteping/adapter-kit`
- `@siteping/cli`

## Hardening checklist for self-hosters

- **`apiKey` is required in production.** Starting `createSitepingHandler` (from `@siteping/server` or `@siteping/adapter-prisma`) with `NODE_ENV=production` and neither an `apiKey` nor a custom `access` policy throws at startup. Destructive endpoints (DELETE, PATCH) refuse to operate without authentication unless you explicitly opt out via `requireAuthForDestructive: false` (only safe behind your own auth middleware).
- **Set `allowedOrigins`.** Without it, no CORS headers are emitted and cross-origin browser requests are blocked. With `allowedOrigins: ["https://your-site.com"]`, only listed origins can call the API.
- **With a custom `access` policy, set `allowedOrigins` too.** `authenticate` must resolve who is calling — anything falsy answers 401. Such a policy may rely on cookies, which browsers attach to forged requests, so POST/PATCH/DELETE must send `Content-Type: application/json` (415 otherwise), and with `allowedOrigins` a mutation from an origin that is neither listed nor the endpoint's own answers 403. List every origin your widget and dashboard run on, plus your public origin behind a proxy that rewrites the request URL.
- **Keep screenshots private if they show private data.** In a public bucket or on Cloudflare Images, a screenshot is readable by anyone who has its URL: keys are random and unguessable, but URLs travel in tickets and chats. A private bucket, the filesystem or a database table served by `createScreenshotServeHandler` with `authorize` keeps them behind your login (`@siteping/screenshot-storage`).
- **Keep tracker issues private if feedback is.** `@siteping/integration-issues` copies each feedback's message, page, reviewer name, user agent and diagnostics into an issue, and embeds its screenshot from the storage URL, which `redact` does not touch. An issue in a public repository is readable by anyone. Prefer a private repository, pass a `redact` function for secrets that end up in URLs or console messages, [leave screenshots out](https://siteping.dev/docs/issue-trackers#extending-the-default-issue) if they show private data, and scope the tracker token to that one repository.
- **Rate-limit POST.** The widget submits from unauthenticated browser contexts. Apply rate limiting at the reverse proxy or middleware layer (Next.js middleware, Nginx, Cloudflare).
- **Run the CLI doctor.** `npx @siteping/cli doctor` flags missing `apiKey`, missing `allowedOrigins`, and other production red flags.

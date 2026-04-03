# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| < Latest | No       |

Only the latest published version of each `@siteping/*` package receives security updates.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, use one of the following methods:

### GitHub Security Advisory (preferred)

Report via [GitHub Security Advisories](https://github.com/NeosiaNexus/siteping/security/advisories/new). This allows private discussion and coordinated disclosure.

### Email

Send an email to **security@neosianexus.dev** with:

- A description of the vulnerability
- Steps to reproduce
- Affected package(s) and version(s)
- Impact assessment (if known)

## Response Timeline

| Step | Timeline |
|------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix or mitigation | Within 30 days (critical), 90 days (non-critical) |

## Disclosure Policy

- We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure).
- We will credit reporters in the release notes (unless you prefer to remain anonymous).
- We ask that you do not publicly disclose the vulnerability until a fix has been released.

## Scope

This policy applies to all packages in the `@siteping/*` scope:

- `@siteping/widget`
- `@siteping/adapter-prisma`
- `@siteping/cli`

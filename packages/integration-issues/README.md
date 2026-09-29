[![npm version](https://img.shields.io/npm/v/@siteping/integration-issues)](https://www.npmjs.com/package/@siteping/integration-issues)
[![Docs](https://img.shields.io/badge/docs-siteping.dev-0066ff)](https://siteping.dev/docs/issue-trackers)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

# @siteping/integration-issues

One GitHub or GitLab issue per [SitePing](https://github.com/NeosiaNexus/SitePing) feedback, opened, closed and reopened along with it through `@siteping/server` lifecycle hooks. No database column: the issue's first line links it to its feedback. Any other tracker plugs in through the `IssueTracker` interface.

**[Documentation](https://siteping.dev/docs/issue-trackers)**

## Install

```bash
npm install @siteping/integration-issues
```

Node ≥ 20, or any runtime with the Fetch API. `@siteping/server` is a peer dependency.

## Quick start

```ts
import { createSitepingHandler } from "@siteping/server";
import { createIssueTrackerHooks } from "@siteping/integration-issues";
import { createGitHubTracker } from "@siteping/integration-issues/github";
// or: import { createGitLabTracker } from "@siteping/integration-issues/gitlab";

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
  store,
  apiKey: process.env.SITEPING_API_KEY,
  hooks: createIssueTrackerHooks({
    tracker: createGitHubTracker({ repository: "acme/site", token: process.env.GITHUB_TOKEN! }),
    siteUrl: "https://acme.com", // resolves the page paths the widget records
  }),
});
```

## Documentation

Token permissions, the status mapping, what an issue contains, failure handling and custom trackers: **[siteping.dev/docs/issue-trackers](https://siteping.dev/docs/issue-trackers)**.

## License

[MIT](https://github.com/NeosiaNexus/SitePing/blob/main/LICENSE)

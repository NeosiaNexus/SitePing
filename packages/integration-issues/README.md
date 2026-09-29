# @siteping/integration-issues

Keep one tracker issue per [SitePing](https://siteping.dev) feedback, through `@siteping/server` lifecycle hooks:

- **created** → opens an issue (Markdown body: message, page, deep link, viewport, screenshot, diagnostics);
- **resolved / won't fix / reopened** → closes or reopens it;
- **deleted** → closes it with a comment. If the tracker is unreachable, the delete is aborted and can be retried.

Issues are linked to feedbacks by a hidden marker in their body — no extra database column.

```ts
import { createSitepingHandler } from "@siteping/server";
import { createIssueTrackerHooks } from "@siteping/integration-issues";
import { createGitHubTracker } from "@siteping/integration-issues/github";
// or: import { createGitLabTracker } from "@siteping/integration-issues/gitlab";

export const { GET, POST, PATCH, DELETE, OPTIONS } = createSitepingHandler({
  store,
  access,
  hooks: createIssueTrackerHooks({
    tracker: createGitHubTracker({ repository: "acme/site", token: process.env.GITHUB_TOKEN! }),
    // tracker: createGitLabTracker({ project: "acme/site", token: process.env.GITLAB_TOKEN! }),
    labels: ["feedback"],
    redact: (text) => text.replace(/token=\S+/g, "token=[redacted]"),
  }),
});
```

| Provider | Entry | Status mapping |
|---|---|---|
| GitHub (github.com, Enterprise Server via `apiBaseUrl`) | `./github` | resolved → closed as completed, won't fix → closed as not planned, open → reopened |
| GitLab (gitlab.com, self-managed via `apiBaseUrl`) | `./gitlab` | resolved / won't fix → closed, open → reopened |

Any other tracker: implement the `IssueTracker` interface and pass it as `tracker`.

Reviewer emails are left out of issues unless `includeAuthorEmail: true` — issues are often public.

MIT

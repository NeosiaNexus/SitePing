/**
 * In-memory stand-ins for the GitHub and GitLab REST APIs, injected as
 * `fetch`. They implement only the endpoints the trackers call, with the
 * request/response shapes of the real APIs, and record every request.
 */

export interface FakeIssue {
  key: string;
  title: string;
  body: string;
  labels: string[];
  isOpen: boolean;
  /** GitHub `state_reason` of the last state change, when any. */
  stateReason: string | null;
  comments: string[];
}

export interface FakeTracker {
  fetch: typeof fetch;
  issues: FakeIssue[];
  requests: Array<{ method: string; path: string; authorization: string | null }>;
  /** Make every request whose `METHOD path` matches answer with this status. */
  failWhen(pattern: RegExp, status: number): void;
  /** Drop the labels of new issues, as the real APIs do for a token without the permission. */
  dropLabels(): void;
}

type Route = (request: Request, match: RegExpMatchArray, url: URL) => Promise<Response> | Response;

function createFakeServer(
  routes: Array<[string, RegExp, Route]>,
  authorizationHeader: string,
  requiredHeaders: readonly string[] = [],
) {
  const issues: FakeIssue[] = [];
  const requests: FakeTracker["requests"] = [];
  const failures: Array<{ pattern: RegExp; status: number }> = [];
  const settings = { dropLabels: false };

  const fakeFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    requests.push({
      method: request.method,
      path: url.pathname,
      authorization: request.headers.get(authorizationHeader),
    });
    if (requiredHeaders.some((header) => !request.headers.has(header))) {
      return new Response(JSON.stringify({ message: "Request forbidden by administrative rules." }), { status: 403 });
    }
    const failure = failures.find(({ pattern }) => pattern.test(`${request.method} ${url.pathname}`));
    if (failure) return new Response(JSON.stringify({ message: "fake failure" }), { status: failure.status });
    for (const [method, pattern, route] of routes) {
      const match = url.pathname.match(pattern);
      if (request.method === method && match) return route(request, match, url);
    }
    return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
  };

  return {
    issues,
    requests,
    settings,
    fetch: fakeFetch,
    failWhen: (pattern: RegExp, status: number) => failures.push({ pattern, status }),
    dropLabels: () => {
      settings.dropLabels = true;
    },
  };
}

function page<Item>(items: Item[], url: URL): Item[] {
  const perPage = Number(url.searchParams.get("per_page") ?? "30");
  const pageNumber = Number(url.searchParams.get("page") ?? "1");
  return items.slice((pageNumber - 1) * perPage, pageNumber * perPage);
}

export function createFakeGitHub(repository: string): FakeTracker {
  const base = `/repos/${repository}/issues`;
  const escapedBase = base.replace(/[/.]/g, "\\$&");
  let server: ReturnType<typeof createFakeServer>;
  const find = (key: string | undefined) => server.issues.find((issue) => issue.key === key);
  const toGitHub = (issue: FakeIssue) => ({
    number: Number(issue.key),
    html_url: `https://github.com/${repository}/issues/${issue.key}`,
    body: issue.body,
    state: issue.isOpen ? "open" : "closed",
    labels: issue.labels.map((name) => ({ name })),
  });

  server = createFakeServer(
    [
      [
        "POST",
        new RegExp(`^${escapedBase}$`),
        async (request) => {
          const { title, body, labels } = (await request.json()) as { title: string; body: string; labels: string[] };
          const issue: FakeIssue = {
            key: String(server.issues.length + 1),
            title,
            body,
            labels: server.settings.dropLabels ? [] : labels,
            isOpen: true,
            stateReason: null,
            comments: [],
          };
          server.issues.push(issue);
          return Response.json(toGitHub(issue), { status: 201 });
        },
      ],
      [
        "GET",
        new RegExp(`^${escapedBase}$`),
        (_request, _match, url) => {
          const label = url.searchParams.get("labels");
          // Newest first, like the real API's default sort.
          const labelled = server.issues.filter((issue) => !label || issue.labels.includes(label)).reverse();
          return Response.json(page(labelled, url).map(toGitHub));
        },
      ],
      [
        "PATCH",
        new RegExp(`^${escapedBase}/(\\d+)$`),
        async (request, match) => {
          const issue = find(match[1]);
          if (!issue) return new Response(null, { status: 404 });
          const { state, state_reason } = (await request.json()) as { state: string; state_reason: string };
          issue.isOpen = state === "open";
          issue.stateReason = state_reason;
          return Response.json(toGitHub(issue));
        },
      ],
      [
        "GET",
        new RegExp(`^${escapedBase}/(\\d+)/comments$`),
        (_request, match, url) => Response.json(page(find(match[1])?.comments ?? [], url).map((body) => ({ body }))),
      ],
      [
        "POST",
        new RegExp(`^${escapedBase}/(\\d+)/comments$`),
        async (request, match) => {
          const { body } = (await request.json()) as { body: string };
          find(match[1])?.comments.push(body);
          return Response.json({ body }, { status: 201 });
        },
      ],
    ],
    "authorization",
    // `new Request` adds no User-Agent, as on runtimes without a default one.
    ["user-agent"],
  );
  return server;
}

export function createFakeGitLab(project: string): FakeTracker {
  const base = `/api/v4/projects/${encodeURIComponent(project)}/issues`;
  const escapedBase = base.replace(/[/.%]/g, "\\$&");
  let server: ReturnType<typeof createFakeServer>;
  const find = (key: string | undefined) => server.issues.find((issue) => issue.key === key);
  const toGitLab = (issue: FakeIssue) => ({
    iid: Number(issue.key),
    web_url: `https://gitlab.com/${project}/-/issues/${issue.key}`,
    description: issue.body,
    state: issue.isOpen ? "opened" : "closed",
    labels: issue.labels,
  });

  server = createFakeServer(
    [
      [
        "POST",
        new RegExp(`^${escapedBase}$`),
        async (request) => {
          const { title, description, labels } = (await request.json()) as {
            title: string;
            description: string;
            labels: string;
          };
          const issue: FakeIssue = {
            key: String(server.issues.length + 1),
            title,
            body: description,
            labels: server.settings.dropLabels ? [] : labels.split(","),
            isOpen: true,
            stateReason: null,
            comments: [],
          };
          server.issues.push(issue);
          return Response.json(toGitLab(issue), { status: 201 });
        },
      ],
      [
        "GET",
        new RegExp(`^${escapedBase}$`),
        (_request, _match, url) => {
          const label = url.searchParams.get("labels");
          // Newest first, like the real API's default sort.
          const labelled = server.issues.filter((issue) => !label || issue.labels.includes(label)).reverse();
          return Response.json(page(labelled, url).map(toGitLab));
        },
      ],
      [
        "PUT",
        new RegExp(`^${escapedBase}/(\\d+)$`),
        async (request, match) => {
          const issue = find(match[1]);
          if (!issue) return new Response(null, { status: 404 });
          const { state_event } = (await request.json()) as { state_event: string };
          issue.isOpen = state_event === "reopen";
          // GitLab records state changes as system notes.
          issue.comments.push(`system:${state_event}`);
          return Response.json(toGitLab(issue));
        },
      ],
      [
        "GET",
        new RegExp(`^${escapedBase}/(\\d+)/notes$`),
        (_request, match, url) =>
          Response.json(
            page(find(match[1])?.comments ?? [], url).map((body) => ({
              body,
              system: body.startsWith("system:"),
            })),
          ),
      ],
      [
        "POST",
        new RegExp(`^${escapedBase}/(\\d+)/notes$`),
        async (request, match) => {
          const { body } = (await request.json()) as { body: string };
          find(match[1])?.comments.push(body);
          return Response.json({ body, system: false }, { status: 201 });
        },
      ],
    ],
    "private-token",
  );
  return server;
}

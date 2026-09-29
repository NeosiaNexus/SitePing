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
  requests: Array<{ method: string; path: string; query: string; authorization: string | null }>;
  /** Make every request whose `METHOD path?query` matches answer with this status. */
  failWhen(pattern: RegExp, status: number): void;
  /** Drop the labels of new issues, as the real APIs do for a token without the permission. */
  dropLabels(): void;
  /** Make searches find nothing, like a search index that has not caught up yet. */
  lagSearch(): void;
  /** Make every request whose `METHOD path?query` matches fail at once, like a refused or reset connection. */
  disconnectWhen(pattern: RegExp): void;
  /** Never answer again, like a host that drops packets: a request only ends when its signal aborts it. */
  hang(): void;
  /** Make every request wait this long before the fake handles it, as over a network. */
  delay(ms: number): void;
  /** Hold the next request whose `METHOD path?query` matches until `release()`; `reached` settles when it arrives. */
  hold(pattern: RegExp): { reached: Promise<void>; release(): void };
}

/**
 * `fetch` to a tracker that accepts the connection and never answers: only
 * the caller's signal ends it. Not a `Request`'s own signal, which follows
 * the caller's through a weak reference and can miss the abort once the
 * `Request` is collected.
 */
export const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

type Route = (request: Request, match: RegExpMatchArray, url: URL) => Promise<Response> | Response;

function createFakeServer(
  routes: Array<[string, RegExp, Route]>,
  authorizationHeader: string,
  requiredHeaders: readonly string[] = [],
) {
  const issues: FakeIssue[] = [];
  const requests: FakeTracker["requests"] = [];
  const failures: Array<{ pattern: RegExp; status: number }> = [];
  const disconnections: RegExp[] = [];
  const holds: Array<{ pattern: RegExp; arrive(): void; released: Promise<void> }> = [];
  const settings = { dropLabels: false, searchLags: false, hangs: false, delayMs: 0 };

  const fakeFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    requests.push({
      method: request.method,
      path: url.pathname,
      query: url.search,
      authorization: request.headers.get(authorizationHeader),
    });
    const route = `${request.method} ${url.pathname}${url.search}`;
    if (disconnections.some((pattern) => pattern.test(route))) throw new TypeError("fetch failed");
    if (settings.hangs) return hangingFetch(input, init);
    if (settings.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, settings.delayMs));
    const held = holds.findIndex(({ pattern }) => pattern.test(route));
    if (held >= 0) {
      const [{ arrive, released }] = holds.splice(held, 1) as [(typeof holds)[number]];
      arrive();
      await released;
    }
    if (requiredHeaders.some((header) => !request.headers.has(header))) {
      return new Response(JSON.stringify({ message: "Request forbidden by administrative rules." }), { status: 403 });
    }
    const failure = failures.find(({ pattern }) => pattern.test(route));
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
    disconnectWhen: (pattern: RegExp) => disconnections.push(pattern),
    dropLabels: () => {
      settings.dropLabels = true;
    },
    lagSearch: () => {
      settings.searchLags = true;
    },
    hang: () => {
      settings.hangs = true;
    },
    delay: (ms: number) => {
      settings.delayMs = ms;
    },
    hold: (pattern: RegExp) => {
      let arrive = () => {};
      let release = () => {};
      const reached = new Promise<void>((resolve) => {
        arrive = resolve;
      });
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      holds.push({ pattern, arrive, released });
      return { reached, release };
    },
  };
}

/** Escapes every RegExp metacharacter, backslash included, so a repository or project path matches literally. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function page<Item>(items: Item[], url: URL): Item[] {
  const perPage = Number(url.searchParams.get("per_page") ?? "30");
  const pageNumber = Number(url.searchParams.get("page") ?? "1");
  return items.slice((pageNumber - 1) * perPage, pageNumber * perPage);
}

export function createFakeGitHub(repository: string): FakeTracker & {
  /** The repository already has this label: GitHub attaches it to a request that names it in any casing. */
  useExistingLabel(name: string): void;
} {
  const base = `/repos/${repository}/issues`;
  const escapedBase = escapeRegExp(base);
  let server: ReturnType<typeof createFakeServer>;
  const find = (key: string | undefined) => server.issues.find((issue) => issue.key === key);
  // GitHub matches label names case-insensitively and answers with the repository's casing.
  const existingLabels: string[] = [];
  const sameLabel = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const hasLabel = (issue: FakeIssue, name: string) => issue.labels.some((label) => sameLabel(label, name));
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
        "GET",
        /^\/search\/issues$/,
        (_request, _match, url) => {
          const query = url.searchParams.get("q") ?? "";
          const label = query.match(/label:(\S+)/)?.[1];
          const phrase = query.match(/"([^"]*)"/)?.[1] ?? "";
          const scoped = query.includes(`repo:${repository} `) && query.includes("in:body");
          const items = server.settings.searchLags || !scoped || !label ? [] : [...server.issues].reverse();
          const found = items.filter((issue) => hasLabel(issue, label ?? "") && issue.body.includes(phrase));
          return Response.json({
            total_count: found.length,
            incomplete_results: false,
            items: page(found, url).map(toGitHub),
          });
        },
      ],
      [
        "POST",
        new RegExp(`^${escapedBase}$`),
        async (request) => {
          const { title, body, labels } = (await request.json()) as { title: string; body: string; labels: string[] };
          const issue: FakeIssue = {
            key: String(server.issues.length + 1),
            title,
            body,
            labels: server.settings.dropLabels
              ? []
              : labels.map((name) => existingLabels.find((existing) => sameLabel(existing, name)) ?? name),
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
          // Like the real API: open issues unless `state` says otherwise, newest first.
          const state = url.searchParams.get("state") ?? "open";
          const listed = server.issues
            .filter((issue) => !label || hasLabel(issue, label))
            .filter((issue) => state === "all" || (state === "open") === issue.isOpen)
            .reverse();
          return Response.json(page(listed, url).map(toGitHub));
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
  return { ...server, useExistingLabel: (name) => existingLabels.push(name) };
}

export function createFakeGitLab(project: string): FakeTracker {
  const base = `/api/v4/projects/${encodeURIComponent(project)}/issues`;
  const escapedBase = escapeRegExp(base);
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
          const search = url.searchParams.get("search");
          if (search !== null && (server.settings.searchLags || url.searchParams.get("in") !== "description")) {
            return Response.json([]);
          }
          // Newest first, like the real API's default sort.
          const labelled = server.issues
            .filter((issue) => (!label || issue.labels.includes(label)) && issue.body.includes(search ?? ""))
            .reverse();
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
          const { body: sent } = (await request.json()) as { body: string };
          // GitLab stores a note as its quick-action parser leaves it: without `\r`, trailing whitespace trimmed.
          const body = sent.replaceAll("\r", "").trimEnd();
          find(match[1])?.comments.push(body);
          return Response.json({ body, system: false }, { status: 201 });
        },
      ],
    ],
    "authorization",
  );
  return server;
}

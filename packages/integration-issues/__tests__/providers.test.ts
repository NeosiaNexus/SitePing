import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import type { IssueTracker } from "../src/index.js";
import { createGitHubTracker } from "../src/providers/github.js";
import { createGitLabTracker } from "../src/providers/gitlab.js";
import { hangingFetch } from "./fake-trackers.js";

const TOKEN = "tracker-secret-token";

interface TrackerOptions {
  token: string;
  apiBaseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  maxListedPages?: number;
}

const providers: Array<[string, (options: TrackerOptions) => IssueTracker]> = [
  ["GitHub", (options) => createGitHubTracker({ repository: "acme/site", ...options })],
  ["GitLab", (options) => createGitLabTracker({ project: "acme/site", ...options })],
];

const servers: Array<ReturnType<typeof createServer>> = [];

/** A local HTTP server; its origin differs from any other's by the port. */
async function listen(answer: (url: string, headers: IncomingHttpHeaders) => [number, Record<string, string>, string]) {
  const server = createServer((request, response) => {
    const [status, headers, body] = answer(request.url ?? "", request.headers);
    response.writeHead(status, headers).end(body);
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    server.close();
  }
});

for (const [name, createTracker] of providers) {
  describe(`${name} tracker`, () => {
    it("refuses a token no header can carry, without echoing it", () => {
      for (const token of ["", " \n", "SECRET\u200B", "SECRET\nsecond", "SECRET\rsecond", "SE CRET", "SECRET\0"]) {
        expect(() => createTracker({ token })).toThrow(/token must be a non-empty string of visible ASCII/);
        expect(() => createTracker({ token })).not.toThrow(/SECRET/);
      }
    });

    it("refuses option values that would fail every request, or silently list nothing", () => {
      const refused = [
        [{ apiBaseUrl: "github.acme.test/api/v3" }, /apiBaseUrl must be an absolute http\(s\) URL/],
        [{ apiBaseUrl: "ftp://acme.test" }, /apiBaseUrl/],
        [{ timeoutMs: Number("5s") }, /timeoutMs must be a positive integer, got NaN/],
        [{ timeoutMs: 0 }, /timeoutMs/],
        [{ timeoutMs: 2.5 }, /timeoutMs/],
        // Timers fire a longer delay at once.
        [{ timeoutMs: 2 ** 31 }, /timeoutMs must be at most 2147483647, got 2147483648/],
        [{ maxListedPages: Number("ten") }, /maxListedPages must be a positive integer, got NaN/],
        [{ maxListedPages: -1 }, /maxListedPages/],
      ] as const;

      for (const [options, error] of refused) {
        expect(() => createTracker({ token: TOKEN, ...options })).toThrow(error);
      }
      expect(() =>
        createTracker({ token: TOKEN, apiBaseUrl: "https://acme.test/api", timeoutMs: 1, maxListedPages: 1 }),
      ).not.toThrow();
      expect(() => createTracker({ token: TOKEN, timeoutMs: 2 ** 31 - 1 })).not.toThrow();
    });

    it("refuses an apiBaseUrl carrying credentials, without echoing them", () => {
      // fetch would refuse it on every call, quoting it in an error the handler logs.
      const apiBaseUrl = "https://ci:SECRET@tracker.acme.test/api";

      expect(() => createTracker({ token: TOKEN, apiBaseUrl })).toThrow(/apiBaseUrl must not carry credentials/);
      expect(() => createTracker({ token: TOKEN, apiBaseUrl })).not.toThrow(/SECRET/);
    });

    it("gives up on a request after timeoutMs", async () => {
      const tracker = createTracker({ token: TOKEN, fetch: hangingFetch, timeoutMs: 20 });

      await expect(tracker.listComments({ key: "1", url: "" })).rejects.toMatchObject({
        code: "ISSUE_TRACKER_REQUEST_FAILED",
        status: null,
      });
    }, 1_000);

    it("sends a token read with a trailing line break, trimmed", async () => {
      const authorization: Array<string | null> = [];
      const tracker = createTracker({
        token: `${TOKEN}\n`,
        fetch: async (input, init) => {
          authorization.push(new Request(input, init).headers.get("authorization"));
          return Response.json([]);
        },
      });

      await tracker.listComments({ key: "1", url: "" });

      expect(authorization).toEqual([`Bearer ${TOKEN}`]);
    });

    it("never forwards its token across a cross-origin redirect", async () => {
      const received: IncomingHttpHeaders[] = [];
      const elsewhere = await listen((_url, headers) => {
        received.push(headers);
        return [200, { "Content-Type": "application/json" }, "[]"];
      });
      const sent: IncomingHttpHeaders[] = [];
      const apiBaseUrl = await listen((url, headers) => {
        sent.push(headers);
        return [302, { Location: `${elsewhere}${url}` }, ""];
      });

      await createTracker({ token: TOKEN, apiBaseUrl }).listComments({ key: "1", url: "" });

      expect(JSON.stringify(sent)).toContain(TOKEN);
      expect(received).toHaveLength(1);
      expect(JSON.stringify(received)).not.toContain(TOKEN);
    });
  });
}

describe("repository and project", () => {
  it("refuses a GitHub repository that is not owner/name", () => {
    for (const repository of ["", "acme", "acme/site/", "acme/site.git", "https://github.com/acme/site"]) {
      expect(() => createGitHubTracker({ repository, token: TOKEN })).toThrow(/repository must be "owner\/name"/);
    }
    for (const repository of ["acme/site", "acme-corp/acme.github.io", "acme_emu/site_2"]) {
      expect(() => createGitHubTracker({ repository, token: TOKEN })).not.toThrow();
    }
  });

  it("refuses a GitLab project that is neither an id nor a full path", () => {
    for (const project of ["", "site", "acme/site.git", "https://gitlab.com/acme/site", 0, 1.5, Number.NaN]) {
      expect(() => createGitLabTracker({ project, token: TOKEN })).toThrow(
        /project must be a numeric id or a full path/,
      );
    }
    for (const project of ["acme/site", "acme/web/site.v2", "42", 42]) {
      expect(() => createGitLabTracker({ project, token: TOKEN })).not.toThrow();
    }
  });
});

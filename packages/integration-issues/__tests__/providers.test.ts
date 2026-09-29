import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import type { IssueTracker } from "../src/index.js";
import { createGitHubTracker } from "../src/providers/github.js";
import { createGitLabTracker } from "../src/providers/gitlab.js";

const TOKEN = "tracker-secret-token";

interface TrackerOptions {
  token: string;
  apiBaseUrl?: string;
  fetch?: typeof fetch;
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

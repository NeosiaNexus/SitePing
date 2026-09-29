import type { AnnotationRecord, FeedbackRecord } from "@siteping/core";
import { fromMarkdown } from "mdast-util-from-markdown";
import { describe, expect, it } from "vitest";
import { buildIssueMarker, formatIssue, type IssueFormatOptions, parseIssueMarker } from "../src/core/issue-format.js";

describe("issue marker", () => {
  it("round-trips ids and project names with characters that need escaping", () => {
    const link = { feedbackId: 'id-with-"quotes"', projectName: "Site --> <!-- tricky" };

    expect(parseIssueMarker(`${buildIssueMarker(link)}\n\nBody text`)).toEqual(link);
  });

  it("keeps a hostile project name inside the marker's HTML comment", () => {
    const link = { feedbackId: "fb-1", projectName: "x --> @octocat <img src=x> --!> <!-->" };
    const marker = buildIssueMarker(link);

    // An HTML comment can only end at a `>`: the marker's must be its last character.
    expect(marker.indexOf(">")).toBe(marker.length - 1);
    expect(marker.lastIndexOf("<")).toBe(0);
    expect(parseIssueMarker(marker)).toEqual(link);
  });

  it("reads the first line only, whatever the line endings", () => {
    const link = { feedbackId: "fb-1", projectName: "site" };
    const marker = buildIssueMarker(link);

    expect(parseIssueMarker(`${marker}\r\n\r\nBody edited on the tracker`)).toEqual(link);
    expect(parseIssueMarker(`Visitor text\n\n${marker}`)).toBeNull();
    expect(parseIssueMarker(`Visitor text ${marker}`)).toBeNull();
  });

  it("treats missing, truncated or malformed markers as absent", () => {
    expect(parseIssueMarker("An issue written by hand")).toBeNull();
    expect(parseIssueMarker('<!-- siteping-feedback {"id":"a" -->')).toBeNull();
    expect(parseIssueMarker('<!-- siteping-feedback {"id":1,"project":"site"} -->')).toBeNull();
    expect(parseIssueMarker('<!-- siteping-feedback {"id":} -->')).toBeNull();
  });
});

const options: IssueFormatOptions = { redact: (text) => text, deepLinkParam: "siteping", includeAuthorEmail: false };

const record = (overrides: Partial<FeedbackRecord> = {}): FeedbackRecord => ({
  id: "fb-1",
  type: "bug",
  message: "The button is broken",
  status: "open",
  projectName: "site",
  url: "https://example.com/checkout",
  urlPattern: null,
  authorName: "Alice",
  authorEmail: "alice@example.com",
  viewport: "1280x720",
  userAgent: "Mozilla/5.0",
  clientId: "client-1",
  resolvedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  annotations: [],
  screenshotUrl: null,
  screenshotRegion: null,
  diagnostics: null,
  ...overrides,
});

const annotation = (overrides: Partial<AnnotationRecord> = {}): AnnotationRecord => ({
  id: "an-1",
  feedbackId: "fb-1",
  cssSelector: "#checkout > button.pay",
  xpath: "/html/body/main/button",
  textSnippet: "Pay now",
  elementTag: "button",
  elementId: null,
  textPrefix: "",
  textSuffix: "",
  fingerprint: "",
  neighborText: "",
  anchorKey: null,
  xPct: 0,
  yPct: 0,
  wPct: 1,
  hPct: 1,
  scrollX: 0,
  scrollY: 0,
  viewportW: 1280,
  viewportH: 720,
  devicePixelRatio: 1,
  createdAt: new Date(0),
  ...overrides,
});

interface MarkdownNode {
  type: string;
  value?: string;
  url?: string;
  children?: MarkdownNode[];
}

/**
 * What a CommonMark parser leaves live in the body: the text and raw HTML
 * outside code, where trackers resolve mentions and references, plus every
 * link and image target.
 */
function liveMarkdown(body: string) {
  const live = { text: [] as string[], links: [] as string[], images: [] as string[] };
  const walk = (node: MarkdownNode): void => {
    if (node.type === "code" || node.type === "inlineCode") return;
    if (node.type === "link" && node.url) return void live.links.push(node.url);
    if (node.type === "image" && node.url) live.images.push(node.url);
    if (node.value !== undefined) live.text.push(node.value);
    node.children?.forEach(walk);
  };
  walk(fromMarkdown(body) as MarkdownNode);
  return { ...live, text: live.text.join("\n") };
}

describe("formatIssue", () => {
  const payloads = [
    "@octocat",
    "@acme/maintainers",
    "#12",
    "acme/site#34",
    "<!-- the rest is hidden",
    "![pixel](https://tracker.test/pixel.png)",
    "[reset your password](javascript:alert(1))",
    "<img src=x onerror=alert(1)>",
    "# Heading",
    "---",
  ];
  const leaks = ["octocat", "maintainers", "#12", "#34", "<!--", "tracker.test", "javascript:", "<img", "Heading"];

  it("quotes a hostile message so nothing in it renders, however it plays with backticks", () => {
    const message = ["````", ...payloads, "```", "``` @octocat", "~~~", "    @octocat"].join("\n");

    const { body } = formatIssue(record({ message }), options);
    const live = liveMarkdown(body);

    for (const leak of leaks) expect(live.text).not.toContain(leak);
    expect(live.links).toEqual(["https://example.com/checkout?siteping=fb-1"]);
    expect(live.images).toEqual([]);
    expect(body).toContain(`\`\`\`\`\`text\n${message}\n\`\`\`\`\``);
  });

  for (const backticks of ["", " `` `"]) {
    it(`quotes every single-line field on one line (${backticks ? "with" : "without"} backticks)`, () => {
      const hostile = (label: string) => `${label} ${payloads.join("\n")}${backticks}`;

      const { body } = formatIssue(
        record({
          authorName: hostile("name"),
          userAgent: hostile("agent"),
          viewport: hostile("viewport"),
          url: `/checkout?q=${hostile("url")}`,
        }),
        { ...options, includeAuthorEmail: true },
      );
      const live = liveMarkdown(body);

      for (const leak of leaks) expect(live.text).not.toContain(leak);
      expect(live.links).toEqual([]);
      expect(live.images).toEqual([]);
    });
  }

  it("quotes console messages and network URLs from the diagnostics", () => {
    const diagnostics: FeedbackRecord["diagnostics"] = {
      console: [{ level: "error", timestamp: "t", message: payloads.join("\n") }],
      network: [
        { url: `https://api.test/${payloads.join(" ")}`, method: "GET", status: 500, durationMs: 12, timestamp: "t" },
      ],
    };

    const live = liveMarkdown(formatIssue(record({ diagnostics }), options).body);

    for (const leak of leaks) expect(live.text).not.toContain(leak);
  });

  it("defuses mentions and references in the title", () => {
    const { title } = formatIssue(
      record({ message: "Ping @octocat and @acme/maintainers about #12\nplease" }),
      options,
    );

    expect(title).toBe("[SitePing] Ping @\u200Boctocat and @\u200Bacme/maintainers about #\u200B12 please");
  });

  it("lists where each annotation points, quoted as code", () => {
    const annotations = [
      annotation({ textSnippet: "Pay @octocat for #12" }),
      annotation({ elementTag: "img", cssSelector: "main > img:nth-child(2)", textSnippet: "" }),
    ];

    const { body } = formatIssue(record({ annotations }), options);

    expect(body).toContain(
      [
        "## Annotations",
        "",
        "- Element `button`, selector `#checkout > button.pay`, text `Pay @octocat for #12`",
        "- Element `img`, selector `main > img:nth-child(2)`",
      ].join("\n"),
    );
    expect(liveMarkdown(body).text).not.toContain("octocat");
  });

  it("caps the annotation list so the body stays under GitHub's 65,536-character limit", () => {
    const annotations = Array.from({ length: 50 }, () =>
      annotation({ cssSelector: "div > ".repeat(333), textSnippet: "x".repeat(500) }),
    );
    const diagnostics: FeedbackRecord["diagnostics"] = {
      console: Array.from({ length: 50 }, () => ({
        level: "error" as const,
        timestamp: "t",
        message: "m".repeat(600),
      })),
      network: Array.from({ length: 20 }, () => ({
        url: `https://api.test/${"p".repeat(1980)}`,
        method: "GET",
        status: 500,
        durationMs: 1,
        timestamp: "t",
      })),
    };

    const { body } = formatIssue(
      record({
        annotations,
        diagnostics,
        message: "`".repeat(5000),
        url: `https://acme.test/${"u".repeat(1980)}`,
        userAgent: "a".repeat(500),
        authorName: "n".repeat(200),
      }),
      { ...options, includeAuthorEmail: true },
    );

    expect(body.match(/^- Element /gm)).toHaveLength(10);
    expect(body).toContain("- and 40 more");
    expect(body).toContain(`\`${"x".repeat(297)}...\``);
    expect(body.length).toBeLessThan(65_536);
  });

  it("resolves the widget's default pathname URL against siteUrl", () => {
    const { body } = formatIssue(record({ url: "/checkout?step=2" }), { ...options, siteUrl: "https://acme.test" });

    expect(liveMarkdown(body).links).toEqual(["https://acme.test/checkout?step=2&siteping=fb-1"]);
    expect(body).toContain("## Page\n\n`https://acme.test/checkout?step=2`");
  });

  it("shows a bare path and no deep link without siteUrl", () => {
    const { body } = formatIssue(record({ url: "/checkout" }), options);

    expect(liveMarkdown(body).links).toEqual([]);
    expect(body).toContain("## Page\n\n`/checkout`");
  });

  it("never links a non-http(s) page URL", () => {
    const { body } = formatIssue(record({ url: "javascript:alert(1)" }), { ...options, siteUrl: "https://acme.test" });

    expect(liveMarkdown(body).links).toEqual([]);
    expect(body).not.toContain("## Open in the page");
  });

  it("embeds https screenshots only", () => {
    const embedded = (screenshotUrl: string) =>
      liveMarkdown(formatIssue(record({ screenshotUrl }), options).body).images;

    expect(embedded("https://cdn.test/shots/a (1).png")).toEqual(["https://cdn.test/shots/a%20(1).png"]);
    expect(embedded("data:image/jpeg;base64,AAAA")).toEqual([]);
    expect(embedded("http://cdn.test/shots/a.png")).toEqual([]);
  });

  it("redacts the author name along with the rest of the free text", () => {
    const redact = (text: string) => text.replace(/token=\S+/g, "token=[redacted]");

    const { title, body } = formatIssue(
      record({ message: "Fails with token=m", authorName: "Bob token=a", userAgent: "UA token=u", url: "/p?token=p" }),
      { ...options, redact },
    );

    expect(`${title}\n${body}`).not.toMatch(/token=(?!\[redacted\])/);
  });
});

import type { AnnotationRecord, FeedbackRecord } from "@siteping/core";
import { buildIssueMarker, formatIssue } from "./src/core/issue-format.ts";

const bt = (n: number) => "`".repeat(n);
const annotation = (): AnnotationRecord => ({
  id: "an-1",
  feedbackId: "fb-1",
  cssSelector: bt(2000),
  xpath: "/x",
  textSnippet: bt(500),
  elementTag: bt(191),
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
  viewportW: 1,
  viewportH: 1,
  devicePixelRatio: 1,
  createdAt: new Date(0),
});
const record: FeedbackRecord = {
  id: "cmabcdefghijklmnopqrstuvw",
  type: "bug",
  message: bt(5000),
  status: "open",
  projectName: "<".repeat(200),
  url: `https://a.b/?${bt(2000 - 13)}`,
  urlPattern: null,
  authorName: bt(200),
  authorEmail: "a@b.co",
  viewport: bt(50),
  userAgent: bt(500),
  clientId: "c",
  resolvedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  annotations: Array.from({ length: 50 }, annotation),
  screenshotUrl: null,
  screenshotRegion: null,
  diagnostics: {
    console: Array.from({ length: 50 }, () => ({ level: "error" as const, timestamp: "t", message: bt(600) })),
    network: Array.from({ length: 20 }, () => ({
      url: bt(2000),
      method: bt(20),
      status: 599,
      durationMs: 600000,
      timestamp: "t",
    })),
  },
};
for (const email of [false, true]) {
  const { body } = formatIssue(record, {
    redact: (t) => t,
    deepLinkParam: "siteping",
    includeAuthorEmail: email,
    siteUrl: "https://acme.test",
  });
  const marker = buildIssueMarker({ feedbackId: record.id, projectName: record.projectName });
  console.log({ email, body: body.length, total: `${marker}\n\n${body}`.length });
  for (const part of body.split(/\n\n(?=## )/)) console.log(part.slice(0, 30).replace(/\n/g, " "), part.length);
}

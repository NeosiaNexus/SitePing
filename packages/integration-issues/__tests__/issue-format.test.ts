import { describe, expect, it } from "vitest";
import { buildIssueMarker, parseIssueMarker } from "../src/core/issue-format.js";

describe("issue marker", () => {
  it("round-trips ids and project names with characters that need escaping", () => {
    const link = { feedbackId: 'id-with-"quotes"', projectName: "Site --> <!-- tricky" };

    expect(parseIssueMarker(`${buildIssueMarker(link)}\n\nBody text`)).toEqual(link);
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
  });
});

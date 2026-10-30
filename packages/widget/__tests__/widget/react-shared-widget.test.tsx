// @vitest-environment jsdom

import { MemoryStore } from "@siteping/adapter-memory";
import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { useSiteping } from "../../src/react.js";

// The real launcher behind the hook (react.test.tsx mocks it), in store mode
// so nothing touches the network.

const store = new MemoryStore();

function Consumer(): null {
  useSiteping({ projectName: "shared-widget", store, forceShow: true });
  return null;
}

const widgets = () => document.querySelectorAll("siteping-widget").length;
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

describe("useSiteping with several consumers (#366)", () => {
  it("keeps the widget while another consumer is mounted", async () => {
    const a = render(<Consumer />);
    const b = render(<Consumer />);
    await settle();
    expect(widgets()).toBe(1);

    a.unmount();
    await settle();
    expect(widgets()).toBe(1);

    b.unmount();
    await settle();
    expect(widgets()).toBe(0);
  });

  it("survives a StrictMode double mount next to another consumer", async () => {
    const a = render(
      <StrictMode>
        <Consumer />
      </StrictMode>,
    );
    const b = render(<Consumer />);
    await settle();
    expect(widgets()).toBe(1);

    b.unmount();
    await settle();
    expect(widgets()).toBe(1);

    a.unmount();
    await settle();
    expect(widgets()).toBe(0);
  });
});

/**
 * Type-level locks for the dashboard's public API surface (vitest typecheck
 * mode — never executed).
 */

import type { SitepingStore } from "@siteping/core";
import { describe, expectTypeOf, it } from "vitest";
import type { InboxSource, InboxState, SitepingInboxProps, UseSitepingInboxOptions } from "../../src/types.js";
import { useSitepingInbox } from "../../src/use-inbox.js";

declare const store: SitepingStore;
declare const source: InboxSource;

describe("UseSitepingInboxOptions XOR union", () => {
  it("accepts each source mode on its own", () => {
    expectTypeOf({ projects: "p", source }).toExtend<UseSitepingInboxOptions>();
    expectTypeOf({ projects: "p", store }).toExtend<UseSitepingInboxOptions>();
    expectTypeOf({ projects: "p", endpoint: "/api", apiKey: "k" }).toExtend<UseSitepingInboxOptions>();
  });

  it("rejects no source and mixed sources", () => {
    // @ts-expect-error — one of source/store/endpoint is required
    useSitepingInbox({ projects: "p" });

    // @ts-expect-error — store and endpoint are mutually exclusive
    useSitepingInbox({ projects: "p", store, endpoint: "/api" });

    // @ts-expect-error — apiKey is endpoint-mode only
    useSitepingInbox({ projects: "p", store, apiKey: "leaked" });
  });
});

describe("InboxState", () => {
  it("exposes the derived view discriminant", () => {
    expectTypeOf<InboxState["view"]>().toEqualTypeOf<"loading" | "error" | "empty" | "ready">();
  });
});

describe("SitepingInboxProps", () => {
  it("combines source modes with presentation props", () => {
    expectTypeOf({ projects: "p", store, theme: "dark" as const }).toExtend<SitepingInboxProps>();

    // @ts-expect-error — "sepia" is not an InboxTheme
    const badTheme: SitepingInboxProps = { projects: "p", store, theme: "sepia" };
    void badTheme;
  });
});

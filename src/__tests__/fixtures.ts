export const validAnnotation = {
  anchor: {
    cssSelector: "div.main > section:nth-child(2)",
    xpath: "/html/body/div[1]/section[2]",
    textSnippet: "Welcome to our platform",
    elementTag: "SECTION",
    elementId: "hero",
    textPrefix: "Navigation links here",
    textSuffix: "Learn more about us",
    fingerprint: "3:1:a1b2c3",
    neighborText: "Previous section | Next section",
  },
  rect: { xPct: 0.1, yPct: 0.2, wPct: 0.5, hPct: 0.3 },
  scrollX: 0,
  scrollY: 150,
  viewportW: 1920,
  viewportH: 1080,
  devicePixelRatio: 2,
};

export const validPayload = {
  projectName: "test-project",
  type: "bug" as const,
  message: "The button is misaligned",
  url: "https://example.com/page",
  viewport: "1920x1080",
  userAgent: "Mozilla/5.0",
  authorName: "Alice",
  authorEmail: "alice@example.com",
  annotations: [validAnnotation],
  clientId: "uuid-123",
};

export const validPayloadNoAnnotations = {
  ...validPayload,
  annotations: [] as typeof validPayload.annotations,
};

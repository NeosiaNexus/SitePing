import type { MemoryStore } from "@siteping/adapter-memory";
import type { AnnotationCreateInput, DiagnosticsSnapshot, FeedbackStatus, FeedbackType } from "@siteping/core";
import { SEED_SCREENSHOTS } from "./seed-screenshots";

/**
 * Seeds the demo MemoryStore with a realistic triage backlog so the inbox at
 * /demo/inbox has something to show. The scenario: "Horizon Studio" (the fake
 * agency site at /demo) is a client reviewing their in-progress website; the
 * "landing" project collects dogfood feedback from the SitePing landing page.
 *
 * Records are created oldest-first because MemoryStore lists in insertion
 * order (newest unshifted to the head). Timestamps are back-dated by mutating
 * the returned records — MemoryStore hands back live references, which is
 * exactly what a demo seed wants.
 */

interface Seed {
  clientId: string;
  projectName: "demo" | "landing";
  url: string;
  type: FeedbackType;
  status: FeedbackStatus;
  message: string;
  authorName: string;
  authorEmail: string;
  viewport: string;
  userAgent: string;
  /** Minutes before "now" the feedback was created. */
  ageMinutes: number;
  /** Minutes before "now" the feedback was closed (resolved / wont_fix). */
  closedMinutes?: number;
  annotation?: Partial<AnnotationCreateInput>;
  diagnostics?: DiagnosticsSnapshot;
}

const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const WIN_FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0";
const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const BASE_ANNOTATION: AnnotationCreateInput = {
  cssSelector: "",
  xpath: "",
  textSnippet: "",
  elementTag: "DIV",
  textPrefix: "",
  textSuffix: "",
  fingerprint: "0:0:seed",
  neighborText: "",
  xPct: 0.05,
  yPct: 0.05,
  wPct: 0.9,
  hPct: 0.9,
  scrollX: 0,
  scrollY: 0,
  viewportW: 1440,
  viewportH: 900,
  devicePixelRatio: 2,
};

function minutesAgoIso(minutes: number, offsetSeconds = 0): string {
  return new Date(Date.now() - minutes * 60_000 + offsetSeconds * 1000).toISOString();
}

// Oldest first — see module comment. Built per call so diagnostics timestamps
// stay aligned with the re-derived createdAt on every 10-minute reset.
function buildSeeds(): Seed[] {
  return [
    {
      clientId: "seed-demo-video-cards",
      projectName: "demo",
      url: "/demo",
      type: "change",
      status: "wont_fix",
      message:
        "Could each project card autoplay a short video on hover? Saw it on an awards site and it looked impressive.",
      authorName: "Marcus Webb",
      authorEmail: "marcus@horizonstudio.example",
      viewport: "1728x1024",
      userAgent: MAC_CHROME,
      ageMinutes: 60 * 24 * 6,
      closedMinutes: 60 * 24 * 4,
      annotation: {
        cssSelector: "#work .grid",
        xpath: "//section[@id='work']//div[contains(@class,'grid')]",
        textSnippet: "Luminary App Mobile App Vertex SaaS Web Platform Greenfield Co.",
        elementTag: "DIV",
        textPrefix: "we are proud to have been",
        textSuffix: "What our clients say",
        neighborText: "Selected Work",
        xPct: 0.02,
        yPct: 0.03,
        wPct: 0.96,
        hPct: 0.55,
        scrollY: 1650,
      },
    },
    {
      clientId: "seed-demo-cards-jump",
      projectName: "demo",
      url: "/demo",
      type: "bug",
      status: "resolved",
      message: "The service cards jump around when I tap them on my iPad — the hover shadow flickers on and off.",
      authorName: "Priya Anand",
      authorEmail: "priya@horizonstudio.example",
      viewport: "1024x1366",
      userAgent: IPAD_SAFARI,
      ageMinutes: 60 * 24 * 5,
      closedMinutes: 60 * 24 * 2,
      annotation: {
        cssSelector: "#services .grid > div:nth-of-type(1)",
        xpath: "//section[@id='services']//div[contains(@class,'grid')]/div[1]",
        textSnippet: "Web Design Beautiful, responsive websites tailored to your brand",
        elementTag: "DIV",
        textPrefix: "to bring your vision to life.",
        textSuffix: "Development",
        neighborText: "Development Scalable applications",
        xPct: 0.0,
        yPct: 0.0,
        wPct: 1.0,
        hPct: 1.0,
        scrollY: 900,
        viewportW: 1024,
        viewportH: 1366,
      },
    },
    {
      clientId: "seed-demo-twitter-icon",
      projectName: "demo",
      url: "/demo",
      type: "question",
      status: "resolved",
      message: "Do we really need the Twitter icon in the footer? We haven't posted there in two years.",
      authorName: "Marcus Webb",
      authorEmail: "marcus@horizonstudio.example",
      viewport: "1728x1024",
      userAgent: MAC_CHROME,
      ageMinutes: 60 * 24 * 4,
      closedMinutes: 60 * 24 * 3,
      annotation: {
        cssSelector: "footer a[aria-label='Twitter']",
        xpath: "//footer//a[@aria-label='Twitter']",
        textSnippet: "Twitter",
        elementTag: "A",
        textPrefix: "All rights reserved.",
        textSuffix: "LinkedIn",
        neighborText: "LinkedIn GitHub",
        xPct: 0,
        yPct: 0,
        wPct: 1,
        hPct: 1,
        scrollY: 4200,
      },
    },
    {
      clientId: "seed-demo-cta-swap",
      projectName: "demo",
      url: "/demo",
      type: "change",
      status: "resolved",
      message: 'Make "View our work" the filled blue button and "Our services" the outlined one — work should win.',
      authorName: "Claire Fontaine",
      authorEmail: "claire@horizonstudio.example",
      viewport: "1440x900",
      userAgent: MAC_CHROME,
      ageMinutes: 60 * 24 * 3,
      closedMinutes: 60 * 24 * 2,
      annotation: {
        cssSelector: ".mt-10.flex.flex-wrap",
        xpath: "//section[1]//div[contains(@class,'mt-10')]",
        textSnippet: "View our work Our services",
        elementTag: "DIV",
        textPrefix: "we handle every pixel.",
        textSuffix: "What we do",
        neighborText: "Digital agency",
        xPct: 0.28,
        yPct: 0.1,
        wPct: 0.44,
        hPct: 0.8,
        scrollY: 300,
      },
    },
    {
      clientId: "seed-landing-pricing",
      projectName: "landing",
      url: "/",
      type: "change",
      status: "wont_fix",
      message: "Have you considered a pricing section? Most tools have one — even just to say it's free.",
      authorName: "Jonas Berg",
      authorEmail: "jonas@webagency.example",
      viewport: "1920x1080",
      userAgent: WIN_FIREFOX,
      ageMinutes: 60 * 24 * 2,
      closedMinutes: 60 * 24,
      annotation: {
        cssSelector: "#comparison",
        xpath: "//section[@id='comparison']",
        textSnippet: "SitePing Marker.io BugHerd Pricing Free & open source",
        elementTag: "SECTION",
        textPrefix: "How it works",
        textSuffix: "FAQ",
        neighborText: "Comparison",
        xPct: 0.05,
        yPct: 0.8,
        wPct: 0.9,
        hPct: 0.15,
        scrollY: 3200,
        viewportW: 1920,
        viewportH: 1080,
      },
    },
    {
      clientId: "seed-demo-elena-quote",
      projectName: "demo",
      url: "/demo",
      type: "change",
      status: "in_progress",
      message: "Elena sent a shorter version of her quote by email last week — please swap it in before launch.",
      authorName: "Claire Fontaine",
      authorEmail: "claire@horizonstudio.example",
      viewport: "1440x900",
      userAgent: MAC_CHROME,
      ageMinutes: 60 * 26,
      annotation: {
        cssSelector: "#about blockquote:nth-of-type(3)",
        xpath: "//section[@id='about']//blockquote[3]",
        textSnippet: "The rebrand they delivered increased our conversion rate by 40%.",
        elementTag: "BLOCKQUOTE",
        textPrefix: "beyond expectations.",
        textSuffix: "Get in touch",
        neighborText: "Elena Rossi Marketing Director",
        xPct: 0.04,
        yPct: 0.15,
        wPct: 0.92,
        hPct: 0.4,
        scrollY: 2600,
      },
    },
    {
      clientId: "seed-demo-nav-zoom",
      projectName: "demo",
      url: "/demo",
      type: "bug",
      status: "open",
      message: "At 150% browser zoom the Contact button in the nav wraps under the logo and everything shifts down.",
      authorName: "Priya Anand",
      authorEmail: "priya@horizonstudio.example",
      viewport: "1280x800",
      userAgent: WIN_FIREFOX,
      ageMinutes: 60 * 25,
      annotation: {
        cssSelector: "nav a[href='#contact']",
        xpath: "//nav//a[@href='#contact']",
        textSnippet: "Contact",
        elementTag: "A",
        textPrefix: "About",
        textSuffix: "Digital agency",
        neighborText: "Work Services About",
        xPct: 0,
        yPct: 0,
        wPct: 1,
        hPct: 1,
        viewportW: 1280,
        viewportH: 800,
      },
    },
    {
      clientId: "seed-landing-copy-button",
      projectName: "landing",
      url: "/",
      type: "bug",
      status: "in_progress",
      message: 'The install snippet button flashes "Copied" but my clipboard stays empty on Firefox.',
      authorName: "Ana Souza",
      authorEmail: "ana@freelance.example",
      viewport: "1920x1080",
      userAgent: WIN_FIREFOX,
      ageMinutes: 60 * 22,
      annotation: {
        cssSelector: "#how-it-works",
        xpath: "//section[@id='how-it-works']",
        textSnippet: "How it works",
        elementTag: "SECTION",
        textPrefix: "Features",
        textSuffix: "Comparison",
        neighborText: "npm install @siteping/widget @siteping/adapter-prisma",
        xPct: 0.3,
        yPct: 0.4,
        wPct: 0.4,
        hPct: 0.12,
        scrollY: 2100,
        viewportW: 1920,
        viewportH: 1080,
      },
      diagnostics: {
        console: [
          {
            level: "error",
            timestamp: minutesAgoIso(60 * 22, -40),
            message: "NotAllowedError: Clipboard write was blocked due to lack of user activation.",
          },
        ],
        network: [],
      },
    },
    {
      clientId: "seed-demo-maintenance-q",
      projectName: "demo",
      url: "/demo",
      type: "question",
      status: "in_progress",
      message: 'Under "Development" — does that include maintenance after launch? Clients keep asking us.',
      authorName: "Marcus Webb",
      authorEmail: "marcus@horizonstudio.example",
      viewport: "1728x1024",
      userAgent: MAC_CHROME,
      ageMinutes: 60 * 7,
      annotation: {
        cssSelector: "#services .grid > div:nth-of-type(2)",
        xpath: "//section[@id='services']//div[contains(@class,'grid')]/div[2]",
        textSnippet: "Development Scalable applications built with modern technologies",
        elementTag: "DIV",
        textPrefix: "tailored to your brand",
        textSuffix: "Branding",
        neighborText: "Web Design Branding",
        xPct: 0.02,
        yPct: 0.5,
        wPct: 0.96,
        hPct: 0.45,
        scrollY: 1000,
      },
    },
    {
      clientId: "seed-landing-gdpr",
      projectName: "landing",
      url: "/",
      type: "question",
      status: "open",
      message: "Is the widget GDPR-compliant when screenshots are enabled? Wondering what ends up in the capture.",
      authorName: "Jonas Berg",
      authorEmail: "jonas@webagency.example",
      viewport: "1920x1080",
      userAgent: WIN_FIREFOX,
      ageMinutes: 60 * 5,
      annotation: {
        cssSelector: "#features",
        xpath: "//section[@id='features']",
        textSnippet: "Features",
        elementTag: "SECTION",
        textPrefix: "that matter",
        textSuffix: "How it works",
        neighborText: "Annotated screenshots",
        xPct: 0.1,
        yPct: 0.3,
        wPct: 0.35,
        hPct: 0.2,
        scrollY: 1400,
        viewportW: 1920,
        viewportH: 1080,
      },
    },
    {
      clientId: "seed-demo-vertex-link",
      projectName: "demo",
      url: "/demo",
      type: "bug",
      status: "open",
      message: "Clicking the Vertex SaaS card does nothing — shouldn't it open the case study page?",
      authorName: "Claire Fontaine",
      authorEmail: "claire@horizonstudio.example",
      viewport: "1440x900",
      userAgent: MAC_CHROME,
      ageMinutes: 60 * 4,
      annotation: {
        cssSelector: "#work .grid > div:nth-of-type(2)",
        xpath: "//section[@id='work']//div[contains(@class,'grid')]/div[2]",
        textSnippet: "Web Platform Vertex SaaS",
        elementTag: "DIV",
        textPrefix: "Luminary App",
        textSuffix: "Greenfield Co.",
        neighborText: "Luminary App Greenfield Co.",
        xPct: 0.0,
        yPct: 0.0,
        wPct: 1.0,
        hPct: 1.0,
        scrollY: 1800,
      },
      diagnostics: {
        console: [],
        network: [
          {
            url: "/case-studies/vertex-saas",
            method: "GET",
            status: 404,
            durationMs: 89,
            timestamp: minutesAgoIso(60 * 4, -15),
          },
        ],
      },
    },
    {
      clientId: "seed-demo-looking-great",
      projectName: "demo",
      url: "/demo",
      type: "other",
      status: "open",
      message: "No changes — just wanted to say this is looking great. Huge step up from the old site!",
      authorName: "Marcus Webb",
      authorEmail: "marcus@horizonstudio.example",
      viewport: "1728x1024",
      userAgent: MAC_CHROME,
      ageMinutes: 60 * 3,
      annotation: {
        cssSelector: "h1",
        xpath: "//h1",
        textSnippet: "We craft digital experiences that matter.",
        elementTag: "H1",
        textPrefix: "Digital agency",
        textSuffix: "Horizon Studio is a design",
        neighborText: "Digital agency",
        xPct: 0.05,
        yPct: 0.1,
        wPct: 0.9,
        hPct: 0.8,
      },
    },
    {
      clientId: "seed-demo-headline-wording",
      projectName: "demo",
      url: "/demo",
      type: "change",
      status: "open",
      message: 'Can we try "digital experiences that ship." instead of "that matter."? Feels more us.',
      authorName: "Claire Fontaine",
      authorEmail: "claire@horizonstudio.example",
      viewport: "1440x900",
      userAgent: MAC_CHROME,
      ageMinutes: 120,
      annotation: {
        cssSelector: "h1",
        xpath: "//h1",
        textSnippet: "We craft digital experiences that matter.",
        elementTag: "H1",
        textPrefix: "Digital agency",
        textSuffix: "Horizon Studio is a design",
        neighborText: "Digital agency",
        xPct: 0.3,
        yPct: 0.55,
        wPct: 0.45,
        hPct: 0.4,
      },
    },
    {
      clientId: "seed-demo-readonly-email",
      projectName: "demo",
      url: "/demo",
      type: "bug",
      status: "open",
      message: "The email field in the contact form won't let me type anything — is it disabled on purpose?",
      authorName: "Sarah Mitchell",
      authorEmail: "sarah@luminary.example",
      viewport: "1440x900",
      userAgent: MAC_CHROME,
      ageMinutes: 25,
      annotation: {
        cssSelector: "#demo-email",
        xpath: "//input[@id='demo-email']",
        textSnippet: "",
        elementTag: "INPUT",
        elementId: "demo-email",
        textPrefix: "Name",
        textSuffix: "Message",
        neighborText: "Email Message",
        xPct: 0,
        yPct: 0,
        wPct: 1,
        hPct: 1,
        scrollY: 3400,
      },
      diagnostics: {
        console: [
          {
            level: "warn",
            timestamp: minutesAgoIso(25, -30),
            message: "Form field demo-email is read-only; ignoring keyboard input.",
          },
          {
            level: "error",
            timestamp: minutesAgoIso(25, -12),
            message: "Uncaught TypeError: Cannot read properties of undefined (reading 'submit')",
          },
        ],
        network: [
          { url: "/api/contact", method: "POST", status: 500, durationMs: 412, timestamp: minutesAgoIso(25, -10) },
        ],
      },
    },
  ];
}

/** Idempotent (clientId dedup in MemoryStore) — safe to call on every reset. */
export async function seedDemoStore(store: MemoryStore): Promise<void> {
  for (const seed of buildSeeds()) {
    const screenshot = SEED_SCREENSHOTS[seed.clientId];
    const record = await store.createFeedback({
      projectName: seed.projectName,
      type: seed.type,
      status: seed.status,
      message: seed.message,
      url: seed.url,
      urlPattern: null,
      viewport: seed.viewport,
      userAgent: seed.userAgent,
      authorName: seed.authorName,
      authorEmail: seed.authorEmail,
      clientId: seed.clientId,
      annotations: seed.annotation ? [{ ...BASE_ANNOTATION, ...seed.annotation }] : [],
      screenshotDataUrl: screenshot?.dataUrl ?? null,
      screenshotRegion: screenshot?.region ?? null,
      diagnostics: seed.diagnostics ?? null,
    });

    // Back-date the live reference so the inbox shows a believable timeline.
    const createdAt = new Date(Date.now() - seed.ageMinutes * 60_000);
    record.createdAt = createdAt;
    record.updatedAt = createdAt;
    if (seed.closedMinutes !== undefined) {
      const closedAt = new Date(Date.now() - seed.closedMinutes * 60_000);
      record.resolvedAt = closedAt;
      record.updatedAt = closedAt;
    }
  }
}

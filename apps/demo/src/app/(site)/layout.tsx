import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://siteping.dev"),
  title: {
    default: "SitePing — Client feedback, pinned to the page",
    template: "%s — SitePing",
  },
  description:
    "Open-source feedback widget for freelancers and agencies. DOM-anchored annotations, self-hosted, zero SaaS fees.",
  openGraph: {
    title: "SitePing — Client feedback, pinned to the page",
    description:
      "Open-source feedback widget for freelancers and agencies. DOM-anchored annotations, self-hosted, zero SaaS fees.",
    url: "https://siteping.dev",
    siteName: "SitePing",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SitePing — Client feedback, pinned to the page",
    description: "Open-source feedback widget. Self-hosted, DOM-anchored, npm install and go.",
  },
};

// Every page of this group opens on the night-blue ink (the landing's header,
// the demo banner), so the phone's status bar matches it in both OS schemes.
// No color-scheme here: the demo's client site is light and keeps light controls.
export const viewport: Viewport = {
  themeColor: "#05071a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-950 font-sans text-gray-100">{children}</body>
    </html>
  );
}

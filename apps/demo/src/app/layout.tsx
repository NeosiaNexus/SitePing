import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SitePing — Client feedback, pinned to the pixel",
  description:
    "Open-source feedback widget for freelancers and agencies. DOM-anchored annotations, self-hosted, zero SaaS fees.",
  openGraph: {
    title: "SitePing — Client feedback, pinned to the pixel",
    description:
      "Open-source feedback widget for freelancers and agencies. DOM-anchored annotations, self-hosted, zero SaaS fees.",
    url: "https://siteping.dev",
    siteName: "SitePing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SitePing — Client feedback, pinned to the pixel",
    description: "Open-source feedback widget. Self-hosted, DOM-anchored, npm install and go.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 font-sans text-gray-100">{children}</body>
    </html>
  );
}

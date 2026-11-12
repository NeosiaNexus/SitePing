import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { NotFoundContent } from "@/components/landing/not-found-content";
import "./globals.css";

// Two root layouts (site and docs) leave unmatched URLs to Next's bare
// default page: this one brands them. It bypasses every layout, so it
// brings its own document, font and styles.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Page not found | SitePing",
  robots: { index: false },
};

export const viewport: Viewport = {
  themeColor: "#05071a",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-ink font-sans text-paper">
        <NotFoundContent />
        <Analytics />
      </body>
    </html>
  );
}

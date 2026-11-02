import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";

// One family carries the page (optical sizes from 12 to 96, widths down to
// 75%), a monospace is reserved for code a reader would actually type.
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
  display: "swap",
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

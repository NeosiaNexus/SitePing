import { Instrument_Serif } from "next/font/google";

/** Horizon Studio's display face: the client site has its own identity, distinct from SitePing's. */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-horizon",
  display: "swap",
});

import Script from "next/script";

// Self-hosted Rybbit instance that measures siteping.dev's audience.
const RYBBIT_HOST = "https://mesure.devwave.fr";

/**
 * Audience measurement for the deployed site. The site id is inlined at build
 * time; unset or empty (local dev, forks), this renders nothing at all.
 */
export function Analytics() {
  const siteId = process.env.NEXT_PUBLIC_RYBBIT_SITE_ID;
  if (!siteId) return null;

  return <Script src={`${RYBBIT_HOST}/api/script.js`} data-site-id={siteId} strategy="afterInteractive" />;
}

import { p } from "../prompts.js";

/** Options accepted by the `siteping doctor` subcommand. */
export interface DoctorCommandOptions {
  /** Override the development server origin (defaults to prompt / `http://localhost:3000`). */
  url?: string;
  /** Override the API endpoint path (defaults to prompt / `/api/siteping`). */
  endpoint?: string;
  /** Bearer token for endpoints configured with `apiKey` (sent as `Authorization: Bearer <key>`). */
  apiKey?: string;
}

/** Shape of the `GET /api/siteping?projectName=…` health-check response. */
interface SitepingHealthResponse {
  total?: number;
}

/**
 * `<url><endpoint>?projectName=…` — the endpoint is joined onto the URL's own
 * path (`http://host/base` keeps `/base`, which `new URL(endpoint, url)` would
 * drop) and `projectName` added to whatever query the endpoint already has.
 */
function healthCheckUrl(url: string, endpoint: string): string {
  const target = new URL(url);
  const { pathname, searchParams } = new URL(endpoint, "http://endpoint.invalid");
  target.pathname = target.pathname.replace(/\/+$/, "") + pathname;
  target.search = searchParams.toString();
  target.searchParams.set("projectName", "__siteping_health_check__");
  return target.toString();
}

export async function doctorCommand(options: DoctorCommandOptions): Promise<void> {
  p.intro("siteping — Network diagnostics");

  const url =
    options.url ??
    (await p.text({
      message: "Development server URL",
      placeholder: "http://localhost:3000",
      defaultValue: "http://localhost:3000",
    }));

  if (p.isCancel(url)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  if (!/^https?:\/\//.test(url)) {
    p.log.error("URL must start with http:// or https://");
    process.exit(1);
  }

  const endpoint =
    options.endpoint ??
    (await p.text({
      message: "API endpoint path",
      placeholder: "/api/siteping",
      defaultValue: "/api/siteping",
    }));

  if (p.isCancel(endpoint)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start(`Testing connection to ${url}${endpoint}`);

  try {
    // Inside the try: `http://` passes the prefix check but doesn't parse.
    const fullUrl = healthCheckUrl(url, endpoint);
    const start = performance.now();
    const response = await fetch(fullUrl, {
      signal: AbortSignal.timeout(10_000),
      ...(options.apiKey ? { headers: { Authorization: `Bearer ${options.apiKey}` } } : {}),
    });
    const elapsed = Math.round(performance.now() - start);

    if (response.ok) {
      let data: SitepingHealthResponse | null;
      try {
        data = (await response.json()) as SitepingHealthResponse;
      } catch {
        data = null;
      }
      spinner.stop(`Connection successful (${elapsed}ms)`);

      if (data && typeof data.total === "number") {
        p.log.success(`API is working — ${data.total} feedback(s) found`);
      } else {
        p.log.warn("Unexpected response — make sure the endpoint uses createSitepingHandler()");
      }
    } else {
      spinner.stop(`HTTP error ${response.status} (${elapsed}ms)`);
      const text = await response.text().catch(() => "");
      p.log.error(`Server responded with: ${response.status} ${response.statusText}`);
      if (text) p.log.info(text.slice(0, 200));
      if (response.status === 401 && !options.apiKey) {
        p.log.info("The endpoint requires authentication — pass the configured key with --api-key <key>");
      }
      process.exit(1);
    }
  } catch (error) {
    spinner.stop("Connection failed");
    if (error instanceof DOMException && error.name === "TimeoutError") {
      p.log.error("Request timed out after 10 seconds");
    } else if (error instanceof TypeError && String(error).includes("fetch")) {
      p.log.error("Unable to connect — is the server running?");
      p.log.info(`Check that ${url} is reachable`);
    } else {
      p.log.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }

  p.outro("Diagnostics complete");
}

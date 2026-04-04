import { p } from "../prompts.js";

export async function doctorCommand(options: { url?: string; endpoint?: string }): Promise<void> {
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

  const projectName = "__siteping_health_check__";
  const fullUrl = new URL(`${endpoint}?projectName=${encodeURIComponent(projectName)}`, url).toString();

  const spinner = p.spinner();
  spinner.start(`Testing connection to ${url}${endpoint}`);

  try {
    const start = performance.now();
    const response = await fetch(fullUrl, { signal: AbortSignal.timeout(10_000) });
    const elapsed = Math.round(performance.now() - start);

    if (response.ok) {
      let data: Record<string, unknown> | null;
      try {
        data = await response.json();
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

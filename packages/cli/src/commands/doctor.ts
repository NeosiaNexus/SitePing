import * as p from "@clack/prompts";

export async function doctorCommand(options: { url?: string; endpoint?: string }): Promise<void> {
  p.intro("siteping — Diagnostic réseau");

  const url =
    options.url ??
    (await p.text({
      message: "URL du serveur de développement",
      placeholder: "http://localhost:3000",
      defaultValue: "http://localhost:3000",
    }));

  if (p.isCancel(url)) {
    p.cancel("Annulé.");
    process.exit(0);
  }

  const endpoint =
    options.endpoint ??
    (await p.text({
      message: "Chemin de l'endpoint API",
      placeholder: "/api/siteping",
      defaultValue: "/api/siteping",
    }));

  if (p.isCancel(endpoint)) {
    p.cancel("Annulé.");
    process.exit(0);
  }

  const fullUrl = `${url}${endpoint}?projectName=__siteping_health_check__`;

  const spinner = p.spinner();
  spinner.start(`Test de connexion à ${url}${endpoint}`);

  try {
    const start = performance.now();
    const response = await fetch(fullUrl);
    const elapsed = Math.round(performance.now() - start);

    if (response.ok) {
      const data = await response.json();
      spinner.stop(`Connexion réussie (${elapsed}ms)`);

      if (data && typeof data.total === "number") {
        p.log.success(`API fonctionnelle — ${data.total} feedback(s) trouvé(s)`);
      } else {
        p.log.warn("Réponse inattendue — vérifiez que l'endpoint utilise createSitepingHandler()");
      }
    } else {
      spinner.stop(`Erreur HTTP ${response.status} (${elapsed}ms)`);
      const text = await response.text().catch(() => "");
      p.log.error(`Le serveur a répondu : ${response.status} ${response.statusText}`);
      if (text) p.log.info(text.slice(0, 200));
    }
  } catch (error) {
    spinner.stop("Connexion échouée");
    if (error instanceof TypeError && String(error).includes("fetch")) {
      p.log.error("Impossible de se connecter — le serveur est-il lancé ?");
      p.log.info(`Vérifiez que ${url} est accessible`);
    } else {
      p.log.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  p.outro("Diagnostic terminé");
}

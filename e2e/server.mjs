import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const widgetJs = readFileSync(join(__dirname, "../packages/widget/dist/index.js"), "utf-8");

/** In-memory feedback store */
let feedbacks = [];
let idCounter = 1;

function resetStore() {
  feedbacks = [];
  idCounter = 1;
}

const HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Siteping E2E Test Page</title>
  <style>
    body { font-family: system-ui; margin: 0; padding: 40px; background: #f5f5f5; }
    .hero { background: #fff; padding: 60px 40px; border-radius: 12px; margin-bottom: 20px; }
    .hero h1 { margin: 0 0 16px; }
    .hero p { color: #666; }
    .section { background: #fff; padding: 40px; border-radius: 12px; margin-bottom: 20px; }
    .section h2 { margin: 0 0 12px; }
    .section p { color: #666; line-height: 1.6; }
    #target-element { background: #e8f4ff; padding: 20px; border-radius: 8px; }
    .tall { height: 1200px; }
  </style>
</head>
<body>
  <div class="hero" id="hero">
    <h1>Page de test E2E</h1>
    <p>Cette page simule un site client pour tester le widget Siteping.</p>
  </div>
  <div class="section">
    <h2>Section avec contenu</h2>
    <p id="target-element">Ceci est un element cible pour les annotations.</p>
  </div>
  <div class="section">
    <h2>Présentation du projet</h2>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p>
  </div>
  <div class="section">
    <h2>Fonctionnalités</h2>
    <ul style="color: #666; line-height: 2;">
      <li>Annotations visuelles directement sur la page</li>
      <li>Capture d'écran automatique</li>
      <li>Gestion des retours client</li>
      <li>Interface simple et intuitive</li>
      <li>Intégration facile via script</li>
      <li>Support multi-projets</li>
    </ul>
  </div>
  <div class="section">
    <h2>Comment ça marche</h2>
    <p>Siteping s'intègre directement dans votre site web. Le widget permet à vos clients de laisser des retours visuels en annotant directement les éléments de la page.</p>
    <p>Chaque annotation est ancrée à un élément du DOM grâce à un sélecteur CSS, un XPath de secours et un extrait de texte pour garantir la fiabilité du positionnement.</p>
  </div>
  <div class="section">
    <h2>Tarification</h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0 0 8px;">Gratuit</h3>
        <p style="font-size: 2em; margin: 0; font-weight: bold;">0€</p>
        <p style="color: #999;">1 projet · 50 retours/mois</p>
      </div>
      <div style="background: #e8f4ff; padding: 24px; border-radius: 8px; text-align: center; border: 2px solid #6366f1;">
        <h3 style="margin: 0 0 8px;">Pro</h3>
        <p style="font-size: 2em; margin: 0; font-weight: bold;">19€</p>
        <p style="color: #999;">10 projets · illimité</p>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; text-align: center;">
        <h3 style="margin: 0 0 8px;">Entreprise</h3>
        <p style="font-size: 2em; margin: 0; font-weight: bold;">Sur devis</p>
        <p style="color: #999;">Illimité · Support dédié</p>
      </div>
    </div>
  </div>
  <div class="section">
    <h2>FAQ</h2>
    <details style="margin-bottom: 12px;">
      <summary style="cursor: pointer; font-weight: 600;">Comment installer le widget ?</summary>
      <p style="color: #666; margin-top: 8px;">Ajoutez simplement le script sur votre page et appelez initSiteping() avec votre configuration.</p>
    </details>
    <details style="margin-bottom: 12px;">
      <summary style="cursor: pointer; font-weight: 600;">Le widget ralentit-il mon site ?</summary>
      <p style="color: #666; margin-top: 8px;">Non, le widget est chargé de manière asynchrone et utilise un Shadow DOM isolé.</p>
    </details>
    <details style="margin-bottom: 12px;">
      <summary style="cursor: pointer; font-weight: 600;">Puis-je personnaliser les couleurs ?</summary>
      <p style="color: #666; margin-top: 8px;">Oui, utilisez l'option accentColor pour adapter le widget à votre charte graphique.</p>
    </details>
  </div>
  <div class="section">
    <h2>Témoignages</h2>
    <blockquote style="border-left: 4px solid #6366f1; margin: 16px 0; padding: 12px 20px; background: #f9f9ff; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-style: italic; color: #444;">"Siteping a transformé notre processus de relecture avec nos clients. Plus besoin de captures d'écran par email !"</p>
      <p style="margin: 8px 0 0; color: #999; font-size: 0.9em;">— Marie D., Agence Web</p>
    </blockquote>
    <blockquote style="border-left: 4px solid #6366f1; margin: 16px 0; padding: 12px 20px; background: #f9f9ff; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-style: italic; color: #444;">"Mes clients adorent pouvoir annoter directement sur le site. Le gain de temps est énorme."</p>
      <p style="margin: 8px 0 0; color: #999; font-size: 0.9em;">— Thomas R., Freelance</p>
    </blockquote>
  </div>
  <div class="section tall">
    <h2>Section longue</h2>
    <p>Contenu qui force le scroll vertical.</p>
  </div>
  <div class="section">
    <h2>Contact</h2>
    <p>Des questions ? Contactez-nous à <a href="#">support@siteping.dev</a></p>
    <p style="color: #999; margin-top: 40px; text-align: center;">© 2026 Siteping — Tous droits réservés</p>
  </div>
  <script type="module">
    import { initSiteping } from '/widget.js';
    const instance = initSiteping({
      endpoint: '/api/siteping',
      projectName: 'e2e-test',
      forceShow: true,
      accentColor: '#6366f1',
      __testMode: true,
    });
    window.__siteping = instance;
  </script>
</body>
</html>`;

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost:3999");

  // Serve widget JS
  if (url.pathname === "/widget.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(widgetJs);
    return;
  }

  // Serve HTML
  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(HTML);
    return;
  }

  // Reset store
  if (url.pathname === "/api/reset") {
    resetStore();
    res.writeHead(200);
    res.end("ok");
    return;
  }

  // API endpoint
  if (url.pathname === "/api/siteping") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    if (req.method === "GET") {
      const projectName = url.searchParams.get("projectName");
      const type = url.searchParams.get("type");
      const status = url.searchParams.get("status");
      const search = url.searchParams.get("search");

      let results = feedbacks.filter(f => f.projectName === projectName);
      if (type) results = results.filter(f => f.type === type);
      if (status) results = results.filter(f => f.status === status);
      if (search) results = results.filter(f => f.message.includes(search));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ feedbacks: results, total: results.length }));
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const fbId = `fb-${idCounter++}`;
          const feedback = {
            id: fbId,
            ...data,
            status: "open",
            resolvedAt: null,
            createdAt: new Date().toISOString(),
            annotations: (data.annotations || []).map((ann) => ({
              id: `ann-${idCounter++}`,
              feedbackId: fbId,
              ...ann.anchor,
              ...ann.rect,
              scrollX: ann.scrollX,
              scrollY: ann.scrollY,
              viewportW: ann.viewportW,
              viewportH: ann.viewportH,
              devicePixelRatio: ann.devicePixelRatio,
              createdAt: new Date().toISOString(),
            })),
          };
          feedbacks.push(feedback);
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(feedback));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    if (req.method === "PATCH") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        try {
          const { id, status } = JSON.parse(body);
          const fb = feedbacks.find(f => f.id === id);
          if (!fb) { res.writeHead(404); res.end(JSON.stringify({ error: "Not found" })); return; }
          fb.status = status;
          fb.resolvedAt = status === "resolved" ? new Date().toISOString() : null;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(fb));
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(3999, () => {
  console.log("E2E server running on http://localhost:3999");
});

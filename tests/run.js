// Diagnostic temporaire : réponses d'Overpass selon les en-têtes d'un vrai navigateur.
const Q = '[out:json][timeout:25];area["ref:INSEE"="09194"]["boundary"="administrative"]->.c;nwr(area.c)["amenity"="townhall"];out center tags 5;';
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const VARIANTS = {
  "node, POST": { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  "navigateur, POST": { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": CHROME, "Origin": "https://9cdr9fmdkt-glitch.github.io", "Referer": "https://9cdr9fmdkt-glitch.github.io/", "Accept": "*/*", "Accept-Language": "fr-FR,fr;q=0.9", "Sec-Fetch-Mode": "cors", "Sec-Fetch-Site": "cross-site" } },
  "navigateur, POST, Accept json": { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": CHROME, "Origin": "https://9cdr9fmdkt-glitch.github.io", "Referer": "https://9cdr9fmdkt-glitch.github.io/", "Accept": "application/json" } },
  "navigateur, GET": { method: "GET", headers: { "User-Agent": CHROME, "Origin": "https://9cdr9fmdkt-glitch.github.io", "Referer": "https://9cdr9fmdkt-glitch.github.io/" } }
};
(async () => {
  for (const s of SERVERS) for (const [k, v] of Object.entries(VARIANTS)) {
    const url = v.method === "GET" ? s + "?data=" + encodeURIComponent(Q) : s, t0 = Date.now();
    try { const r = await fetch(url, { ...v, body: v.method === "POST" ? "data=" + encodeURIComponent(Q) : undefined, signal: AbortSignal.timeout(30000) }); const t = await r.text();
      console.log(r.status, (Date.now() - t0) + " ms", s.split("/")[2], "|", k, "| CORS:", r.headers.get("access-control-allow-origin"), "|", t.slice(0, 160).replace(/\s+/g, " ")) }
    catch (e) { console.log("ERREUR", s.split("/")[2], "|", k, e.message) }
    await new Promise(r => setTimeout(r, 1500));
  }
  process.exit(0);
})();

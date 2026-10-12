// Diagnostic temporaire : lecture des articles du code de la sécurité intérieure sur Légifrance.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const URLS = ["https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000025503132/LEGISCTA000029656954/",
  "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000025503132/LEGISCTA000045942728/"];
const strip = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;|&#160;/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n");
(async () => {
  for (const u of URLS) {
    try { const r = await fetch(u, { headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "fr-FR" } }); const t = strip(await r.text());
      console.log("\n##### " + r.status + " " + u); const i = t.indexOf("Article R731-1"); console.log(i < 0 ? t.slice(0, 1500) : t.slice(i, i + 30000)) }
    catch (e) { console.log("ERREUR", u, e.message) }
  }
  process.exit(0);
})();

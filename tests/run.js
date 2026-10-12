// Diagnostic temporaire : texte consolidé du code de la sécurité intérieure (codes.droit.org, source Légifrance).
const { execSync } = require("child_process");
const sh = c => { try { return execSync(c, { encoding: "utf8", maxBuffer: 1 << 28 }) } catch (e) { return "ERREUR " + e.message } };
console.log(sh('curl -sSL -A "Mozilla/5.0" -o /tmp/csi.pdf -w "%{http_code} %{size_download}\\n" "https://codes.droit.org/PDF/Code%20de%20la%20s%C3%A9curit%C3%A9%20int%C3%A9rieure.pdf"'));
console.log(sh("which pdftotext || (sudo apt-get install -y -qq poppler-utils >/dev/null 2>&1 && which pdftotext)"));
const t = sh("pdftotext -layout /tmp/csi.pdf - 2>/dev/null");
console.log("Longueur :", t.length); const head = t.slice(0, 600); console.log(head);
const i = t.search(/Article R731-1\b/), j = t.search(/Article D731-18|Article R732-1\b|Chapitre II : Planification/);
const k = t.indexOf("Article R731-1", i + 10);
console.log("\n===== EXTRAIT =====\n" + (i < 0 ? "introuvable" : t.slice(i, Math.min(i + 45000, j > i ? j + 200 : i + 45000))));
process.exit(0);

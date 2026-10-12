// Diagnostic temporaire : texte consolidé du code de la sécurité intérieure (codes.droit.org, source Légifrance).
const { execSync } = require("child_process");
const sh = c => { try { return execSync(c, { encoding: "utf8", maxBuffer: 1 << 28 }) } catch (e) { return "ERREUR " + e.message } };
console.log(sh('curl -sSL -A "Mozilla/5.0" -o /tmp/csi.pdf -w "%{http_code} %{size_download}\\n" "https://codes.droit.org/PDF/Code%20de%20la%20s%C3%A9curit%C3%A9%20int%C3%A9rieure.pdf"'));
console.log(sh("sudo apt-get update -qq >/dev/null 2>&1; sudo apt-get install -y -qq poppler-utils >/dev/null 2>&1; which pdftotext"));
const t = sh("pdftotext -layout /tmp/csi.pdf - 2>/dev/null");
console.log("Longueur :", t.length); const head = t.slice(0, 1200); console.log(head);
const st = t.indexOf("Section 1 : Plan communal ou intercommunal de sauvegarde", 3000000), en = t.indexOf("D. 731-9 ", st);
console.log("===== SECTION 1 =====\n" + t.slice(st, en).replace(/[ ]{3,}/g, "  ").replace(/\n\s*\n+/g, "\n"));
process.exit(0);

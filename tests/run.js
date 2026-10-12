// Diagnostic temporaire : texte consolidé du code de la sécurité intérieure (codes.droit.org, source Légifrance).
const { execSync } = require("child_process");
const sh = c => { try { return execSync(c, { encoding: "utf8", maxBuffer: 1 << 28 }) } catch (e) { return "ERREUR " + e.message } };
console.log(sh('curl -sSL -A "Mozilla/5.0" -o /tmp/csi.pdf -w "%{http_code} %{size_download}\\n" "https://codes.droit.org/PDF/Code%20de%20la%20s%C3%A9curit%C3%A9%20int%C3%A9rieure.pdf"'));
console.log(sh("sudo apt-get update -qq >/dev/null 2>&1; sudo apt-get install -y -qq poppler-utils >/dev/null 2>&1; which pdftotext"));
const t = sh("pdftotext -layout /tmp/csi.pdf - 2>/dev/null");
console.log("Longueur :", t.length); const head = t.slice(0, 1200); console.log(head);
const re = /R\.?\s?731-1\b/g; let m, pos = []; while ((m = re.exec(t)) && pos.length < 12) pos.push(m.index);
console.log("Positions R731-1 :", pos.join(", "));
pos.forEach(p => console.log("\n--- " + p + " ---\n" + t.slice(Math.max(0, p - 120), p + 200)));
const s0 = pos.length ? pos[pos.length > 1 ? 1 : 0] : -1;
// Bloc complet : de la dernière occurrence plausible (corps du texte) jusqu'à D731-18 ou R732
const last = pos[pos.length - 1]; const end = t.slice(last).search(/R\.?\s?732-1\b|D\.?\s?731-1[89]\b/);
console.log("\n===== BLOC =====\n" + t.slice(last - 300, last + (end > 0 ? end + 300 : 40000)).replace(/[ ]{3,}/g, "  "));
process.exit(0);

// Diagnostic temporaire : l'outil interroge les vraies bases publiques depuis GitHub Actions.
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"), path = require("path");
const wait = ms => new Promise(r => setTimeout(r, ms));
async function run(file, commune) {
  console.log("\n===== " + file + " / " + commune);
  const SRC = fs.readFileSync(path.join(__dirname, "..", file), "utf8").replace(/<script src=[^>]+><\/script>/, "");
  const vc = new VirtualConsole(); vc.on("jsdomError", e => console.log("JSERR", String(e.message).slice(0, 200)));
  const dom = new JSDOM("<!doctype html><html><body>" + SRC + "</body></html>", { runScripts: "dangerously", pretendToBeVisual: true, url: "https://9cdr9fmdkt-glitch.github.io/atelier-exercice-pcs/", virtualConsole: vc,
    beforeParse(w) {
      w.fetch = (u, o) => { const t0 = Date.now(), lab = String(u).slice(0, 110);
        const opt = o ? { method: o.method, body: o.body, headers: o.headers } : {};
        return fetch(u, opt).then(async r => { const txt = await r.text(); console.log(r.status, (Date.now() - t0) + " ms", lab, r.ok ? "(" + txt.length + " o)" : "\n   " + txt.slice(0, 400).replace(/\s+/g, " "));
          if (/overpass/.test(lab) && r.ok) { try { const j = JSON.parse(txt); console.log("   éléments :", j.elements.length, j.remark ? "REMARK " + j.remark : "") } catch (e) { console.log("   JSON illisible", txt.slice(0, 200)) } }
          if (/installations|education|rapport/.test(lab) && r.ok) console.log("   " + txt.slice(0, 500).replace(/\s+/g, " "));
          return new Response(txt, { status: r.status, headers: r.headers }) })
          .catch(e => { console.log("ERREUR", (Date.now() - t0) + " ms", lab, e.message, e.cause ? e.cause.code || e.cause.message : ""); throw e }) };
    } });
  const w = dom.window, q = s => w.document.querySelector(s);
  await wait(3000); q("#commune").value = commune; q("#commune").dispatchEvent(new w.Event("input"));
  await wait(3000); const li = q("#sugg li"); if (!li) { console.log("pas de suggestion"); return }
  li.dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true })); await wait(70000);
  console.log("NOTE LIEUX :", q("#lieuxNote").textContent); console.log("DATALIST écoles :", q("#datalists").innerHTML.length);
  w.close();
}
(async () => { for (const f of ["index.html", "tests/ancien.html"]) await run(f, "Mirepoix"); await run("index.html", "Pamiers"); process.exit(0) })();

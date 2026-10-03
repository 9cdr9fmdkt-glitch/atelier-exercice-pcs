// Tests de bout en bout de Commune Prête dans un navigateur simulé (jsdom), bases publiques simulées.
// Lancer : npm test
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"), path = require("path");
const FIX = require("./fixtures");
const SRC = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").replace(/<script src=[^>]+><\/script>/, "");
let failures = 0, passes = 0;
const ok = (cond, label) => { if (cond) { passes++; console.log("  ✓ " + label) } else { failures++; console.log("  ✗ " + label) } };
const wait = ms => new Promise(r => setTimeout(r, ms));

function open(name, hash = "", storage) {
  const F = FIX[name], errs = [], clip = { text: "" }, blobs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => { const m = String(e.message || e); if (!/Not implemented: (window\.print|window\.focus|navigation|HTMLCanvas)/.test(m)) errs.push(m) });
  const R = o => Promise.resolve({ ok: true, json: () => Promise.resolve(o) });
  const dom = new JSDOM("<!doctype html><html><body>" + SRC + "</body></html>", {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://exemple.test/" + hash, virtualConsole: vc,
    beforeParse(w) {
      if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
      w.fetch = (u, o) => { u = String(u);
        if (u.includes("communes?nom")) return R([F.commune]);
        if (u.includes("geometry=contour")) return R({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } });
        if (u.includes("overpass")) return R({ elements: F.osm });
        if (u.includes("gaspar/risques")) return R({ data: [{ risques_detail: [{ libelle_risque_long: "Inondation" }] }] });
        if (u.includes("gaspar/catnat")) return R({ data: [] });
        if (u.includes("installations_classees")) return R({ data: F.icpe });
        if (u.includes("data.education")) return R({ results: F.ecoles });
        if (u.includes("resultats_rapport_risque")) { const lat = +u.split(",")[1]; return R({ risquesNaturels: { inondation: { present: true, libelleStatutAdresse: F.flood(lat) ? "Risque Existant" : "Risque non Connu" } } }) }
        return Promise.reject(new Error("hors ligne")) };
      Object.defineProperty(w.navigator, "clipboard", { value: { writeText: t => { clip.text = t; return Promise.resolve() }, readText: () => Promise.resolve(clip.text) } });
      w.URL.createObjectURL = b => { blobs.push(b); return "blob:test" }; w.URL.revokeObjectURL = () => {};
    } });
  const w = dom.window;
  w.HTMLAnchorElement.prototype.click = function () {};
  return { w, d: w.document, q: s => w.document.querySelector(s), errs, clip, blobs, close: () => w.close() };
}
async function pickCommune(t, name) {
  t.q("#commune").value = FIX[name].commune.nom.slice(0, 3); t.q("#commune").dispatchEvent(new t.w.Event("input"));
  await wait(350); t.q("#sugg li").dispatchEvent(new t.w.MouseEvent("mousedown", { bubbles: true })); await wait(700);
}
const click = (t, s) => { const e = t.q(s); if (!e) throw new Error("élément absent : " + s); e.dispatchEvent(new t.w.MouseEvent("click", { bubbles: true })) };
function gen(t) { click(t, "#gen"); if (t.q("#genLabel").textContent.includes("Confirmer")) click(t, "#gen") }
const view = t => t.q("#view").textContent;

(async () => {
  { const A = fs.readFileSync(path.join(__dirname, "..", "aide.html"), "utf8");
    console.log("\nMODE D'EMPLOI");
    ok(/<h1>Mode d’emploi<\/h1>/.test(A) && (A.match(/<section id=/g) || []).length >= 20, "page d'aide complète");
    ok(!/Scénario à venir » \./.test(A) && /retrait-gonflement/.test(A), "aide à jour sur les scénarios disponibles"); }
  for (const name of ["paris", "hameau", "bourg"]) {
    console.log("\n" + name.toUpperCase());
    const t = open(name); await wait(300); await pickCommune(t, name);
    ok(t.q("#commune").value === FIX[name].commune.nom, "commune chargée");
    const risks = [...t.d.querySelectorAll("input[name=risk]")].map(x => x.value);
    ok(risks.length === 19, "19 scénarios proposés (" + risks.length + ")");
    const left = new Set();
    for (const r of risks) {
      const inp = t.q("#r-" + r); inp.checked = true; inp.dispatchEvent(new t.w.Event("change", { bubbles: true })); gen(t);
      for (const tab of ["scenario", "chrono", "modeles", "roles", "cadrage"]) { click(t, `[data-tab="${tab}"]`); (view(t).match(/\{\w+\}|undefined|NaN/g) || []).forEach(m => left.add(r + "/" + tab + ":" + m)) }
    }
    ok(!left.size, "aucun champ non rempli dans les 19 scénarios" + (left.size ? " : " + [...left].slice(0, 6).join(", ") : ""));
    const inp = t.q("#r-inondation"); inp.checked = true; inp.dispatchEvent(new t.w.Event("change", { bubbles: true })); gen(t);
    click(t, '[data-tab="scenario"]');
    ok(view(t).includes(FIX[name].commune.nom), "le scénario nomme la commune");
    if (name === "paris") { ok(/Police nationale/.test(view(t)) && /Brigade de sapeurs-pompiers de Paris/.test(view(t)), "acteurs parisiens"); ok(/184 élèves/.test(view(t)), "effectif réel de l'école") }
    if (name === "hameau") ok(/Gendarmerie/.test(view(t)) && /hameau d'Usson/.test(view(t)), "gendarmerie et hameau nommé");
    if (name === "bourg") { const s = t.q("#r-industriel"); s.checked = true; s.dispatchEvent(new t.w.Event("change", { bubbles: true })); gen(t); click(t, '[data-tab="scenario"]');
      ok(/Arterris/.test(view(t)) && /Seveso seuil bas/.test(view(t)), "site industriel réel et classement Seveso"); ok(/vent de secteur/.test(view(t)), "direction du vent calculée") }
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : ""));
    t.close();
  }

  console.log("\nCONDUITE, OBSERVATION, RETEX, EXPORTS");
  const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); gen(t);
  click(t, '[data-tab="conduite"]'); click(t, "#lstart");
  ok(/H\+0:00/.test(t.q("#lclock").textContent), "horloge démarrée");
  click(t, "[data-lsent]"); click(t, "[data-ldone]");
  t.q("#lmc").value = "Décision du maire"; click(t, "#lmcadd");
  ok(t.d.querySelectorAll(".mclist li").length >= 4, "main courante alimentée");
  click(t, '[data-tab="obs"]'); click(t, '[data-cot="ALERTE-0"][data-v="ok"]'); click(t, "#obsLinkBtn"); await wait(50);
  const link = t.clip.text; ok(/#obs=/.test(link), "lien observateur produit");
  const o = open("bourg", link.slice(link.indexOf("#"))); await wait(300);
  ok(o.d.body.classList.contains("obsmode") && o.d.querySelectorAll(".obsr").length > 20, "mode observateur ouvert");
  o.q("#oname").value = "Observateur test"; o.q("#oname").dispatchEvent(new o.w.Event("input", { bubbles: true }));
  click(o, '[data-ocot="POP-0"][data-v="part"]'); click(o, "#ocopy"); await wait(50);
  ok(/^COMMUNE-PRETE-OBS:/.test(o.clip.text), "code observateur produit"); o.close();
  t.q("#obsImport").value = o.clip.text; click(t, "#obsImportBtn");
  ok(t.q('[data-cot="POP-0"][data-v="part"]').getAttribute("aria-pressed") === "true", "cotations de l'observateur importées");
  click(t, '[data-tab="retex"]'); ok(/Délais de réaction mesurés/.test(view(t)), "délais mesurés dans le RETEX");
  click(t, "#archBtn"); click(t, "#archBtn"); ok(/Historique des exercices/.test(view(t)) && /Inondation/.test(view(t)), "exercice archivé");
  click(t, "#repDoc"); click(t, "#dosDoc"); await wait(50);
  const texts = await Promise.all(t.blobs.map(b => new Promise(r => { const f = new t.w.FileReader(); f.onload = () => r(f.result); f.readAsText(b) })));
  ok(texts.length === 2 && /Rapport de fin d'exercice/.test(texts[0]) && /Taux d'atteinte/.test(texts[0]), "rapport Word généré");
  ok(!/commune fictive/.test(texts[1]) && /Convention d'exercice/.test(texts[1]) && /Fiches rôles/.test(texts[1]) && !/<button/.test(texts[1]), "dossier Word complet et propre");
  click(t, '[data-tab="chrono"]'); click(t, "#cardsPrint"); await wait(400);
  const fr = [...t.d.querySelectorAll("iframe")].pop();
  ok(fr && fr.contentDocument.querySelectorAll(".card").length >= 12, "fiches joueurs prêtes à imprimer");
  ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : ""));
  t.close();

  console.log("\nANNUAIRE ET EXERCICE D'ALERTE");
  const a = open("hameau"); await wait(300); await pickCommune(a, "hameau");
  a.q("#annuPaste").value = "Nom\tFonction\tTéléphone\nJean Martin\tMaire\t06 11 22 33 44\nSophie Durand\tPremière adjointe\t06 22 33 44 55\nLuc Bernard\tSecrétaire de mairie\t05 61 00 00 00\nAnne Petit\tAgent technique\t";
  click(a, "#annuImport");
  ok(/4 contacts/.test(a.q("#annuCount").textContent), "annuaire importé depuis un copier-coller Excel");
  click(a, '#segFormat [data-v="alerte"]'); gen(a);
  ok(/30 min/.test(a.q("#kpis").textContent) && a.q("#kpis").textContent.includes("3"), "exercice d'alerte de 30 minutes, 3 messages");
  click(a, '[data-tab="roles"]'); ok(/Jean Martin/.test(view(a)) && /Luc Bernard/.test(view(a)), "titulaires des rôles tirés de l'annuaire");
  click(a, '[data-tab="scenario"]'); ok(/sans numéro de téléphone/.test(view(a)), "contact sans numéro signalé");
  click(a, '[data-tab="conduite"]'); ok(/Test de l'annuaire/.test(view(a)), "liste d'appels dans la conduite");
  click(a, '[data-call="0"][data-v="ok"]'); click(a, '[data-call="1"][data-v="ok"]'); click(a, '[data-call="2"][data-v="msg"]'); click(a, '[data-call="3"][data-v="ko"]');
  ok(/2 joints sur 4/.test(view(a)), "appels comptés");
  click(a, '[data-tab="retex"]'); ok(/2 sur 4/.test(view(a)) && /50 %/.test(view(a)), "résultat du test d'annuaire dans le RETEX");
  click(a, "#repDoc"); await wait(50);
  const rep = await new Promise(r => { const f = new a.w.FileReader(); f.onload = () => r(f.result); f.readAsText(a.blobs.pop()) });
  ok(/Test de l'annuaire de crise/.test(rep) && /Anne Petit/.test(rep), "test d'annuaire dans le rapport");
  ok(!a.errs.length, "aucune erreur JavaScript" + (a.errs.length ? " : " + a.errs[0] : ""));
  a.close();

  console.log("\nAFFICHAGE");
  const v = open("bourg"); await wait(300);
  ok([...v.d.querySelectorAll(".tgrp")].map(x => x.textContent).join("/") === "Préparer/Conduire/Évaluer", "onglets regroupés en trois temps");
  click(v, "#panelBtn"); ok(v.d.body.classList.contains("panel-off") && v.q("#panelBtn").getAttribute("aria-pressed") === "true", "panneau de préparation masqué");
  click(v, "#panelBtn"); ok(!v.d.body.classList.contains("panel-off"), "panneau de préparation réaffiché");
  click(v, "#themeBtn"); ok(v.d.documentElement.dataset.theme === "light", "thème clair choisi");
  click(v, "#themeBtn"); ok(v.d.documentElement.dataset.theme === "dark", "thème sombre choisi");
  click(v, "#themeBtn"); ok(!v.d.documentElement.dataset.theme && /automatique/.test(v.q("#themeBtn").title), "retour au thème automatique");
  ok(/"theme":"auto"/.test(v.w.localStorage.getItem("commune-prete-affichage")), "choix d'affichage conservé");
  ok(!/Scénario disponible/.test(v.q("#risks").textContent), "liste des risques épurée");
  ok(/aide\.html$/.test(v.q("#helpLink").href), "bouton Aide vers le mode d'emploi");
  ok(!v.q("#hello").hidden, "bandeau d'accueil sur le dossier d'exemple");
  click(v, "#dosDoc"); await wait(50);
  const ex = await new Promise(r => { const f = new v.w.FileReader(); f.onload = () => r(f.result); f.readAsText(v.blobs.pop()) });
  ok(/Exemple sur une commune fictive/.test(ex), "dossier d'exemple signalé comme fictif");
  await pickCommune(v, "bourg"); ok(v.q("#hello").hidden, "bandeau d'accueil masqué une fois la commune choisie");
  ok(!v.errs.length, "aucune erreur JavaScript" + (v.errs.length ? " : " + v.errs[0] : ""));
  v.close();

  console.log(`\n${passes} réussis, ${failures} en échec`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error("ERREUR DU TEST :", e); process.exit(1) });

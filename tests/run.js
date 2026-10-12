// Tests de bout en bout de Commune Prête dans un navigateur simulé (jsdom), bases publiques simulées.
// Lancer : npm test
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs"), path = require("path");
const FIX = require("./fixtures");
const SRC = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").replace(/<script src=[^>]+><\/script>/, "");
let failures = 0, passes = 0;
const ok = (cond, label) => { if (cond) { passes++; console.log("  ✓ " + label) } else { failures++; console.log("  ✗ " + label) } };
const wait = ms => new Promise(r => setTimeout(r, ms));

function open(name, hash = "", storage, opts = {}) {
  const F = FIX[name], errs = [], clip = { text: "" }, blobs = [], saves = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => { const m = String(e.message || e); if (!/Not implemented: (window\.print|window\.focus|navigation|HTMLCanvas)/.test(m)) errs.push(m) });
  const R = o => Promise.resolve({ ok: true, json: () => Promise.resolve(o) });
  const dom = new JSDOM("<!doctype html><html><body>" + SRC + "</body></html>", {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://exemple.test/" + hash, virtualConsole: vc,
    beforeParse(w) {
      if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
      if (opts.noStorage) Object.defineProperty(w, "localStorage", { get() { throw new Error("SecurityError") } });
      if (opts.claude) w.claude = { use: n => Promise.resolve(n === "downloads" ? { save: r => { saves.push(r); return Promise.resolve({ status: "saved" }) } } : null) };
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
  return { w, d: w.document, q: s => w.document.querySelector(s), errs, clip, blobs, saves, close: () => w.close() };
}
async function pickCommune(t, name) {
  t.q("#commune").value = FIX[name].commune.nom.slice(0, 3); t.q("#commune").dispatchEvent(new t.w.Event("input"));
  await wait(350); t.q("#sugg li").dispatchEvent(new t.w.MouseEvent("mousedown", { bubbles: true })); await wait(700);
}

// Navigateur simulé où plusieurs communes coexistent : chaque réponse dépend du code INSEE demandé.
// opts.slow[code] = délai en ms de la réponse OpenStreetMap ; opts.fail[code] = OpenStreetMap ne répond pas pour cette commune.
const overpassCalls = [];
function openMulti(opts = {}, storage) {
  const errs = [], blobs = [], byCode = {};
  Object.values(FIX).forEach(F => byCode[F.commune.code] = F);
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => { const m = String(e.message || e); if (!/Not implemented/.test(m)) errs.push(m) });
  const R = o => Promise.resolve({ ok: true, json: () => Promise.resolve(o) });
  const later = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
  const dom = new JSDOM("<!doctype html><html><body>" + SRC + "</body></html>", {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://exemple.test/", virtualConsole: vc,
    beforeParse(w) {
      if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
      w.fetch = (u, o) => { u = String(u); const body = o && o.body ? decodeURIComponent(String(o.body)) : "";
        const code = (u.match(/code_insee=(\w+)|code_commune%3D%22(\w+)|communes\/(\w+)\?/) || []).slice(1).find(Boolean) || (body.match(/ref:INSEE"="(\w+)"/) || [])[1];
        const F = byCode[code];
        if (u.includes("communes?nom")) { const q = decodeURIComponent(u.split("nom=")[1].split("&")[0]).toLowerCase(); return R(Object.values(FIX).filter(f => f.commune.nom.toLowerCase().startsWith(q)).map(f => f.commune)) }
        if (u.includes("geometry=contour")) return R({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } });
        if (u.includes("overpass")) { if (opts.fail && opts.fail[code]) return Promise.reject(new Error("HTTP 429"));
          if (opts.busy && opts.busy[code] > 0) { opts.busy[code]--; overpassCalls.push(u); return Promise.resolve({ ok: false, status: 504, json: () => Promise.reject(new Error("504")) }) }
          overpassCalls.push(u); return later((opts.slow && opts.slow[code]) || 0, { ok: true, json: () => Promise.resolve({ elements: F.osm }) }) }
        if (u.includes("gaspar/risques")) return later((opts.slowRisk && opts.slowRisk[code]) || 0, { ok: true, json: () => Promise.resolve({ data: [{ risques_detail: (opts.risques || F.risques || ["Inondation"]).map(l => ({ libelle_risque_long: l })) }] }) });
        if (u.includes("gaspar/catnat")) return R({ data: [] });
        if (u.includes("installations_classees")) return R({ data: F.icpe });
        if (u.includes("data.education")) return R({ results: F.ecoles });
        if (u.includes("resultats_rapport_risque")) { const [lon, lat] = u.split("latlon=")[1].split(",").map(Number); const G = Object.values(FIX).sort((a, b) => Math.hypot(a.commune.centre.coordinates[1] - lat, a.commune.centre.coordinates[0] - lon) - Math.hypot(b.commune.centre.coordinates[1] - lat, b.commune.centre.coordinates[0] - lon))[0];
          return R({ risquesNaturels: { inondation: { present: true, libelleStatutAdresse: G.flood(lat) ? "Risque Existant" : "Risque non Connu" } } }) }
        return Promise.reject(new Error("hors ligne")) };
      w.URL.createObjectURL = b => { blobs.push(b); return "blob:test" }; w.URL.revokeObjectURL = () => {};
    } });
  const w = dom.window; w.HTMLAnchorElement.prototype.click = function () {};
  return { w, d: w.document, q: s => w.document.querySelector(s), errs, blobs, close: () => w.close() };
}
async function chooseCommune(t, name, ms = 700) {
  t.q("#commune").value = FIX[name].commune.nom.slice(0, 4); t.q("#commune").dispatchEvent(new t.w.Event("input"));
  await wait(320); const li = [...t.d.querySelectorAll("#sugg li")].find(l => l.textContent.startsWith(FIX[name].commune.nom));
  li.dispatchEvent(new t.w.MouseEvent("mousedown", { bubbles: true })); await wait(ms);
}
// Tout ce que l'utilisateur peut lire de la commune : lieux saisis, carte, scénario, chronogramme.
function everything(t) {
  const out = [...t.d.querySelectorAll("#lieuxBox input, #lieuxBox select")].map(i => i.value).join(" | ");
  const tabs = ["carte", "scenario", "chrono"].map(k => { click(t, `[data-tab="${k}"]`); return t.q("#view").textContent }).join(" ");
  return out + " " + tabs + " " + t.q("#datalists").innerHTML;
}
const MIREPOIX = /Hers-Vif|Arterris|Le Pont|Remparts|Paul Dumons|Maréchal Leclerc|Montbel|\bD 119/;
const click = (t, s) => { const e = t.q(s); if (!e) throw new Error("élément absent : " + s); e.dispatchEvent(new t.w.MouseEvent("click", { bubbles: true })) };
function gen(t) { click(t, "#gen"); if (t.q("#genLabel").textContent.includes("Confirmer")) click(t, "#gen") }
const view = t => t.q("#view").textContent;

const pcsStored = (t, sec) => JSON.parse(t.w.localStorage.getItem("commune-prete-pcs"))["09194"][sec];
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
      ok(/Arterris/.test(view(t)) && /Seveso seuil bas/.test(view(t)), "site industriel réel et classement Seveso"); ok(/vent de secteur/.test(view(t)), "direction du vent calculée");
      ok(/Arterris \(commerce de gros\)/.test(view(t)), "activité du site déduite du code NAF (Géorisques ne donne plus libelleNaf)");
      ok(!/Durand Martine/.test(everything(t)), "établissement « Non ICPE » écarté des installations classées et de la carte") }
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : ""));
    t.close();
  }

  console.log("\nÉTABLISSEMENTS ET LIEUX PUBLICS");
  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg");
    const s = t.q("#r-canicule"); s.checked = true; s.dispatchEvent(new t.w.Event("change", { bubbles: true })); gen(t); click(t, '[data-tab="scenario"]');
    ok(/Établissements d'enseignement \(3\)/.test(view(t)) && /École privée Sainte-Marie/.test(view(t)) && /Collège Victor Hugo/.test(view(t)), "tous les établissements, publics et privés, pris en compte");
    ok(/Les cours sont maintenus dans les 3 établissements d'enseignement de la commune/.test(view(t)) && /788 élèves au total/.test(view(t)), "hypothèse au pluriel et effectif total");
    ok(/Médiathèque Jean-Jaurès/.test(t.q("#erpList").textContent) && /Jardin du Lac/.test(t.q("#erpList").textContent), "lieux publics recensés (bibliothèques, parcs…)");
    click(t, '[data-tab="chrono"]'); ok(/situation de chacun des 3 établissements/.test(view(t)), "point de situation demandé pour chaque établissement");
    const box = [...t.d.querySelectorAll("#erpList [data-erp]")].find(x => x.dataset.erp === "École privée Sainte-Marie");
    box.checked = false; box.dispatchEvent(new t.w.Event("change", { bubbles: true })); gen(t); click(t, '[data-tab="scenario"]');
    ok(/Établissements d'enseignement \(2\)/.test(view(t)) && !/Sainte-Marie/.test(view(t)), "établissement décoché écarté du scénario");
    const s2 = t.q("#r-inondation"); s2.checked = true; s2.dispatchEvent(new t.w.Event("change", { bubbles: true })); gen(t); click(t, '[data-tab="chrono"]');
    ok(/lieux recevant du public de la zone/.test(view(t)) && /Médiathèque Jean-Jaurès/.test(view(t)), "lieux recevant du public de la zone exposée à prévenir");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = open("hameau"); await wait(300); await pickCommune(t, "hameau"); gen(t); click(t, '[data-tab="scenario"]');
    ok(!/Établissements d'enseignement \(/.test(view(t)), "commune sans établissement : pas de liste vide"); click(t, '[data-tab="chrono"]');
    ok(!/situation de chacun/.test(view(t)), "commune sans établissement : pas de message aux établissements"); t.close(); }

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

  console.log("\nSTOCKAGE ET COPIE CLAUDE");
  { const t = open("bourg", "", null, { noStorage: true }); await wait(300); await pickCommune(t, "bourg"); gen(t);
    click(t, '[data-tab="retex"]'); click(t, "#archBtn"); click(t, "#archBtn");
    ok(/ne conserve pas les données/.test(t.q("#toast").textContent), "archivage sans stockage local signalé");
    ok(/Historique des exercices/.test(view(t)) && /Inondation/.test(view(t)), "exercice gardé en mémoire et exportable");
    click(t, "#repDoc"); await wait(50);
    const r = await new Promise(res => { const f = new t.w.FileReader(); f.onload = () => res(f.result); f.readAsText(t.blobs.pop()) });
    ok(/<h2>6\. Grille d'observation détaillée/.test(r), "sections du rapport numérotées dans l'ordre");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = open("bourg", "", null, { claude: true }); await wait(300); click(t, '[data-tab="retex"]'); click(t, "#repDoc"); await wait(80);
    ok(t.saves.length === 1 && /\.html$/.test(t.saves[0].filename) && /Rapport de fin d'exercice/.test(t.saves[0].data), "rapport enregistré dans la copie Claude (format HTML)");
    ok(/format HTML/.test(t.q("#toast").textContent), "format du fichier annoncé");
    click(t, "#histExport"); await wait(80);
    ok(t.saves.length === 2 && t.saves[1].filename === "historique-commune-prete.json", "historique exporté dans la copie Claude"); t.close(); }

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
  ok(/<h2>6\. Test de l'annuaire de crise/.test(rep) && /<h2>7\. Grille/.test(rep), "section du test d'annuaire numérotée");
  ok(!a.errs.length, "aucune erreur JavaScript" + (a.errs.length ? " : " + a.errs[0] : ""));
  a.close();


  console.log("\nCHANGEMENT DE COMMUNE");
  { // 1. Commune B choisie après A, OpenStreetMap ne répond pas pour B : rien de A ne doit subsister.
    const t = openMulti({ fail: { "09253": true } }); await wait(300);
    await chooseCommune(t, "bourg"); click(t, "#gen"); click(t, '[data-tab="carte"]');
    ok(MIREPOIX.test(everything(t)), "première commune chargée (Mirepoix)");
    await chooseCommune(t, "hameau", 11000); click(t, "#gen"); if (t.q("#genLabel").textContent.includes("Confirmer")) click(t, "#gen");
    const all = everything(t), m = all.match(MIREPOIX);
    ok(!m, "aucun lieu de la commune précédente après changement de commune" + (m ? " : « " + m[0] + " »" : ""));
    ok(/OpenStreetMap n'a pas répondu/.test(t.q("#lieuxNote").textContent), "échec de chargement signalé à l'utilisateur");
    click(t, '[data-tab="scenario"]'); ok(/lieux génériques|Lieux non chargés/.test(t.q("#view").textContent), "lieux génériques signalés dans les points de cohérence");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : ""));
    t.close();
  }
  { // 2. Réponse tardive : A répond après que B a été choisie. Les données de A ne doivent pas écraser B.
    const t = openMulti({ slow: { "09194": 1500 }, slowRisk: { "09194": 1500 } }); await wait(300);
    await chooseCommune(t, "bourg", 100);
    await chooseCommune(t, "hameau", 2200);
    click(t, "#gen"); if (t.q("#genLabel").textContent.includes("Confirmer")) click(t, "#gen");
    const all = everything(t), m = all.match(MIREPOIX);
    ok(t.q("#commune").value === "Rouze" && !m, "réponse tardive de la commune précédente ignorée" + (m ? " : « " + m[0] + " »" : ""));
    ok(/Usson|Aude/.test(all), "lieux de la commune choisie présents");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : ""));
    t.close();
  }
  { // 3. Dossier enregistré dans le navigateur avec les lieux d'une autre commune : ils sont écartés au démarrage.
    const t0 = openMulti(); await wait(300); await chooseCommune(t0, "bourg"); const st = JSON.parse(t0.w.localStorage.getItem("atelier-pcs-v2")); t0.close();
    st.p.insee = "09253"; st.p.commune = "Rouze";
    const t = openMulti({ fail: { "09253": true } }, { "atelier-pcs-v2": JSON.stringify(st) }); await wait(900);
    ok(!/Hers-Vif|Arterris|Le Pont|Remparts/.test(t.q("#datalists").innerHTML), "lieux enregistrés pour une autre commune écartés au démarrage");
    const st2 = JSON.parse(JSON.stringify(st)); st2.geo = { status: "ok", insee: "09253" };
    const u = openMulti({ fail: { "09253": true } }, { "atelier-pcs-v2": JSON.stringify(st2) }); await wait(900);
    ok(!/Hers-Vif|Arterris|Le Pont|Remparts/.test(u.q("#datalists").innerHTML), "lieux enregistrés par l'ancienne version rechargés"); u.close();
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : ""));
    t.close();
  }

  console.log("\nOPENSTREETMAP SATURÉ");
  { // Les serveurs Overpass publics répondent souvent « 504 » quand ils sont saturés : l'outil réessaie avant d'abandonner.
    overpassCalls.length = 0; const t = openMulti({ busy: { "09194": 2 } }); await wait(300);
    await chooseCommune(t, "bourg", 9000);
    ok(/Mirepoix/.test(t.q("#lieuxNote").textContent) || /Lieux proposés/.test(t.q("#lieuxNote").textContent), "lieux chargés malgré deux réponses « serveur saturé »");
    ok(overpassCalls.length === 3, "trois demandes à OpenStreetMap (" + overpassCalls.length + ")");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = openMulti({ fail: { "09194": true } }); await wait(300); await chooseCommune(t, "bourg", 11000);
    ok(/nouvel essai automatique/.test(t.q("#lieuxNote").textContent), "nouvel essai automatique annoncé après un échec"); t.close(); }

  console.log("\nESPACE PCS");
  { const t = open("bourg"); await wait(300);
    ok(t.q('#espaceSeg [data-esp="exercices"]').getAttribute("aria-pressed") === "true", "espace Exercices par défaut");
    click(t, '#espaceSeg [data-esp="pcs"]');
    ok(t.d.body.classList.contains("esp-pcs") && !t.q("#pcsPanel").hidden && t.q("#config").hidden, "espace PCS affiché, panneau des exercices masqué");
    ok(/Recherchez votre commune/.test(t.q("#pcsView").textContent), "invitation à choisir la commune");
    ok(/"espace":"pcs"/.test(t.w.localStorage.getItem("commune-prete-affichage")), "choix d'espace conservé");
    click(t, '#espaceSeg [data-esp="exercices"]'); ok(!t.q("#config").hidden && t.q("#pcsPanel").hidden, "retour à l'espace Exercices");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg");
    click(t, '#espaceSeg [data-esp="pcs"]');
    ok(/Plan communal de sauvegarde/.test(t.q("#pcsView").textContent) && !/EXERCICE · EXERCICE/.test(t.q("#pcsView").textContent), "espace PCS sans bandeau « EXERCICE »");
    click(t, '#espaceSeg [data-esp="exercices"]');
    const v0 = t.q("#view"), c0 = t.q("#view").firstElementChild;
    click(t, "#themeBtn"); click(t, "#panelBtn");
    ok(t.q("#view") === v0 && t.q("#view").firstElementChild === c0, "thème et panneau sans reconstruire la vue");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = openMulti(); await wait(300); await chooseCommune(t, "bourg");
    click(t, '#espaceSeg [data-esp="pcs"]');
    ok(t.d.querySelectorAll("#pcsRub li").length === 10, "dix rubriques");
    click(t, '#pcsRub [data-rub="0"]'); const f = t.q('[data-pf="gen.dateApprob"]');
    f.value = "2024-03-15"; f.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    ok(JSON.parse(t.w.localStorage.getItem("commune-prete-pcs"))["09194"].gen.dateApprob === "2024-03-15", "saisie enregistrée pour la commune");
    ok(t.q('#pcsRub [data-rub="0"]').dataset.state === "encours", "rubrique en cours");
    ok(/\d+ %/.test(t.q("#pcsTaux").textContent), "taux d'avancement affiché");
    click(t, '#espaceSeg [data-esp="exercices"]'); await chooseCommune(t, "hameau"); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="0"]');
    ok(t.q('[data-pf="gen.dateApprob"]').value === "", "aucune saisie d'une autre commune");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = open("bourg", "", null, { noStorage: true }); await wait(300); await pickCommune(t, "bourg"); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="0"]');
    const f = t.q('[data-pf="gen.referent"]'); f.value = "Adjoint à la sécurité"; f.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    ok(/ne conserve pas/.test(t.q("#toast").textContent), "PCS sans stockage : avertissement");
    ok(!t.errs.length, "aucune erreur JavaScript sans stockage"); t.close(); }

  { const t = openMulti(); await wait(300); await chooseCommune(t, "bourg"); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="0"]');
    const b1 = t.q('#pcsRub [data-rub="1"]'), f = t.q('[data-pf="gen.referent"]');
    f.value = "Adjoint"; f.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    ok(t.q('#pcsRub [data-rub="1"]') === b1, "boutons des rubriques conservés après une saisie");
    click(t, '#pcsRub [data-rub="1"]');
    ok(!!t.q('[data-pf="risques.ddrm"]'), "premier clic sur une autre rubrique pris en compte");
    click(t, '#pcsRub [data-rub="5"]'); const n = t.d.querySelector('[data-pf^="moyens.cap."]');
    if (n) { n.value = "-4"; n.dispatchEvent(new t.w.Event("change", { bubbles: true })); ok(pcsStored(t, "moyens").cap[n.dataset.pf.slice(11)] === 0, "capacité négative ramenée à 0"); }
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]');
    click(t, '#pcsRub [data-rub="1"]'); const v1 = t.q("#pcsView").textContent;
    ok(/Inondation/.test(v1) && /Arterris/.test(v1) && /Seveso seuil bas/.test(v1) && /Géorisques/.test(v1), "analyse des risques pré-remplie");
    click(t, '#pcsRub [data-rub="2"]'); const v2 = t.q("#pcsView").textContent;
    ok(/Collège Victor Hugo/.test(v2) && /École privée Sainte-Marie/.test(v2) && /Médiathèque Jean-Jaurès/.test(v2), "enjeux pré-remplis");
    click(t, '#pcsRub [data-rub="7"]'); ok(/PPMS/.test(t.q("#pcsView").textContent), "plans des établissements à suivre");
    ok(!!t.q('[data-pf="prev.plans.Collège Victor Hugo"]'), "champ de suivi du plan de chaque établissement");
    ok(/Aperçu dans le PCS/.test(t.q("#pcsView").textContent) && !!t.q("#pcsApercu"), "aperçu sous les champs");
    for (let i = 0; i < 10; i++) { click(t, `#pcsRub [data-rub="${i}"]`); ok(!/undefined|NaN|\{\w+\}|Invalid Date/.test(t.q("#pcsView").textContent), "aucun champ non rempli dans l'aperçu de la rubrique " + i); }
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = openMulti({}); await wait(300); await chooseCommune(t, "hameau", 900); click(t, '#espaceSeg [data-esp="pcs"]');
    for (let i = 0; i < 10; i++) { click(t, `#pcsRub [data-rub="${i}"]`); ok(!/undefined|NaN|\{\w+\}|Invalid Date/.test(t.q("#pcsView").textContent), "hameau : aperçu propre, rubrique " + i); }
    t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="8"]');
    const v = t.q("#pcsView").textContent;
    ok(/Fiche réflexe : Inondation/.test(v) && /Montez dans les étages/.test(v), "fiche réflexe du risque recensé avec la consigne à la population");
    ok(/Fiche réflexe : Population et accueil/.test(v), "fiches par fonction");
    ok(/0 à 30 minutes/.test(v), "premières actions datées");
    ok(/Recevoir et horodater l'alerte — qui : Secrétariat et main courante/.test(t.q("#pcsApercu").textContent), "action avec la fonction responsable");
    ok(t.q('#pcsRub [data-rub="8"]').dataset.state === "complete", "rubrique 8 complète : risques recensés et fonctions couverts");
    const ta = t.q('[data-fiche="r:inondation"]'); ta.value = "Texte du maire pour l'inondation."; ta.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    ok(pcsStored(t, "fiches")["r:inondation"] === "Texte du maire pour l'inondation." && /Texte du maire pour l'inondation\./.test(t.q("#pcsApercu").textContent), "texte modifié conservé et repris dans l'aperçu");
    click(t, '[data-fiche-reset="r:inondation"]');
    ok(!pcsStored(t, "fiches")["r:inondation"] && /Montez dans les étages/.test(t.q("#pcsApercu").textContent), "retour au texte proposé");
    const cb = t.q('[data-trans="cyber"]'); cb.checked = true; cb.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    ok(/Fiche réflexe : Cyberattaque/.test(t.q("#pcsApercu").textContent) && pcsStored(t, "fiches").transverses.join() === "cyber", "risque transverse coché : sa fiche s'ajoute");
    click(t, '#pcsRub [data-rub="3"]'); ok(!/Fiche réflexe/.test(t.q("#pcsView").textContent), "fiches limitées à la rubrique 8");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = openMulti({}); await wait(300); await chooseCommune(t, "hameau", 900); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="8"]');
    const v = t.q("#pcsView").textContent;
    ok(/Fiche réflexe : Maire, directeur des opérations/.test(v) && !/undefined|NaN|\{\w+\}/.test(v), "hameau : fiches des six fonctions sans champ non rempli");
    ok(t.d.querySelectorAll("#pcsFiches details").length >= 6, "hameau : au moins six fiches");
    t.close(); }

  { const LAB = ["Inondation", "Feu de forêt", "Tempête", "Canicule", "Séisme", "Mouvement de terrain", "Transport de marchandises dangereuses", "Risque industriel", "Rupture de barrage", "Risque nucléaire", "Épidémie"];
    const BAD = /\bde le\b|\bde les\b|\bà le\b|\bà les\b|Ouvrir au\b|\{\w+\}|undefined|NaN|  +|\s[,.]/;
    for (const nom of ["bourg", "hameau"]) {
      const t = openMulti({ risques: LAB }); await wait(300); await chooseCommune(t, nom, 900); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="8"]');
      for (const k of ["canicule", "coupure", "cyber", "sanitaire", "terrorisme", "ferroviaire", "aerien", "hopital", "bombe", "masse"]) { const cb = t.q(`[data-trans="${k}"]`); if (!cb.disabled && !cb.checked) { cb.checked = true; cb.dispatchEvent(new t.w.Event("change", { bubbles: true })) } }
      const titres = [...t.d.querySelectorAll("#pcsFiches summary")].map(x => x.textContent);
      ok(titres.length === 19 + 6, nom + " : 19 fiches de risque et 6 fiches de fonction (" + titres.length + ")");
      const txt = [...t.d.querySelectorAll("#pcsFiches textarea")].map(x => x.value).join("\n") + "\n" + t.q("#pcsApercu").textContent;
      const m = txt.match(BAD); ok(!m, nom + " : fiches sans article fautif, accolade ni double espace" + (m ? " : « " + txt.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, " ") + " »" : ""));
      if (nom === "bourg") ok(/Fiche réflexe : Cyberattaque/.test(txt) && / : /.test(txt) && !/\S: /.test(txt.replace(/https?:\/\//g, "")), "l'espace avant les deux-points est conservé");
      ok(!t.errs.length, "aucune erreur JavaScript"); t.close(); }
    const lit = SRC.slice(SRC.indexOf("const FICHE_RISQUE={"), SRC.indexOf("function ficheLieux"));
    ok(!/\b(de|à) \{(le|la|les)_(secteur|axe|icpe|heberg|etab|erp|hopital|gare|aero|evt|riviere|massif)\}|Ouvrir \{au_|\{du_icpe\}/.test(lit), "texte des 19 risques (dont ferroviaire, aérien, hôpital, bombe, masse hors interface) sans article mal formé"); }
  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsTabs [data-ptab="verifier"]');
    ok(t.d.querySelectorAll("[data-gv]").length === 35 * 4, "35 points de contrôle, quatre réponses chacun");
    ok(/date d'approbation à saisir/.test(t.q("#pcsView").textContent) && !/Invalid Date/.test(t.q("#pcsView").textContent), "échéance sans date d'approbation");
    click(t, '[data-gv="g1"][data-v="ok"]'); click(t, '[data-gv="g2"][data-v="part"]'); click(t, '[data-gv="g3"][data-v="ko"]'); click(t, '[data-gv="r4"][data-v="na"]');
    ok(/50 %/.test(t.q("#verifTaux").textContent), "taux : présent 1, à compléter 0,5, absent 0, sans objet exclu");
    ok(/présenté au conseil municipal/.test(t.q("#verifManques").textContent), "manque légal listé");
    ok(t.d.querySelectorAll("[data-va]").length === 2, "une action par manque");
    click(t, '[data-gv="g3"][data-v="ko"]'); ok(t.q('[data-gv="g3"][data-v="ko"]').getAttribute("aria-pressed") === "false", "second clic sur une cotation : elle est effacée");
    click(t, '[data-gv="g3"][data-v="ko"]'); ok(t.d.querySelectorAll("[data-va]").length === 2, "pas d'action en double");
    click(t, '[data-gcomp="g3"]'); ok(t.q('#pcsTabs [data-ptab="rediger"]').getAttribute("aria-selected") === "true" && t.q('#pcsRub [data-rub="0"]').getAttribute("aria-current") === "true", "bouton Compléter vers la rubrique");
    click(t, '#pcsRub [data-rub="0"]'); const f = t.q('[data-pf="gen.dateApprob"]'); f.value = "2020-01-10"; f.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    click(t, '#pcsTabs [data-ptab="verifier"]'); ok(/10 janvier 2025/.test(t.q("#pcsView").textContent) && /dépassée/.test(t.q("#pcsView").textContent), "échéance de révision dépassée signalée");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }


  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400);
    t.q("#annuPaste").value = "Nom\tFonction\tTéléphone\nJean Martin\tMaire\t06 11 22 33 44"; click(t, "#annuImport");
    click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="3"]');
    const a = t.q('[data-pf="alerte.astreinte"]'); a.value = "Astreinte élus : 06 98 76 54 32"; a.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    click(t, '#pcsTabs [data-ptab="documents"]'); click(t, "#pcsDoc"); click(t, "#pcsPub"); click(t, "#pcsArr"); await wait(80);
    const [full, pub, arr] = await Promise.all(t.blobs.slice(-3).map(b => new Promise(r => { const f = new t.w.FileReader(); f.onload = () => r(f.result); f.readAsText(b) })));
    ok(/Plan communal de sauvegarde/.test(full) && /Jean Martin/.test(full) && /Fiche réflexe/.test(full), "PCS complet avec annuaire et fiches");
    ok(!/Jean Martin/.test(pub) && !/06 11 22 33 44|06 98 76 54 32/.test(pub) && /numéro non publié/.test(pub), "version publique sans nom ni numéro");
    ok(!/EXERCICE · EXERCICE/.test(full + pub + arr) && !/undefined|\{\w+\}/.test(full + pub + arr), "documents du PCS sans mention d'exercice ni valeur vide");
    click(t, '#pcsTabs [data-ptab="verifier"]'); click(t, '[data-gv="a5"][data-v="ko"]'); click(t, '#pcsTabs [data-ptab="documents"]'); click(t, "#pcsVer"); await wait(80);
    const ver = await new Promise(r => { const f = new t.w.FileReader(); f.onload = () => r(f.result); f.readAsText(t.blobs[t.blobs.length - 1]) });
    ok(/Rapport de vérification/.test(ver) && /DICRIM réalisé et inséré au PCS/.test(ver), "rapport de vérification avec les manques");
    ok(/ARRÊTÉ MUNICIPAL/.test(arr) && /Préfecture de l'Ariège|préfet de l'Ariège/.test(arr) && /Pays de Mirepoix/.test(arr), "arrêté et courrier de transmission");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

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

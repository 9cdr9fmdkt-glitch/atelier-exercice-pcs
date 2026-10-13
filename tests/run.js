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
      // guideVu : démarrage guidé déjà vu (ancien comportement : dossier d'exemple affiché d'emblée)
      if (opts.guideVu) { let a = {}; try { a = JSON.parse(w.localStorage.getItem("commune-prete-affichage")) || {} } catch (e) {} a.guide = true; w.localStorage.setItem("commune-prete-affichage", JSON.stringify(a)) }
      if (opts.noStorage) Object.defineProperty(w, "localStorage", { get() { throw new Error("SecurityError") } });
      if (opts.claude) w.claude = { use: n => Promise.resolve(n === "downloads" ? { save: r => { saves.push(r); return Promise.resolve({ status: "saved" }) } } : null) };
      w.fetch = (u, o) => { u = String(u); if (opts.offline) return Promise.reject(new Error("hors ligne"));
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
// La recherche de commune est dans le démarrage guidé : l'ouvrir si besoin (bouton de la barre), choisir,
// puis suivre « Préparer un exercice de crise » et « Générer le dossier », qui ferme le parcours.
const guideStep1 = t => !t.q("#guide").hidden && !t.q('#guide [data-gstep="1"]').hidden;
function guideFinish(t) { click(t, "#gChoixEx"); click(t, "#gGen"); if (/Confirmer/.test(t.q("#gGen").textContent)) click(t, "#gGen") }
async function pickCommune(t, name) {
  if (!guideStep1(t)) t.q("#communeChange").dispatchEvent(new t.w.MouseEvent("click", { bubbles: true }));
  t.q("#commune").value = FIX[name].commune.nom.slice(0, 3); t.q("#commune").dispatchEvent(new t.w.Event("input"));
  await wait(350); t.q("#sugg li").dispatchEvent(new t.w.MouseEvent("mousedown", { bubbles: true })); await wait(700);
  guideFinish(t);
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
  if (!guideStep1(t)) t.q("#communeChange").dispatchEvent(new t.w.MouseEvent("click", { bubbles: true }));
  t.q("#commune").value = FIX[name].commune.nom.slice(0, 4); t.q("#commune").dispatchEvent(new t.w.Event("input"));
  await wait(320); const li = [...t.d.querySelectorAll("#sugg li")].find(l => l.textContent.startsWith(FIX[name].commune.nom));
  li.dispatchEvent(new t.w.MouseEvent("mousedown", { bubbles: true })); await wait(ms);
  guideFinish(t);
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
  { const t = open("bourg", "", null, { claude: true, guideVu: true }); await wait(300); click(t, '[data-tab="retex"]'); click(t, "#repDoc"); await wait(80);
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
  { const t = open("bourg", "", null, { guideVu: true }); await wait(300);
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
    const a = t.q('[data-pf="alerte.astreinte"]'); a.value = "Astreinte élus"; a.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    const g = t.q('[data-pf="alerte.reglement"]'); g.value = "Le secrétariat appelle Jean Martin au 06 98 76 54 32"; g.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    click(t, '#pcsTabs [data-ptab="documents"]'); click(t, "#pcsDoc"); click(t, "#pcsPub"); click(t, "#pcsArr"); await wait(80);
    const [full, pub, arr] = await Promise.all(t.blobs.slice(-3).map(b => new Promise(r => { const f = new t.w.FileReader(); f.onload = () => r(f.result); f.readAsText(b) })));
    ok(/Plan communal de sauvegarde/.test(full) && /Jean Martin/.test(full) && /Fiche réflexe/.test(full), "PCS complet avec annuaire et fiches");
    ok(!/Jean Martin/.test(pub) && !/06 11 22 33 44|06 98 76 54 32/.test(pub) && !/Jean Martin/.test(pub) && /\[numéro non publié\]/.test(pub) && /\[nom non publié\]/.test(pub), "version publique sans nom ni numéro, remplacés par des mentions");
    ok(!/EXERCICE · EXERCICE/.test(full + pub + arr) && !/undefined|\{\w+\}/.test(full + pub + arr), "documents du PCS sans mention d'exercice ni valeur vide");
    click(t, '#pcsTabs [data-ptab="verifier"]'); click(t, '[data-gv="a5"][data-v="ko"]'); click(t, '#pcsTabs [data-ptab="documents"]'); click(t, "#pcsVer"); await wait(80);
    const ver = await new Promise(r => { const f = new t.w.FileReader(); f.onload = () => r(f.result); f.readAsText(t.blobs[t.blobs.length - 1]) });
    ok(/Rapport de vérification/.test(ver) && /DICRIM réalisé et inséré au PCS/.test(ver), "rapport de vérification avec les manques");
    ok(/ARRÊTÉ MUNICIPAL/.test(arr) && /Préfecture de l'Ariège|préfet de l'Ariège/.test(arr) && /Pays de Mirepoix/.test(arr), "arrêté et courrier de transmission");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="4"]');
    const l = t.q('[data-pf="pcc.lieu"]'); l.value = "Salle du conseil, mairie"; l.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    click(t, '#espaceSeg [data-esp="exercices"]'); click(t, '[data-tab="cadrage"]');
    ok(/Poste de commandement communal/.test(view(t)) && /Salle du conseil, mairie/.test(view(t)), "lieu du PCC repris dans la convention d'exercice");
    gen(t); click(t, '[data-tab="retex"]'); click(t, "#archBtn"); click(t, "#archBtn");
    click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="9"]');
    ok(/Mises à jour issues des exercices/.test(t.q("#pcsView").textContent) && /Mettre à jour l'annuaire de crise du PCS/.test(t.q("#pcsView").textContent), "actions correctives du RETEX dans le PCS");
    ok((t.q("#pcsView").textContent.match(/Mettre à jour l'annuaire de crise du PCS/g) || []).length === 1, "actions correctives listées une seule fois");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = open("bourg", "", null, { guideVu: true }); await wait(300);
    ok(!/Poste de commandement communal/.test((click(t, '[data-tab="cadrage"]'), view(t))) && !t.w.localStorage.getItem("commune-prete-pcs"), "sans PCS : pas de ligne PCC, rien d'enregistré par l'espace Exercices");
    t.close(); }
  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400);
    const heb = t.q("#heberg").value;
    click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="5"]');
    const c = t.q('[data-pf="moyens.cap.' + heb + '"]');
    ok(!!heb && !!c, "capacité du lieu d'accueil saisissable dans le PCS");
    if (c) { c.value = "5"; c.dispatchEvent(new t.w.Event("change", { bubbles: true }));
      click(t, '#espaceSeg [data-esp="exercices"]');
      const r = t.q("#r-inondation"); r.checked = true; r.dispatchEvent(new t.w.Event("change", { bubbles: true })); gen(t);
      click(t, '[data-tab="chrono"]');
      ok(/Nous sommes complets avec 5 personnes/.test(view(t)), "capacité du PCS utilisée pour le message de saturation (fiche vide)"); }
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = openMulti({}); await wait(300);
    await chooseCommune(t, "bourg"); click(t, "#gen"); click(t, '[data-tab="cadrage"]'); click(t, '[data-tab="chrono"]');
    await chooseCommune(t, "hameau", 11000);
    click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="4"]');
    const l = t.q('[data-pf="pcc.lieu"]'); l.value = "Mairie annexe"; l.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    const st = JSON.parse(t.w.localStorage.getItem("commune-prete-pcs") || "{}");
    ok(Object.keys(st).length === 1 && st["09253"] !== undefined, "seule la commune éditée est enregistrée (pas de squelette pour l'autre commune)" + " : " + Object.keys(st).join(","));
    ok(!st["09194"], "aucune entrée PCS créée par la seule consultation des exercices");
    t.close(); }

  console.log("\nESPACE PCS : CORRECTIONS DE LA REVUE FINALE");
  const setF = (t, p, v) => { const f = t.q('[data-pf="' + p + '"]'); f.value = v; f.dispatchEvent(new t.w.Event("change", { bubbles: true })) };
  const readBlob = (t, b) => new Promise(r => { const f = new t.w.FileReader(); f.onload = () => r(f.result); f.readAsText(b) });
  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); gen(t);
    click(t, '[data-tab="obs"]'); click(t, "#obsLinkBtn"); await wait(50); const link = t.clip.text;
    const o = open("bourg", link.slice(link.indexOf("#"))); await wait(300);
    click(o, "#themeBtn"); click(o, "#panelBtn");
    ok(o.d.body.classList.contains("obsmode") && !!o.d.documentElement.dataset.theme, "mode observateur : changement de thème possible");
    ok(!o.errs.length, "mode observateur : aucune erreur JavaScript au changement de thème" + (o.errs.length ? " : " + o.errs[0] : "")); o.close(); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="2"]');
    setF(t, "vuln.detenteur", "Mme Durand, CCAS");
    ok(/Mme Durand, CCAS/.test(t.q("#pcsApercu").textContent), "aperçu complet : détenteur du registre");
    click(t, '#pcsTabs [data-ptab="documents"]'); click(t, "#pcsDoc"); click(t, "#pcsPub"); await wait(80);
    const [full, pub] = await Promise.all(t.blobs.slice(-2).map(b => readBlob(t, b)));
    ok(/Mme Durand, CCAS/.test(full), "PCS complet : détenteur du registre présent");
    ok(!/Durand|CCAS/.test(pub) && /Le registre est tenu par la commune ; ses modalités ne sont pas publiées\./.test(pub), "version publique : détenteur absent, mention à la place");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]');
    const tab = t.q('#pcsTabs [data-ptab="verifier"]'); tab.focus(); click(t, '#pcsTabs [data-ptab="verifier"]');
    ok(t.d.activeElement && t.d.activeElement.id === "ptab-verifier", "clic sur un onglet : le focus reste sur l'onglet");
    click(t, "#addVAct"); click(t, "#addVAct"); const n0 = t.d.querySelectorAll("[data-vadel]").length;
    t.q('[data-vadel="0"]').focus(); click(t, '[data-vadel="0"]');
    const ae = t.d.activeElement;
    ok(t.d.querySelectorAll("[data-vadel]").length === n0 - 1 && ae && (ae.dataset.vadel !== undefined || ae.id === "addVAct"), "suppression d'une action : le focus reste dans le plan de mise à jour");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]');
    const loi = r => { click(t, '#pcsRub [data-rub="' + r + '"]'); return t.q("#pcsBody .callout").textContent };
    ok(/personnes vulnérables/.test(loi(2)) && /zones et infrastructures sensibles/.test(loi(2)), "loi, rubrique 2 : registre et zones sensibles");
    ok(/annuaire/.test(loi(3)) && /règlement d'emploi/.test(loi(3)) && /DICRIM/.test(loi(3)) && /inséré/.test(loi(3)), "loi, rubrique 3 : annuaire, règlement d'emploi, DICRIM inséré");
    ok(/réserve communale/.test(loi(6)) && /bénévolement/.test(loi(6)), "loi, rubrique 6 : réserve et bénévoles");
    ok(/poste de commandement/.test(loi(4)), "loi, rubrique 4 : poste de commandement");
    ok(/actions préventives et correctives/.test(loi(7)) && /personne publique ou privée/.test(loi(7)), "loi, rubrique 7 : actions préventives et dispositions des tiers");
    ok(/inventaire/.test(loi(5)) && /intercommunalité/.test(loi(5)), "loi, rubrique 5 : inventaire et capacités de l'intercommunalité");
    ok(/dispositions spécifiques/.test(loi(8)), "loi, rubrique 8 : dispositions spécifiques");
    ok(/L731-3/.test(loi(9)) && /L731-4/.test(loi(9)) && /annuaire/.test(loi(9)), "loi, rubrique 9 : périodicité des exercices et annuaire");
    ok(/deux ans/.test(loi(0)) && /correspondant incendie et secours/.test(loi(0)), "loi, rubrique 0 : délai de deux ans et correspondant");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="0"]');
    setF(t, "gen.dateNotif", "2023-05-10");
    ok(/Échéance d'élaboration : 10 mai 2025 \(dépassée\)/.test(t.q("#pcsApercu").textContent), "échéance d'élaboration à deux ans de la notification, dépassée");
    setF(t, "gen.dateNotif", "2099-05-10");
    ok(/Échéance d'élaboration : 10 mai 2101/.test(t.q("#pcsApercu").textContent) && !/10 mai 2101 \(dépassée\)/.test(t.q("#pcsApercu").textContent), "échéance d'élaboration à venir sans mention");
    setF(t, "gen.dateNotif", "2023-05-10"); setF(t, "gen.dateApprob", "2024-01-15");
    ok(/Échéance d'élaboration : 10 mai 2025/.test(t.q("#pcsApercu").textContent) && !/10 mai 2025 \(dépassée\)/.test(t.q("#pcsApercu").textContent), "échéance d'élaboration non dépassée une fois le plan approuvé");
    click(t, '#pcsRub [data-rub="1"]'); setF(t, "risques.pprDate", "2019-03-04"); setF(t, "risques.ppiDate", "2021-11-20");
    ok(/4 mars 2019/.test(t.q("#pcsApercu").textContent) && /20 novembre 2021/.test(t.q("#pcsApercu").textContent), "dates du PPR et du PPI dans l'aperçu");
    click(t, '#pcsRub [data-rub="2"]'); setF(t, "vuln.zones", "Berges de l'Hers, passage à niveau");
    ok(/Berges de l'Hers/.test(t.q("#pcsApercu").textContent), "zones sensibles complémentaires dans l'aperçu");
    click(t, '#pcsRub [data-rub="3"]');
    ok(/Modèles de messages disponibles dans l'espace Exercices : .*FR-Alert/.test(t.q("#pcsApercu").textContent), "modèles de messages cités dans l'aperçu de la rubrique 3");
    click(t, '#pcsTabs [data-ptab="documents"]'); ok(!!t.q("#pcsArrPdf"), "bouton PDF de l'arrêté");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="0"]');
    setF(t, "gen.referent", "Premier onglet");
    const st = JSON.parse(t.w.localStorage.getItem("commune-prete-pcs")); st["09194"].gen.dateApprob = "2022-02-02";
    t.w.localStorage.setItem("commune-prete-pcs", JSON.stringify(st));
    t.w.dispatchEvent(new t.w.StorageEvent("storage", { key: "commune-prete-pcs" })); await wait(30);
    ok(t.q('[data-pf="gen.dateApprob"]').value === "2022-02-02" && /2 février 2022/.test(t.q("#pcsApercu").textContent), "modification faite dans un autre onglet reprise à l'affichage");
    setF(t, "gen.referent", "Adjoint");
    ok(JSON.parse(t.w.localStorage.getItem("commune-prete-pcs"))["09194"].gen.dateApprob === "2022-02-02", "saisie suivante : la modification de l'autre onglet n'est pas écrasée");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg", "", null, { guideVu: true }); await wait(300);
    click(t, "#panelBtn"); click(t, '#espaceSeg [data-esp="pcs"]');
    ok(t.d.body.classList.contains("panel-off"), "panneau des exercices masqué avant la recherche");
    click(t, "#pcsGoEx");
    ok(!t.d.body.classList.contains("panel-off") && t.d.activeElement && t.d.activeElement.id === "commune", "« Rechercher ma commune » réaffiche le panneau et place le curseur sur le champ commune");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("paris"); await wait(300); await pickCommune(t, "paris"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]');
    click(t, '#pcsTabs [data-ptab="documents"]'); click(t, "#pcsArr"); await wait(80);
    const arr = await readBlob(t, t.blobs[t.blobs.length - 1]);
    ok(/Le préfet de police/.test(arr) && /R731-3/.test(arr) && !/Le maire,<br>/.test(arr), "arrêté de Paris : signé par le préfet de police");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="1"]');
    ok(t.q('[data-pf="risques.ddrm"] option[value=""]').textContent === "—", "liste oui/non : option vide affichée « — »");
    click(t, '#pcsRub [data-rub="5"]'); ok(!!t.q("#pcsBody fieldset legend") && /Capacité des lieux d'accueil/.test(t.q("#pcsBody fieldset legend").textContent), "capacités dans un fieldset nommé");
    ok(!/dont techniques/.test(t.q("#pcsApercu").textContent), "aperçu des moyens : pas de « 3 dont techniques »");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  console.log("\nCOMMUNE DANS LA BARRE ET MENTION « ENREGISTRÉ »");
  { const t = open("bourg"); await wait(300);
    const bar = () => t.q("#communeBar"), nom = () => t.q("#communeBar .cb-nom").textContent.trim(), btn = () => t.q("#cbAct").textContent.trim();
    ok(!!bar() && !bar().hidden && nom() === "Exemple fictif" && btn() === "Choisir ma commune", "barre : « Exemple fictif » et « Choisir ma commune » au départ");
    ok(t.q(".tools-r").firstElementChild === bar() && bar().nextElementSibling === t.q("#espaceSeg"), "barre : bloc commune placé avant le sélecteur d'espace");
    ok(t.q("#saveState").getAttribute("aria-live") === "polite" && t.q("#saveState").textContent.trim() === "", "mention vide au démarrage, annoncée poliment");
    click(t, '#espaceSeg [data-esp="pcs"]'); click(t, "#communeChange");
    ok(guideStep1(t) && t.q("#pcsView").hidden && t.d.activeElement && t.d.activeElement.id === "commune", "« Choisir ma commune » depuis l'espace PCS : démarrage guidé à l'écran 1, curseur sur le champ commune");
    await pickCommune(t, "bourg");
    ok(nom() === "Mirepoix" && btn() === "Changer", "barre : « Mirepoix » et « Changer » après le choix");
    click(t, '#espaceSeg [data-esp="pcs"]');
    ok(!bar().hidden && nom() === "Mirepoix" && btn() === "Changer", "barre : commune affichée dans l'espace PCS");
    click(t, "#panelBtn"); click(t, "#communeChange");
    ok(guideStep1(t) && !t.d.body.classList.contains("panel-off") && t.d.activeElement && t.d.activeElement.id === "commune", "« Changer » : démarrage guidé à l'écran 1, panneau réaffiché, curseur sur le champ commune");
    click(t, "#gBack1"); click(t, '#espaceSeg [data-esp="exercices"]');
    t.q("#saveState").textContent = "";
    click(t, '[data-tab="scenario"]'); click(t, '[data-tab="cadrage"]');
    ok(t.q("#saveState").textContent.trim() === "", "simple rendu ou changement d'onglet : pas de mention");
    const f = t.q('[data-fi="' + t.q("#ficheFields [data-fi]").dataset.fi + '"]'); f.value = "3"; f.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    ok(/Enregistré/.test(t.q("#saveState").textContent), "saisie dans la fiche Moyens : « Enregistré »");
    t.q("#saveState").textContent = "";
    click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="0"]'); setF(t, "gen.referent", "Adjoint");
    ok(/Enregistré/.test(t.q("#saveState").textContent), "saisie dans le PCS : « Enregistré »");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = open("bourg", "", null, { noStorage: true }); await wait(300); await pickCommune(t, "bourg");
    ok(t.q("#communeBar .cb-nom").textContent.trim() === "Mirepoix", "sans stockage : commune affichée");
    const f = t.q("#ficheFields [data-fi]"); f.value = "2"; f.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    ok(/Non conservé par ce navigateur/.test(t.q("#saveState").textContent) && !/Enregistré/.test(t.q("#saveState").textContent), "sans stockage : « Non conservé par ce navigateur »");
    await wait(2600); ok(/Non conservé par ce navigateur/.test(t.q("#saveState").textContent), "sans stockage : mention durable");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
  { const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); gen(t);
    click(t, '[data-tab="obs"]'); click(t, "#obsLinkBtn"); await wait(50); const link = t.clip.text;
    const o = open("bourg", link.slice(link.indexOf("#"))); await wait(300);
    const cb = o.q("#communeBar");
    ok(o.d.body.classList.contains("obsmode") && (!cb || cb.hidden) && !/Exemple fictif|Mirepoix|Changer/.test(o.q(".appbar").textContent), "mode observateur : ni commune ni bouton dans la barre");
    o.q("#oname").value = "Obs"; o.q("#oname").dispatchEvent(new o.w.Event("input", { bubbles: true }));
    ok(!o.q("#saveState") || o.q("#saveState").textContent.trim() === "", "mode observateur : pas de mention « Enregistré »");
    o.close(); t.close(); }
  { const m = (SRC.match(/@media \(max-width:620px\)\{\.espace\{[^\n]*/) || [""])[0];
    ok(/\.appbar \.logo\{flex:0 1000 auto/.test(m), "téléphone : le titre se replie avant le nom de la commune (« Mirepoix » ne se réduit pas à « M »)");
    ok(/\.cb-etat\{position:absolute;left:0;[^}]*max-width:calc\(100vw - 32px\)/.test(m), "téléphone : mention d'état ancrée à gauche, sans sortir de l'écran");
  }

  console.log("\nDÉMARRAGE GUIDÉ");
  { const t = open("bourg"); await wait(300);
    const g = t.q("#guide"), step = n => !t.q('#guide [data-gstep="' + n + '"]').hidden, mark = () => t.q("#gMark").textContent.trim();
    ok(!!g && !g.hidden && step(1) && !step(2) && !step(3), "premier lancement : démarrage guidé affiché, écran 1");
    ok(t.q("#view").hidden && t.q(".bar").hidden && t.q("#config").hidden && t.q("#pcsPanel").hidden, "premier lancement : dossier d'exemple et panneau masqués");
    ok(g.classList.contains("card") && g.parentNode === t.q("main.work") && !t.q("#guide [role=dialog]"), "carte dans l'espace de travail, sans fenêtre modale");
    ok(mark() === "Étape 1 sur 3" && t.d.activeElement && t.d.activeElement.id === "commune", "repère « Étape 1 sur 3 », curseur sur la recherche");
    ok(t.q('#guide [data-gstep="1"] #commune') && t.q('#guide [data-gstep="1"] #sugg') && t.q('#guide [data-gstep="1"] #manualId') && !t.q("#config #commune"), "recherche et saisie manuelle déplacées dans l'écran 1");
    ok(!t.q("#hello") && !/\.hello\b|helloBtn/.test(SRC), "bandeau « Ceci est un exemple » supprimé avec ses styles");
    ok(!t.q("#gExample").hidden && t.q("#gBack1").hidden && t.q("#gWarn").hidden, "exemple fictif : lien « Voir l'exemple », ni retour ni avertissement");
    click(t, "#gExample");
    ok(g.hidden && !t.q("#view").hidden && !t.q("#config").hidden && /Exemple fictif/.test(t.q("#communeBar").textContent), "« Voir l'exemple » ferme le parcours et laisse l'exemple");
    const aff = JSON.parse(t.w.localStorage.getItem("commune-prete-affichage"));
    ok(aff.guide === true, "parcours noté comme vu (champ guide)");
    const keep = {}; for (let i = 0; i < t.w.localStorage.length; i++) { const k = t.w.localStorage.key(i); keep[k] = t.w.localStorage.getItem(k) }
    ok(!t.w.localStorage.getItem("atelier-pcs-v2") || JSON.parse(t.w.localStorage.getItem("atelier-pcs-v2")).isExample !== false, "aucune donnée d'exercice modifiée par le parcours");
    t.close();
    const r = open("bourg", "", keep); await wait(300);
    ok(r.q("#guide").hidden && !r.q("#view").hidden, "au rechargement : le parcours n'est plus imposé");
    click(r, "#communeChange");
    ok(!r.q("#guide").hidden && !r.q('#guide [data-gstep="1"]').hidden && r.d.activeElement.id === "commune", "« Choisir ma commune » rouvre l'écran 1");
    ok(!r.errs.length, "aucune erreur JavaScript" + (r.errs.length ? " : " + r.errs[0] : "")); r.close(); }

  { const t = open("bourg"); await wait(300);
    const step = n => !t.q('#guide [data-gstep="' + n + '"]').hidden, mark = () => t.q("#gMark").textContent.trim();
    t.q("#commune").value = "Mir"; t.q("#commune").dispatchEvent(new t.w.Event("input")); await wait(350);
    ok(t.q("#commune").getAttribute("role") === "combobox" && t.q("#commune").getAttribute("aria-expanded") === "true" && !t.q("#sugg").hidden, "écran 1 : liste de suggestions en combobox");
    t.q("#commune").dispatchEvent(new t.w.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    ok(t.q("#commune").getAttribute("aria-activedescendant") === "sg-0", "écran 1 : flèche bas sur la première suggestion");
    t.q("#commune").dispatchEvent(new t.w.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await wait(700);
    ok(step(2) && !step(1) && mark() === "Étape 2 sur 3" && t.d.activeElement && t.d.activeElement.id === "gT2", "choix au clavier : écran 2, focus sur son titre");
    ok(/Mirepoix/.test(t.q("#communeBar").textContent) && t.q("#guide").hidden === false, "commune affichée dans la barre pendant le parcours");
    ok(/Préparer un exercice de crise/.test(t.q("#gChoixEx").textContent) && /Rédiger ou vérifier le plan communal de sauvegarde/.test(t.q("#gChoixPcs").textContent), "écran 2 : deux choix");
    click(t, "#gBack2"); ok(step(1) && t.d.activeElement.id === "commune", "« Retour » de l'écran 2 vers l'écran 1");
    ok(t.q("#gExample").hidden && !t.q("#gBack1").hidden, "commune choisie : plus de lien « Voir l'exemple », bouton « Retour »");
    click(t, "#gNext1"); ok(step(2), "écran 1 : « Continuer » avec la commune déjà choisie");
    ok(t.q("#gChoixPcs").getAttribute("aria-disabled") === "false" && !t.q("#gChoixPcs").hasAttribute("aria-describedby"), "commune trouvée : choix PCS actif, sans note « code INSEE » associée");
    click(t, "#gChoixEx");
    ok(step(3) && mark() === "Étape 3 sur 3" && t.d.activeElement && t.d.activeElement.id === "gT3", "« Préparer un exercice » : écran 3, focus sur son titre");
    { t.q("#gAutres").open = true; t.q("#gAutres summary").focus();
      const r = t.d.createElement("button"); r.id = "placesRetry"; t.d.body.appendChild(r); click(t, "#placesRetry"); r.remove(); await wait(700);
      ok(t.q("#gAutres").open && t.d.activeElement === t.q("#gAutres summary"), "lieux rechargés en arrière-plan : « Autres risques » reste ouvert, focus conservé") }
    const chk = t.q("#gRisks input:checked");
    ok(chk && chk.value === "inondation" && chk.name === "grisk" && /Recensé/.test(t.q("#gRisks").textContent), "risque recensé par Géorisques présélectionné");
    ok(t.d.querySelectorAll("#gRisks input[name=grisk]").length === 19 && !t.q("#gRisks #r-inondation"), "liste du parcours distincte de celle du panneau (19 risques)");
    ok(t.q('#gFormat [data-v="cadre"]').getAttribute("aria-pressed") === "true" && t.q("#gHeure").value === "09:00", "format « Cadre » et heure H 09:00 par défaut");
    const s2 = t.q("#gr-canicule"); s2.checked = true; s2.dispatchEvent(new t.w.Event("change", { bubbles: true }));
    click(t, '#gFormat [data-v="terrain"]'); t.q("#gDate").value = "2026-11-20"; t.q("#gHeure").value = "10:30";
    click(t, "#gBack3"); ok(step(2), "« Retour » de l'écran 3 vers l'écran 2"); click(t, "#gChoixEx");
    ok(t.q("#gr-canicule").checked && t.q('#gFormat [data-v="terrain"]').getAttribute("aria-pressed") === "true", "choix conservés après un retour");
    click(t, "#gGen");
    ok(t.q("#guide").hidden && !t.q("#view").hidden && !t.q("#config").hidden, "« Générer le dossier » ferme le parcours");
    ok(t.q("#tab-cadrage").getAttribute("aria-selected") === "true" && t.d.activeElement && t.d.activeElement.id === "tab-cadrage", "onglet Cadrage ouvert, focus sur l'onglet");
    const v = view(t);
    ok(/Mirepoix/.test(v) && /Canicule/.test(v) && /Exercice avec volet terrain/.test(v) && /H = 10:30/.test(v) && /20 novembre 2026/.test(v), "dossier généré avec la commune, le risque, le format, la date et l'heure");
    ok(t.q("#r-canicule").checked && t.q("#date").value === "2026-11-20" && t.q("#heureH").value === "10:30" && t.q('#segFormat [data-v="terrain"]').getAttribute("aria-pressed") === "true", "choix repris dans le panneau de préparation");
    ok(/réglages/i.test(t.q("#toast").textContent), "message sur les réglages fins");
    const st = JSON.parse(t.w.localStorage.getItem("atelier-pcs-v2")), aff = JSON.parse(t.w.localStorage.getItem("commune-prete-affichage"));
    ok(st.isExample === false && st.p.insee === "09194" && st.injects.length > 5 && aff.guide === true, "dossier enregistré, parcours noté comme vu");
    click(t, "#communeChange");
    ok(!t.q("#gWarn").hidden && /réglages d'exercice/.test(t.q("#gWarn").textContent) && /conservés/.test(t.q("#gWarn").textContent), "commune réelle déjà choisie : avertissement de remplacement");
    { const c = t.q("#commune"); ok(c.value === "Mirepoix" && c.selectionStart === 0 && c.selectionEnd === c.value.length, "« Changer » : commune actuelle sélectionnée, la frappe la remplace") }
    click(t, "#gBack1"); ok(t.q("#guide").hidden && !t.q("#view").hidden && /Mirepoix/.test(t.q("#communeBar").textContent), "« Retour » de l'écran 1 : parcours fermé, commune inchangée");
    click(t, '#espaceSeg [data-esp="pcs"]'); click(t, "#communeChange");
    ok(!t.q("#guide").hidden && !t.q('#guide [data-gstep="1"]').hidden && t.q("#pcsView").hidden && t.q("#pcsPanel").hidden, "« Changer » depuis l'espace PCS : écran 1");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg"); await wait(300); t.q("#commune").value = "Mir"; t.q("#commune").dispatchEvent(new t.w.Event("input")); await wait(350);
    t.q("#sugg li").dispatchEvent(new t.w.MouseEvent("mousedown", { bubbles: true })); await wait(700);
    click(t, "#gChoixPcs");
    ok(t.q("#guide").hidden && t.d.body.classList.contains("esp-pcs") && !t.q("#pcsView").hidden && !t.q("#pcsPanel").hidden, "« Rédiger ou vérifier le PCS » : espace PCS ouvert, parcours fermé");
    ok(t.q('#pcsRub [data-rub="0"]').getAttribute("aria-current") === "true" && t.q('#ptab-rediger').getAttribute("aria-selected") === "true" && !!t.q('[data-pf="gen.dateApprob"]'), "rubrique Généralités ouverte");
    ok(t.d.activeElement && t.d.activeElement.dataset.rub === "0", "focus sur la rubrique Généralités");
    ok(JSON.parse(t.w.localStorage.getItem("commune-prete-affichage")).guide === true, "parcours noté comme vu");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg", "", null, { offline: true }); await wait(300);
    ok(!t.q("#guide").hidden && !t.q("#manualId").hidden && !!t.q("#gManual"), "hors ligne : saisie manuelle dans l'écran 1");
    ok(t.q("#pop").value === "" && t.q("#dept").value === "", "hors ligne : champs vides, sans les valeurs de l'exemple fictif");
    click(t, "#gManual"); ok(!t.q('#guide [data-gstep="1"]').hidden && /nom de la commune/i.test(t.q("#toast").textContent), "hors ligne : nom obligatoire");
    t.q("#commune").value = "Belcaire"; t.q("#pop").value = "410"; t.q("#dept").value = "Aude (11)";
    t.q("#dept").dispatchEvent(new t.w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    ok(!t.q('#guide [data-gstep="2"]').hidden && /Belcaire/.test(t.q("#communeBar").textContent) && !/Exemple fictif/.test(t.q("#communeBar").textContent), "hors ligne : écran 2, commune saisie dans la barre");
    const st = JSON.parse(t.w.localStorage.getItem("atelier-pcs-v2"));
    ok(st.isExample === false && st.p.commune === "Belcaire" && String(st.p.pop) === "410" && st.p.dept === "Aude (11)" && !st.p.insee, "hors ligne : sortie de l'exemple fictif, nom, population et département enregistrés");
    ok(!t.q("#gPcsNote").hidden && /INSEE/.test(t.q("#gPcsNote").textContent) && t.q("#gChoixPcs").getAttribute("aria-describedby") === "gPcsNote", "hors ligne : l'espace PCS signalé comme nécessitant la recherche en ligne");
    click(t, "#gChoixEx"); ok(t.d.querySelectorAll("#gRisks input[name=grisk]").length === 19, "hors ligne : liste complète des risques");
    click(t, "#gGen"); const v = view(t);
    ok(t.q("#guide").hidden && /Belcaire/.test(v) && /410 habitants/.test(v) && /Aude \(11\)/.test(v) && !/fictive/.test(v), "hors ligne : dossier de la commune saisie");
    click(t, '#espaceSeg [data-esp="pcs"]'); ok(/Recherchez votre commune/.test(t.q("#pcsView").textContent), "hors ligne, sans code INSEE : espace PCS inchangé (invitation)");
    ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }

  { const t = open("bourg", "", null, { guideVu: true }); await wait(300); await pickCommune(t, "bourg"); gen(t);
    click(t, '[data-tab="obs"]'); click(t, "#obsLinkBtn"); await wait(50); const link = t.clip.text;
    const o = open("bourg", link.slice(link.indexOf("#"))); await wait(300);
    ok(o.d.body.classList.contains("obsmode") && (!o.q("#guide") || o.q("#guide").hidden) && !/Étape 1 sur 3/.test(o.d.body.textContent), "mode observateur : jamais de démarrage guidé");
    o.close(); t.close(); }

  console.log("\nAFFICHAGE");
  const v = open("bourg", "", null, { guideVu: true }); await wait(300);
  ok([...v.d.querySelectorAll(".tgrp")].map(x => x.textContent).join("/") === "Préparer/Conduire/Évaluer", "onglets regroupés en trois temps");
  click(v, "#panelBtn"); ok(v.d.body.classList.contains("panel-off") && v.q("#panelBtn").getAttribute("aria-pressed") === "true", "panneau de préparation masqué");
  click(v, "#panelBtn"); ok(!v.d.body.classList.contains("panel-off"), "panneau de préparation réaffiché");
  click(v, "#themeBtn"); ok(v.d.documentElement.dataset.theme === "light", "thème clair choisi");
  click(v, "#themeBtn"); ok(v.d.documentElement.dataset.theme === "dark", "thème sombre choisi");
  click(v, "#themeBtn"); ok(!v.d.documentElement.dataset.theme && /automatique/.test(v.q("#themeBtn").title), "retour au thème automatique");
  ok(/"theme":"auto"/.test(v.w.localStorage.getItem("commune-prete-affichage")), "choix d'affichage conservé");
  ok(!/Scénario disponible/.test(v.q("#risks").textContent), "liste des risques épurée");
  ok(/aide\.html$/.test(v.q("#helpLink").href), "bouton Aide vers le mode d'emploi");
  ok(!v.q("#hello") && v.q("#guide").hidden && !v.q("#view").hidden && /Exemple fictif/.test(v.q("#communeBar").textContent), "démarrage guidé déjà vu : dossier d'exemple affiché, signalé dans la barre, sans bandeau");
  click(v, "#dosDoc"); await wait(50);
  const ex = await new Promise(r => { const f = new v.w.FileReader(); f.onload = () => r(f.result); f.readAsText(v.blobs.pop()) });
  ok(/Exemple sur une commune fictive/.test(ex), "dossier d'exemple signalé comme fictif");
  await pickCommune(v, "bourg"); ok(v.q("#guide").hidden && !v.q("#view").hidden && !/Exemple fictif/.test(v.q("#communeBar").textContent), "démarrage guidé refermé une fois la commune choisie et le dossier généré");
  ok(!v.errs.length, "aucune erreur JavaScript" + (v.errs.length ? " : " + v.errs[0] : ""));
  v.close();

  console.log("\nRÉGLEMENTATION ET MODE D'EMPLOI");
  { const t = open("bourg", "", null, { guideVu: true }); await wait(300); click(t, '[data-tab="regl"]');
    ok(/2025-126/.test(view(t)) && /D731-14/.test(view(t)), "réglementation : décret de 2025 et correspondant incendie et secours");
    t.close(); }
  { const A = fs.readFileSync(path.join(__dirname, "..", "aide.html"), "utf8");
    ok(/id="rediger-et-verifier-le-pcs"/.test(A) && (A.match(/href="#rediger-et-verifier-le-pcs"/g) || []).length === 2, "aide : partie PCS et entrée aux deux sommaires"); }

  console.log(`\n${passes} réussis, ${failures} en échec`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error("ERREUR DU TEST :", e); process.exit(1) });

# Espace PCS : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objectif :** ajouter à Commune Prête un espace « PCS » pour rédiger un plan communal de sauvegarde pré-rempli, vérifier un PCS existant et produire quatre documents.

**Architecture :** tout reste dans `index.html` (HTML, CSS et JavaScript dans une seule fonction anonyme). Le code PCS forme un bloc séparé, commenté `/* ---------- Espace PCS ---------- */`, placé après le bloc « Mode observateur ». Il lit l'état partagé `S` (commune, lieux, annuaire, fiche Moyens) et enregistre ses données propres sous la clé `commune-prete-pcs`.

**Technique :** JavaScript sans bibliothèque (seule dépendance existante : Leaflet), tests de bout en bout dans jsdom (`tests/run.js`, `npm test`).

**Conception :** `docs/superpowers/specs/2026-10-12-espace-pcs-design.md` (à lire avec ce plan).

## Contraintes générales

- Un seul fichier `index.html` ; aucune nouvelle dépendance.
- Clés existantes inchangées : `atelier-pcs-v2`, `commune-prete-historique`, `commune-prete-obs-*`, `commune-prete-affichage` (qui reçoit seulement le champ `espace`).
- Nouvelle clé : `commune-prete-pcs`, objet indexé par code INSEE.
- Aucune donnée nominative de personne vulnérable.
- Version publique : ni annuaire, ni nom, ni numéro de téléphone, ni lieu de repli, ni liaisons du PCC, ni effectifs par secteur des personnes vulnérables.
- Textes en français, sobres ; accords et articles produits par les fonctions existantes `art()`, `nf()`, `cap()`.
- Identité visuelle inchangée : jetons de couleur `:root`, classes existantes (`.step`, `.chips`, `.seg`, `.kv`, `.callout`, `.tg`, `.btn`, `.checks`, `.cot`).
- Affichage correct à 400 px de large et en thème sombre ; contrôles accessibles au clavier, champs nommés.
- Chaque tâche se termine par `npm test` sans échec, puis un commit.
- Documents : fonctions existantes `dl()`, `dlMsg()`, `printHTML()`, `printCss()`, `fileBase()`.

## Points de vigilance

1. **Changement de commune pendant la rédaction** : le PCS affiché doit être celui du nouveau code INSEE, sans aucune valeur de l'ancien. Test : tâche 2.
2. **Navigateur sans stockage** : saisies gardées en mémoire, avertissement unique, aucune erreur. Test : tâche 2.
3. **Commune sans risque ni lieu recensé** (hameau) : rubriques vides à remplir, aucune valeur `undefined` ni accolade non remplacée dans les aperçus, fiches réflexes limitées aux fonctions. Test : tâche 4.
4. **Version publique** : un numéro de téléphone saisi dans un champ libre (ex. astreinte) ne doit pas fuiter. Test : tâche 6.
5. **Date d'approbation absente ou invalide** : l'échéance de révision affiche « date d'approbation à saisir », sans `Invalid Date`. Test : tâche 5.

---

### Task 1 (tâche 1) : sélecteur d'espaces et squelette de l'espace PCS

**Fichiers :**
- Modifier : `index.html` (barre d'application, CSS, bloc « Affichage : thème et panneau », `render()`)
- Tests : `tests/run.js` (nouvelle section `ESPACE PCS`, avant `AFFICHAGE`)

**Interfaces :**
- Produit : `AFF.espace` (`"exercices"` | `"pcs"`, défaut `"exercices"`) ; `setEspace(e: string): void` ; `renderPCS(): void` ; conteneurs `#pcsPanel` (aside) et `#pcsView` (section) ; onglets `#pcsTabs [data-ptab="rediger"|"verifier"|"documents"]` ; état d'onglet `PCSUI.tab` ; rubrique sélectionnée `PCSUI.rub` (entier 0 à 9).

- [ ] **Étape 1 : écrire les tests qui échouent**

```js
console.log("\nESPACE PCS");
{ const t = open("bourg"); await wait(300);
  ok(t.q('#espaceSeg [data-esp="exercices"]').getAttribute("aria-pressed") === "true", "espace Exercices par défaut");
  click(t, '#espaceSeg [data-esp="pcs"]');
  ok(t.d.body.classList.contains("esp-pcs") && !t.q("#pcsPanel").hidden && t.q("#config").hidden, "espace PCS affiché, panneau des exercices masqué");
  ok(/Recherchez votre commune/.test(t.q("#pcsView").textContent), "invitation à choisir la commune");
  ok(/"espace":"pcs"/.test(t.w.localStorage.getItem("commune-prete-affichage")), "choix d'espace conservé");
  click(t, '#espaceSeg [data-esp="exercices"]'); ok(!t.q("#config").hidden && t.q("#pcsPanel").hidden, "retour à l'espace Exercices");
  ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
```

- [ ] **Étape 2 : lancer `npm test`** — attendu : échec « élément absent : #espaceSeg [data-esp="exercices"] ».

- [ ] **Étape 3 : implémenter**
  - Dans `.tools-r` de la barre d'application, avant le lien Aide : `<div class="seg" id="espaceSeg" role="group" aria-label="Espace"><button type="button" data-esp="exercices">Exercices</button><button type="button" data-esp="pcs">PCS</button></div>`.
  - Ajouter `<aside class="config" id="pcsPanel" hidden aria-label="Rubriques du PCS">` dans `.shell` après `#config`, et `<section id="pcsView" hidden>` dans `main.work` après `#view`.
  - `setEspace(e)` : met `AFF.espace`, appelle `saveAff()`, bascule `body.esp-pcs`, `hidden` de `#config`, `.bar`, `.head`, `#view` d'un côté, `#pcsPanel`, `#pcsView` de l'autre, met `aria-pressed`, puis `render()` ou `renderPCS()`.
  - `applyAff()` appelle `setEspace(AFF.espace||"exercices")` sans sauvegarder une seconde fois.
  - `renderPCS()` : sans `S.p.insee` (ou `S.isExample`), affiche dans `#pcsView` une carte `.doc` avec « Recherchez votre commune dans l'espace Exercices pour construire son plan communal de sauvegarde. » et un bouton qui bascule vers Exercices et place le focus sur `#commune`. Sinon : en-tête `docHead("Plan communal de sauvegarde")`, onglets `#pcsTabs` (classe `.tab`, `role="tab"`, flèches gauche/droite comme `#tabs`), corps vide pour l'instant.
  - Le mode observateur (`body.obsmode`) masque `#espaceSeg`.

- [ ] **Étape 4 : lancer `npm test`** — attendu : tous les tests réussissent.

- [ ] **Étape 5 : commit** — `git commit -am "Espace PCS : sélecteur d'espaces et squelette"`

---

### Task 2 (tâche 2) : données du PCS, rubriques, saisie et avancement

**Fichiers :**
- Modifier : `index.html` (bloc Espace PCS)
- Tests : `tests/run.js`

**Interfaces :**
- Consomme : `renderPCS()`, `PCSUI` (tâche 1).
- Produit :
  - `PKEY = "commune-prete-pcs"` ; `pLoad(): object` ; `pSave(): boolean` (faux si le stockage est refusé ; données gardées dans `PMEM`) ;
  - `pcsCur(): object` — entrée du code INSEE courant, créée vide `{gen:{},risques:{},vuln:{},alerte:{},pcc:{},moyens:{cap:{}},reserve:{},prev:{plans:{}},fiches:{},maint:{},verif:{cot:{},actions:[]}}` ;
  - `PCS_RUB` : tableau de 10 objets `{id:number, titre:string, ref:string, loi:string, champs:Array<{k:string, label:string, type:"texte"|"date"|"ouinon"|"nombre"|"liste", req:boolean, public?:false}>}` ;
  - `pcsGet(path: string): any` et `pcsSet(path: string, v: any): void` (chemin « section.cle », ex. `"gen.dateApprob"`) ;
  - `rubState(id: number): "afaire"|"encours"|"complete"` ; `pcsTaux(): number` (0 à 100, part des champs `req` renseignés, valeurs pré-remplies comprises).
- Champs (clé, type, obligatoire) — libellés en français à partir de la conception, partie 5 :
  - 0 `gen` : `notifie` ouinon ; `dateNotif` date ; `infoConseil` date ; `dateApprob` date req ; `datePresent` date req ; `referent` texte req, public:false.
  - 1 `risques` : `ddrm` ouinon req ; `ppr` liste (« aucun », « prescrit », « approuvé ») ; `ppi` ouinon ; `locaux` texte.
  - 2 `vuln` : `detenteur` texte req ; `conservation` texte req ; `miseAJour` texte req ; `activation` texte req ; `effectifs` texte public:false.
  - 3 `alerte` : `astreinte` texte req, public:false ; `reglement` texte req ; `dicrim` date req.
  - 4 `pcc` : `lieu` texte req ; `repli` texte public:false ; `liaisons` texte public:false ; `mainCourante` ouinon ; `pics` texte.
  - 5 `moyens` : `cap.<nom du lieu>` nombre (au moins un requis) ; `transport` texte req ; `ravitaillement` texte req ; `prives` texte.
  - 6 `reserve` : `modalites` texte (req si la fiche Moyens indique des réservistes) ; `missions` texte ; `benevoles` texte req.
  - 7 `prev` : `services` texte req ; `plans.<nom>` ouinon.
  - 8 `fiches` : aucun champ de saisie (tâche 4).
  - 9 `maint` : `annuaireDate` date req ; `infoPublic` texte req.

- [ ] **Étape 1 : écrire les tests qui échouent**

```js
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
```

- [ ] **Étape 2 : lancer `npm test`** — attendu : échec « élément absent : #pcsRub [data-rub="0"] ».

- [ ] **Étape 3 : implémenter**
  - Panneau `#pcsPanel` : liste `<ol id="pcsRub">` de boutons `[data-rub]` avec `data-state` et une pastille (✓ complète, ◐ en cours, ○ à faire, doublée d'un texte `.sr`), puis `#pcsTaux` (« Avancement : 42 % »).
  - Onglet Rédiger : rubrique `PCSUI.rub` = titre, encadré `.callout` « Ce que la loi exige » (`loi` et `ref`), champs générés depuis `champs` avec `data-pf="section.cle"`, `<label for>` explicite.
  - Écoute `change` sur `#pcsView` : `pcsSet()`, `pSave()` ; si faux et pas encore averti, `toast("Ce navigateur ne conserve pas les données : utilisez les documents de l'onglet Documents pour garder votre travail.")` ; puis rafraîchir panneau et taux.
  - Une valeur est « renseignée » si elle n'est ni vide ni nulle (pré-remplie ou saisie).

- [ ] **Étape 4 : lancer `npm test`** — attendu : tous les tests réussissent.

- [ ] **Étape 5 : commit** — `git commit -am "Espace PCS : rubriques, saisie et avancement par commune"`

---

### Task 3 (tâche 3) : pré-remplissage et aperçu des rubriques

**Fichiers :**
- Modifier : `index.html` (bloc Espace PCS)
- Tests : `tests/run.js`

**Interfaces :**
- Consomme : `pcsGet`, `pcsSet`, `PCS_RUB` (tâche 2) ; `geoRisks`, `S.icpe`, `S.dams`, `S.nucs`, `S.quartiers`, `allEtabs()`, `S.places`, `S.annu`, `fv()`, `fn()`, `ALERTES`, `CONVS`, `partners()`, `actors()`, `hCommune()`, `nextDue()`, `MODELES`/`modeles()` existants.
- Produit :
  - `pcsAuto(): object` — valeurs pré-remplies `{chemin: {v:any, src:"Géorisques"|"carte"|"annuaire"|"fiche Moyens"|"historique"}}` ;
  - `pcsVal(path: string): any` — saisie si présente, sinon valeur de `pcsAuto()` ;
  - `rubApercu(id: number, opts?: {public:boolean}): string` — HTML de la rubrique telle qu'elle figurera dans le PCS ;
  - `pcsLists(): {risques:Array, etabs:Array, erp:Array, reseaux:Array, accueil:Array, plansTiers:Array, cellule:Array}`.
- Pré-remplissages :
  - 0 : commune, population, EPCI, PICS (fiche `pics`) ;
  - 1 : risques Géorisques avec arrêtés CatNat, installations classées soumises à autorisation ou Seveso, barrages et centrale à moins de 40 km, quartiers en zone inondable ;
  - 2 : établissements d'enseignement (`allEtabs()`, effectifs), EHPAD, santé, lieux recevant du public (`ERP_CATS`), postes électriques et ouvrages d'eau ;
  - 3 : annuaire (nombre de contacts, date d'import), moyens d'alerte de la fiche ;
  - 4 : cellules de la cellule de crise (mêmes six fonctions que `vRoles`) et titulaires (`holders()`) ;
  - 5 : fiche Moyens (élus, agents, véhicules, groupe électrogène, places, lits, conventions), salles et gymnases (catégories `salle` et `sport`) ;
  - 6 : effectif de réserve de la fiche ;
  - 7 : établissements devant avoir un plan propre : enseignement (« PPMS »), EHPAD (« plan bleu »), installations classées (« plan d'urgence de l'exploitant ») ;
  - 9 : dernier exercice et échéance (historique), actions correctives non soldées.
- Chaque valeur pré-remplie s'affiche avec `<span class="tg src">source</span>` ; l'aperçu se place sous les champs, titre « Aperçu dans le PCS ».

- [ ] **Étape 1 : écrire les tests qui échouent**

```js
{ const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]');
  click(t, '#pcsRub [data-rub="1"]'); const v1 = t.q("#pcsView").textContent;
  ok(/Inondation/.test(v1) && /Arterris/.test(v1) && /Seveso seuil bas/.test(v1) && /Géorisques/.test(v1), "analyse des risques pré-remplie");
  click(t, '#pcsRub [data-rub="2"]'); const v2 = t.q("#pcsView").textContent;
  ok(/Collège Victor Hugo/.test(v2) && /École privée Sainte-Marie/.test(v2) && /Médiathèque Jean-Jaurès/.test(v2), "enjeux pré-remplis");
  click(t, '#pcsRub [data-rub="7"]'); ok(/PPMS/.test(t.q("#pcsView").textContent), "plans des établissements à suivre");
  ok(!/undefined|NaN|\{\w+\}/.test(t.q("#pcsView").textContent), "aucun champ non rempli dans les aperçus");
  t.close(); }
```

- [ ] **Étape 2 : lancer `npm test`** — attendu : échec « analyse des risques pré-remplie ».

- [ ] **Étape 3 : implémenter** `pcsAuto`, `pcsVal`, `pcsLists`, `rubApercu` et leur affichage dans l'onglet Rédiger ; `rubState`/`pcsTaux` utilisent `pcsVal`.

- [ ] **Étape 4 : lancer `npm test`** — attendu : tous les tests réussissent.

- [ ] **Étape 5 : commit** — `git commit -am "Espace PCS : pré-remplissage et aperçu des rubriques"`

---

### Task 4 (tâche 4) : fiches réflexes

**Fichiers :**
- Modifier : `index.html` (bloc Espace PCS)
- Tests : `tests/run.js`

**Interfaces :**
- Consomme : `pcsGet`/`pcsSet` (tâche 2), `pcsLists` (tâche 3), `geoRisks`, `RISKS`, `CONSIGNES`, `fill()`, `actors()`, `etabsScen()`, `erpConcerned()`.
- Produit :
  - `FICHE_FONCTIONS` : six fonctions (Maire, directeur des opérations ; Responsable des actions communales ; Secrétariat et main courante ; Population et accueil ; Logistique et terrain ; Communication) ;
  - `fichesReflexes(): Array<{id:string, titre:string, type:"risque"|"fonction", blocs:{declenchement:string[], immediat:Array<{action:string, qui:string}>, suivi:string[], fin:string[]}}>` ;
  - texte modifié conservé dans `pcsCur().fiches[id]` (chaîne libre) ; bouton « Revenir au texte proposé ».
- Risques couverts : chaque risque de `geoRisks.items` dont la clé figure dans `RISKS` (hors « autre »), plus les risques transverses que l'utilisateur coche dans la rubrique (`canicule`, `coupure`, `cyber`, `sanitaire`, `terrorisme`). Phrase de consigne à la population : `fill(CONSIGNES[risque], S.p)`.

- [ ] **Étape 1 : écrire les tests qui échouent**

```js
{ const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="8"]');
  const v = t.q("#pcsView").textContent;
  ok(/Fiche réflexe : Inondation/.test(v) && /Montez dans les étages/.test(v), "fiche réflexe du risque recensé avec la consigne à la population");
  ok(/Fiche réflexe : Population et accueil/.test(v), "fiches par fonction");
  ok(/0 à 30 minutes/.test(v), "premières actions datées");
  t.close(); }
{ const t = open("hameau"); await wait(300); await pickCommune(t, "hameau"); click(t, '#espaceSeg [data-esp="pcs"]');
  for (let r = 0; r < 10; r++) { click(t, `#pcsRub [data-rub="${r}"]`); ok(!/undefined|NaN|\{\w+\}/.test(t.q("#pcsView").textContent), "hameau : rubrique " + r + " sans champ non rempli") }
  t.close(); }
```

- [ ] **Étape 2 : lancer `npm test`** — attendu : échec « fiche réflexe du risque recensé ».

- [ ] **Étape 3 : implémenter** `fichesReflexes()` et l'affichage de la rubrique 8 (une `<details>` par fiche, texte modifiable dans un `<textarea data-fiche="id">`). La rubrique 8 est complète quand chaque risque recensé a sa fiche et que les six fiches de fonction existent.

- [ ] **Étape 4 : lancer `npm test`** — attendu : tous les tests réussissent.

- [ ] **Étape 5 : commit** — `git commit -am "Espace PCS : fiches réflexes"`

---

### Task 5 (tâche 5) : vérification d'un PCS existant

**Fichiers :**
- Modifier : `index.html` (bloc Espace PCS)
- Tests : `tests/run.js`

**Interfaces :**
- Consomme : `pcsGet`/`pcsSet`, `PCSUI` (tâches 1-2).
- Produit :
  - `PCS_GRILLE` : `Array<{id:string, rub:number, texte:string, ref:string, grav:"loi"|"bp"}>` (liste ci-dessous, textes repris tels quels) ;
  - `verifResult(): {taux:number|null, cotes:number, manques:Array<{id, texte, ref, grav, v}>, echeance:Date|null, depassee:boolean}` — calculé sur les seuls points cotés : présent = 1, à compléter = 0,5, absent = 0, « sans objet » et points non cotés exclus (`taux` vaut `null` si aucun point n'est coté) ; `manques` = points cotés « absent » ou « à compléter » ; manques triés `loi` avant `bp`, puis absent avant à compléter ; échéance = `gen.dateApprob` + 5 ans ;
  - cotations dans `pcsCur().verif.cot[id]` (`"ok"|"part"|"ko"|"na"`) ; actions dans `pcsCur().verif.actions` (`{id, a, pilote, ech}`), une par manque, pilote « À désigner », échéance « À fixer », modifiables ; bouton `[data-gcomp="id"]` « Compléter » qui ouvre la rubrique `rub` dans Rédiger.
- Grille (id, rubrique, texte, référence, gravité) :
  - g1, 0, « Arrêté d'approbation du maire signé », R731-3 III, loi
  - g2, 0, « PCS transmis au préfet et au président de l'intercommunalité », R731-3 III, loi
  - g3, 0, « PCS présenté au conseil municipal depuis le renouvellement général de mars 2026 », R731-3 IV, loi
  - g4, 0, « Élu chargé de la sécurité civile ou correspondant incendie et secours désigné », D731-14, loi
  - r1, 1, « Risques du dossier départemental des risques majeurs repris », R731-1 III, loi
  - r2, 1, « PPR, PPI et cartes des surfaces inondables pris en compte », R731-1 III, loi
  - r3, 1, « Risques propres aux particularités locales analysés », R731-1 II, loi
  - r4, 1, « Carte des aléas et des enjeux jointe », bonne pratique, bp
  - e1, 2, « Recensement des personnes vulnérables : registre et modalités d'activation décrits », R731-2 1°, loi
  - e2, 2, « Établissements sensibles et lieux recevant du public recensés », R731-2 1°, loi
  - e3, 2, « Infrastructures sensibles recensées (eau, énergie, réseaux) », R731-2 1°, loi
  - a1, 3, « Réception de l'alerte des autorités organisée 24 h sur 24 », R731-2 2°, loi
  - a2, 3, « Annuaire opérationnel présent », R731-2 2°, loi
  - a3, 3, « Annuaire mis à jour depuis moins d'un an », R731-8 I, bp
  - a4, 3, « Règlement d'emploi des moyens d'alerte », R731-2 2°, loi
  - a5, 3, « DICRIM réalisé et inséré au PCS », R731-2 2°, loi
  - a6, 3, « Messages d'alerte et d'information préparés », bonne pratique, bp
  - c1, 4, « Organisation du poste de commandement communal », R731-2 4°, loi
  - c2, 4, « Lieu de repli du PCC prévu », bonne pratique, bp
  - c3, 4, « Titulaires et suppléants désignés pour chaque fonction », bonne pratique, bp
  - c4, 4, « Main courante prévue », bonne pratique, bp
  - m1, 5, « Inventaire des moyens propres de la commune », R731-2 6°, loi
  - m2, 5, « Moyens mobilisables auprès de tiers : transport, hébergement, ravitaillement », R731-2 6°, loi
  - m3, 5, « Capacité de chaque lieu d'accueil connue », bonne pratique, bp
  - m4, 5, « Utilisation des capacités de l'intercommunalité prévue », R731-2 6°, loi
  - v1, 6, « Modalités de mise en œuvre de la réserve communale (si elle existe) », R731-2 3°, loi
  - v2, 6, « Prise en compte des bénévoles spontanés », R731-2 3°, loi
  - p1, 7, « Actions préventives et correctives des services communaux », R731-2 5°, loi
  - p2, 7, « Dispositions des établissements et entreprises recensées (PPMS, plans bleus, plans d'urgence) », R731-2 5°, loi
  - f1, 8, « Dispositions spécifiques pour chaque risque recensé », R731-2 II, loi
  - f2, 8, « Fiches réflexes par fonction de la cellule de crise », bonne pratique, bp
  - o1, 9, « Révision datant de moins de cinq ans », R731-8 I, loi
  - o2, 9, « Exercice ou mise en œuvre réelle depuis moins de cinq ans, avec retour d'expérience », R731-8 III, D731-12, D731-13, loi
  - o3, 9, « Existence du PCS portée à la connaissance du public, version consultable », R731-8 V, loi
  - o4, 9, « Acteurs du plan informés régulièrement », R731-8 IV, loi

- [ ] **Étape 1 : écrire les tests qui échouent**

```js
{ const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsTabs [data-ptab="verifier"]');
  ok(t.d.querySelectorAll("[data-gv]").length === 35 * 4, "35 points de contrôle, quatre réponses chacun");
  ok(/date d'approbation à saisir/.test(t.q("#pcsView").textContent) && !/Invalid Date/.test(t.q("#pcsView").textContent), "échéance sans date d'approbation");
  click(t, '[data-gv="g1"][data-v="ok"]'); click(t, '[data-gv="g2"][data-v="part"]'); click(t, '[data-gv="g3"][data-v="ko"]'); click(t, '[data-gv="r4"][data-v="na"]');
  ok(/50 %/.test(t.q("#verifTaux").textContent), "taux : présent 1, à compléter 0,5, absent 0, sans objet exclu");
  ok(/présenté au conseil municipal/.test(t.q("#verifManques").textContent), "manque légal listé");
  click(t, '[data-gcomp="g3"]'); ok(t.q('#pcsTabs [data-ptab="rediger"]').getAttribute("aria-selected") === "true" && t.q('#pcsRub [data-rub="0"]').getAttribute("aria-current") === "true", "bouton Compléter vers la rubrique");
  click(t, '#pcsRub [data-rub="0"]'); const f = t.q('[data-pf="gen.dateApprob"]'); f.value = "2020-01-10"; f.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  click(t, '#pcsTabs [data-ptab="verifier"]'); ok(/10 janvier 2025/.test(t.q("#pcsView").textContent) && /dépassée/.test(t.q("#pcsView").textContent), "échéance de révision dépassée signalée");
  ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
```

- [ ] **Étape 2 : lancer `npm test`** — attendu : échec « 35 points de contrôle ».

- [ ] **Étape 3 : implémenter** l'onglet Vérifier : groupes par rubrique (`.obsg`), chaque point avec `<details>` pour l'exigence, groupe `.cot` de quatre boutons `[data-gv][data-v]` « Présent », « À compléter », « Absent », « Sans objet » ; synthèse `#verifTaux`, `#verifManques`, échéance ; plan de mise à jour en tableau éditable (même forme que le plan d'actions du RETEX).

- [ ] **Étape 4 : lancer `npm test`** — attendu : tous les tests réussissent.

- [ ] **Étape 5 : commit** — `git commit -am "Espace PCS : vérification d'un PCS existant"`

---

### Task 6 (tâche 6) : documents

**Fichiers :**
- Modifier : `index.html` (bloc Espace PCS)
- Tests : `tests/run.js`

**Interfaces :**
- Consomme : `rubApercu(id, {public})` (tâche 3), `fichesReflexes()` (tâche 4), `verifResult()` (tâche 5), `dl`, `dlMsg`, `printHTML`, `printCss`, `fileBase`, `MARK_PRINT`, `S.annu`.
- Produit : `pcsHTML(opts: {public: boolean}): string` ; `arreteHTML(): string` ; `verifHTML(): string`. Boutons de l'onglet Documents : `#pcsDoc`/`#pcsDocPdf` (PCS complet), `#pcsPub`/`#pcsPubPdf` (version publique), `#pcsArr` (arrêté et courrier, Word), `#pcsVer`/`#pcsVerPdf` (rapport de vérification). Noms de fichier : `fileBase()` avec le préfixe `pcs`, `pcs-public`, `arrete-pcs`, `verification-pcs`.
- Version publique : `rubApercu` omet les champs `public:false`, l'annexe annuaire, les titulaires des fonctions et toute chaîne qui ressemble à un numéro de téléphone (`/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/`, remplacée par « [numéro non publié] »).
- Arrêté (texte fixe, à faire relire) : « ARRÊTÉ MUNICIPAL N° [numéro] portant approbation du plan communal de sauvegarde », visas du code général des collectivités territoriales (L2212-2) et du code de la sécurité intérieure (L731-3, R731-1 à R731-8), articles : approbation ; consultation en mairie de la version publique ; transmission au préfet et au président de l'intercommunalité ; révision au plus tard dans cinq ans ; puis courrier de transmission au préfet (nom tiré de `partners().pref`) avec copie au président de l'intercommunalité (`S.p.epci`).

- [ ] **Étape 1 : écrire les tests qui échouent**

```js
{ const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400);
  t.q("#annuPaste").value = "Nom\tFonction\tTéléphone\nJean Martin\tMaire\t06 11 22 33 44"; click(t, "#annuImport");
  click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="3"]');
  const a = t.q('[data-pf="alerte.astreinte"]'); a.value = "Astreinte élus : 06 98 76 54 32"; a.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  click(t, '#pcsTabs [data-ptab="documents"]'); click(t, "#pcsDoc"); click(t, "#pcsPub"); click(t, "#pcsArr"); await wait(80);
  const [full, pub, arr] = await Promise.all(t.blobs.slice(-3).map(b => new Promise(r => { const f = new t.w.FileReader(); f.onload = () => r(f.result); f.readAsText(b) })));
  ok(/Plan communal de sauvegarde/.test(full) && /Jean Martin/.test(full) && /Fiche réflexe/.test(full), "PCS complet avec annuaire et fiches");
  ok(!/Jean Martin/.test(pub) && !/06 11 22 33 44|06 98 76 54 32/.test(pub) && /numéro non publié/.test(pub), "version publique sans nom ni numéro");
  click(t, '#pcsTabs [data-ptab="verifier"]'); click(t, '[data-gv="a5"][data-v="ko"]'); click(t, '#pcsTabs [data-ptab="documents"]'); click(t, "#pcsVer"); await wait(80);
  const ver = await new Promise(r => { const f = new t.w.FileReader(); f.onload = () => r(f.result); f.readAsText(t.blobs[t.blobs.length - 1]) });
  ok(/Rapport de vérification/.test(ver) && /DICRIM réalisé et inséré au PCS/.test(ver), "rapport de vérification avec les manques");
  ok(/ARRÊTÉ MUNICIPAL/.test(arr) && /Préfecture de l'Ariège|préfet de l'Ariège/.test(arr) && /Pays de Mirepoix/.test(arr), "arrêté et courrier de transmission");
  ok(!t.errs.length, "aucune erreur JavaScript" + (t.errs.length ? " : " + t.errs[0] : "")); t.close(); }
```

- [ ] **Étape 2 : lancer `npm test`** — attendu : échec « élément absent : #pcsDoc ».

- [ ] **Étape 3 : implémenter** l'onglet Documents (une carte par document : titre, destinataires, boutons Word et PDF) et les trois fonctions de génération, avec la feuille `printCss()` et une page de garde comme `dossierHTML()`.

- [ ] **Étape 4 : lancer `npm test`** — attendu : tous les tests réussissent.

- [ ] **Étape 5 : commit** — `git commit -am "Espace PCS : documents (PCS complet, version publique, arrêté, vérification)"`

---

### Task 7 (tâche 7) : lien avec les exercices

**Fichiers :**
- Modifier : `index.html` (`vCadrage`, `ficheVars`/`checks`, rubrique 9 du bloc PCS)
- Tests : `tests/run.js`

**Interfaces :**
- Consomme : `pcsCur()`, `pcsVal()` (tâches 2-3), `hCommune()`.
- Produit : `pcsForExercise(): {pcc:string|null, capAccueil:number|null}` — lieu du PCC et capacité saisie du lieu d'accueil retenu (`S.p.heberg`).
- Effets :
  - convention d'exercice : ligne « Poste de commandement communal » avec `pcc` quand il est renseigné ;
  - `fn(p,"cap")` reste prioritaire ; à défaut, la capacité du PCS alimente le message de saturation et le point de cohérence existants ;
  - rubrique 9 : les actions correctives non soldées des exercices archivés s'affichent sous « Mises à jour issues des exercices ».

- [ ] **Étape 1 : écrire les tests qui échouent**

```js
{ const t = open("bourg"); await wait(300); await pickCommune(t, "bourg"); await wait(400); click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="4"]');
  const l = t.q('[data-pf="pcc.lieu"]'); l.value = "Salle du conseil, mairie"; l.dispatchEvent(new t.w.Event("change", { bubbles: true }));
  click(t, '#espaceSeg [data-esp="exercices"]'); click(t, '[data-tab="cadrage"]');
  ok(/Poste de commandement communal/.test(view(t)) && /Salle du conseil, mairie/.test(view(t)), "lieu du PCC repris dans la convention d'exercice");
  gen(t); click(t, '[data-tab="retex"]'); click(t, "#archBtn"); click(t, "#archBtn");
  click(t, '#espaceSeg [data-esp="pcs"]'); click(t, '#pcsRub [data-rub="9"]');
  ok(/Mettre à jour l'annuaire de crise du PCS/.test(t.q("#pcsView").textContent), "actions correctives du RETEX dans le PCS");
  t.close(); }
```

- [ ] **Étape 2 : lancer `npm test`** — attendu : échec « lieu du PCC repris ».

- [ ] **Étape 3 : implémenter** `pcsForExercise()` et ses trois usages.

- [ ] **Étape 4 : lancer `npm test`** — attendu : tous les tests réussissent.

- [ ] **Étape 5 : commit** — `git commit -am "Espace PCS : lien avec les exercices"`

---

### Task 8 (tâche 8) : réglementation, mode d'emploi, vérifications finales et publication

**Fichiers :**
- Modifier : `index.html` (table `REGL`, constante `VERIF`), `aide.html`, `README.md`
- Tests : `tests/run.js`

**Interfaces :**
- Consomme : l'ensemble des tâches précédentes.

- [ ] **Étape 1 : écrire les tests qui échouent**

```js
{ const t = open("bourg"); await wait(300); click(t, '[data-tab="regl"]');
  ok(/2025-126/.test(view(t)) && /D731-14/.test(view(t)), "réglementation : décret de 2025 et correspondant incendie et secours");
  t.close(); }
{ const A = fs.readFileSync(path.join(__dirname, "..", "aide.html"), "utf8");
  ok(/id="rediger-et-verifier-le-pcs"/.test(A) && /href="#rediger-et-verifier-le-pcs"/.test(A), "aide : partie PCS et entrée au sommaire"); }
```

- [ ] **Étape 2 : lancer `npm test`** — attendu : échec « réglementation : décret de 2025 ».

- [ ] **Étape 3 : implémenter**
  - `REGL` : l'entrée « Code de la sécurité intérieure, art. D731-9 à D731-13 » mentionne « rédaction issue du décret n° 2025-126 du 12 février 2025 » ; l'entrée « Décret n° 2022-1532 du 8 décembre 2022 » devient « Décret n° 2025-126 du 12 février 2025 » (objet : exercices des PCS et PICS, association de la population, retour d'expérience ; lien de recherche `https://www.legifrance.gouv.fr/search/all?query=d%C3%A9cret%202025-126`, à remplacer par le lien direct quand Jordan l'aura relevé sur Légifrance) ; nouvelle entrée « Code de la sécurité intérieure, art. D731-14 » (correspondant incendie et secours désigné dans les six mois suivant l'installation du conseil municipal), statut « En vigueur ».
  - `VERIF` : « 12 octobre 2026 » ; pastille de l'en-tête mise à jour.
  - `aide.html` : section `id="rediger-et-verifier-le-pcs"` (rubriques, pré-remplissage, vérification, documents, version publique, personnes vulnérables sans noms) et entrée dans les deux sommaires.
  - `README.md` : espace PCS et clé `commune-prete-pcs` dans la liste des clés.

- [ ] **Étape 4 : lancer `npm test`** — attendu : tous les tests réussissent.

- [ ] **Étape 5 : vérifications visuelles** — script Playwright local (400 px et 1280 px, thèmes clair et sombre) sur les trois onglets de l'espace PCS : aucun débordement horizontal (`scrollWidth` égal à la largeur), captures relues.

- [ ] **Étape 6 : commit, envoi et publication**
  - `git commit -am "Espace PCS : réglementation actualisée, mode d'emploi"` ; `git push origin main` ; contrôle « Tests » de GitHub Actions réussi.
  - Copie Claude : `sed -n '/<!-- debut-contenu -->/,/<!-- fin-contenu -->/p' index.html | sed '1d;$d' > artifact.html`, puis republication sur l'artifact existant (capacité `downloads` conservée).

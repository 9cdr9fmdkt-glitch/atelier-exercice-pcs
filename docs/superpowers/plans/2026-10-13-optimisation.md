# Optimisation (simplicité d'usage) : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objectif :** rendre Commune Prête immédiatement utilisable par une secrétaire de mairie : démarrage guidé, commune dans la barre du haut, panneau allégé, étape suivante, saisie unique entre les deux espaces.

**Architecture :** tout reste dans `index.html`. Les nouveaux éléments réutilisent les classes existantes. Le démarrage guidé est une carte rendue dans `main.work` (pas de fenêtre modale). Le champ `#commune` et sa liste `#sugg` sont déplacés dans l'écran 1 du parcours en gardant leurs identifiants, pour conserver le code de recherche existant (`showSugg`, `pick`, navigation clavier).

**Technique :** JavaScript sans bibliothèque, tests jsdom (`tests/run.js`, `npm test`).

**Conception :** `docs/superpowers/specs/2026-10-13-optimisation-design.md` (à lire avec ce plan).

## Contraintes générales

- Identité visuelle, nom, couleurs, polices, marquage d'exercice inchangés.
- Clés `atelier-pcs-v2`, `commune-prete-historique`, `commune-prete-obs-*`, `commune-prete-pcs` inchangées. Seul ajout : champ `guide` (booléen) dans `commune-prete-affichage`.
- Contenu doctrinal inchangé (LIB, CRIT, REGL, CASC, CONSIGNES, modèles d'arrêtés, fiches réflexes, grille).
- Affichage correct à 400 px et en thème sombre ; contrôles accessibles au clavier, champs nommés, `aria-live` pour la mention « Enregistré ».
- Copie Claude et mode hors ligne : saisie manuelle de la commune possible.
- Chaque tâche : tests ajoutés d'abord, `npm test` sans échec, puis commit « Optimisation : <tâche> ».

## Points de vigilance

1. **Tests existants** : le démarrage guidé s'affiche au premier lancement et masque le dossier d'exemple. Le helper `pickCommune` doit ouvrir le parcours (bouton « Changer ») si `#commune` n'est pas visible, puis fermer le parcours en choisissant « Préparer un exercice » ou en le passant ; ajouter une option `open(..., {guideVu:true})` qui pré-remplit `commune-prete-affichage` avec `guide:true` pour les tests qui veulent l'ancien comportement. Aucun test existant ne doit être supprimé ; ceux du bandeau `#hello` sont réécrits pour le parcours.
2. **Mode observateur** (`#obs=`) : ni parcours, ni commune dans la barre, ni mention « Enregistré ».
3. **Changement de commune pendant une conduite d'exercice** : comportement actuel conservé (remise à zéro des réglages d'exercice) ; le PCS du code INSEE précédent reste intact.
4. **Stockage refusé** : la mention devient « Non conservé par ce navigateur », sans erreur.

---

### Tâche 1 : commune dans la barre du haut et mention « Enregistré »

**Fichiers :** `index.html` (barre `.appbar`, styles, `save()`, `pSave()`, `hSave()`), `tests/run.js`.

- [ ] Tests : la barre affiche « Exemple fictif » et « Choisir ma commune » au départ ; après choix de Mirepoix, « Mirepoix » et « Changer » ; présents dans les deux espaces ; absents en mode observateur ; après une saisie (fiche Moyens), `#saveState` contient « Enregistré » ; avec `noStorage`, « Non conservé par ce navigateur ».
- [ ] Ajouter dans `.tools-r`, avant `#espaceSeg`, un bloc `#communeBar` : nom (`.cb-nom`, tronqué par `text-overflow`), bouton `#communeChange` (`btn sm ghost`), et `#saveState` (`note`, `aria-live="polite"`).
- [ ] `renderCommuneBar()` appelée par `render()`, `renderPCS()`, `pick()`.
- [ ] `save()` renvoie vrai ou faux ; une fonction `saved(ok)` affiche « Enregistré » 2 s (classe d'estompage) ou le message durable en cas d'échec. Brancher sur `save()`, `pSave()` et `hSave()` pour les saisies de l'utilisateur (pas à chaque rendu : ne l'appeler que depuis les gestionnaires d'événements de saisie).
- [ ] Sur téléphone (≤ 620 px), le nom se tronque à 12 caractères environ ; les pastilles d'état restent masquées comme aujourd'hui.
- [ ] `npm test`, commit.

### Tâche 2 : démarrage guidé

**Fichiers :** `index.html` (HTML de `main.work`, styles, démarrage, `pick()`), `tests/run.js`.

- [ ] Tests : premier lancement → `#guide` visible, `#view` et le panneau masqués ; « Voir l'exemple » ferme et ne le réaffiche pas au rechargement ; parcours exercice (Mirepoix → exercice → risque présélectionné, format Cadre, date → « Générer le dossier ») → dossier généré, onglet Cadrage, parcours fermé ; parcours PCS → espace PCS, rubrique 1 ; « Changer » depuis l'espace PCS ouvre l'écran 1 ; avertissement de remplacement quand une commune réelle est déjà choisie ; hors ligne : saisie manuelle nom, population, département, puis écran 2.
- [ ] HTML : `<section id="guide" class="card doc" hidden>` dans `main.work`, avant `.bar`, contenant trois écrans (`data-gstep="1|2|3"`), un repère « Étape n sur 3 », boutons « Retour » et principal. Déplacer `#commune`, `#sugg` et `#manualId` du panneau dans l'écran 1.
- [ ] Écran 1 : recherche ; si `live===false`, champs manuels et bouton « Continuer » ; lien « Voir l'exemple » (seulement si l'exemple est affiché). `pick()` passe ensuite à l'écran 2 au lieu de rendre le dossier.
- [ ] Écran 2 : deux boutons larges (`btn`, pleine largeur) « Préparer un exercice de crise » et « Rédiger ou vérifier le plan communal de sauvegarde ».
- [ ] Écran 3 : liste des risques (réutiliser le rendu de `renderRisks` dans un conteneur `#gRisks`, mêmes noms de champ radio sous un autre `name` pour ne pas entrer en conflit), `#segFormat` cloné en `#gFormat`, date, heure H ; « Générer le dossier » recopie les choix dans `S.p`, appelle `generate()`, `S.tab="cadrage"`, ferme le parcours.
- [ ] `openGuide(step)`, `closeGuide()` ; `AFF.guide=true` dès la fermeture. Au démarrage : ouvrir si `S.isExample && !AFF.guide`. Supprimer le bandeau `#hello` et ses styles.
- [ ] Mettre à jour le helper `pickCommune` et ajouter l'option `guideVu` (voir vigilance 1) ; réécrire les deux tests du bandeau `#hello`.
- [ ] `npm test`, commit.

### Tâche 3 : panneau Exercices allégé

**Fichiers :** `index.html` (panneau `#config`, `renderRisks`), `tests/run.js`.

- [ ] Tests : seules les étapes Commune, Risque joué, Format et horaires sont dépliées ; un `details#avance` « Réglages avancés » contient cascade, objectifs, lieux, annuaire, moyens, partenaires ; leurs résumés (« 7 sur 7 », nombre de contacts, « n sur 9 ») restent visibles ; avec Géorisques répondant, les risques non recensés sont dans `details#autresRisques`, ouvert si le risque choisi y est.
- [ ] L'étape 1 du panneau ne garde que `#idcard`.
- [ ] Déplacer cascade et objectifs dans des `details.more` à l'intérieur de `#avance` ; renuméroter les étapes visibles 1 à 3, `#avance` sans numéro.
- [ ] `renderRisks` : quand `prof` existe, regrouper les risques non recensés (hors risques transverses et à site, qui restent visibles) sous `#autresRisques`.
- [ ] `npm test`, commit.

### Tâche 4 : étape suivante

**Fichiers :** `index.html` (`render()`, `renderRediger()`, `cleanView()`, styles d'impression), `tests/run.js`.

- [ ] Tests : chaque onglet Exercices sauf « Réglementation » se termine par `[data-next]` portant le nom de l'onglet suivant ; un clic change d'onglet et place le focus sur l'onglet ; rubriques PCS 0 à 8 : « Rubrique suivante », rubrique 9 : « Vérifier le PCS » ; le dossier Word, le PCS Word et le texte copié ne contiennent ni « Suivant : » ni « Rubrique suivante ».
- [ ] Ajouter le bouton dans `render()` après `VIEWS[S.tab]()` (dans l'`article`, classe `next`), et dans `renderRediger()`.
- [ ] `cleanView()` et `@media print` retirent `.next`.
- [ ] `npm test`, commit.

### Tâche 5 : rubriques PCS sans commune

**Fichiers :** `index.html` (`renderPCS`, `renderPcsPanel`), `tests/run.js`.

- [ ] Tests : sans commune, le sommaire est cliquable ; chaque rubrique affiche « Ce que la loi exige » et sa référence, aucun champ de saisie, un bouton « Choisir ma commune » qui ouvre le parcours à l'écran 1 ; les onglets Vérifier et Documents sont désactivés (`aria-disabled`) avec une note ; aucune écriture dans `commune-prete-pcs`.
- [ ] Rendre la structure à onglets même sans commune ; `renderRediger()` en mode lecture seule quand `!S.p.insee||S.isExample`.
- [ ] `npm test`, commit.

### Tâche 6 : saisie unique entre les deux espaces

**Fichiers :** `index.html` (`renderFiche`, `renderAnnu`, `renderRediger`), `tests/run.js`.

- [ ] Tests : rubrique 3 : bouton « Modifier l'annuaire et les moyens d'alerte » ouvrant l'import d'annuaire (coller, fichier CSV, vider) et les puces des moyens d'alerte ; rubrique 5 : champs numériques et listes de la fiche Moyens ; rubrique 6 : réservistes ; une modification depuis le PCS se retrouve dans le panneau Exercices et inversement ; l'aperçu PCS se met à jour ; la mention « Enregistré » apparaît.
- [ ] Factoriser `renderFiche` en `ficheFieldsHTML(keys, prefix)` (préfixe d'identifiants pour éviter les doublons d'`id`) et l'import d'annuaire en `annuHTML(prefix)` ; gestionnaires d'événements délégués communs (`data-fi`, `data-fic`, `data-annu`).
- [ ] Dans `renderRediger()`, un `details.more` « Modifier » par rubrique concernée ; après changement : `save()`, `updateApercu()`, `updatePcsPanel()`, `renderFiche()`/`renderAnnu()` côté panneau.
- [ ] `npm test`, commit.

### Tâche 7 : mode d'emploi, README et revue de la tâche

**Fichiers :** `aide.html`, `README.md`, `tests/run.js`.

- [ ] Test : `aide.html` contient la section « Démarrer en trois étapes » et l'entrée correspondante au sommaire.
- [ ] `aide.html` : section « Démarrer en trois étapes » ; mise à jour des passages sur la recherche de commune (bouton « Changer »), le panneau (« Réglages avancés »), l'espace PCS (lecture sans commune, modification des moyens et de l'annuaire).
- [ ] `README.md` : mention du champ `guide` dans `commune-prete-affichage`.
- [ ] Revue complète de la branche (relecture indépendante) : accessibilité clavier, 400 px, thème sombre, copie Claude (aucun lien externe ajouté), mode observateur.
- [ ] `npm test`, commit.

### Intégration (après accord de Jordan)

- Fusion de `optimisation` dans `main`, `npm test`, push, contrôle GitHub Actions « Tests », copie artifact régénérée et republiée sur la même adresse.

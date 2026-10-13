# Optimisation : simplicité d'usage — conception

Date : 13 octobre 2026. Statut : conception validée en conversation avec Jordan, à relire avant le plan de réalisation.

## 1. Objet

Rendre Commune Prête immédiatement utilisable par une **secrétaire de mairie** : peu de temps, pas spécialiste de la crise, besoin d'un parcours guidé et de peu de choix à faire.

Gênes retenues par Jordan : **prise en main**, **navigation**, **saisie**. La rapidité et la revue complète habituelle sont traitées après, dans le même chantier, sans changement visible.

## 2. Décisions prises

| Sujet | Décision |
|---|---|
| Utilisateur de référence | Secrétaire de mairie |
| Ampleur | Parcours guidé ajouté ; l'interface actuelle reste accessible |
| Prise en main | Démarrage guidé en trois écrans |
| Navigation | Commune affichée dans la barre du haut, commune aux deux espaces ; bouton « Étape suivante » ; rubriques PCS consultables sans commune |
| Saisie | Panneau Exercices allégé ; aucune donnée demandée deux fois ; mention « Enregistré » |

## 3. Contraintes inchangées

- Identité visuelle, nom de l'outil, couleurs, polices, marquage d'exercice : inchangés. Les nouveaux éléments réutilisent les composants existants (`card`, `btn`, `seg`, `chip`, `note`, `callout`).
- Données sauvegardées : clés `atelier-pcs-v2`, `commune-prete-historique`, `commune-prete-obs-*`, `commune-prete-pcs` inchangées dans leur structure. Seul ajout rétrocompatible : le champ `guide` dans `commune-prete-affichage` (le démarrage guidé a été vu ou passé).
- Contenu doctrinal (LIB, CRIT, REGL, CASC, CONSIGNES, modèles d'arrêtés, fiches réflexes, grille) : inchangé.
- Fonctionnement hors ligne et dans la copie Claude : conservé (saisie manuelle de la commune quand les bases publiques ne répondent pas).
- `aide.html` mis à jour ; un test dans `tests/run.js` par comportement nouveau et par bug corrigé.

## 4. Démarrage guidé

### 4.1 Quand il apparaît

- Au premier lancement (exemple fictif affiché, `guide` absent) : il s'affiche à la place du dossier, panneau de préparation masqué. Le bandeau « Ceci est un exemple… » actuel disparaît, remplacé par ce parcours.
- À tout moment, par le bouton « Changer » de la commune dans la barre du haut (§ 5.1) : il s'ouvre à l'écran 1.
- Un lien « Voir l'exemple » à l'écran 1 ferme le parcours et laisse l'exemple fictif ; `guide` est alors noté pour ne plus l'imposer.

### 4.2 Les trois écrans

Une carte centrée, sobre, avec un repère « Étape 1 sur 3 », un bouton principal et un bouton « Retour ».

1. **Votre commune.** Champ de recherche identique à l'actuel (suggestions geo.api.gouv.fr, clavier, accessibilité). Hors ligne : nom, population et département saisis à la main. Le choix déclenche les chargements habituels (Géorisques, carte, établissements) en arrière-plan.
2. **Que voulez-vous faire ?** Deux grands choix :
   - « Préparer un exercice de crise » → écran 3 ;
   - « Rédiger ou vérifier le plan communal de sauvegarde » → ouvre l'espace PCS, rubrique 1 (Généralités), et ferme le parcours.
3. **Votre exercice.**
   - Risque : les risques recensés par Géorisques pour la commune, le premier présélectionné (même règle qu'aujourd'hui) ; pendant le chargement, un message d'attente ; sans réponse, la liste complète.
   - Format : sélecteur actuel (Sur table, Cadre, Avec terrain, Alerte), « Cadre » par défaut.
   - Date et heure H (09:00 par défaut).
   - Bouton « Générer le dossier » : génère comme aujourd'hui, ouvre l'onglet Cadrage, ferme le parcours ; un message rappelle que les réglages fins sont dans « Réglages avancés ».

### 4.3 Changement de commune

Si une commune réelle est déjà choisie, l'écran 1 indique que les réglages d'exercice de la commune actuelle seront remplacés ; le PCS, rangé par code INSEE, et l'historique sont conservés. Le comportement de remise à zéro reste celui de la recherche actuelle.

## 5. Navigation

### 5.1 Commune dans la barre du haut

- À droite du sélecteur « Exercices | PCS » : nom de la commune et bouton « Changer » (ouvre le démarrage guidé, écran 1). Sur téléphone, le nom se tronque.
- Exemple fictif : « Exemple fictif » et bouton « Choisir ma commune ».
- Le champ de recherche disparaît du panneau Exercices : l'étape 1 du panneau ne garde que la fiche d'identité (code INSEE, population, département) et, hors ligne, les champs de saisie manuelle.
- Effet : la recherche de commune devient possible depuis l'espace PCS (point reporté le 12/10).

### 5.2 Étape suivante

- En bas de chaque pièce de l'espace Exercices : « Suivant : <nom de l'onglet suivant> » ; rien sur la dernière (Réglementation).
- En bas de chaque rubrique de l'espace PCS : « Rubrique suivante : <n>. <titre> » ; sur la dernière, « Vérifier le PCS ».
- Ces boutons n'apparaissent pas à l'impression ni dans les documents produits.

### 5.3 Rubriques PCS sans commune

Sans commune choisie, l'espace PCS affiche le sommaire et, pour chaque rubrique, « Ce que la loi exige » et la référence, avec un bouton « Choisir ma commune » à la place des champs. Les onglets Vérifier et Documents restent réservés à une commune choisie (point reporté le 12/10).

## 6. Saisie

### 6.1 Panneau Exercices allégé

Toujours visibles :
1. Commune (fiche d'identité) ;
2. Risque joué : risques recensés en tête ; quand Géorisques a répondu, les risques non recensés sont repliés sous « Autres risques » (ouvert automatiquement si le risque choisi s'y trouve) ;
3. Format et horaires (inchangé).

Repliés sous un seul « Réglages avancés » : effets en cascade, objectifs évalués, lieux utilisés dans le scénario, annuaire de crise, moyens de la commune, partenaires. Chaque ligne du repli garde son résumé (« 7 sur 7 », « 12 contacts », « 4 sur 9 »).

### 6.2 Aucune donnée demandée deux fois

- La fiche « Moyens de la commune » et l'annuaire de crise sont les mêmes données (`S.p.fiche`, `S.annu`) dans les deux espaces. Ils deviennent **modifiables depuis l'espace PCS** : rubrique 3 (annuaire et moyens d'alerte), rubrique 5 (moyens), rubrique 6 (réserve), au moyen d'un bouton « Modifier » qui ouvre les mêmes champs que dans le panneau Exercices.
- Les valeurs pré-remplies restent signalées par leur source (« carte », « Géorisques », « fiche Moyens », « annuaire »).
- La capacité d'accueil reste saisie par lieu dans le PCS ; la règle actuelle de priorité (fiche Moyens d'abord, à défaut PCS) est conservée.

### 6.3 Mention « Enregistré »

Après chaque saisie conservée, une mention discrète « Enregistré » apparaît à côté de la commune dans la barre du haut, puis s'estompe. Si le navigateur refuse le stockage, la mention devient durable : « Non conservé par ce navigateur », avec le conseil actuel (sauvegarder l'historique, télécharger les documents).

## 7. Mode d'emploi

`aide.html` : nouvelle section « Démarrer en trois étapes », mise à jour des passages sur la recherche de commune, le panneau de préparation, les réglages avancés et l'espace PCS.

## 8. Tests à ajouter

- Le démarrage guidé s'affiche au premier lancement et pas ensuite ; « Voir l'exemple » le ferme.
- Parcours exercice complet : commune → exercice → risque, format, date → dossier généré, onglet Cadrage.
- Parcours PCS : commune → PCS → espace PCS, rubrique 1.
- Commune affichée dans la barre ; « Changer » ouvre l'écran 1 depuis les deux espaces.
- Bouton « Suivant » sur chaque pièce sauf la dernière ; « Rubrique suivante » dans le PCS ; absents des documents.
- Rubriques PCS lisibles sans commune ; Vérifier et Documents indisponibles.
- Panneau : réglages avancés repliés ; risques non recensés repliés quand Géorisques a répondu.
- Fiche Moyens et annuaire modifiés depuis le PCS : mêmes valeurs dans l'espace Exercices.
- Mention « Enregistré » et cas du stockage refusé.
- Données sauvegardées inchangées : relecture d'un état antérieur sans perte.

## 9. Hors périmètre

- Rapidité et revue complète : étape suivante du chantier, sans changement visible.
- Points reportés le 12/10 non couverts ici : arrêté de Paris (signataire préfet de police), échéances au 29 février, perte de focus lors d'une écriture depuis un autre onglet, liens Légifrance directs.

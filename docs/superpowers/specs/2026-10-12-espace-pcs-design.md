# Espace PCS : conception

Date : 12 octobre 2026. Statut : conception validée en conversation avec Jordan, à relire avant le plan de réalisation.

## 1. Objet

Ajouter à Commune Prête un espace « PCS » qui permet à une commune :

- de **rédiger** son plan communal de sauvegarde, pré-rempli avec ce que l'outil connaît déjà ;
- de **vérifier** un PCS existant au moyen d'une grille de conformité guidée ;
- de **produire** quatre documents : PCS complet, version publique, arrêté d'approbation avec courrier de transmission, rapport de vérification.

L'optimisation de l'outil (simplicité d'usage, rapidité, revue complète) est un second chantier, mené après la livraison de l'espace PCS. Il n'est pas couvert par ce document.

## 2. Décisions prises

| Sujet | Décision |
|---|---|
| Finalité | Rédiger un PCS neuf et vérifier un PCS existant |
| Structure | Contenu exigé par le code de la sécurité intérieure (version issue du décret n° 2022-907), dans l'ordre réglementaire, avec fiches réflexes |
| Vérification | Grille à cocher guidée, sans import de document |
| Personnes vulnérables | Procédure et effectifs seulement, aucune donnée nominative |
| Intégration | Deux espaces, « Exercices » et « PCS », choisis par un sélecteur dans la barre d'application |
| Architecture | Tout dans `index.html`, dans un bloc de code PCS séparé |
| Données | Données de la commune partagées entre les deux espaces ; données propres au PCS sous la nouvelle clé `commune-prete-pcs` |

## 3. Références réglementaires

Code de la sécurité intérieure, partie réglementaire :

- **R731-1** : le PCS comprend une analyse des risques connus et propres aux particularités locales, appuyée notamment sur le DDRM, les PPR, les PPI et les cartes des surfaces inondables. Le préfet notifie au maire l'obligation de réaliser un PCS.
- **R731-2** : le plan est adapté aux moyens de la commune et comprend :
  1. l'identification des enjeux, dont le recensement des personnes vulnérables et des zones et infrastructures sensibles ;
  2. l'organisation de la protection et du soutien de la population, avec un annuaire opérationnel et un règlement d'emploi des moyens d'alerte ;
  3. les modalités de mise en œuvre de la réserve communale de sécurité civile et la prise en compte des bénévoles ;
  4. l'organisation du poste de commandement communal, ou la participation à un poste intercommunal ;
  5. les actions préventives et correctives des services communaux, et le recensement des dispositions déjà prises par les personnes publiques ou privées ;
  6. l'inventaire des moyens propres de la commune et de ceux que peuvent fournir des personnes publiques ou privées (transport, hébergement, ravitaillement, locaux).
  Des dispositions spécifiques complètent ces éléments selon les risques recensés (II).
- **R731-3** : élaboration à l'initiative du maire, qui informe le conseil municipal et le président de l'EPCI ; délai de deux ans après la notification du préfet ; approbation par arrêté du maire ; transmission au préfet et au président de l'EPCI ; présentation au conseil municipal après adoption et après chaque renouvellement général.
- **R731-4** : ces dispositions s'appliquent aussi à un PCS élaboré sans obligation.
- **R731-5 et R731-6** : plan intercommunal de sauvegarde (PICS).
- **R731-8** : mise à jour de l'annuaire, révision au plus tous les cinq ans, mise à jour du DICRIM si nécessaire, évaluation opérationnelle au moins tous les cinq ans (éventuellement par exercice, D731-9 et suivants), information des acteurs, information du public avec un plan consultable sans données personnelles ni informations nuisant à la sécurité.

La référence à R731-3 dans la table `REGL` existante (« R731-1 et suivants ») reste valable. Aucune entrée existante de `REGL` n'est modifiée.

## 4. Organisation de l'écran

- La barre d'application reçoit un sélecteur à deux positions, **Exercices | PCS**. Le choix est conservé dans `commune-prete-affichage`, avec le thème et le panneau.
- L'espace Exercices est inchangé.
- L'espace PCS reprend la même disposition : panneau à gauche, document à droite.
  - **Panneau** : la recherche de commune (partagée), puis la liste des dix rubriques avec leur état (à faire, en cours, complète) et le taux d'avancement global.
  - **Document** : trois onglets, **Rédiger | Vérifier | Documents**.
- Sans commune choisie, l'espace PCS affiche une invitation à rechercher la commune, comme le bandeau d'accueil actuel.
- En largeur réduite (980 px et moins), le panneau passe au-dessus du document, comme aujourd'hui.

## 5. Rubriques (onglet Rédiger)

| # | Rubrique | Référence | Pré-rempli par l'outil | À saisir |
|---|---|---|---|---|
| 0 | Généralités et approbation | R731-3, R731-4 | Commune, population, intercommunalité, existence d'un PICS (fiche Moyens) | Obligation notifiée (oui/non, date) et échéance de deux ans calculée ; date d'approbation ; date de présentation au conseil municipal |
| 1 | Analyse des risques | R731-1 | Risques recensés et arrêtés CatNat (Géorisques), installations classées, barrages, centrale, quartiers en zone inondable | DDRM, PPR, PPI : existence et date ; risques locaux complémentaires |
| 2 | Enjeux et personnes vulnérables | R731-2, 1° | Établissements d'enseignement (publics et privés, effectifs), EHPAD, établissements de santé, lieux recevant du public, postes électriques et ouvrages d'eau | Registre des personnes vulnérables : détenteur, lieu de conservation, mise à jour, activation, effectifs par secteur ; zones et infrastructures sensibles complémentaires |
| 3 | Alerte, information, annuaire | R731-2, 2° | Annuaire de crise, moyens d'alerte (fiche Moyens), modèles de messages existants | Réception de l'alerte 24 h/24 (astreinte, numéro) ; règlement d'emploi des moyens d'alerte (qui déclenche, quand, quel message) ; DICRIM (date) |
| 4 | Poste de commandement communal | R731-2, 4° | Cellules de la cellule de crise (identiques aux fiches rôles), titulaires tirés de l'annuaire | Lieu principal, lieu de repli, liaisons, main courante, articulation avec le PICS |
| 5 | Moyens et lieux d'accueil | R731-2, 6° | Fiche Moyens (élus, agents, véhicules, groupe électrogène, places, lits), salles et gymnases recensés, conventions | Capacité de chaque lieu d'accueil, transport, ravitaillement, moyens privés mobilisables |
| 6 | Réserve communale et bénévoles | R731-2, 3° | Effectif de la réserve (fiche Moyens) | Modalités d'appel, missions confiées, accueil des bénévoles spontanés |
| 7 | Actions préventives | R731-2, 5° | Liste des établissements dotés de plans propres à suivre (PPMS des établissements d'enseignement, plans bleus des EHPAD, plans d'urgence des sites industriels) | Actions des services communaux ; état des plans des tiers |
| 8 | Fiches réflexes | R731-2, II | Une fiche par risque recensé par Géorisques et par risque transverse choisi ; une fiche par fonction de la cellule de crise | Modifications du texte de chaque fiche |
| 9 | Maintien opérationnel | R731-8 | Dates d'approbation et de révision (échéance à cinq ans), exercices de l'historique, actions correctives non soldées du RETEX | Dernière mise à jour de l'annuaire, modalités d'information du public |

Chaque rubrique affiche :

- un encadré **« Ce que la loi exige »** citant l'article ;
- les champs, chaque valeur pré-remplie portant sa source (« Géorisques », « carte », « annuaire », « fiche Moyens ») ;
- un **aperçu** du texte tel qu'il figurera dans le PCS.

Une rubrique est **complète** quand tous ses éléments obligatoires sont renseignés, **en cours** quand au moins un l'est, **à faire** sinon. Le taux global est la part des éléments obligatoires renseignés.

### Fiches réflexes

Forme commune :

1. **Déclenchement** : qui reçoit l'alerte, qui décide, critères.
2. **Premières actions (0 à 30 minutes)** : action, fonction responsable.
3. **Actions de suivi**.
4. **Fin de l'événement** : levée des mesures, retour d'expérience.

Contenu : rédigé à partir des consignes à la population (`CONSIGNES`), des fonctions de la cellule de crise et des lieux réels (secteur exposé, lieux d'accueil, établissements concernés). Le texte de chaque fiche est modifiable et la modification est conservée. Le fond des fiches est une nouvelle doctrine : il est signalé à Jordan pour relecture avant diffusion.

## 6. Vérification d'un PCS existant (onglet Vérifier)

- Une trentaine de points (liste exacte arrêtée dans le plan de réalisation), regroupés selon les dix rubriques. Chaque point se coche **présent**, **à compléter**, **absent** ou **sans objet**, et affiche sur demande l'exigence et l'article.
- Points notables : arrêté d'approbation signé ; transmission au préfet et à l'EPCI ; présentation au conseil municipal depuis le renouvellement général de mars 2026 ; réception de l'alerte 24 h/24 ; annuaire mis à jour depuis moins d'un an ; règlement d'emploi des moyens d'alerte ; DICRIM à jour ; lieu de repli du PCC ; capacité des lieux d'accueil ; fiche réflexe pour chaque risque recensé ; révision et exercice datant de moins de cinq ans ; version publique consultable.
- **Résultat** : taux de conformité (présent = 1, à compléter = 0,5, absent = 0 ; « sans objet » exclu) ; manques classés par gravité (obligation légale, puis bonne pratique) ; échéance de révision à partir de la date d'approbation saisie, avec alerte si elle est dépassée.
- **Plan de mise à jour** : chaque manque devient une action (pilote, échéance), modifiable comme dans le RETEX. Un bouton **Compléter** ouvre la rubrique correspondante dans l'onglet Rédiger.

## 7. Documents (onglet Documents)

Tous produits comme les documents actuels : Word (`.doc`, ou `.html` dans la copie Claude) et PDF par impression, avec la feuille de style imprimée existante (`printCss`).

1. **PCS complet** : page de garde, sommaire, rubriques 0 à 9, fiches réflexes, annuaire en annexe.
2. **Version publique** (R731-8, V) : mêmes rubriques, sans annuaire, sans noms ni numéros de téléphone, sans lieu de repli ni liaisons du PCC, sans effectifs par secteur des personnes vulnérables.
3. **Arrêté d'approbation et courrier de transmission** au préfet et au président de l'EPCI (R731-3, III), avec la mention « modèle à faire relire avant signature ».
4. **Rapport de vérification** : taux, manques, plan de mise à jour, échéances.

## 8. Données

- **Partagées** (inchangées) : `S.p` (commune, risques, lieux, fiche Moyens, partenaires), `S.annu`, données géographiques en mémoire, historique `commune-prete-historique`.
- **Nouvelle clé** `commune-prete-pcs` : un objet par code INSEE, contenant :
  - `gen` : obligation notifiée, dates (notification, approbation, présentation au conseil) ;
  - `risques` : DDRM, PPR, PPI, risques complémentaires ;
  - `vuln` : détenteur du registre, conservation, mise à jour, activation, effectifs par secteur ;
  - `alerte` : astreinte, numéro, règlement d'emploi, DICRIM ;
  - `pcc` : lieu principal, repli, liaisons, main courante, PICS ;
  - `moyens` : capacités des lieux d'accueil, transport, ravitaillement, moyens privés ;
  - `reserve` : modalités, missions, bénévoles ;
  - `prev` : actions des services, état des plans des tiers ;
  - `fiches` : textes modifiés des fiches réflexes ;
  - `maint` : mise à jour de l'annuaire, information du public ;
  - `verif` : cotations de la grille et plan de mise à jour.
- Les clés existantes (`atelier-pcs-v2`, `commune-prete-historique`, `commune-prete-obs-*`, `commune-prete-affichage`) ne changent pas de structure ; `commune-prete-affichage` reçoit seulement le champ `espace`.
- **Lien avec les exercices** : l'espace Exercices lit le PCS quand il existe (lieu du PCC dans la convention d'exercice, capacités des lieux d'accueil pour le message de saturation). Les actions correctives du RETEX apparaissent dans la rubrique 9.
- Stockage refusé par le navigateur : données gardées en mémoire, avertissement identique à celui de l'historique, sauvegarde possible par les documents.

## 9. Cas limites

- Aucune commune choisie : invitation à rechercher la commune ; les rubriques restent consultables mais vides.
- Géorisques ou OpenStreetMap indisponibles : champs à saisir à la main ; mention dans la rubrique concernée.
- Commune sans risque recensé : rubrique 1 à compléter à la main ; fiches réflexes limitées aux risques transverses choisis et aux fonctions.
- Commune sans établissement ni lieu recensé : rubriques 2 et 5 à compléter à la main.
- Changement de commune : le PCS affiché est celui de la nouvelle commune (clé par code INSEE) ; aucune donnée d'une commune n'apparaît dans une autre.

## 10. Tests (tests/run.js)

- Passage d'un espace à l'autre et conservation du choix.
- Pré-remplissage des rubriques 1, 2 et 5 à partir des données simulées (Mirepoix).
- Calcul de l'avancement et de l'état des rubriques.
- Grille de vérification : taux, exclusion des « sans objet », échéance de révision et alerte de dépassement, actions générées.
- Version publique : aucun nom, aucun numéro de téléphone, ni lieu de repli.
- Arrêté et courrier : commune, préfecture et EPCI nommés.
- Enregistrement par commune et absence de mélange entre deux communes.
- Navigateur sans stockage : avertissement, pas d'erreur.
- Aucune régression des tests existants.

## 11. Documentation

- `aide.html` : nouvelle partie « Rédiger et vérifier le PCS » et entrée au sommaire.
- `README.md` : mention de l'espace PCS et de la clé `commune-prete-pcs`.

## 12. Hors périmètre

- Import et analyse automatique d'un PCS existant (Word ou PDF).
- Liste nominative des personnes vulnérables.
- Rédaction du DICRIM complet (seule sa date et sa mise à jour sont suivies).
- PICS de l'intercommunalité.
- Optimisation générale de l'outil (second chantier).

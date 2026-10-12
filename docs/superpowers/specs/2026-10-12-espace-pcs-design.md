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

Texte vérifié le 12 octobre 2026 sur la version consolidée du code de la sécurité intérieure à jour au 1er octobre 2026 (données Légifrance, édition codes.droit.org). Légifrance refuse les consultations automatisées : une relecture directe sur legifrance.gouv.fr reste recommandée avant diffusion.

Partie réglementaire, livre VII, titre III, chapitre Ier, section 1 « Plan communal ou intercommunal de sauvegarde » (R731-1 à D731-13) :

- **R731-1** :
  - I : le PCS organise, sous l'autorité du maire, la préparation et la réponse au profit de la population lors des situations de crise ;
  - II : il comprend une analyse de l'ensemble des risques connus et des risques propres aux particularités locales ;
  - III : cette analyse s'appuie notamment sur le DDRM, les PPR naturels ou miniers prescrits ou approuvés, les PPI, les cartes de surfaces inondables et des risques d'inondation des TRI ; elle prend aussi en compte les risques volcanique, cyclonique, sismique (zones 3, 4 et 5) et d'incendie de forêt (bois et forêts classés ou réputés exposés) ;
  - IV : le préfet notifie au maire l'obligation de réaliser un PCS, ainsi que la survenance d'un nouveau risque, et en informe le président de l'EPCI.
- **R731-2** : le plan est adapté aux moyens de la commune ; c'est une organisation globale de gestion de tout type d'événement. Il comprend :
  1. l'identification des enjeux, en particulier le recensement des personnes vulnérables au sens de l'article L121-6-1 du code de l'action sociale et des familles (registre), et des zones et infrastructures sensibles ;
  2. l'organisation de la protection et du soutien de la population : dispositions pour alerter et informer la population à tout moment et recevoir une alerte des autorités, dont un annuaire opérationnel et un règlement d'emploi des moyens d'alerte ; le DICRIM intègre ces éléments et, une fois réalisé, **est inséré au PCS** ;
  3. les modalités de mise en œuvre de la réserve communale de sécurité civile, si elle existe, et la prise en compte des personnes qui se mettent bénévolement à disposition des sinistrés ;
  4. l'organisation du poste de commandement communal, ou la participation du maire ou de son représentant à un poste de coordination intercommunal ;
  5. les actions préventives et correctives des services communaux, et le recensement des dispositions de sécurité civile déjà prises par toute personne publique ou privée implantée sur la commune ;
  6. l'inventaire des moyens propres de la commune ou pouvant être fournis par des personnes publiques ou privées (notamment transport, hébergement, ravitaillement, matériels et locaux) et leurs modalités de mise en œuvre ; cet inventaire participe au recensement des capacités communales mutualisables et prévoit l'utilisation des capacités de l'EPCI.
  - II : des dispositions spécifiques complètent au besoin ces éléments pour faire face aux conséquences prévisibles des risques recensés.
- **R731-3** : élaboration à l'initiative du maire, qui informe le conseil municipal et le président de l'EPCI de l'engagement des travaux ; délai de deux ans après la notification du préfet ; arrêté du maire (préfet de police à Paris) à l'issue de l'élaboration ou de la révision ; transmission au préfet et au président de l'EPCI ; présentation au conseil municipal après adoption et après chaque renouvellement général, par le maire, un adjoint, le conseiller municipal chargé de la sécurité civile ou, à défaut, le correspondant incendie et secours.
- **R731-4** : ces dispositions s'appliquent aussi à un PCS élaboré sans obligation.
- **R731-5 à R731-7** : plan intercommunal de sauvegarde (contenu, procédure, capacités intercommunales).
- **R731-8** : mise à jour par l'actualisation de l'annuaire opérationnel ; révision selon l'évolution des risques, au plus tous les cinq ans ; mise à jour du DICRIM après révision le cas échéant ; évaluation du caractère opérationnel au moins tous les cinq ans, qui peut être associée aux exercices ; information régulière des acteurs ; information du public de l'existence et de la révision du plan, rendu consultable sans données personnelles ni informations de nature à nuire à la sécurité.
- **D731-9 à D731-13** (rédaction issue du décret n° 2025-126 du 12 février 2025) : exercices réguliers dans la périodicité fixée par les articles L731-3 et L731-4 ; participation possible à un exercice intercommunal ; association de la population dans la mesure du possible (alerte, mise à l'abri ou évacuation, campagne d'information, réserve communale et bénévoles, retour d'expérience) ; retour d'expérience obligatoire après chaque exercice ; un événement réel ayant activé le plan remplace l'exercice.
- **D731-14** (section 2) : le correspondant incendie et secours est désigné, à défaut d'adjoint ou de conseiller chargé de la sécurité civile, dans les six mois suivant l'installation du conseil municipal, et son nom est communiqué au préfet et au SDIS.

**Mise à jour de la table `REGL` de l'outil** (validée par Jordan) :

- l'entrée « art. D731-9 à D731-13 » cite désormais le décret n° 2025-126 du 12 février 2025, qui a donné leur rédaction actuelle aux articles sur les exercices ;
- l'entrée « Décret n° 2022-1532 du 8 décembre 2022 » est remplacée par le décret n° 2025-126 du 12 février 2025 ;
- ajout de l'article D731-14 (correspondant incendie et secours) ;
- liens vers Légifrance vérifiés à la main par Jordan, faute de consultation automatisée possible.

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
| 0 | Généralités et approbation | R731-1 IV, R731-3, R731-4, D731-14 | Commune, population, intercommunalité, existence d'un PICS (fiche Moyens) | Obligation notifiée (oui/non, date) et échéance de deux ans calculée ; information du conseil municipal et de l'EPCI au lancement ; date d'approbation ; date de présentation au conseil municipal ; élu chargé de la sécurité civile ou correspondant incendie et secours |
| 1 | Analyse des risques | R731-1 | Risques recensés et arrêtés CatNat (Géorisques), installations classées, barrages, centrale, quartiers en zone inondable | DDRM, PPR, PPI : existence et date ; risques locaux complémentaires |
| 2 | Enjeux et personnes vulnérables | R731-2, 1° | Établissements d'enseignement (publics et privés, effectifs), EHPAD, établissements de santé, lieux recevant du public, postes électriques et ouvrages d'eau | Registre des personnes vulnérables : détenteur, lieu de conservation, mise à jour, activation, effectifs par secteur ; zones et infrastructures sensibles complémentaires |
| 3 | Alerte, information, annuaire | R731-2, 2° | Annuaire de crise, moyens d'alerte (fiche Moyens), modèles de messages existants | Réception de l'alerte 24 h/24 (astreinte, numéro) ; règlement d'emploi des moyens d'alerte (qui déclenche, quand, quel message) ; DICRIM (date, joint en annexe du PCS) |
| 4 | Poste de commandement communal | R731-2, 4° | Cellules de la cellule de crise (identiques aux fiches rôles), titulaires tirés de l'annuaire | Lieu principal, lieu de repli, liaisons, main courante, articulation avec le PICS |
| 5 | Moyens et lieux d'accueil | R731-2, 6° | Fiche Moyens (élus, agents, véhicules, groupe électrogène, places, lits), salles et gymnases recensés, conventions | Capacité de chaque lieu d'accueil, transport, ravitaillement, moyens privés mobilisables |
| 6 | Réserve communale et bénévoles | R731-2, 3° | Effectif de la réserve (fiche Moyens) | Modalités d'appel, missions confiées, accueil des bénévoles spontanés |
| 7 | Actions préventives | R731-2, 5° | Liste des établissements dotés de plans propres à suivre (PPMS des établissements d'enseignement, plans bleus des EHPAD, plans d'urgence des sites industriels) | Actions des services communaux ; état des plans des tiers |
| 8 | Fiches réflexes | R731-2, II | Une fiche par risque recensé par Géorisques et par risque transverse choisi ; une fiche par fonction de la cellule de crise | Modifications du texte de chaque fiche |
| 9 | Maintien opérationnel | R731-8, D731-9 à D731-13 | Dates d'approbation et de révision (échéance à cinq ans), exercices de l'historique, actions correctives non soldées du RETEX | Dernière mise à jour de l'annuaire, modalités d'information du public |

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
- Points notables : arrêté d'approbation signé ; correspondant incendie et secours désigné dans les six mois suivant l'installation du conseil municipal (D731-14) ; DICRIM inséré au PCS (R731-2, 2°) ; retour d'expérience après chaque exercice (D731-12) ; transmission au préfet et à l'EPCI ; présentation au conseil municipal depuis le renouvellement général de mars 2026 ; réception de l'alerte 24 h/24 ; annuaire mis à jour depuis moins d'un an ; règlement d'emploi des moyens d'alerte ; DICRIM à jour ; lieu de repli du PCC ; capacité des lieux d'accueil ; fiche réflexe pour chaque risque recensé ; révision et exercice datant de moins de cinq ans ; version publique consultable.
- **Résultat** : taux de conformité (présent = 1, à compléter = 0,5, absent = 0 ; « sans objet » exclu) ; manques classés par gravité (obligation légale, puis bonne pratique) ; échéance de révision à partir de la date d'approbation saisie, avec alerte si elle est dépassée.
- **Plan de mise à jour** : chaque manque devient une action (pilote, échéance), modifiable comme dans le RETEX. Un bouton **Compléter** ouvre la rubrique correspondante dans l'onglet Rédiger.

## 7. Documents (onglet Documents)

Tous produits comme les documents actuels : Word (`.doc`, ou `.html` dans la copie Claude) et PDF par impression, avec la feuille de style imprimée existante (`printCss`).

1. **PCS complet** : page de garde, sommaire, rubriques 0 à 9, fiches réflexes ; en annexe l'annuaire et l'emplacement prévu pour le DICRIM.
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

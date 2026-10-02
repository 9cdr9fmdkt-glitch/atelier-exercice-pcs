# Commune Prête

Outil web pour préparer, conduire et évaluer les exercices de crise des communes (plan communal de sauvegarde).

En ligne : https://9cdr9fmdkt-glitch.github.io/atelier-exercice-pcs/

## Organisation

- `index.html` : l'outil complet, en un seul fichier (HTML, CSS, JavaScript). Seule dépendance : Leaflet 1.9.4 chargé depuis cdnjs.
- `sw.js`, `manifest.webmanifest`, `icon-*.png` : fonctionnement hors ligne et installation sur l'appareil (version en ligne uniquement).
- Données publiques interrogées depuis le navigateur : geo.api.gouv.fr (communes, contours, intercommunalité, région), Géorisques (risques, arrêtés CatNat, installations classées, rapport de risques au point), annuaire de l'Éducation nationale (effectifs), OpenStreetMap via l'API Overpass (lieux), tuiles OpenStreetMap (fond de carte).
- Aucune donnée de la commune n'est envoyée sur un serveur : l'état est conservé dans le navigateur (clé `atelier-pcs-v2` pour le dossier, `commune-prete-historique` pour l'historique, `commune-prete-obs-*` pour les observateurs).

## Copie dans Claude (artifact)

L'outil est aussi publié comme artifact Claude. Le contenu publié est la partie de `index.html` comprise entre les marqueurs `<!-- debut-contenu -->` et `<!-- fin-contenu -->` (l'enveloppe HTML est ajoutée par Claude à la publication) :

```sh
sed -n '/<!-- debut-contenu -->/,/<!-- fin-contenu -->/p' index.html | sed '1d;$d' > artifact.html
```

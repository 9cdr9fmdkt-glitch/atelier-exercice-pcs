// Réponses simulées des bases publiques pour trois communes types.
const C = {
  paris: { commune: { nom: "Paris", code: "75056", population: 2113705, departement: { code: "75", nom: "Paris" }, region: { nom: "Île-de-France" }, epci: { nom: "Métropole du Grand Paris" }, centre: { type: "Point", coordinates: [2.347, 48.859] } },
    osm: [
      { type: "node", id: 1, lat: 48.8565, lon: 2.3524, tags: { amenity: "townhall", name: "Hôtel de Ville" } },
      { type: "way", id: 2, center: { lat: 48.857, lon: 2.35 }, tags: { amenity: "school", name: "École élémentaire Saint-Merri" } },
      { type: "node", id: 3, lat: 48.858, lon: 2.349, tags: { amenity: "community_centre", name: "Centre Paris Anim' Les Halles" } },
      { type: "way", id: 4, center: { lat: 48.854, lon: 2.349 }, tags: { amenity: "hospital", name: "Hôtel-Dieu" } },
      { type: "node", id: 5, lat: 48.861, lon: 2.347, tags: { railway: "station", name: "Châtelet - Les Halles" } },
      { type: "way", id: 7, center: { lat: 48.8566, lon: 2.3515 }, tags: { highway: "pedestrian", name: "Place de l'Hôtel de Ville" } },
      { type: "node", id: 20, lat: 48.8606, lon: 2.3471, tags: { place: "quarter", name: "Les Halles" } },
      { type: "node", id: 21, lat: 48.857, lon: 2.353, tags: { place: "neighbourhood", name: "Saint-Merri" } },
      { type: "way", id: 40, center: { lat: 48.856, lon: 2.345 }, tags: { waterway: "river", name: "La Seine" } },
      { type: "way", id: 30, center: { lat: 48.858, lon: 2.35 }, tags: { highway: "primary", name: "Rue de Rivoli" } }],
    icpe: [], ecoles: [{ nom_etablissement: "Ecole élémentaire Saint-Merri", type_etablissement: "Ecole", nombre_d_eleves: 184, latitude: 48.8571, longitude: 2.3501 }],
    flood: lat => lat < 48.858 },
  hameau: { commune: { nom: "Rouze", code: "09253", population: 52, departement: { code: "09", nom: "Ariège" }, region: { nom: "Occitanie" }, epci: { nom: "CC Pyrénées Audoises" }, centre: { type: "Point", coordinates: [2.06, 42.75] } },
    osm: [
      { type: "node", id: 1, lat: 42.75, lon: 2.06, tags: { amenity: "townhall" } },
      { type: "node", id: 20, lat: 42.76, lon: 2.07, tags: { place: "hamlet", name: "Usson" } },
      { type: "way", id: 40, center: { lat: 42.752, lon: 2.062 }, tags: { waterway: "river", name: "Aude" } },
      { type: "way", id: 42, center: { lat: 42.77, lon: 2.08 }, tags: { landuse: "forest", name: "Forêt domaniale du Carcanet" } },
      { type: "way", id: 30, center: { lat: 42.745, lon: 2.04 }, tags: { highway: "secondary", ref: "D 16" } }],
    icpe: [], ecoles: [], flood: () => false },
  bourg: { commune: { nom: "Mirepoix", code: "09194", population: 3100, departement: { code: "09", nom: "Ariège" }, region: { nom: "Occitanie" }, epci: { nom: "CC du Pays de Mirepoix" }, centre: { type: "Point", coordinates: [1.87, 43.09] } },
    osm: [
      { type: "node", id: 1, lat: 43.088, lon: 1.874, tags: { amenity: "townhall", name: "Mairie de Mirepoix" } },
      { type: "way", id: 2, center: { lat: 43.0882, lon: 1.8745 }, tags: { place: "square", name: "Place du Maréchal Leclerc" } },
      { type: "node", id: 3, lat: 43.089, lon: 1.873, tags: { amenity: "community_centre", name: "Salle Paul Dumons" } },
      { type: "node", id: 21, lat: 43.08, lon: 1.86, tags: { place: "hamlet", name: "Le Pont" } },
      { type: "way", id: 40, center: { lat: 43.085, lon: 1.87 }, tags: { waterway: "river", name: "L'Hers-Vif" } },
      { type: "way", id: 50, center: { lat: 42.95, lon: 1.95 }, tags: { waterway: "dam", name: "Barrage de Montbel" } },
      { type: "way", id: 30, center: { lat: 43.09, lon: 1.86 }, tags: { highway: "primary", ref: "D 119" } }],
    icpe: [{ raisonSociale: "COOPERATIVE AGRICOLE ARTERRIS", regime: "Autorisation", statutSeveso: "Seveso seuil bas", etatActivite: "En fonctionnement", latitude: 43.095, longitude: 1.85, libelleNaf: "Commerce de gros de céréales" }],
    ecoles: [{ nom_etablissement: "Ecole primaire publique Les Remparts", type_etablissement: "Ecole", nombre_d_eleves: 212, latitude: 43.0885, longitude: 1.8742 }],
    flood: lat => Math.abs(lat - 43.08) < 0.001 }
};
module.exports = C;

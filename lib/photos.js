// Catégories de photos (remplies par le collecteur) et choix de la photo mise en avant.
export const PHOTO_TYPES = [
  ["officiel", "Portrait officiel"],
  ["portrait", "Portraits"],
  ["election", "Élection régionale"],
  ["maillot", "Maillot"],
  ["voyage", "Voyage de préparation"],
  ["autre", "Autres"],
];
export const TYPE_LABEL = Object.fromEntries(PHOTO_TYPES);

// Photo à afficher pour une candidate selon le filtre choisi ; repli sur le portrait officiel.
export function featured(c, photos = [], type = "officiel") {
  const pick = photos.find((p) => p.type === type);
  if (pick) return { url: pick.url, fallback: false };
  const fb = c.portrait_url || photos.find((p) => p.type === "officiel")?.url || photos[0]?.url || null;
  return { url: fb, fallback: type !== "officiel" };
}

// Photos d'une candidate pour un type donné ("tout" = toutes), portrait en secours.
export function photosOf(app, c, type = "tout") {
  const all = app.photosBy[c.id] || [];
  const list = type === "tout" ? all : all.filter((p) => p.type === type);
  if (list.length) return list;
  if (type !== "tout") return [];
  return c.portrait_url ? [{ id: `portrait-${c.id}`, url: c.portrait_url, type: "officiel" }] : [];
}

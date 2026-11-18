// Affichage des photos à la bonne taille.
// - Petites tailles (vignettes, grilles, carrousels) : miniature stockée sur Supabase (480 px, WebP), fabriquée une fois pour toutes.
// - Grandes tailles (plein écran) : la photo d'origine, déjà allégée (1200 px, WebP).
// - Photo pas encore miniaturisée : repli sur le service wsrv.nl, puis sur l'original en cas d'échec (onImgError).
const thumbs = new Map(); // adresse d'origine -> miniature
export function registerThumbs(photos = [], candidates = []) {
  for (const p of photos) if (p.thumb_url) thumbs.set(p.url, p.thumb_url);
  for (const c of candidates) if (c.portrait_thumb) thumbs.set(c.portrait_url, c.portrait_thumb);
}

export function sized(url, w) {
  if (!url || !url.includes("/storage/v1/object/public/")) return url;
  if (w > 480) return url;
  const t = thumbs.get(url);
  if (t) return t;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&we&output=webp&q=78`;
}
export const onImgError = (orig) => (e) => {
  const img = e.currentTarget;
  if (orig && img.src !== orig) img.src = orig;
};

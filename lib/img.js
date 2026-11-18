// Photos redimensionnées à la taille d'affichage (miniatures), via le service gratuit wsrv.nl qui les garde en cache :
// Supabase ne sert chaque photo qu'une fois au service, au lieu d'une fois par joueur, et les pages chargent plus vite.
// En cas de souci du service, l'image retombe sur l'original (onImgError).
export function sized(url, w) {
  if (!url || !url.includes("/storage/v1/object/public/")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&we&output=webp&q=78`;
}
export const onImgError = (orig) => (e) => {
  const img = e.currentTarget;
  if (orig && img.src !== orig) img.src = orig;
};

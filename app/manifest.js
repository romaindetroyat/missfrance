export default function manifest() {
  return {
    name: "Miss France 2027 — Pronostics",
    short_name: "Miss France 27",
    description: "Pronostics entre amis pour l'élection de Miss France 2027.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f1",
    theme_color: "#fbf7f1",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

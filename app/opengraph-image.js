import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Aperçu affiché quand on partage le lien (WhatsApp, iMessage, Messenger…)
export const alt = "Miss France 2027 — le grand pronostic entre amis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (pkg, file) => readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));
const Star = ({ x, y, s, c, o = 1 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" style={{ position: "absolute", left: x, top: y, opacity: o }}>
    <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill={c} />
  </svg>
);

export default async function Image() {
  const [pacifico, fredoka, nunito] = await Promise.all([
    font("pacifico", "pacifico-latin-400-normal.woff"),
    font("fredoka", "fredoka-latin-600-normal.woff"),
    font("nunito", "nunito-latin-700-normal.woff"),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#fbf7f1", fontFamily: "Nunito" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "radial-gradient(circle at 0% 0%, rgba(232,198,106,.55), rgba(232,198,106,0) 55%), radial-gradient(circle at 100% 10%, rgba(226,87,127,.32), rgba(226,87,127,0) 50%), radial-gradient(circle at 50% 110%, rgba(91,141,239,.22), rgba(91,141,239,0) 55%)" }} />
        <svg width="560" height="385" viewBox="0 0 64 44" style={{ position: "absolute", right: -40, top: 40, opacity: 0.09 }}>
          <path d="M6 38 L2 8 L18 20 L32 2 L46 20 L62 8 L58 38 Z" fill="#b8923a" />
        </svg>
        <Star x={92} y={96} s={30} c="#d4a64a" />
        <Star x={610} y={70} s={20} c="#e2577f" />
        <Star x={1080} y={470} s={26} c="#d4a64a" />
        <Star x={800} y={540} s={16} c="#5b8def" o={0.8} />
        <Star x={150} y={520} s={18} c="#e2577f" o={0.8} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="76" height="76" viewBox="0 0 64 64">
              <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e0b04f" /><stop offset="1" stopColor="#e2577f" /></linearGradient></defs>
              <rect width="64" height="64" rx="16" fill="url(#g)" />
              <path d="M15 42 L11 20 L23 29 L32 14 L41 29 L53 20 L49 42 Z" fill="#fff" />
              <rect x="15" y="45" width="34" height="6" rx="3" fill="#fff" />
            </svg>
            <div style={{ fontFamily: "Fredoka", fontSize: 26, letterSpacing: 8, color: "#8a6a1f" }}>LE GRAND PRONOSTIC ENTRE AMIS</div>
          </div>
          <div style={{ fontFamily: "Pacifico", fontSize: 112, lineHeight: 1.3, marginTop: 10, whiteSpace: "nowrap", color: "#c2456e", backgroundImage: "linear-gradient(90deg, #a87a1e, #e2577f 55%, #c58b2a)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", paddingBottom: 6 }}>
            Miss France 2027
          </div>
          <div style={{ fontSize: 36, color: "#4f4a43", marginTop: 0 }}>31 candidates, une couronne : fais ton Top 5 !</div>
          <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
            <div style={{ display: "flex", background: "#fff", borderRadius: 999, padding: "14px 28px", fontFamily: "Fredoka", fontSize: 28, color: "#9a3d5c", boxShadow: "0 10px 28px rgba(120,80,30,.16)" }}>Élection le 12 décembre</div>
            <div style={{ display: "flex", backgroundImage: "linear-gradient(90deg, #d4a64a, #e2577f)", borderRadius: 999, padding: "14px 28px", fontFamily: "Fredoka", fontSize: 28, color: "#fff" }}>Pronos de l'IA · Duels · Défilé</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pacifico", data: pacifico, weight: 400, style: "normal" },
        { name: "Fredoka", data: fredoka, weight: 600, style: "normal" },
        { name: "Nunito", data: nunito, weight: 700, style: "normal" },
      ],
    }
  );
}

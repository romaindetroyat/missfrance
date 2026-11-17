import "./globals.css";
import Providers from "./providers";
import Shell from "@/components/Shell";

export const metadata = {
  title: "Miss France 2027 — Pronostics",
  description: "Pronostics entre amis pour l'élection de Miss France 2027.",
  robots: { index: false, follow: false },
};
export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}

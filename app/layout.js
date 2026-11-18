import "./globals.css";
import Providers from "./providers";
import Shell from "@/components/Shell";

export const metadata = {
  metadataBase: new URL("https://missfrance-pi.vercel.app"),
  title: "Miss France 2027 — Pronostics",
  description: "Pronostics entre amis pour l'élection de Miss France 2027.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Miss France 2027 — Pronostics",
    title: "Miss France 2027 — le grand pronostic entre amis",
    description: "31 candidates, une couronne. Fais ton Top 5 et bats tes amis le soir de l'élection, le 12 décembre.",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "Miss France 2027 — le grand pronostic entre amis", description: "31 candidates, une couronne. Fais ton Top 5 et bats tes amis !" },
  robots: { index: false, follow: false },
  applicationName: "Miss France 27",
  appleWebApp: { capable: true, title: "Miss France 27", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf7f1",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&family=Pacifico&display=swap" />
      </head>
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}

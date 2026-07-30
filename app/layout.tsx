import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dino-girl-crystal-dash.frankgkroener.chatgpt.site"),
  title: "Adventures of the Dino Girl – Nachtpark",
  description: "Dino Girls nächtliches Stadt-Abenteuer mit Goldmünzen und Stofftier-Eisbär.",
  openGraph: {
    title: "Adventures of the Dino Girl – Nachtpark",
    description: "Springe mit Dino Girl durch die nächtliche Stadt und wirf den Stofftier-Eisbären.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Adventures of the Dino Girl – Nachtpark",
    description: "Springe mit Dino Girl durch die nächtliche Stadt und wirf den Stofftier-Eisbären.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

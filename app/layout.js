import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import "./ofertas-extra.css";
import "./cartoes.css";
import { categorias } from "../data/ofertas";
import CascaCondicional from "../components/CascaCondicional";

const fonteTitulo = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--fonte-titulo",
  display: "swap",
});
const fonteTexto = Figtree({
  subsets: ["latin"],
  variable: "--fonte-texto",
  display: "swap",
});

export const metadata = {
  title: "MukiOfertas - As melhores ofertas e promoções",
  description: "Ofertas, cupons e promoções relâmpago das maiores lojas do Brasil.",
  other: {
    lomadee: "2324685",
    "google-adsense-account": "ca-pub-6000221061047510",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${fonteTitulo.variable} ${fonteTexto.variable}`}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6000221061047510"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <CascaCondicional categorias={categorias} telegram={process.env.NEXT_PUBLIC_TELEGRAM_URL}>
          {children}
        </CascaCondicional>
      </body>
    </html>
  );
}
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import "./ofertas-extra.css";
import "./cartoes.css";
import { categorias } from "../data/ofertas";
import Casca from "../components/Casca";

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
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${fonteTitulo.variable} ${fonteTexto.variable}`}>
      <body>
        <Casca categorias={categorias} telegram={process.env.NEXT_PUBLIC_TELEGRAM_URL}>
          {children}
        </Casca>
      </body>
    </html>
  );
}

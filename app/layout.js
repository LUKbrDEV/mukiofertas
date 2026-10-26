import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import "./ofertas-extra.css";
import "./cartoes.css";
import { categorias } from "../data/ofertas";
import CascaCondicional from "../components/CascaCondicional";
import AvisoCookies from "../components/AvisoCookies";
import { buscarTotaisPorCategoria } from "../lib/ofertas";
import { SITE } from "../lib/site";

export const revalidate = 300; // o menu Departamentos atualiza os totais a cada 5 minutos

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

const TITULO = "MukiOfertas - As melhores ofertas e promoções";
const DESCRICAO = "Ofertas, cupons e promoções relâmpago das maiores lojas do Brasil.";

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: TITULO,
  description: DESCRICAO,
  openGraph: {
    type: "website",
    siteName: SITE.nome,
    locale: "pt_BR",
    title: TITULO,
    description: DESCRICAO,
    images: [{ url: "/logo-mukiofertas.png", alt: "MukiOfertas" }],
  },
  twitter: {
    card: "summary",
    title: TITULO,
    description: DESCRICAO,
    images: ["/logo-mukiofertas.png"],
  },
  other: {
    lomadee: "2324685",
    "google-adsense-account": "ca-pub-6000221061047510",
  },
};

export default async function RootLayout({ children }) {
  // Categorias que têm ofertas no ar, com a quantidade de cada uma
  const totais = await buscarTotaisPorCategoria();
  const temTotais = Object.keys(totais).length > 0;
  const departamentos = categorias
    .map((c) => ({ ...c, total: totais[c.slug] ?? 0 }))
    .filter((c) => !temTotais || c.total > 0);

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
        <CascaCondicional
          departamentos={departamentos}
          telegram={process.env.NEXT_PUBLIC_TELEGRAM_URL}
        >
          {children}
        </CascaCondicional>
        <AvisoCookies />
      </body>
    </html>
  );
}
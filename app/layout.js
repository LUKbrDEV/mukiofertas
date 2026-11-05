import { Bricolage_Grotesque, Figtree } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./ofertas-extra.css";
import "./cartoes.css";
import "./cards-compactos.css";
import "./destaques.css";
import "./cards-v2.css"; // visual novo dos cards de oferta (tire esta linha para voltar ao antigo)
import { categorias } from "../data/ofertas";
import CascaCondicional from "../components/CascaCondicional";
import AvisoCookies from "../components/AvisoCookies";
import AvisosMembro from "../components/AvisosMembro";
import BotaoComunidade from "../components/BotaoComunidade";
import Halloween from "../components/Halloween";
import { buscarTotaisPorCategoria } from "../lib/ofertas";
import { montarMenu } from "../lib/departamentos";
import { SITE } from "../lib/site";

export const revalidate = 60; // o menu Departamentos atualiza os totais a cada minuto (igual às páginas)

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

const TITULO = "MukiOfertas: ofertas, cupons e promoções do dia";
const DESCRICAO =
  "O MukiOfertas reúne as melhores ofertas, cupons e promoções relâmpago da Amazon, Mercado Livre, KaBuM!, Magalu e Shopee, com desconto real e atualizadas o dia todo.";

// Tag do Google Ads (medição de conversões)
const GOOGLE_ADS_ID = "AW-18414048816";

// Perfis oficiais do MukiOfertas em outros sites (ajudam o Google a reconhecer a marca).
// Coloque aqui os links completos das suas redes, um por linha, entre aspas.
const PERFIS_OFICIAIS = [
  process.env.NEXT_PUBLIC_TELEGRAM_URL,
  process.env.NEXT_PUBLIC_INSTAGRAM_URL,
  process.env.NEXT_PUBLIC_TIKTOK_URL,
  // "https://www.youtube.com/@mukiofertas",
].filter(Boolean);

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: TITULO,
  description: DESCRICAO,
  applicationName: "MukiOfertas",
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
  // Menu Departamentos (estilo Promobit, data/menu-departamentos.js). Os totais só servem para
  // esconder as subcategorias que ainda não têm ofertas no ar; o número não aparece na tela.
  const totais = await buscarTotaisPorCategoria();
  const departamentos = montarMenu(categorias, totais);

  const base = SITE.url.replace(/\/+$/, "");

  // Dados da marca para o Google (nome do site, logo e perfis oficiais)
  const dadosDaMarca = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "MukiOfertas",
      alternateName: ["Muki Ofertas", "mukiofertas.com.br"],
      url: `${base}/`,
      inLanguage: "pt-BR",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "MukiOfertas",
      alternateName: "Muki Ofertas",
      url: `${base}/`,
      logo: `${base}/logo-mukiofertas.png`,
      description:
        "Site brasileiro de ofertas, cupons e promoções das maiores lojas online. Não é uma loja: as compras são feitas no site de cada loja.",
      ...(PERFIS_OFICIAIS.length > 0 ? { sameAs: PERFIS_OFICIAIS } : {}),
    },
  ];

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
        {/* Tag do Google Ads */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ADS_ID}');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosDaMarca).replace(/</g, "\\u003c") }}
        />
        <CascaCondicional departamentos={departamentos} telegram={process.env.NEXT_PUBLIC_TELEGRAM_URL}>
          {children}
        </CascaCondicional>
        <AvisoCookies />
        <AvisosMembro />
        {/* Enfeite de Halloween: some sozinho depois de 01/11 */}
        <Halloween />
        <BotaoComunidade
          whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_URL}
          telegram={process.env.NEXT_PUBLIC_TELEGRAM_URL}
          instagram={process.env.NEXT_PUBLIC_INSTAGRAM_URL}
          tiktok={process.env.NEXT_PUBLIC_TIKTOK_URL}
        />
      </body>
    </html>
  );
}
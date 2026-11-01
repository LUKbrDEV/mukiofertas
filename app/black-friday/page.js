// Página especial de Black Friday (https://mukiofertas.com.br/black-friday).
// Salve como app/black-friday/page.js (crie a pasta "black-friday" dentro de "app").
// Publique o quanto antes: o Google leva semanas para posicionar uma página nova.
// Para o ano que vem, é só trocar ANO, DATA e FIM abaixo.
//
// Estratégia da página: destaques escolhidos pela mesma pontuação da página inicial (lib/vitrine.mjs):
// desconto confiável (desconto exagerado de marketplace cai para o fim), marca conhecida, loja confiável,
// cliques e variedade; depois cupons, tecnologia, casa e presentes até R$ 100.

import Link from "next/link";
import ListaOfertas from "../../components/ListaOfertas";
import HeroBlackFriday from "../../components/HeroBlackFriday";
import { categorias } from "../../data/ofertas";
import { buscarOfertas, buscarTotaisPorCategoria, buscarConfigHome } from "../../lib/ofertas";
import { montarDepartamentos } from "../../lib/departamentos";
import { regrasDaVitrine, escolherComVariedade, descontoDe } from "../../lib/vitrine.mjs";
import { SITE } from "../../lib/site";

export const revalidate = 600; // atualiza a cada 10 minutos

const ANO = 2026;
const DATA = "2026-11-27"; // sexta-feira da Black Friday
const DATA_TEXTO = "27 de novembro de 2026";
const FIM = "2026-12-01"; // dia seguinte à Cyber Monday
const PRECO_MINIMO_DESTAQUE = 30; // R$ — nos destaques, nada de filtro de torneira de R$ 15

// Seções da página (a ordem aqui é a ordem na tela, depois dos destaques e dos cupons)
const SECOES = [
  {
    id: "tecnologia",
    titulo: "🖥️ Tecnologia",
    texto: "Hardware, monitores, notebooks, celulares, games e TVs com o melhor desconto do momento.",
    slugs: [
      "hardware", "processadores", "placa-mae", "ssd", "placa-de-video", "memoria-ram", "gabinete", "perifericos",
      "computadores", "notebooks", "notebook", "tablets", "monitores", "monitor", "smartphones", "celulares",
      "games", "consoles", "controles", "jogos", "tv", "televisores", "eletronicos", "fones", "caixas-de-som", "relogios", "redes",
    ],
    maximo: 12,
    maxPorCategoria: 3,
    precoMinimo: 50,
  },
  {
    id: "casa",
    titulo: "🏠 Casa e eletro",
    texto: "Air fryer, aspirador, cafeteira, ar-condicionado e o que deixa a casa mais prática.",
    slugs: ["casa", "cama-banho", "limpeza", "casa-inteligente", "ar-condicionado", "ferramentas"],
    maximo: 8,
    maxPorCategoria: 3,
    precoMinimo: 50,
  },
  {
    id: "presentes",
    titulo: "🎁 Presentes até R$ 100",
    texto: "Boas ofertas para presentear (ou se presentear) sem gastar muito.",
    precoMaximo: 100,
    precoMinimo: 20,
    maximo: 8,
    maxPorCategoria: 2,
  },
];

const TITULO = `Black Friday ${ANO}: as melhores ofertas e cupons`;
const DESCRICAO = `Ofertas de Black Friday ${ANO} com desconto real em celulares, hardware, games, eletrônicos e casa. Cupons, promoções relâmpago e dicas para não cair em golpe.`;

export const metadata = {
  title: `${TITULO} | MukiOfertas`,
  description: DESCRICAO,
  alternates: { canonical: "/black-friday" },
  openGraph: {
    type: "website",
    siteName: SITE.nome,
    locale: "pt_BR",
    title: TITULO,
    description: DESCRICAO,
    url: "/black-friday",
    images: [{ url: "/logo-mukiofertas.png", alt: "MukiOfertas" }],
  },
};

const CSS = `
  .bf-topo {
    margin-bottom: 24px;
    padding: 28px;
    border-radius: 16px;
    color: #fff;
    background: linear-gradient(135deg, #0b1220 0%, #062a66 60%, #0a4bb8 100%);
  }
  .bf-selo {
    display: inline-block;
    margin-bottom: 10px;
    padding: 4px 12px;
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0b1220;
    background: #ff7a1a;
    border-radius: 999px;
  }
  .bf-topo h1 {
    margin: 0 0 10px;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: clamp(1.7rem, 4vw, 2.6rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  .bf-topo p { max-width: 760px; margin: 0; font-size: 1.02rem; line-height: 1.6; color: #dbe6ff; }
  .bf-contagem { margin-top: 16px !important; font-weight: 800; color: #ffb27a !important; }
  .bf-acoes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .bf-acoes a {
    padding: 10px 18px; font-weight: 700; border-radius: 8px;
    color: #0b1220; background: #fff;
  }
  .bf-acoes a.bf-laranja { color: #fff; background: #ff7a1a; }
  .bf-secao { margin: 30px 0; }
  .bf-secao h2 {
    margin: 0 0 6px;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.4rem;
    font-weight: 800;
  }
  .bf-secao > p { margin: 0 0 14px; color: var(--tinta-suave); }
  .bf-cats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 8px; }
  .bf-cabecalho { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px 16px; }
  .bf-cabecalho a { font-weight: 800; color: #c2410c; white-space: nowrap; }
  .bf-aviso {
    display: flex; gap: 10px; align-items: flex-start;
    margin: 0 0 14px; padding: 10px 14px; font-size: 0.9rem; line-height: 1.45;
    color: #7c2d12; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px;
  }
  .bf-cat {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; font-weight: 700; font-size: 0.92rem;
    background: #fff; border: 1px solid var(--linha); border-radius: 999px;
  }
  .bf-cat:hover { border-color: #ff7a1a; color: #c2410c; }
  .bf-texto {
    max-width: 860px;
    padding: 24px;
    background: #fff;
    border: 1px solid var(--linha);
    border-radius: 12px;
    line-height: 1.65;
  }
  .bf-texto h2 { margin-top: 0; }
  .bf-texto h3 { margin: 22px 0 6px; font-size: 1.05rem; font-weight: 800; }
  .bf-texto ul { margin: 8px 0 0; padding-left: 22px; }
  .bf-texto li { margin-bottom: 6px; }
  @media (max-width: 639px) { .bf-topo { padding: 20px; } .bf-texto { padding: 16px; } }
`;

const PERGUNTAS = [
  {
    p: `Quando é a Black Friday ${ANO}?`,
    r: `A Black Friday ${ANO} acontece na sexta-feira, ${DATA_TEXTO}. Muitas lojas começam as promoções dias ou até semanas antes e estendem as ofertas pelo fim de semana e pela Cyber Monday, na segunda-feira seguinte.`,
  },
  {
    p: "Como saber se o desconto da Black Friday é real?",
    r: "Compare o preço com o de semanas anteriores. No MukiOfertas, as ofertas que mudam de preço ou acabam ficam marcadas como expiradas, e a comunidade comenta quando um preço não vale a pena. Desconfie de descontos enormes sobre um preço \"de\" inflado.",
  },
  {
    p: "Vale a pena esperar a Black Friday para comprar?",
    r: "Para eletrônicos, celulares, hardware, games e eletrodomésticos, geralmente sim: é quando aparecem os menores preços do ano. Para itens que você precisa agora, acompanhe as ofertas do dia, porque boas promoções aparecem o ano todo.",
  },
  {
    p: "Como receber as ofertas da Black Friday assim que aparecem?",
    r: "Entre no canal do MukiOfertas no Telegram. As promoções relâmpago costumam durar poucas horas, e lá elas chegam no mesmo momento em que são publicadas no site.",
  },
];


export default async function PaginaBlackFriday() {
  const [ofertas, cupons, totais, config] = await Promise.all([
    buscarOfertas({ limite: 1000, limiteExpiradas: 0 }),
    buscarOfertas({ categoria: "cupons", ordem: "recentes", limite: 8, limiteExpiradas: 0 }),
    buscarTotaisPorCategoria(),
    buscarConfigHome(),
  ]);
  const r = regrasDaVitrine(config);
  const noAr = ofertas.filter((o) => !o.expirada && descontoDe(o) > 0);
  const jaMostradas = new Set();
  const marcar = (lista) => (lista.forEach((o) => jaMostradas.add(o.id)), lista);

  // Destaques: pontuação da vitrine, com bastante variedade de categoria e de loja
  const destaques = marcar(
    escolherComVariedade(
      noAr.filter((o) => Number(o.preco_atual) >= PRECO_MINIMO_DESTAQUE),
      r,
      { maximo: 16, maxPorCategoria: 2, maxPorLoja: 5 }
    )
  );

  const secoes = SECOES.map((s) => ({
    ...s,
    ofertas: marcar(
      escolherComVariedade(
        noAr.filter(
          (o) =>
            (!s.slugs || s.slugs.includes(o.categoria)) &&
            Number(o.preco_atual) >= (s.precoMinimo ?? 0) &&
            (!s.precoMaximo || Number(o.preco_atual) <= s.precoMaximo)
        ),
        r,
        { maximo: s.maximo, ignorar: jaMostradas, maxPorCategoria: s.maxPorCategoria, maxPorLoja: 4 }
      )
    ),
  }));

  // Atalhos por departamento (só os principais, com ofertas no ar)
  const departamentos = montarDepartamentos(categorias, totais).filter((d) => d.slug !== "outros" && d.total > 0);
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL;
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_URL;

  // Dados estruturados: caminho da página e perguntas frequentes (ajudam o Google)
  const base = SITE.url.replace(/\/+$/, "");
  const dadosEstruturados = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: `Black Friday ${ANO}`, item: `${base}/black-friday` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: PERGUNTAS.map((q) => ({
        "@type": "Question",
        name: q.p,
        acceptedAnswer: { "@type": "Answer", text: q.r },
      })),
    },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c") }}
      />

      <HeroBlackFriday
        ano={ANO}
        inicioIso={`${DATA}T00:00:00-03:00`}
        fimIso={`${FIM}T00:00:00-03:00`}
        dataTexto={DATA_TEXTO}
        titulo={TITULO}
        whatsapp={whatsapp}
        telegram={telegram}
      />

      {departamentos.length > 0 && (
        <nav className="bf-cats" aria-label="Black Friday por categoria">
          {departamentos.map((d) => (
            <Link key={d.slug} href={`/categoria/${d.slug}`} className="bf-cat">
              <span aria-hidden="true">{d.emoji}</span> {d.nome}
            </Link>
          ))}
        </nav>
      )}

      <section className="bf-secao" id="destaques" aria-labelledby="bf-destaques">
        <div className="bf-cabecalho">
          <h2 id="bf-destaques">🔥 Destaques da Black Friday</h2>
          <Link href="/mais-procuradas">Ver mais →</Link>
        </div>
        <p>Desconto real, marcas conhecidas e lojas confiáveis, escolhidos entre todas as ofertas no ar.</p>
        <ListaOfertas
          ofertas={destaques}
          vazio="As ofertas da Black Friday aparecem aqui assim que forem encontradas."
        />
      </section>

      {cupons.filter((c) => !c.expirada).length > 0 && (
        <section className="bf-secao" aria-labelledby="bf-cupons">
          <div className="bf-cabecalho">
            <h2 id="bf-cupons">🎟️ Cupons da Black Friday</h2>
            <Link href="/cupons-de-desconto">Ver todos os cupons →</Link>
          </div>
          <p>Clique em copiar e use na hora de pagar.</p>
          <ListaOfertas ofertas={cupons.filter((c) => !c.expirada)} vazio="" />
        </section>
      )}

      {secoes
        .filter((s) => s.ofertas.length > 0)
        .map((s) => (
          <section key={s.id} className="bf-secao" aria-labelledby={`bf-${s.id}`}>
            <h2 id={`bf-${s.id}`}>{s.titulo}</h2>
            <p>{s.texto}</p>
            <ListaOfertas ofertas={s.ofertas} vazio="" />
          </section>
        ))}

      <section className="bf-secao">
        <p className="bf-aviso">
          <span aria-hidden="true">🛡️</span>
          <span>
            <strong>Cuidado com desconto falso:</strong> na Black Friday muitos vendedores aumentam o preço &quot;de&quot;
            antes. Aqui, ofertas com desconto exagerado em marketplace ficam no fim da lista, e a comunidade avisa nos
            comentários quando um preço não vale a pena.
          </span>
        </p>
      </section>

      <section className="bf-secao">
        <div className="bf-texto">
          <h2>Como aproveitar a Black Friday sem cair em golpe</h2>
          <ul>
            <li>
              <strong>Pesquise o preço antes.</strong> Acompanhe os produtos que você quer desde já para saber
              quanto eles custam normalmente.
            </li>
            <li>
              <strong>Compre em lojas conhecidas.</strong> Desconfie de sites desconhecidos com preços muito
              abaixo do mercado e confira o endereço antes de pagar.
            </li>
            <li>
              <strong>Use cupons.</strong> Muitas ofertas ficam ainda mais baratas com cupom; no MukiOfertas é
              só clicar em &quot;Copiar&quot; e colar na hora de pagar.
            </li>
            <li>
              <strong>Confira frete e prazo.</strong> Um preço baixo com frete alto pode sair mais caro que outra
              oferta com frete grátis.
            </li>
            <li>
              <strong>Seja rápido nas relâmpago.</strong> Promoções com mais de 50% de desconto costumam acabar em
              poucas horas.
            </li>
          </ul>

          <h2 style={{ marginTop: 28 }}>Perguntas frequentes</h2>
          {PERGUNTAS.map((q) => (
            <div key={q.p}>
              <h3>{q.p}</h3>
              <p style={{ margin: 0 }}>{q.r}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

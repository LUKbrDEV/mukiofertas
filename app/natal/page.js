// Página especial de Natal (https://mukiofertas.com.br/natal).
// Salve como app/natal/page.js (pasta "natal" dentro de "app").
// Seções: Árvores, Decorações, Dicas de presentes (listas por preço e por pessoa) e Ofertas de Natal.
// As ofertas de Natal vêm das categorias natal, arvores-de-natal e decoracao-natal (lib/classificar.mjs).
// As listas de presentes são escolhidas entre todas as ofertas no ar, com a pontuação da vitrine (lib/vitrine.mjs).
// Para o ano que vem, é só trocar ANO.

import Link from "next/link";
import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas, buscarConfigHome } from "../../lib/ofertas";
import { regrasDaVitrine, escolherComVariedade, descontoDe } from "../../lib/vitrine.mjs";
import { SITE } from "../../lib/site";

export const revalidate = 600; // atualiza a cada 10 minutos

const ANO = 2026;
const CATEGORIAS_NATAL = ["natal", "arvores-de-natal", "decoracao-natal"];

// Listas de presentes (a ordem aqui é a ordem na tela). O "id" é o endereço da lista: /natal#para-ela
const PRESENTES = [
  {
    id: "ate-50",
    titulo: "💸 Presentes até R$ 50",
    texto: "Lembrancinhas, amigo secreto e aquele mimo que não pesa no bolso.",
    precoMinimo: 15,
    precoMaximo: 50,
  },
  {
    id: "ate-100",
    titulo: "🎁 Presentes até R$ 100",
    texto: "Boas opções para presentear bem gastando pouco.",
    precoMinimo: 50,
    precoMaximo: 100,
  },
  {
    id: "para-ela",
    titulo: "💝 Para ela",
    texto: "Perfumes, maquiagem, skincare, cabelos e moda feminina.",
    slugs: ["perfumaria", "maquiagem", "skincare", "cabelos", "moda-feminina", "beleza", "relogios"],
    precoMinimo: 30,
  },
  {
    id: "para-ele",
    titulo: "👔 Para ele",
    texto: "Perfumes, barbear, camisas de time, fones, relógios e moda masculina.",
    slugs: ["barbear", "moda-masculina", "camisas-de-time", "relogios", "fones", "sapatos", "perfumaria"],
    precoMinimo: 30,
  },
  {
    id: "para-criancas",
    titulo: "🧸 Para as crianças",
    texto: "Brinquedos, LEGO, bonecas, carrinhos, jogos e bicicletas.",
    slugs: [
      "brinquedos", "bonecas", "carrinhos", "blocos-de-montar", "jogos-infantis", "pelucias", "educativos",
      "brinquedos-ao-ar-livre", "bicicletas-infantis", "eletronicos-infantis", "livros-infantis",
    ],
    precoMinimo: 20,
  },
  {
    id: "para-quem-joga",
    titulo: "🎮 Para quem joga",
    texto: "Consoles, jogos, controles, headsets e periféricos gamer.",
    slugs: ["consoles", "jogos", "controles", "volantes", "perifericos", "games", "cadeiras-mesas"],
    precoMinimo: 50,
  },
  {
    id: "para-casa",
    titulo: "🏠 Para a casa",
    texto: "Air fryer, cafeteira, cama e banho e o que deixa a casa mais gostosa.",
    slugs: ["air-fryer", "eletroportateis", "cama-banho", "casa", "casa-inteligente", "cafe"],
    precoMinimo: 40,
  },
];

const TITULO = `Natal ${ANO}: árvores, decoração e as melhores ideias de presente em promoção`;
const DESCRICAO = `Ofertas de Natal ${ANO}: árvores de Natal, enfeites, pisca-pisca, panetones e listas de presentes até R$ 50, até R$ 100, para ela, para ele, para crianças e para quem joga.`;

export const metadata = {
  title: `${TITULO} | MukiOfertas`,
  description: DESCRICAO,
  alternates: { canonical: "/natal" },
  openGraph: {
    type: "website",
    siteName: SITE.nome,
    locale: "pt_BR",
    title: TITULO,
    description: DESCRICAO,
    url: "/natal",
    images: [{ url: "/logo-mukiofertas.png", alt: "MukiOfertas" }],
  },
};

const CSS = `
  .nt-topo {
    position: relative; overflow: hidden; isolation: isolate;
    margin-bottom: 18px; padding: 28px;
    border-radius: 18px; color: #fff;
    background:
      radial-gradient(60% 120% at 100% 0%, rgba(34, 197, 94, .35), transparent 60%),
      linear-gradient(135deg, #7f0d18 0%, #b0101e 55%, #e11d2e 100%);
    box-shadow: 0 14px 36px rgba(127, 13, 24, .3);
  }
  /* neve caindo bem de leve */
  .nt-topo::before {
    content: ""; position: absolute; inset: 0; z-index: -1; opacity: .5;
    background-image:
      radial-gradient(2px 2px at 20px 30px, #fff, transparent),
      radial-gradient(2px 2px at 90px 80px, #fff, transparent),
      radial-gradient(1.5px 1.5px at 160px 40px, #fff, transparent),
      radial-gradient(2px 2px at 230px 110px, #fff, transparent),
      radial-gradient(1.5px 1.5px at 300px 20px, #fff, transparent);
    background-size: 320px 140px;
    animation: nt-neve 12s linear infinite;
  }
  @keyframes nt-neve { to { background-position: 0 140px; } }
  @media (prefers-reduced-motion: reduce) { .nt-topo::before { animation: none; } }
  .nt-selo {
    display: inline-block; margin-bottom: 10px; padding: 4px 12px; border-radius: 999px;
    font-size: .8rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
    color: #7f0d18; background: #fff;
  }
  .nt-topo h1 {
    margin: 0 0 10px; font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: clamp(1.6rem, 3.6vw, 2.4rem); font-weight: 800; line-height: 1.1; letter-spacing: -.02em;
  }
  .nt-topo p { max-width: 760px; margin: 0; font-size: 1.02rem; line-height: 1.6; color: #ffe4e6; }
  .nt-acoes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .nt-acoes a { padding: 10px 18px; font-weight: 700; border-radius: 999px; color: #7f0d18; background: #fff; }
  .nt-acoes a.nt-verde { color: #fff; background: #16a34a; }

  .nt-atalhos { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 8px; }
  .nt-atalho {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
    font-weight: 700; font-size: .92rem; background: #fff; border: 1px solid var(--linha); border-radius: 999px;
  }
  .nt-atalho:hover { border-color: #e11d2e; color: #b0101e; }

  .nt-secao { margin: 30px 0; scroll-margin-top: 140px; }
  .nt-secao h2 { margin: 0 0 6px; font-family: var(--fonte-titulo), system-ui, sans-serif; font-size: 1.4rem; font-weight: 800; }
  .nt-secao > p, .nt-cabecalho + p { margin: 0 0 14px; color: var(--tinta-suave); }
  .nt-cabecalho { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px 16px; }
  .nt-cabecalho a { font-weight: 800; color: #b0101e; white-space: nowrap; }

  .nt-presentes-menu { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 18px; }
  .nt-presentes-menu a {
    padding: 6px 12px; font-size: .88rem; font-weight: 700; border-radius: 999px;
    color: #14532d; background: #dcfce7; border: 1px solid #bbf7d0;
  }
  .nt-presentes-menu a:hover { background: #bbf7d0; }
  .nt-lista { margin: 0 0 26px; scroll-margin-top: 140px; }
  .nt-lista h3 { margin: 0 0 4px; font-size: 1.15rem; font-weight: 800; }
  .nt-lista > p { margin: 0 0 12px; color: var(--tinta-suave); }

  .nt-texto {
    max-width: 860px; padding: 24px; background: #fff;
    border: 1px solid var(--linha); border-radius: 12px; line-height: 1.65;
  }
  .nt-texto h2 { margin-top: 0; }
  .nt-texto h3 { margin: 22px 0 6px; font-size: 1.05rem; font-weight: 800; }
  .nt-texto ul { margin: 8px 0 0; padding-left: 22px; }
  .nt-texto li { margin-bottom: 6px; }
  @media (max-width: 639px) { .nt-topo { padding: 20px; } .nt-texto { padding: 16px; } }
`;

const PERGUNTAS = [
  {
    p: "Até quando comprar para o presente chegar antes do Natal?",
    r: "Quanto antes, melhor. Perto do Natal os Correios e as transportadoras ficam cheios e os prazos aumentam. Confira sempre a data de entrega na página da loja antes de pagar; muitas lojas avisam a data limite para entrega antes do dia 25.",
  },
  {
    p: "Árvore de Natal: qual tamanho escolher?",
    r: "Para apartamento, árvores de 1,20 m a 1,50 m costumam caber bem. Para sala com pé-direito normal, 1,80 m é o tamanho mais vendido. Quanto mais galhos, mais cheia ela fica; prefira base de metal, que é mais firme.",
  },
  {
    p: "Vale a pena comprar presentes na Black Friday para o Natal?",
    r: "Sim. Eletrônicos, games, perfumes e brinquedos costumam ter os menores preços do ano na Black Friday. Comprando antes, você também foge dos atrasos de entrega de dezembro.",
  },
  {
    p: "Como receber as ofertas de Natal assim que aparecem?",
    r: "Entre no grupo do WhatsApp ou no canal do MukiOfertas no Telegram. As promoções relâmpago duram poucas horas, e lá elas chegam no mesmo momento em que são publicadas no site.",
  },
];

export default async function PaginaNatal() {
  const [doNatal, todas, config] = await Promise.all([
    buscarOfertas({ categoria: CATEGORIAS_NATAL, ordem: "recentes", limite: 200, limiteExpiradas: 0 }),
    buscarOfertas({ limite: 1000, limiteExpiradas: 0 }),
    buscarConfigHome(),
  ]);
  const r = regrasDaVitrine(config);
  const noAr = (lista) => lista.filter((o) => !o.expirada);

  const arvores = noAr(doNatal).filter((o) => o.categoria === "arvores-de-natal");
  const decoracoes = noAr(doNatal).filter((o) => o.categoria === "decoracao-natal");
  const ofertasDeNatal = noAr(doNatal);

  // Listas de presentes: sem os itens de Natal (enfeite não é presente) e só com desconto
  const candidatos = noAr(todas).filter((o) => !CATEGORIAS_NATAL.includes(o.categoria) && descontoDe(o) > 0);
  const jaMostradas = new Set();
  const listas = PRESENTES.map((l) => {
    const ofertas = escolherComVariedade(
      candidatos.filter(
        (o) =>
          (!l.slugs || l.slugs.includes(o.categoria)) &&
          Number(o.preco_atual) >= (l.precoMinimo ?? 0) &&
          (!l.precoMaximo || Number(o.preco_atual) <= l.precoMaximo)
      ),
      r,
      { maximo: 8, ignorar: jaMostradas, maxPorCategoria: l.slugs ? 3 : 2, maxPorLoja: 4 }
    );
    ofertas.forEach((o) => jaMostradas.add(o.id));
    return { ...l, ofertas };
  }).filter((l) => l.ofertas.length > 0);

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
        { "@type": "ListItem", position: 2, name: `Natal ${ANO}`, item: `${base}/natal` },
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

      <section className="nt-topo">
        <span className="nt-selo">🎄 Especial de Natal {ANO}</span>
        <h1>Natal com desconto: árvores, decoração e ideias de presente</h1>
        <p>
          Tudo para o Natal num lugar só: árvores, enfeites e pisca-pisca com preço conferido, e listas de presentes
          prontas por valor e para cada pessoa da família.
        </p>
        <div className="nt-acoes">
          <a href="#presentes" className="nt-verde">🎁 Ver dicas de presentes</a>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">Receber no WhatsApp</a>
          )}
          {telegram && (
            <a href={telegram} target="_blank" rel="noopener noreferrer">Canal no Telegram</a>
          )}
        </div>
      </section>

      <nav className="nt-atalhos" aria-label="Seções do Natal">
        <a href="#arvores" className="nt-atalho">🎄 Árvores</a>
        <a href="#presentes" className="nt-atalho">🎁 Dicas de presentes</a>
        <a href="#decoracoes" className="nt-atalho">✨ Decorações</a>
        <a href="#ofertas" className="nt-atalho">🔥 Ofertas de Natal</a>
      </nav>

      <section className="nt-secao" id="arvores" aria-labelledby="nt-arvores">
        <div className="nt-cabecalho">
          <h2 id="nt-arvores">🎄 Árvores de Natal</h2>
          <Link href="/categoria/arvores-de-natal">Ver todas →</Link>
        </div>
        <p>Pinheiros, árvores nevadas e kits com enfeites, do tamanho certo para a sua sala.</p>
        <ListaOfertas
          ofertas={arvores.slice(0, 8)}
          vazio="As árvores de Natal em promoção aparecem aqui assim que forem encontradas."
        />
      </section>

      <section className="nt-secao" id="presentes" aria-labelledby="nt-presentes">
        <h2 id="nt-presentes">🎁 Dicas de presentes</h2>
        <p>Listas escolhidas entre as ofertas no ar: desconto real, marcas conhecidas e lojas confiáveis.</p>
        {listas.length > 0 && (
          <nav className="nt-presentes-menu" aria-label="Listas de presentes">
            {listas.map((l) => (
              <a key={l.id} href={`#${l.id}`}>{l.titulo}</a>
            ))}
          </nav>
        )}
        {listas.length === 0 && <p className="vazio">As dicas de presentes aparecem aqui em instantes.</p>}
        {listas.map((l) => (
          <div key={l.id} className="nt-lista" id={l.id}>
            <h3>{l.titulo}</h3>
            <p>{l.texto}</p>
            <ListaOfertas ofertas={l.ofertas} vazio="" />
          </div>
        ))}
      </section>

      <section className="nt-secao" id="decoracoes" aria-labelledby="nt-decoracoes">
        <div className="nt-cabecalho">
          <h2 id="nt-decoracoes">✨ Decorações</h2>
          <Link href="/categoria/decoracao-natal">Ver todas →</Link>
        </div>
        <p>Enfeites, bolas, pisca-pisca, guirlandas e presépios para deixar a casa no clima.</p>
        <ListaOfertas
          ofertas={decoracoes.slice(0, 8)}
          vazio="As decorações de Natal em promoção aparecem aqui assim que forem encontradas."
        />
      </section>

      <section className="nt-secao" id="ofertas" aria-labelledby="nt-ofertas">
        <div className="nt-cabecalho">
          <h2 id="nt-ofertas">🔥 Ofertas de Natal</h2>
          <Link href="/categoria/natal">Ver todas →</Link>
        </div>
        <p>Tudo de Natal que entrou no site por último: ceia, panetones, roupas natalinas, árvores e enfeites.</p>
        <ListaOfertas
          ofertas={ofertasDeNatal.slice(0, 16)}
          vazio="As ofertas de Natal aparecem aqui assim que forem encontradas."
        />
      </section>

      <section className="nt-secao">
        <div className="nt-texto">
          <h2>Como aproveitar as ofertas de Natal</h2>
          <ul>
            <li>
              <strong>Compre cedo.</strong> Em dezembro os prazos de entrega aumentam; garanta os presentes antes.
            </li>
            <li>
              <strong>Use cupons.</strong> Muitas ofertas ficam mais baratas com cupom; é só copiar e colar na hora
              de pagar.
            </li>
            <li>
              <strong>Confira frete e prazo.</strong> Um preço baixo com frete alto pode sair mais caro que outra
              oferta com frete grátis.
            </li>
            <li>
              <strong>Faça uma lista.</strong> Separe um valor para cada pessoa e use as listas de presentes acima
              para não estourar o orçamento.
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

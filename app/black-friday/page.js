// Página especial de Black Friday (https://mukiofertas.com.br/black-friday).
// Salve como app/black-friday/page.js (crie a pasta "black-friday" dentro de "app").
// Publique o quanto antes: o Google leva semanas para posicionar uma página nova.
// Para o ano que vem, é só trocar ANO e DATA abaixo.

import Link from "next/link";
import ListaOfertas from "../../components/ListaOfertas";
import { categorias } from "../../data/ofertas";
import { buscarOfertas, buscarTotaisPorCategoria } from "../../lib/ofertas";
import { ordenarOfertas } from "../../lib/ordenar";
import { montarDepartamentos } from "../../lib/departamentos";
import { SITE } from "../../lib/site";

export const revalidate = 600; // atualiza a cada 10 minutos

const ANO = 2026;
const DATA = "2026-11-27"; // sexta-feira da Black Friday
const DATA_TEXTO = "27 de novembro de 2026";

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
  .bf-cats { display: flex; flex-wrap: wrap; gap: 8px; }
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

function diasAte(dataIso) {
  const alvo = new Date(`${dataIso}T00:00:00-03:00`).getTime();
  return Math.ceil((alvo - Date.now()) / 86400000);
}

export default async function PaginaBlackFriday() {
  const [ofertas, totais] = await Promise.all([
    buscarOfertas({ limite: 120, limiteExpiradas: 0 }),
    buscarTotaisPorCategoria(),
  ]);
  const maioresDescontos = ordenarOfertas(ofertas, "maior-desconto").slice(0, 24);
  const departamentos = montarDepartamentos(categorias, totais).filter((d) => d.slug !== "outros");
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL;

  const faltam = diasAte(DATA);
  const contagem =
    faltam > 1
      ? `Faltam ${faltam} dias para a Black Friday.`
      : faltam === 1
        ? "A Black Friday é amanhã!"
        : faltam > -4
          ? "A Black Friday está acontecendo agora!"
          : `A Black Friday ${ANO} terminou, mas as ofertas do dia continuam.`;

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

      <header className="bf-topo">
        <span className="bf-selo">Black Friday {ANO}</span>
        <h1>{TITULO}</h1>
        <p>
          Reunimos aqui as melhores ofertas da Black Friday {ANO} nas maiores lojas do Brasil, com desconto
          real e atualizadas o dia todo. A data oficial é {DATA_TEXTO}, mas as promoções já começaram.
        </p>
        <p className="bf-contagem">{contagem}</p>
        <div className="bf-acoes">
          <a href="#maiores-descontos" className="bf-laranja">
            Ver maiores descontos
          </a>
          <Link href="/cupons">Ofertas com cupom</Link>
          {telegram && (
            <a href={telegram} target="_blank" rel="noopener noreferrer">
              Receber no Telegram
            </a>
          )}
        </div>
      </header>

      <section className="bf-secao" id="maiores-descontos" aria-labelledby="bf-descontos">
        <h2 id="bf-descontos">Maiores descontos agora</h2>
        <p>As ofertas no ar com o maior desconto em relação ao preço anterior.</p>
        <ListaOfertas
          ofertas={maioresDescontos}
          vazio="As ofertas da Black Friday aparecem aqui assim que forem encontradas."
        />
      </section>

      {departamentos.length > 0 && (
        <section className="bf-secao" aria-labelledby="bf-categorias">
          <h2 id="bf-categorias">Black Friday por categoria</h2>
          <p>Escolha o que você procura e veja só as ofertas daquela categoria.</p>
          <nav className="bf-cats">
            {departamentos.flatMap((d) => [d, ...(d.filhos ?? [])]).filter((d) => d.total > 0).map((d) => (
              <Link key={d.slug} href={`/categoria/${d.slug}`} className="bf-cat">
                <span aria-hidden="true">{d.emoji}</span> {d.nome}
              </Link>
            ))}
          </nav>
        </section>
      )}

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
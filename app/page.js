import Link from "next/link";
import LinhaOfertas from "../components/LinhaOfertas";
import CardOferta from "../components/CardOferta";
import FeedOfertas from "../components/FeedOfertas";
import BannerBlackFriday from "../components/BannerBlackFriday";
import IconeRaio from "../components/IconeRaio";
import FaixaLojas from "../components/FaixaLojas";
import SobreMuki from "../components/SobreMuki";
import HomeComRanking from "../components/HomeComRanking";
import GuiasHome from "../components/GuiasHome";
import { buscarOfertas, buscarLojasComCategorias, buscarConfigHome, calcularDesconto } from "../lib/ofertas";
import { lojasDestaque, lojaDoNome } from "../data/lojas";
import { categorias } from "../data/ofertas";
import { guias } from "../data/guias";
import {
  regrasDaVitrine,
  escolherComVariedade,
  descontoDe,
  maioresDescontos,
  maisBaratos,
  recentesComVariedade,
} from "../lib/vitrine.mjs";
import { ehRelampago } from "../lib/relampago.mjs";

export const revalidate = 60;

// Página inicial: faixas (carrosséis) na ordem em que a pessoa decide comprar, e depois o feed completo.
//   1) Black Friday (some sozinha depois da data)
//   2) ⚡ Relâmpago agora      URGÊNCIA: acaba logo, por isso vem primeiro
//   3) ⭐ Destaques            AS MELHORES: desconto real + marca + loja confiável (lib/vitrine.mjs)
//   4) 💸 Maiores descontos    ÂNCORA DE PREÇO: "era R$ X, agora R$ Y" chama atenção
//   5) 🏆 Escolhas do Muki     PROVA SOCIAL: nota alta e aprovadas pela comunidade
//   6) 🪙 Mais baratos         IMPULSO: até R$ 100, decisão rápida, gera o primeiro clique
//   7) 🆕 Chegaram agora       NOVIDADE: motivo para voltar ao site todo dia
//   8) Feed de ofertas em grade, com abas (Destaques · Recentes · Mais quentes · Maiores descontos ·
//      Mais baratos · Cupons), filtro por departamento e botão "Carregar mais"
//   9) Ofertas por loja  10) Guias de compra  11) Sobre o MukiOfertas
// Uma oferta aparece em no máximo UMA faixa (as de cima têm prioridade), para a página não repetir.
// Coluna da direita: ranking da comunidade e guias (WhatsApp/Telegram ficam no botão flutuante).
// Quem aparece em Destaques: lib/vitrine.mjs (pontuação + variedade), com os números
// ajustáveis no painel admin (Configurações → Página inicial).

const NO_FEED = 96; // ofertas por aba do feed (o botão "Carregar mais" mostra de 24 em 24)
const NA_FAIXA = 12; // ofertas em cada faixa (carrossel)
const MINIMO_NA_FAIXA = 4; // com menos que isso, a faixa não aparece

// Lojas que não aparecem na faixa "Relâmpago agora"
const LOJAS_FORA_DO_RELAMPAGO = ["AliExpress"];

// Departamento de cada oferta (usado no filtro do feed): a categoria-mãe, se houver
const PAI = Object.fromEntries(categorias.map((c) => [c.slug, c.pai ?? c.slug]));
const DEPARTAMENTOS = Object.fromEntries(
  categorias.filter((c) => !c.pai).map((c) => [c.slug, { nome: c.nome, emoji: c.emoji }])
);

// Monta a faixa de lojas: SÓ as lojas cadastradas no data/lojas.js, na ordem de lá.
// Lojas novas não aparecem sozinhas quando chega uma oferta: você escolhe quando colocar.
function listaDeCategorias(contagem, slugLoja) {
  const lista = Object.entries(contagem)
    .map(([slug, total]) => {
      const c = categorias.find((x) => x.slug === slug);
      return c ? { slug, nome: c.nome, emoji: c.emoji, total } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);
  // Cupons não são um departamento: entram como atalho para a aba Cupons, filtrada pela loja
  if (contagem.cupons) {
    lista.unshift({
      slug: "cupons",
      nome: "Cupons",
      emoji: "🏷️",
      total: contagem.cupons,
      href: `/cupons-de-desconto?loja=${slugLoja}`,
    });
  }
  return lista;
}

function montarLojas(doBanco) {
  const somar = (alvo, l) => {
    alvo.total += l.total;
    for (const [slug, n] of Object.entries(l.categorias)) alvo.categorias[slug] = (alvo.categorias[slug] ?? 0) + n;
  };

  const comLogo = lojasDestaque.map((l) => ({ ...l, total: 0, categorias: {} }));
  for (const l of doBanco) {
    const config = lojaDoNome(l.nome); // ex.: "Kabum BR" (Lomadee) soma na KaBuM!
    if (config) somar(comLogo.find((x) => x.slug === config.slug), l);
  }

  return comLogo.map((l) => ({
    nome: l.nome,
    slug: l.slug,
    logo: l.logo ?? null,
    cor: l.cor,
    artigo: l.artigo,
    total: l.total,
    categorias: listaDeCategorias(l.categorias, l.slug),
  }));
}

// Cards prontos para o feed (o servidor monta, o feed só escolhe quais aparecem)
function itensDoFeed(ofertas) {
  return ofertas.map((o) => ({
    id: o.id,
    grupo: PAI[o.categoria] ?? null,
    card: <CardOferta oferta={o} />,
  }));
}

// "Escolhas do Muki": os produtos mais bem avaliados (nota da loja e likes da comunidade)
function escolhasDoMuki(ofertas, maximo = 12) {
  const pontuadas = ofertas
    .filter((o) => Number(o.preco_atual) >= 30)
    .map((o) => {
      const nota = Number(o.nota) || 0;
      const likes = Number(o.likes) || 0;
      const dislikes = Number(o.dislikes) || 0;
      const aprovada = (nota >= 4.6) || (likes >= 1 && likes > dislikes);
      const pontos =
        (nota ? (nota - 4) * 60 : 0) +
        (likes - dislikes * 2) * 12 +
        Math.min(o.cliques ?? 0, 60) * 0.6 +
        calcularDesconto(o) * 0.3 +
        (o.destaque ? 10 : 0);
      return { o, pontos, aprovada };
    })
    .sort((a, b) => b.pontos - a.pontos);

  // primeiro as bem avaliadas; se faltar, completa com as melhores do resto (sem nota ruim)
  const ordem = [...pontuadas.filter((x) => x.aprovada), ...pontuadas.filter((x) => !x.aprovada && !(x.o.nota && x.o.nota < 4.3))];
  const porLoja = {};
  const porCategoria = {};
  const lista = [];
  for (const { o } of ordem) {
    if ((porLoja[o.loja] ?? 0) >= 2 || (porCategoria[o.categoria] ?? 0) >= 2) continue;
    porLoja[o.loja] = (porLoja[o.loja] ?? 0) + 1;
    porCategoria[o.categoria] = (porCategoria[o.categoria] ?? 0) + 1;
    lista.push(o);
    if (lista.length >= maximo) break;
  }
  return lista;
}

// "Mais quentes": cliques e destaque pesam mais que o desconto
function maisQuentes(ofertas) {
  return [...ofertas]
    .map((o) => ({ o, pontos: Math.min(o.cliques ?? 0, 100) * 3 + calcularDesconto(o) + (o.destaque ? 30 : 0) }))
    .sort((a, b) => b.pontos - a.pontos)
    .map((x) => x.o);
}

// Uma faixa da página inicial: título, frase curta, "Ver todas" e o carrossel
function Faixa({ id, titulo, subtitulo, href, ofertas }) {
  if (ofertas.length < MINIMO_NA_FAIXA) return null;
  return (
    <section className="destaques" aria-labelledby={`titulo-${id}`}>
      <div className="secao-cabecalho">
        <div>
          <h2 id={`titulo-${id}`} className="secao-titulo">
            {titulo}
          </h2>
          {subtitulo && <p style={{ margin: "2px 0 0", fontSize: "0.88rem", color: "#475569" }}>{subtitulo}</p>}
        </div>
        {href && (
          <Link href={href} className="botao-ver-mais">
            Ver todas →
          </Link>
        )}
      </div>
      <LinhaOfertas ofertas={ofertas} />
    </section>
  );
}

// Caixas da coluna da direita (abaixo do ranking)
function LateralExtra({ whatsapp, telegram }) {
  return (
    <div className="home-lateral-extra">
      <style>{`
        .home-lateral-extra { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; font-size: 13px; }
        .hle-caixa { padding: 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
        .hle-caixa strong { display: block; margin-bottom: 6px; font-size: 14px; color: #0f172a; }
        .hle-caixa p { margin: 0 0 10px; color: #475569; line-height: 1.45; }
        .hle-caixa ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
        .hle-caixa li a { color: #0f172a; font-weight: 600; line-height: 1.35; }
        .hle-caixa li a:hover { color: var(--marca-escura, #d9440e); }
      `}</style>

      <section className="hle-caixa" aria-label="Guias de compra">
        <strong>📖 Antes de comprar</strong>
        <ul>
          {guias.slice(0, 4).map((g) => (
            <li key={g.slug}>
              <Link href={`/guias/${g.slug}`}>{g.titulo}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default async function Home() {
  const [todas, cuponsNoAr, contagemLojas, config] = await Promise.all([
    // todas as ofertas no ar (sem cupons), JUNTO com as da comunidade; o feed é montado daqui
    buscarOfertas({ limite: 1000, limiteExpiradas: 0, comComunidade: true }),
    buscarOfertas({ categoria: "cupons", ordem: "recentes", limite: 48, limiteExpiradas: 0 }),
    buscarLojasComCategorias(),
    buscarConfigHome(),
  ]);
  const r = regrasDaVitrine(config);
  const noAr = todas.filter((o) => !o.expirada);
  const comDesconto = noAr.filter((o) => descontoDe(o) > 0);

  // ⚡ Relâmpago agora (linha do topo): só as que têm hora para acabar, as que acabam antes primeiro.
  // Sem nenhuma relâmpago no ar, a faixa não aparece.
  const relampagos = noAr
    .filter((o) => ehRelampago(o) && !LOJAS_FORA_DO_RELAMPAGO.includes(o.loja))
    .sort((a, b) => new Date(a.relampago_ate) - new Date(b.relampago_ate))
    .slice(0, 12);

  // ⭐ Escolhas do Muki: nota alta na loja (Shopee/AliExpress) + aprovação da comunidade (likes)
  // + interesse (cliques) + desconto. No máximo 2 por loja e 2 por categoria, para variar.
  // 📌 Fixadas no painel admin (aba Página inicial): aparecem primeiro, na ordem escolhida
  const fixadas = noAr
    .filter((o) => o.fixada_home)
    .sort((a, b) => (a.fixada_ordem ?? 999) - (b.fixada_ordem ?? 999));
  const semFixadas = (lista) => lista.filter((o) => !o.fixada_home);
  // ----- Faixas: cada oferta aparece em no máximo uma (as de cima escolhem primeiro) -----
  const jaNaPagina = new Set(relampagos.map((o) => o.id));
  const usar = (lista) => {
    for (const o of lista) jaNaPagina.add(o.id);
    return lista;
  };
  const semRepetir = (lista) => lista.filter((o) => !jaNaPagina.has(o.id));

  // ⭐ Destaques: fixadas no painel primeiro, depois a melhor pontuação das últimas horas
  let faixaDestaques = escolherComVariedade(semFixadas(noAr), r, {
    maximo: NA_FAIXA,
    horas: r.home_horas_destaque,
    ignorar: jaNaPagina,
  });
  if (faixaDestaques.length < 8)
    faixaDestaques = escolherComVariedade(semFixadas(noAr), r, { maximo: NA_FAIXA, ignorar: jaNaPagina });
  faixaDestaques = usar([...semRepetir(fixadas), ...faixaDestaques].slice(0, NA_FAIXA));

  // 💸 Maiores descontos (confiáveis, a partir de R$ 50)
  const faixaDescontos = usar(maioresDescontos(noAr, r, { maximo: NA_FAIXA, ignorar: jaNaPagina }));

  // 🏆 Escolhas do Muki
  const escolhas = usar(escolhasDoMuki(semRepetir(semFixadas(comDesconto)), NA_FAIXA));

  // 🪙 Mais baratos (até R$ 100, com 20%+ de desconto real)
  const faixaBaratos = usar(maisBaratos(noAr, r, { maximo: NA_FAIXA, ignorar: jaNaPagina }));

  // 🆕 Chegaram agora
  const faixaRecentes = usar(recentesComVariedade(noAr, r, { maximo: NA_FAIXA, ignorar: jaNaPagina }));

  // ⭐ Destaques: pontuação (desconto confiável + cliques + marca + loja), com variedade
  let destaques = escolherComVariedade(semFixadas(noAr), r, { maximo: NO_FEED, horas: r.home_horas_destaque });
  if (destaques.length < 48) destaques = escolherComVariedade(semFixadas(noAr), r, { maximo: NO_FEED });
  destaques = [...fixadas, ...destaques].slice(0, NO_FEED);

  // 🆕 Recentes: as que entraram por último
  const recentes = [...comDesconto]
    .sort((a, b) => new Date(b.publicada_em ?? 0) - new Date(a.publicada_em ?? 0))
    .slice(0, NO_FEED);

  // 🔥 Mais quentes: as mais clicadas
  const quentes = maisQuentes(comDesconto).slice(0, NO_FEED);

  // 💸 Maiores descontos (a partir de R$ 50, para não encher de itens baratinhos)
  const descontos = [...comDesconto]
    .filter((o) => Number(o.preco_atual) >= 50)
    .sort((a, b) => descontoDe(b) - descontoDe(a))
    .slice(0, NO_FEED);

  // 🪙 Mais baratos (aba do feed: mais opções, sem limite de variedade tão apertado)
  const baratos = maisBaratos(noAr, { ...r, home_max_por_categoria: 8, home_max_por_loja: 30 }, { maximo: NO_FEED });

  const cupons = cuponsNoAr.filter((o) => !o.expirada);

  const abas = [
    {
      id: "destaques",
      rotulo: "Destaques",
      descricao: "Desconto real, marcas conhecidas e lojas confiáveis, escolhidas pela vitrine do MukiOfertas.",
      href: "/mais-procuradas",
      itens: itensDoFeed(destaques),
    },
    {
      id: "recentes",
      rotulo: "Recentes",
      descricao: "As ofertas que acabaram de chegar, das mais novas para as mais antigas.",
      href: "/recentes",
      itens: itensDoFeed(recentes),
    },
    {
      id: "quentes",
      rotulo: "Mais quentes",
      descricao: "As ofertas que a comunidade mais está clicando agora.",
      href: "/mais-procuradas",
      itens: itensDoFeed(quentes),
    },
    {
      id: "descontos",
      rotulo: "Maiores descontos",
      descricao: "Os maiores descontos sobre o preço anterior informado pela loja.",
      href: "/maiores-descontos",
      itens: itensDoFeed(descontos),
    },
    {
      id: "baratos",
      rotulo: "Mais baratos",
      descricao: "Até R$ 100, do mais barato para o mais caro, só com desconto de verdade.",
      href: "/mais-baratos",
      itens: itensDoFeed(baratos),
    },
    {
      id: "cupons",
      rotulo: "Cupons",
      descricao: "Clique em copiar e use o código no carrinho da loja.",
      href: "/cupons-de-desconto",
      itens: itensDoFeed(cupons),
    },
  ];

  return (
    <>
      <h1 className="so-leitor">Ofertas do dia, cupons e promoções relâmpago</h1>

      <BannerBlackFriday />

      <HomeComRanking
        extra={
          <LateralExtra
            whatsapp={process.env.NEXT_PUBLIC_WHATSAPP_URL}
            telegram={process.env.NEXT_PUBLIC_TELEGRAM_URL}
          />
        }
      >
        {relampagos.length > 0 && (
          <section className="destaques" aria-labelledby="titulo-relampago">
            <div className="secao-cabecalho">
              <h2 id="titulo-relampago" className="secao-titulo">
                <IconeRaio tamanho={20} /> Relâmpago agora
              </h2>
              <Link href="/relampago" className="botao-ver-mais">
                Ver todas →
              </Link>
            </div>
            <LinhaOfertas ofertas={relampagos} />
          </section>
        )}

        <Faixa
          id="destaques"
          titulo="⭐ Destaques"
          subtitulo="As melhores ofertas do momento: desconto real, marcas conhecidas e lojas confiáveis"
          href="/mais-procuradas"
          ofertas={faixaDestaques}
        />

        <Faixa
          id="descontos"
          titulo="💸 Maiores descontos"
          subtitulo="Os maiores cortes de preço, conferidos (sem desconto inflado)"
          href="/maiores-descontos"
          ofertas={faixaDescontos}
        />

        <Faixa
          id="escolhas"
          titulo="🏆 Escolhas do Muki"
          subtitulo="Nota alta na loja, aprovadas pela comunidade e com desconto de verdade"
          ofertas={escolhas}
        />

        <Faixa
          id="baratos"
          titulo="🪙 Mais baratos"
          subtitulo="Achadinhos até R$ 100 com desconto de verdade"
          href="/mais-baratos"
          ofertas={faixaBaratos}
        />

        <Faixa
          id="recentes"
          titulo="🆕 Chegaram agora"
          subtitulo="As ofertas mais novas do site"
          href="/recentes"
          ofertas={faixaRecentes}
        />

        <FeedOfertas abas={abas} departamentos={DEPARTAMENTOS} />
      </HomeComRanking>

      <FaixaLojas lojas={montarLojas(contagemLojas)} />

      <GuiasHome comoEscolhemos={false} />

      <SobreMuki />
    </>
  );
}

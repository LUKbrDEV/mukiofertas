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
import { regrasDaVitrine, escolherComVariedade, descontoDe } from "../lib/vitrine.mjs";

export const revalidate = 60;

// Página inicial no estilo "feed de ofertas":
//   1) Black Friday (some sozinha depois da data)
//   2) ⚡ Relâmpago agora: uma linha curta em carrossel, fixa no topo
//   3) Feed de ofertas em grade, com abas de ordenação
//      (⭐ Destaques · 🆕 Recentes · 🔥 Mais quentes · 💸 Maiores descontos · 🎟️ Cupons),
//      filtro rápido por departamento e botão "Carregar mais"
//   4) Ofertas por loja  5) Guias de compra  6) Sobre o MukiOfertas
// Coluna da direita: ranking da comunidade, canais (WhatsApp/Telegram) e guias.
// Quem aparece em Destaques: lib/vitrine.mjs (pontuação + variedade), com os números
// ajustáveis no painel admin (Configurações → Página inicial).

const NO_FEED = 36; // ofertas por aba do feed (o botão "Carregar mais" mostra de 12 em 12)

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

// "Mais quentes": cliques e destaque pesam mais que o desconto
function maisQuentes(ofertas) {
  return [...ofertas]
    .map((o) => ({ o, pontos: Math.min(o.cliques ?? 0, 100) * 3 + calcularDesconto(o) + (o.destaque ? 30 : 0) }))
    .sort((a, b) => b.pontos - a.pontos)
    .map((x) => x.o);
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
        .hle-canais { display: grid; gap: 8px; }
        .hle-canal { display: block; padding: 9px 10px; border-radius: 10px; color: #fff; font-weight: 800; text-align: center; text-decoration: none; }
        .hle-canal--whats { background: #128c4a; }
        .hle-canal--tele { background: #1f78c9; }
        .hle-canal:hover { color: #fff; filter: brightness(0.95); }
      `}</style>

      {(whatsapp || telegram) && (
        <section className="hle-caixa" aria-label="Receba as ofertas">
          <strong>Receba as ofertas primeiro</strong>
          <p>As melhores promoções chegam no grupo e no canal assim que aparecem.</p>
          <div className="hle-canais">
            {whatsapp && (
              <a className="hle-canal hle-canal--whats" href={whatsapp} target="_blank" rel="noopener noreferrer">
                Entrar no WhatsApp
              </a>
            )}
            {telegram && (
              <a className="hle-canal hle-canal--tele" href={telegram} target="_blank" rel="noopener noreferrer">
                Seguir no Telegram
              </a>
            )}
          </div>
        </section>
      )}

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
    // todas as ofertas no ar (sem cupons e sem as da comunidade); o feed é montado daqui
    buscarOfertas({ limite: 1000, limiteExpiradas: 0 }),
    buscarOfertas({ categoria: "cupons", ordem: "recentes", limite: 24, limiteExpiradas: 0 }),
    buscarLojasComCategorias(),
    buscarConfigHome(),
  ]);
  const r = regrasDaVitrine(config);
  const noAr = todas.filter((o) => !o.expirada);
  const comDesconto = noAr.filter((o) => descontoDe(o) > 0);

  // ⚡ Relâmpago agora (linha do topo)
  const relampagosNoAr = noAr.filter((o) => o.relampago && !LOJAS_FORA_DO_RELAMPAGO.includes(o.loja));
  let relampagos = escolherComVariedade(relampagosNoAr, r, { maximo: 12, horas: r.home_horas_relampago });
  if (relampagos.length < 4)
    relampagos = escolherComVariedade(relampagosNoAr, r, { maximo: 12, horas: r.home_horas_relampago * 2 });

  // ⭐ Destaques: pontuação (desconto confiável + cliques + marca + loja), com variedade
  let destaques = escolherComVariedade(noAr, r, { maximo: NO_FEED, horas: r.home_horas_destaque });
  if (destaques.length < 12) destaques = escolherComVariedade(noAr, r, { maximo: NO_FEED });

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

  const cupons = cuponsNoAr.filter((o) => !o.expirada);

  const abas = [
    {
      id: "destaques",
      rotulo: "⭐ Destaques",
      descricao: "Desconto real, marcas conhecidas e lojas confiáveis, escolhidas pela vitrine do MukiOfertas.",
      href: "/mais-procuradas",
      itens: itensDoFeed(destaques),
    },
    {
      id: "recentes",
      rotulo: "🆕 Recentes",
      descricao: "As ofertas que acabaram de chegar, das mais novas para as mais antigas.",
      href: "/recentes",
      itens: itensDoFeed(recentes),
    },
    {
      id: "quentes",
      rotulo: "🔥 Mais quentes",
      descricao: "As ofertas que a comunidade mais está clicando agora.",
      href: "/mais-procuradas",
      itens: itensDoFeed(quentes),
    },
    {
      id: "descontos",
      rotulo: "💸 Maiores descontos",
      descricao: "Os maiores descontos sobre o preço anterior informado pela loja.",
      href: "/maiores-descontos",
      itens: itensDoFeed(descontos),
    },
    {
      id: "cupons",
      rotulo: "🎟️ Cupons",
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

        <FeedOfertas abas={abas} departamentos={DEPARTAMENTOS} />
      </HomeComRanking>

      <FaixaLojas lojas={montarLojas(contagemLojas)} />

      <GuiasHome comoEscolhemos={false} />

      <SobreMuki />
    </>
  );
}

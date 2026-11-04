import Link from "next/link";
import LinhaOfertas from "../components/LinhaOfertas";
import BannerBlackFriday from "../components/BannerBlackFriday";
import FaixaRelampago from "../components/FaixaRelampago";
import FaixaLojas from "../components/FaixaLojas";
import SobreMuki from "../components/SobreMuki";
import HomeComRanking from "../components/HomeComRanking";
import { buscarOfertas, buscarLojasComCategorias, buscarConfigHome } from "../lib/ofertas";
import { lojasDestaque, lojaDoNome } from "../data/lojas";
import { categorias } from "../data/ofertas";
import { regrasDaVitrine, escolherComVariedade, descontoDe } from "../lib/vitrine.mjs";

export const revalidate = 60;

// Ordem da página inicial (estratégia de vendas):
//   1) Black Friday  2) 🔥 Em alta agora  3) ⚡ Relâmpago  4) 🆕 Acabaram de chegar  5) 🎟️ Cupons do dia
//   6) Faixas do nicho (Hardware, Monitores, Smartphones, Games, TVs)  7) Ofertas por loja  8) Sobre
// Quem aparece primeiro em cada faixa: lib/vitrine.mjs (pontuação + variedade), com os números
// ajustáveis no painel admin (Configurações → Página inicial).

// Faixas do nicho (a ordem aqui é a ordem na tela). Para acrescentar outra, copie uma linha.
const FAIXAS_DO_NICHO = [
  {
    id: "hardware",
    slugs: ["hardware", "processadores", "placa-mae", "ssd", "placa-de-video", "memoria-ram", "gabinete"],
    titulo: "🧩 Hardware em promoção",
    href: "/categoria/hardware",
    maxPorCategoria: 3, // variedade: placa de vídeo, SSD, memória, placa-mãe...
  },
  {
    id: "monitores",
    slugs: ["monitor", "monitores"],
    titulo: "🖥️ Monitores",
    href: "/categoria/monitores",
    aparelho: /\bmonitor(es)?\b/i,
    precoMinimo: 300,
  },
  {
    id: "smartphones",
    slugs: ["celulares", "smartphones"],
    titulo: "📱 Smartphones",
    href: "/categoria/smartphones",
    aparelho: /\b(smartphones?|celular(es)?|iphone|galaxy|redmi|poco|moto ?g|motorola|xiaomi|realme)\b/i,
    precoMinimo: 400,
  },
  {
    id: "games",
    slugs: ["games", "consoles", "controles", "jogos"],
    titulo: "🎮 Video Games",
    href: "/categoria/games",
    maxPorCategoria: 4,
  },
  {
    id: "tvs",
    slugs: ["televisores", "tv"],
    titulo: "📺 TVs",
    href: "/categoria/tv",
    aparelho: /\b(smart ?tv|tv|televis(or|ao|ão))\b/i,
    precoMinimo: 600,
  },
];

// Lojas que não aparecem na faixa "Promoções relâmpago" da página inicial
const LOJAS_FORA_DO_RELAMPAGO = ["AliExpress"];

// Palavras que, no começo do título, indicam acessório (suporte, cabo, controle...)
const ACESSORIO =
  /^(\S+\s+){0,3}(suportes?|bra[cç]os?|cabos?|capas?|capinhas?|pel[ií]culas?|controles?|antenas?|base|filtros?|adaptador(es)?|conversor|receptor|kit|hub|fonte|carregador|protetor|tela|display|pe[cç]as?|botão|botao)\b/i;
// Telas de carro/moto (CarPlay, DVR) não entram nas faixas de Monitores e TVs
const VEICULO = /\b(moto|carro|veicular|automotiv[oa]|carplay|android auto|dvr)\b/i;

function daFaixa(ofertas, faixa) {
  return ofertas.filter(
    (o) =>
      faixa.slugs.includes(o.categoria) &&
      (!faixa.aparelho ||
        (faixa.aparelho.test(o.titulo) && !ACESSORIO.test(o.titulo) && !VEICULO.test(o.titulo))) &&
      Number(o.preco_atual) >= (faixa.precoMinimo ?? 0)
  );
}

// Seção com título, botão "Ver todas" e uma linha de cards com setas
function Faixa({ id, titulo, subtitulo, href, textoBotao = "Ver todas →", ofertas }) {
  if (!ofertas || ofertas.length === 0) return null;
  return (
    <section className="destaques" aria-labelledby={id}>
      <div className="secao-cabecalho">
        <div>
          <h2 id={id} className="secao-titulo">
            {titulo}
          </h2>
          {subtitulo && <p className="secao-sub">{subtitulo}</p>}
        </div>
        <Link href={href} className="botao-ver-mais">
          {textoBotao}
        </Link>
      </div>
      <LinhaOfertas ofertas={ofertas} />
    </section>
  );
}

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

export default async function Home() {
  const [todas, cuponsNoAr, contagemLojas, config] = await Promise.all([
    // todas as ofertas no ar (sem cupons e sem as da comunidade); as faixas são montadas daqui
    buscarOfertas({ limite: 1000, limiteExpiradas: 0 }),
    buscarOfertas({ categoria: "cupons", ordem: "recentes", limite: 12, limiteExpiradas: 0 }),
    buscarLojasComCategorias(),
    buscarConfigHome(),
  ]);
  const r = regrasDaVitrine(config);
  const noAr = todas.filter((o) => !o.expirada);
  const jaMostradas = new Set();
  const marcar = (lista) => (lista.forEach((o) => jaMostradas.add(o.id)), lista);

  // 2) Em alta agora: pontuação (desconto confiável + cliques + marca + loja), das últimas horas
  let emAlta = escolherComVariedade(noAr, r, { maximo: 12, horas: r.home_horas_destaque });
  if (emAlta.length < 6) emAlta = escolherComVariedade(noAr, r, { maximo: 12 });
  marcar(emAlta);

  // 3) Relâmpago: só as recentes, sem repetir o que já está em "Em alta"
  const relampagosNoAr = noAr.filter((o) => o.relampago && !LOJAS_FORA_DO_RELAMPAGO.includes(o.loja));
  let relampagos = escolherComVariedade(relampagosNoAr, r, { maximo: 12, horas: r.home_horas_relampago, ignorar: jaMostradas });
  if (relampagos.length < 4)
    relampagos = escolherComVariedade(relampagosNoAr, r, { maximo: 12, horas: r.home_horas_relampago * 2, ignorar: jaMostradas });
  marcar(relampagos);

  // 4) Acabaram de chegar: as mais novas primeiro (só com desconto, para toda oferta ter o selo)
  const recentes = [...noAr]
    .filter((o) => descontoDe(o) > 0)
    .sort((a, b) => new Date(b.publicada_em ?? 0) - new Date(a.publicada_em ?? 0))
    .slice(0, 16);

  // 6) Faixas do nicho: as melhores de cada uma, sem repetir as das faixas de cima
  const faixasDoNicho = FAIXAS_DO_NICHO.map((f) => ({
    ...f,
    ofertas: escolherComVariedade(daFaixa(noAr, f), r, {
      maximo: 12,
      ignorar: jaMostradas,
      maxPorCategoria: f.maxPorCategoria ?? 12,
      maxPorLoja: 4,
    }),
  }));

  return (
    <>
      <h1 className="so-leitor">Ofertas do dia, cupons e promoções relâmpago</h1>

      <BannerBlackFriday />

      <HomeComRanking>
      <Faixa
        id="titulo-em-alta"
        titulo="🔥 Em alta agora"
        subtitulo="As melhores ofertas do momento: desconto real, marcas conhecidas e o que o público está clicando."
        href="/mais-procuradas"
        textoBotao="Ver mais →"
        ofertas={emAlta}
      />

      <FaixaRelampago ofertas={relampagos} />

      <Faixa
        id="titulo-recentes"
        titulo="🆕 Acabaram de chegar"
        subtitulo="As ofertas mais novas aparecem primeiro."
        href="/recentes"
        ofertas={recentes}
      />

      <Faixa
        id="titulo-cupons"
        titulo="🎟️ Cupons do dia"
        subtitulo="Clique em copiar e use na loja."
        href="/cupons-de-desconto"
        ofertas={cuponsNoAr.filter((o) => !o.expirada)}
      />

      {faixasDoNicho.map((f) => (
        <Faixa key={f.id} id={`titulo-${f.id}`} titulo={f.titulo} href={f.href} ofertas={f.ofertas} />
      ))}
      </HomeComRanking>

      <FaixaLojas lojas={montarLojas(contagemLojas)} />

      <SobreMuki />
    </>
  );
}

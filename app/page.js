import FeedLinhas from "../components/FeedLinhas";
import LojasChips from "../components/LojasChips";
import BannerBlackFriday from "../components/BannerBlackFriday";
import FaixaLojas from "../components/FaixaLojas";
import SobreMuki from "../components/SobreMuki";
import HomeComRanking from "../components/HomeComRanking";
import GuiasHome from "../components/GuiasHome";
import SelosConfianca from "../components/SelosConfianca";
import { LateralAntes, LateralDepois } from "../components/LateralHome";
import { buscarLojasComCategorias } from "../lib/ofertas";
import { inicioDoFeed } from "../lib/feed-home";
import { lojasDestaque, lojaDoNome } from "../data/lojas";
import { categorias } from "../data/ofertas";
import { guias } from "../data/guias";

export const revalidate = 300; // refaz a página no máximo a cada 5 minutos

// Página inicial (visual novo, pensado primeiro para o celular):
//   1) Black Friday (some sozinha depois da data)
//   2) Lojas: "Ofertas verificadas das maiores lojas do Brasil" (celular: "Comece pela sua loja")
//   3) Feed: abas (Meus alertas, Destaques, Recentes, Menor preço, Maior desconto, Com cupom) e departamentos.
//      Computador: grade de 4 por linha, com a faixa dos canais depois de 2 linhas.
//      Celular: linhas por categoria (1 card na tela, arrasta para o lado). Rolagem infinita (rota /api/feed).
//      A lógica fica em lib/feed-home.js; o feed em components/FeedLinhas.js; o card em components/CardFeed.js.
//   4) Ofertas por loja, guias, Sobre e a faixa de confiança (aparecem quando o feed chega ao fim)
// Coluna da direita (computador): Receba no WhatsApp, Cupons do dia, ranking, Enviar uma oferta e o guia.

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
  const [feed, contagemLojas] = await Promise.all([inicioDoFeed(), buscarLojasComCategorias()]);

  const lojas = montarLojas(contagemLojas);

  return (
    <>
      <h1 className="so-leitor">Ofertas do dia, cupons e promoções relâmpago</h1>

      <BannerBlackFriday />

      <LojasChips emBreve={lojas.filter((l) => !l.total).map((l) => l.slug)} />

      <HomeComRanking
        antes={<LateralAntes cupons={feed.cuponsDoDia} />}
        extra={<LateralDepois guia={guias[0]} />}
      >
        <FeedLinhas
          abas={feed.abas}
          departamentos={feed.departamentos}
          primeira={feed.primeira}
          primeiraGrade={feed.primeiraGrade}
        />
      </HomeComRanking>

      <div id="todas-as-lojas" style={{ scrollMarginTop: "var(--mk-topo-fixo, 0px)" }}>
        <FaixaLojas lojas={lojas} />
      </div>

      <GuiasHome comoEscolhemos={false} />

      <SobreMuki />

      <SelosConfianca />
    </>
  );
}

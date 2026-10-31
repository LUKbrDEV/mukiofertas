import Link from "next/link";
import LinhaOfertas from "../components/LinhaOfertas";
import BannerBlackFriday from "../components/BannerBlackFriday";
import FaixaRelampago from "../components/FaixaRelampago";
import FaixaLojas from "../components/FaixaLojas";
import SobreMuki from "../components/SobreMuki";
import { buscarOfertas, buscarMaisProcuradas, buscarLojasComCategorias } from "../lib/ofertas";
import { lojasDestaque, lojaDoNome } from "../data/lojas";
import { categorias } from "../data/ofertas";
import { ordenarOfertas } from "../lib/ordenar";

export const revalidate = 60;

// Faixas por categoria na página inicial (a ordem aqui é a ordem na tela).
// Para acrescentar outra, é só copiar uma linha e trocar o slug, o título e o emoji.
const FAIXAS_DE_CATEGORIA = [
  // Só os aparelhos, sem acessórios. "slugs" inclui o slug antigo do departamento
  // (para as ofertas que ainda não foram reclassificadas) e o filtro abaixo tira suportes, cabos etc.
  {
    slug: "monitor",
    slugs: ["monitor", "monitores"],
    titulo: "Melhores ofertas em Monitores",
    emoji: "🖥️",
    aparelho: /\bmonitor(es)?\b/i,
    precoMinimo: 300,
  },
  {
    slug: "televisores",
    slugs: ["televisores", "tv"],
    titulo: "Melhores ofertas em TVs",
    emoji: "📺",
    aparelho: /\b(smart ?tv|tv|televis(or|ao|ão))\b/i,
    precoMinimo: 600,
  },
];

// Lojas que não aparecem na faixa "Promoções relâmpago" da página inicial
const LOJAS_FORA_DO_RELAMPAGO = ["AliExpress"];

// Palavras que, no começo do título, indicam acessório (suporte, cabo, controle...)
const ACESSORIO =
  /^(\S+\s+){0,3}(suportes?|bra[cç]os?|cabos?|capas?|pel[ií]culas?|controles?|antenas?|base|filtros?|adaptador(es)?|conversor|receptor|kit|hub|fonte|carregador|protetor|tela|display|pe[cç]as?|botão|botao)\b/i;

// Fica só com os aparelhos de verdade: o título fala do aparelho, não começa com nome de
// acessório e o preço é de aparelho (suporte de R$ 80 não entra na faixa de monitores)
function soAparelhos(ofertas, faixa) {
  return ofertas.filter(
    (o) => faixa.aparelho.test(o.titulo) && !ACESSORIO.test(o.titulo) && Number(o.preco_atual) >= faixa.precoMinimo
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
function listaDeCategorias(contagem) {
  return Object.entries(contagem)
    .map(([slug, total]) => {
      const c = categorias.find((x) => x.slug === slug);
      return c ? { slug, nome: c.nome, emoji: c.emoji, total } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);
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
    categorias: listaDeCategorias(l.categorias),
  }));
}

export default async function Home() {
  const [contagemLojas, relampagosNoAr, procuradas, recentes, ...porCategoria] = await Promise.all([
    buscarLojasComCategorias(),
    buscarOfertas({ relampago: true, limite: 40, limiteExpiradas: 0 }),
    buscarMaisProcuradas(24),
    // As que entraram por último no site, sem dar prioridade às que estão em destaque
    buscarOfertas({ ordem: "recentes", limite: 24, limiteExpiradas: 0 }),
    ...FAIXAS_DE_CATEGORIA.map((f) => buscarOfertas({ categoria: f.slugs, limite: 80, limiteExpiradas: 0 })),
  ]);

  const relampagos = relampagosNoAr
    .filter((o) => !o.expirada && !LOJAS_FORA_DO_RELAMPAGO.includes(o.loja))
    .slice(0, 12);

  // Para não repetir o mesmo produto, o que já está na faixa de relâmpago
  // não aparece de novo em "Melhores ofertas do momento"
  const idsRelampago = new Set(relampagos.map((o) => o.id));
  const melhores = procuradas.filter((o) => !idsRelampago.has(o.id)).slice(0, 12);

  return (
    <>
      <h1 className="so-leitor">Ofertas e promoções</h1>

      <BannerBlackFriday />
      <FaixaLojas lojas={montarLojas(contagemLojas)} />
      <FaixaRelampago ofertas={relampagos} />

      <Faixa
        id="titulo-melhores"
        titulo="🔥 Melhores ofertas do momento"
        subtitulo="As promoções com os maiores descontos e que estão chamando mais atenção agora."
        href="/mais-procuradas"
        textoBotao="Ver mais →"
        ofertas={melhores}
      />

      {FAIXAS_DE_CATEGORIA.map((f, i) => (
        <Faixa
          key={f.slug}
          id={`titulo-${f.slug}`}
          titulo={`${f.emoji} ${f.titulo}`}
          subtitulo="Os maiores descontos desta categoria."
          href={`/categoria/${f.slug}?ordem=maior-desconto`}
          // Maiores descontos primeiro
          ofertas={ordenarOfertas(soAparelhos(porCategoria[i] ?? [], f), "maior-desconto").slice(0, 12)}
        />
      ))}

      <Faixa
        id="titulo-recentes"
        titulo="🆕 Promoções adicionadas recentemente"
        subtitulo="As ofertas mais novas aparecem primeiro."
        href="/recentes"
        ofertas={recentes}
      />

      <SobreMuki />
    </>
  );
}

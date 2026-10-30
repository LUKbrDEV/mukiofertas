import Link from "next/link";
import LinhaOfertas from "../components/LinhaOfertas";
import BannerBlackFriday from "../components/BannerBlackFriday";
import FaixaRelampago from "../components/FaixaRelampago";
import FaixaLojas from "../components/FaixaLojas";
import SobreMuki from "../components/SobreMuki";
import { buscarOfertas, buscarMaisProcuradas, buscarLojasComCategorias, slugDaLoja } from "../lib/ofertas";
import { lojasDestaque, lojaDoNome, corDaLoja } from "../data/lojas";
import { categorias } from "../data/ofertas";
import { ordenarOfertas } from "../lib/ordenar";

export const revalidate = 60;

// Faixas por categoria na página inicial (a ordem aqui é a ordem na tela).
// Para acrescentar outra, é só copiar uma linha e trocar o slug, o título e o emoji.
const FAIXAS_DE_CATEGORIA = [
  { slug: "monitores", titulo: "Melhores ofertas em Monitores", emoji: "🖥️" },
  { slug: "tv", titulo: "Melhores ofertas em TVs", emoji: "📺" },
];

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

// Monta a faixa de lojas: primeiro as que têm logo (na ordem do data/lojas.js), depois todas as
// outras lojas com ofertas no ar, da que tem mais ofertas para a que tem menos.
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
  const outras = [];
  for (const l of doBanco) {
    const config = lojaDoNome(l.nome);
    if (config) somar(comLogo.find((x) => x.slug === config.slug), l);
    else
      outras.push({
        nome: l.nome,
        slug: slugDaLoja(l.nome),
        artigo: "da",
        logo: null,
        cor: corDaLoja(l.nome),
        total: l.total,
        categorias: { ...l.categorias },
      });
  }

  return [...comLogo, ...outras.sort((a, b) => b.total - a.total)].map((l) => ({
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
    buscarOfertas({ relampago: true, limite: 12, limiteExpiradas: 0 }),
    buscarMaisProcuradas(24),
    // As que entraram por último no site, sem dar prioridade às que estão em destaque
    buscarOfertas({ ordem: "recentes", limite: 24, limiteExpiradas: 0 }),
    ...FAIXAS_DE_CATEGORIA.map((f) => buscarOfertas({ categoria: f.slug, limite: 40, limiteExpiradas: 0 })),
  ]);

  const relampagos = relampagosNoAr.filter((o) => !o.expirada).slice(0, 12);

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
          ofertas={ordenarOfertas(porCategoria[i] ?? [], "maior-desconto").slice(0, 12)}
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

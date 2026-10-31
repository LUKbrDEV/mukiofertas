// Aba "Cupons": todos os cupons do site, de todas as fontes:
//   - Telegram: postagens que são só um cupom (o classificador marca a categoria "cupons")
//   - Lomadee e Awin: o robô de coleta busca os cupons das lojas (scripts/fontes/cupons.mjs)
//   - Painel admin: cupons cadastrados na aba Cupons (tabela "cupons")
// Os cupons não aparecem nos departamentos nem na vitrine da página inicial.
// Salve como app/cupons-de-desconto/page.js

import Link from "next/link";
import ListaOfertas from "../../components/ListaOfertas";
import CupomRevelar from "../../components/CupomRevelar";
import { buscarOfertas, buscarCupons, CATEGORIA_CUPONS } from "../../lib/ofertas";
import { SITE } from "../../lib/site";

export const revalidate = 60;

const TITULO = "Cupons de desconto de hoje";
const DESCRICAO =
  "Cupons de desconto da Amazon, Mercado Livre, Shopee, AliExpress e outras lojas, atualizados o dia todo. Copie o código e use na compra.";

export const metadata = {
  title: `${TITULO} | MukiOfertas`,
  description: DESCRICAO,
  alternates: { canonical: "/cupons-de-desconto" },
  openGraph: {
    type: "website",
    siteName: SITE.nome,
    locale: "pt_BR",
    title: `${TITULO} | MukiOfertas`,
    description: DESCRICAO,
    url: "/cupons-de-desconto",
    images: [{ url: "/logo-mukiofertas.png", alt: "MukiOfertas" }],
  },
};

const CSS = `
  .cupons-filtros { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 18px; }
  .cupons-filtros a {
    padding: 6px 14px;
    font-size: 0.88rem;
    font-weight: 700;
    color: #0f172a;
    text-decoration: none;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
  }
  .cupons-filtros a:hover { border-color: #ff7a1a; color: #ff6a00; }
  .cupons-filtros a[aria-current="page"] { color: #fff; background: #ff6a00; border-color: #ff6a00; }
  .cupons-manuais { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin: 0 0 22px; }
  .cupom-manual {
    display: flex; flex-direction: column; gap: 8px; padding: 16px;
    background: #fff; border: 2px dashed #ffb27a; border-radius: 14px;
  }
  .cupom-manual-loja { font-size: 0.8rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
  .cupom-manual-desc { margin: 0; font-weight: 700; color: #0f172a; line-height: 1.35; }
  .cupom-manual-validade { margin: 0; font-size: 0.8rem; color: #64748b; }
  .cupom-manual .botao { margin-top: auto; text-align: center; }
`;

export default async function PaginaCupons({ searchParams }) {
  const { loja: lojaPedida } = await searchParams;

  const [todos, manuais] = await Promise.all([
    buscarOfertas({
    categoria: CATEGORIA_CUPONS,
    ordem: "recentes",
    limite: 200,
    limiteExpiradas: 12,
    }),
    buscarCupons(),
  ]);

  // Filtro por loja (só as lojas que têm cupom agora)
  const lojas = [
    ...new Set([...todos.filter((o) => !o.expirada).map((o) => o.loja), ...manuais.map((c) => c.loja).filter(Boolean)]),
  ].sort();
  const cupons = lojaPedida ? todos.filter((o) => o.loja === lojaPedida) : todos;
  const doPainel = lojaPedida ? manuais.filter((c) => c.loja === lojaPedida) : manuais;
  const noAr = cupons.filter((o) => !o.expirada).length + doPainel.length;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="secao-cabecalho" style={{ marginBottom: 6 }}>
        <div>
          <h1 className="titulo-pagina">🏷️ Cupons de desconto</h1>
          <p className="subtitulo-pagina" style={{ marginBottom: 0 }}>
            {noAr > 0
              ? `${noAr} ${noAr === 1 ? "cupom ativo" : "cupons ativos"} agora. Copie o código e use na loja.`
              : "Nenhum cupom ativo agora. Novos cupons aparecem aqui assim que chegam."}
          </p>
        </div>
      </div>

      {lojas.length > 1 && (
        <nav className="cupons-filtros" aria-label="Filtrar por loja">
          <Link href="/cupons-de-desconto" aria-current={!lojaPedida ? "page" : undefined}>
            Todas
          </Link>
          {lojas.map((l) => (
            <Link
              key={l}
              href={`/cupons-de-desconto?loja=${encodeURIComponent(l)}`}
              aria-current={lojaPedida === l ? "page" : undefined}
            >
              {l}
            </Link>
          ))}
        </nav>
      )}

      {/* Cupons cadastrados no painel admin (aba Cupons) */}
      {doPainel.length > 0 && (
        <div className="cupons-manuais">
          {doPainel.map((c) => (
            <article key={c.id} className="cupom-manual">
              {c.loja && <span className="cupom-manual-loja">{c.loja}</span>}
              {c.descricao && <p className="cupom-manual-desc">{c.descricao}</p>}
              <CupomRevelar codigo={c.codigo} />
              {c.validade && (
                <p className="cupom-manual-validade">
                  Válido até {new Date(`${c.validade}T12:00:00`).toLocaleDateString("pt-BR")}
                </p>
              )}
              {c.link && (
                <a className="botao" href={c.link} target="_blank" rel="sponsored noopener noreferrer">
                  Ir para a loja
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      <ListaOfertas
        ofertas={cupons}
        vazio="Nenhum cupom ativo agora. Novos cupons aparecem aqui assim que chegam."
      />

      <p className="subtitulo-pagina" style={{ marginTop: 24 }}>
        Procurando produtos com cupom? Veja as <Link href="/cupons">ofertas com cupom</Link>.
      </p>
    </>
  );
}

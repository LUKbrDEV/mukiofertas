// Página de um produto da compra em grupo: grupos abertos, "Criar meu grupo" e perguntas frequentes.
// Salve como app/compra-em-grupo/p/[id]/[[...slug]]/page.js
// Endereço: /compra-em-grupo/p/1005012629992095/nome-do-produto (o nome no fim é opcional)

import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import CardGrupo from "../../../../../components/compra-em-grupo/CardGrupo";
import GrupoAberto from "../../../../../components/compra-em-grupo/GrupoAberto";
import { ContarVisita, DivulgarRapido, AvisarNovosGrupos } from "../../../../../components/compra-em-grupo/AcoesProduto";
import { formatarPreco } from "../../../../../lib/ofertas";
import { CSS_GRUPO } from "../../../../../components/compra-em-grupo/estilo";
import { buscarProdutoDeGrupo, produtosParecidos, linkDoProduto, slugTitulo } from "../../../../../lib/compra-em-grupo";
import { categorias } from "../../../../../data/ofertas";
import { SITE } from "../../../../../lib/site";

export const revalidate = 30;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const produto = await buscarProdutoDeGrupo(id);
  if (!produto) return { title: "Produto não encontrado | MukiOfertas", robots: { index: false } };
  const titulo = `Compra em grupo: ${produto.titulo}`;
  const descricao = produto.grupos.length
    ? `${produto.grupos.length} ${produto.grupos.length === 1 ? "grupo aberto" : "grupos abertos"} no AliExpress. Entre no grupo e pague o preço de grupo.`
    : "Crie um grupo de 3 no AliExpress e divulgue aqui para fechar mais rápido.";
  return {
    title: `${titulo} | MukiOfertas`,
    description: descricao,
    alternates: { canonical: linkDoProduto(produto) },
    openGraph: {
      type: "website",
      siteName: SITE.nome,
      locale: "pt_BR",
      title: titulo,
      description: descricao,
      url: linkDoProduto(produto),
      images: produto.imagem ? [{ url: produto.imagem, alt: produto.titulo }] : undefined,
    },
  };
}

export default async function ProdutoDeGrupo({ params }) {
  const { id, slug } = await params;
  const produto = await buscarProdutoDeGrupo(id);
  if (!produto) notFound();
  // endereço com o nome errado/antigo: manda para o certo
  const certo = slugTitulo(produto.titulo);
  if (certo && slug?.[0] && slug[0] !== certo) permanentRedirect(linkDoProduto(produto));

  const parecidos = await produtosParecidos(produto);
  const categoria = categorias.find((c) => c.slug === produto.categoria) ?? null;
  const pai = categoria?.pai ? categorias.find((c) => c.slug === categoria.pai) : categoria;
  const abertos = produto.grupos;
  const precoGrupo = Number(produto.preco_grupo) || null;
  const precoNormal = Number(produto.preco_normal) || null;
  const off = precoGrupo && precoNormal && precoNormal > precoGrupo ? Math.round(((precoNormal - precoGrupo) / precoNormal) * 100) : null;
  // "Criar meu grupo": link de afiliado (comissão); sem ele, a página do produto no AliExpress
  const linkCriar = produto.link_afiliado || `https://pt.aliexpress.com/item/${produto.id}.html`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_GRUPO }} />
      <nav style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 12px" }} aria-label="Você está em">
        <Link href="/compra-em-grupo">Compra em grupo</Link>
        {pai && (
          <>
            {" › "}
            <Link href={`/compra-em-grupo?aba=todos&cat=${pai.slug}`}>{pai.nome}</Link>
          </>
        )}
      </nav>

      <ContarVisita id={produto.id} />
      <section className="cg-produto">
        <div className="cg-produto-foto">
          {produto.imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.imagem} alt={produto.titulo} />
          ) : (
            <span style={{ fontSize: 64 }}>👥</span>
          )}
        </div>

        <div className="cg-coluna">
          <h1>{produto.titulo}</h1>
          <div className="cg-numeros">
            <span>👥 {produto.grupos_criados} {produto.grupos_criados === 1 ? "grupo criado" : "grupos criados"}</span>
            <span>👁️ {(produto.visualizacoes ?? 0).toLocaleString("pt-BR")} visualizações</span>
          </div>

          {abertos.length > 0 ? (
            <div className="cg-faixa cg-faixa--aberto">
              <span className="cg-faixa-icone">🔥</span>
              <span>
                <strong>
                  {abertos.length === 1 ? "1 grupo aberto agora" : `${abertos.length} grupos abertos agora`}:{" "}
                  {abertos[0].faltam === 1 ? "falta só 1 pessoa." : `faltam ${abertos[0].faltam} pessoas.`}
                </strong>{" "}
                Entre no grupo e pague o preço de grupo. Se não fechar em 24h, o AliExpress devolve o dinheiro.
              </span>
            </div>
          ) : (
            <div className="cg-faixa">
              <span className="cg-faixa-icone">📦</span>
              <span>
                <strong>Este produto está sem grupo aberto: crie o seu.</strong> Você cria o grupo de 3 no AliExpress,
                divulga o link aqui e quem entrar paga o preço de grupo com você.
              </span>
            </div>
          )}

          {(precoGrupo || precoNormal) && (
            <div className="cg-precobox">
              <div className="cg-precobox-linha">
                <span className="cg-precobox-preco">{formatarPreco(precoGrupo ?? precoNormal)}</span>
                {off ? (
                  <>
                    <s>{formatarPreco(precoNormal)}</s>
                    <span className="cg-badge">-{off}%</span>
                  </>
                ) : null}
              </div>
              <div className="cg-mono">
                {precoGrupo ? (
                  <>
                    {precoNormal ? (
                      <>
                        Preço fora do grupo: {formatarPreco(precoNormal)}
                        <br />
                      </>
                    ) : null}
                    Preço do grupo de 3 no app do AliExpress
                  </>
                ) : (
                  <>
                    Preço comprando sozinho
                    <br />
                    O preço de grupo aparece no app do AliExpress
                  </>
                )}
              </div>
            </div>
          )}

          {abertos.length > 0 ? (
            <a className="cg-cta" href={abertos[0].link} target="_blank" rel="nofollow noopener sponsored">
              👥 Entrar no grupo <small>({abertos[0].faltam === 1 ? "falta 1 pessoa" : `faltam ${abertos[0].faltam}`})</small>
            </a>
          ) : (
            <a className="cg-cta" href={linkCriar} target="_blank" rel="nofollow noopener sponsored">
              ＋ Criar meu grupo no AliExpress
            </a>
          )}

          {abertos.length > 0 && (
            <div className="cg-caixa">
              <strong className="cg-caixa-titulo">Grupos abertos</strong>
              <p className="cg-caixa-texto">Entrou? Toque em &quot;Já entrei&quot; para atualizar as vagas para os outros.</p>
              <div className="cg-grupos" style={{ margin: 0 }}>
                {abertos.map((g) => (
                  <GrupoAberto key={g.id} grupo={g} />
                ))}
              </div>
              <a className="cg-btn cg-btn--contorno cg-btn--largo" style={{ marginTop: 10 }} href={linkCriar} target="_blank" rel="nofollow noopener sponsored">
                Prefere criar o seu? Criar meu grupo no AliExpress
              </a>
            </div>
          )}

          <div className="cg-caixa">
            <strong className="cg-caixa-titulo">Como criar o seu grupo</strong>
            <ol className="cg-passos">
              <li>
                Toque em &quot;Criar meu grupo no AliExpress&quot;. O preço de grupo aparece no app do AliExpress, com a sua conta
                entrada.
              </li>
              <li>No app, escolha a compra em grupo (grupo de 3), pague o preço de grupo e copie o link de convite.</li>
              <li>Volte aqui e cole o link em &quot;Já criou o grupo?&quot;. Ele entra na lista para mais gente entrar.</li>
            </ol>
          </div>

          <DivulgarRapido produtoId={produto.id} />
          <AvisarNovosGrupos produtoId={produto.id} />

          <p className="cg-aviso" style={{ margin: 0 }}>
            Preço de grupo e vagas são informados pela comunidade e podem mudar. Confira o valor no AliExpress antes de pagar.
          </p>
        </div>
      </section>

      <section className="cg-secao cg-faq">
        <h2>Perguntas frequentes</h2>
        <details>
          <summary>Como entro num grupo?</summary>
          <p>
            Toque em &quot;Entrar no grupo&quot;. O AliExpress abre o grupo com o preço promocional: escolha a variação, pague e
            espere as vagas completarem. Depois, toque em &quot;Já entrei&quot; aqui para atualizar as vagas para os outros.
          </p>
        </details>
        <details>
          <summary>E se o grupo não fechar?</summary>
          <p>
            O grupo tem 24 horas para completar 3 pessoas. Se não completar, o AliExpress cancela o pedido e devolve o
            dinheiro na mesma forma de pagamento. Aí é só entrar em outro grupo aberto deste produto.
          </p>
        </details>
        <details>
          <summary>O grupo já fechou, mas ainda aparece aqui</summary>
          <p>Toque em &quot;Já fechou&quot;. Com dois avisos, o grupo sai do mural. Depois de 24 horas ele sai sozinho.</p>
        </details>
      </section>

      {parecidos.length > 0 && (
        <section className="cg-secao">
          <h2>Você também pode gostar</h2>
          <div className="cg-grade">
            {parecidos.map((p) => (
              <CardGrupo key={p.id} produto={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Página "Compra em grupo": mural de grupos de 3 do AliExpress abertos agora.
// Salve como app/compra-em-grupo/page.js. Dados: lib/compra-em-grupo.js.

import Link from "next/link";
import CardGrupo from "../../components/compra-em-grupo/CardGrupo";
import { CSS_GRUPO } from "../../components/compra-em-grupo/estilo";
import { listarProdutosDeGrupo, ordenarParaAbrir } from "../../lib/compra-em-grupo";
import { categorias } from "../../data/ofertas";
import { SITE } from "../../lib/site";

export const revalidate = 30;

const TITULO = "Compra em grupo do AliExpress";
const DESCRICAO =
  "Grupos de 3 do AliExpress abertos agora: entre num grupo e pague o preço de grupo. Ou divulgue o seu grupo para fechar mais rápido.";

export const metadata = {
  title: `${TITULO} | MukiOfertas`,
  description: DESCRICAO,
  alternates: { canonical: "/compra-em-grupo" },
  openGraph: {
    type: "website",
    siteName: SITE.nome,
    locale: "pt_BR",
    title: `${TITULO} | MukiOfertas`,
    description: DESCRICAO,
    url: "/compra-em-grupo",
    images: [{ url: "/logo-mukiofertas.png", alt: "MukiOfertas" }],
  },
};

// departamento de uma categoria (a própria, se for principal)
const departamentoDe = (slug) => {
  const c = categorias.find((x) => x.slug === slug);
  return c?.pai ? categorias.find((x) => x.slug === c.pai) ?? c : c ?? null;
};

export default async function CompraEmGrupo({ searchParams }) {
  const params = await searchParams;
  // "todos" era o nome antigo da aba "Para abrir grupo"
  const aba = params?.aba === "abrir" || params?.aba === "todos" ? "abrir" : "abertos";
  const dep = typeof params?.cat === "string" ? params.cat : null;

  const { produtos: todos, totalAbertos, erro } = await listarProdutosDeGrupo({ aba: "todos" });
  // filtros de departamento: só os que têm produto na lista
  const deps = [];
  for (const p of todos) {
    const d = departamentoDe(p.categoria);
    if (d && !deps.some((x) => x.slug === d.slug)) deps.push(d);
  }
  const doDep = dep ? todos.filter((p) => departamentoDe(p.categoria)?.slug === dep) : todos;
  const abertos = doDep.filter((p) => p.abertos > 0);
  const paraAbrir = ordenarParaAbrir(doDep.filter((p) => p.abertos === 0));
  // na aba "Abertos agora", embaixo dos grupos aparecem alguns produtos para abrir grupo
  const MAX_ABRIR_NA_ABA_ABERTOS = 12;
  const link = (mudar) => {
    const q = new URLSearchParams();
    const a = mudar.aba ?? aba;
    const c = "cat" in mudar ? mudar.cat : dep;
    if (a !== "abertos") q.set("aba", a);
    if (c) q.set("cat", c);
    const s = q.toString();
    return `/compra-em-grupo${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_GRUPO }} />
      <div className="cg-topo">
        <div>
          <h1 className="titulo-pagina" style={{ marginBottom: 4 }}>👥 Compra em grupo</h1>
          <p className="subtitulo-pagina" style={{ marginBottom: 0 }}>
            Grupos de 3 do AliExpress: com 3 pessoas no mesmo grupo, todo mundo paga o preço de grupo.
            {totalAbertos ? ` ${totalAbertos} ${totalAbertos === 1 ? "grupo aberto" : "grupos abertos"} agora.` : ""}
          </p>
        </div>
        <Link href="/compra-em-grupo/divulgar" className="cg-btn">
          ➕ Divulgar meu grupo
        </Link>
      </div>

      <div className="cg-como">
        <div>
          <strong>1. Escolha um grupo</strong>Os que estão quase fechando aparecem primeiro.
        </div>
        <div>
          <strong>2. Entre e pague no AliExpress</strong>O link abre o grupo com o preço promocional.
        </div>
        <div>
          <strong>3. Espere fechar</strong>Fechou em 24h? Pedido confirmado. Não fechou? O AliExpress devolve o dinheiro.
        </div>
      </div>

      <nav className="cg-filtros" aria-label="Mostrar">
        <Link href={link({ aba: "abertos" })} aria-current={aba === "abertos" ? "page" : undefined}>
          🔥 Abertos agora
        </Link>
        <Link href={link({ aba: "abrir" })} aria-current={aba === "abrir" ? "page" : undefined}>
          ➕ Para abrir grupo
        </Link>
      </nav>
      {deps.length > 1 && (
        <nav className="cg-filtros" aria-label="Departamentos" style={{ marginTop: -8 }}>
          <Link href={link({ cat: null })} aria-current={!dep ? "page" : undefined}>
            Tudo
          </Link>
          {deps.map((d) => (
            <Link key={d.slug} href={link({ cat: d.slug })} aria-current={dep === d.slug ? "page" : undefined}>
              {d.emoji} {d.nome}
            </Link>
          ))}
        </nav>
      )}

      {erro ? (
        <p className="vazio">A compra em grupo está sendo preparada. Volte daqui a pouco.</p>
      ) : aba === "abertos" ? (
        <>
          {abertos.length > 0 ? (
            <div className="cg-grade">
              {abertos.map((p) => (
                <CardGrupo key={p.id} produto={p} />
              ))}
            </div>
          ) : (
            <div className="cg-faixa">
              <span className="cg-faixa-icone">📦</span>
              <span>
                <strong>Nenhum grupo aberto agora. Que tal abrir um?</strong> Escolha um produto abaixo, crie o grupo de 3 no
                AliExpress e divulgue o link aqui. A comunidade ajuda a fechar.
              </span>
            </div>
          )}

          {paraAbrir.length > 0 && (
            <section style={{ marginTop: 26 }}>
              <div className="cg-topo" style={{ marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>➕ Produtos para abrir grupo</h2>
                {paraAbrir.length > MAX_ABRIR_NA_ABA_ABERTOS && (
                  <Link href={link({ aba: "abrir" })} className="cg-btn cg-btn--claro cg-btn--pequeno">
                    Ver todos ({paraAbrir.length})
                  </Link>
                )}
              </div>
              <div className="cg-grade">
                {paraAbrir.slice(0, MAX_ABRIR_NA_ABA_ABERTOS).map((p) => (
                  <CardGrupo key={p.id} produto={p} />
                ))}
              </div>
            </section>
          )}

          {abertos.length === 0 && paraAbrir.length === 0 && (
            <div className="cg-sem-grupo" style={{ marginTop: 14 }}>
              Ainda não temos produtos aqui. Criou um grupo no AliExpress?{" "}
              <Link href="/compra-em-grupo/divulgar">Divulgue aqui</Link> para fechar mais rápido.
            </div>
          )}
        </>
      ) : paraAbrir.length === 0 ? (
        <div className="cg-sem-grupo">
          Nenhum produto para abrir grupo{dep ? " neste departamento" : ""} agora.{" "}
          <Link href="/compra-em-grupo/divulgar">Divulgue o seu grupo</Link>.
        </div>
      ) : (
        <>
          <p className="subtitulo-pagina" style={{ marginTop: -4 }}>
            Produtos que aceitam grupo de 3 no AliExpress e estão sem grupo aberto agora. Os que mais tiveram grupos aparecem
            primeiro.
          </p>
          <div className="cg-grade">
            {paraAbrir.map((p) => (
              <CardGrupo key={p.id} produto={p} />
            ))}
          </div>
        </>
      )}

      <p className="cg-aviso">
        A compra acontece no AliExpress. Os grupos são divulgados pela comunidade; o MukiOfertas pode receber comissão
        pelos links, sem custo extra para você.
      </p>
    </>
  );
}

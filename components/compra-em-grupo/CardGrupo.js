// Card de um produto da compra em grupo. Salve como components/compra-em-grupo/CardGrupo.js.
import Link from "next/link";
import { formatarPreco } from "../../lib/ofertas";
import { linkDoProduto, textoFaltam } from "../../lib/compra-em-grupo";

export function PrecoGrupo({ produto }) {
  const grupo = Number(produto.preco_grupo) || null;
  const normal = Number(produto.preco_normal) || null;
  const principal = grupo ?? normal;
  if (!principal) return null;
  const off = grupo && normal && normal > grupo ? Math.round(((normal - grupo) / normal) * 100) : null;
  return (
    <div>
      <span className="cg-rotulo">{grupo ? "Preço no grupo" : "Preço"}</span>
      <div className="cg-preco">
        <strong>{formatarPreco(principal)}</strong>
        {off ? (
          <>
            <s>{formatarPreco(normal)}</s>
            <span className="cg-off">-{off}%</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function CardGrupo({ produto }) {
  const status = produto.abertos
    ? produto.abertos > 1
      ? `${produto.abertos} grupos abertos · ${textoFaltam(produto.menorFaltam).toLowerCase()}`
      : textoFaltam(produto.menorFaltam)
    : produto.grupos_criados > 0
      ? `Abrir grupo · ${produto.grupos_criados} já ${produto.grupos_criados === 1 ? "criado" : "criados"}`
      : "Abrir grupo";
  return (
    <Link href={linkDoProduto(produto)} className="cg-card">
      <div className="cg-card-foto">
        {produto.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.imagem} alt={produto.titulo} loading="lazy" />
        ) : (
          <span style={{ fontSize: 40 }}>👥</span>
        )}
      </div>
      <div className="cg-card-corpo">
        <p className="cg-card-titulo">{produto.titulo}</p>
        <PrecoGrupo produto={produto} />
        <span className={`cg-status ${produto.abertos ? `cg-status--${produto.menorFaltam}` : ""}`}>{produto.abertos ? "👥" : "➕"} {status}</span>
      </div>
    </Link>
  );
}

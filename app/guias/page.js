// Lista dos guias de compra: https://www.mukiofertas.com.br/guias
// Salve como app/guias/page.js. Os textos ficam em data/guias.js.

import Link from "next/link";
import { guias, formatarDataGuia } from "../../data/guias";
import "../../components/guias.css";

export const metadata = {
  title: "Guias de compra | MukiOfertas",
  description:
    "Guias de compra do MukiOfertas: como escolher monitor, SSD e celular, como saber se uma promoção é real, como usar cupons e comprar com segurança.",
  alternates: { canonical: "/guias" },
};

export default function PaginaGuias() {
  const lista = [...guias].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));

  return (
    <div className="guias-pagina">
      <h1>Guias de compra</h1>
      <p className="guias-intro">
        Antes de aproveitar uma oferta, vale saber o que olhar. Aqui a equipe do MukiOfertas explica, sem
        complicação, como escolher os produtos mais procurados e como fugir dos descontos de fachada.
      </p>

      <ul className="guias-grade">
        {lista.map((g) => (
          <li key={g.slug}>
            <Link href={`/guias/${g.slug}`} className="guia-card">
              <span className="guia-tema">{g.tema}</span>
              <strong>{g.titulo}</strong>
              <p>{g.descricao}</p>
              <small>
                Atualizado em {formatarDataGuia(g.atualizadoEm)} · {g.minutos} min de leitura
              </small>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

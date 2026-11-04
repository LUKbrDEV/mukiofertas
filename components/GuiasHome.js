// Faixa "Guias de compra" + bloco "Como escolhemos as ofertas" da página inicial.
// Salve como components/GuiasHome.js (usado no app/page.js).

import Link from "next/link";
import { guias } from "../data/guias";
import "./guias.css";

const PASSOS = [
  {
    titulo: "Só desconto informado pela loja",
    texto: "Mostramos o preço anterior apenas quando a própria loja informa. Sem preço anterior, a oferta não ganha selo de desconto.",
  },
  {
    titulo: "Conferimos o preço",
    texto: "O robô do site volta à loja de tempos em tempos para conferir a maioria das ofertas. Se o preço subiu, a oferta ganha a tag Expirado e desce para o fim da lista.",
  },
  {
    titulo: "Tiramos o que venceu",
    texto: "Toda oferta expira em poucos dias e, depois, sai do site. Assim a vitrine fica só com o que ainda está valendo.",
  },
  {
    titulo: "A comunidade avisa",
    texto: "Os membros comentam, votam e avisam quando o preço mudou ou o cupom parou de funcionar.",
  },
];

// comoEscolhemos={false} esconde o bloco "Como escolhemos as ofertas" (ele também está na página Sobre)
export default function GuiasHome({ comoEscolhemos = true }) {
  const lista = [...guias].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 3);

  return (
    <>
      <section className="home-guias" aria-labelledby="titulo-guias-home">
        <div className="secao-cabecalho">
          <div>
            <h2 id="titulo-guias-home" className="secao-titulo">
              📖 Guias de compra
            </h2>
            <p className="secao-sub">O que olhar antes de aproveitar uma oferta, explicado pela equipe do MukiOfertas.</p>
          </div>
          <Link href="/guias" className="botao-ver-mais">
            Ver todos →
          </Link>
        </div>
        <ul className="guias-grade">
          {lista.map((g) => (
            <li key={g.slug}>
              <Link href={`/guias/${g.slug}`} className="guia-card">
                <span className="guia-tema">{g.tema}</span>
                <strong>{g.titulo}</strong>
                <p>{g.descricao}</p>
                <small>{g.minutos} min de leitura</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {comoEscolhemos && (
      <section className="home-confianca" aria-labelledby="titulo-como-escolhemos">
        <h2 id="titulo-como-escolhemos">Como escolhemos as ofertas</h2>
        <ol>
          {PASSOS.map((p) => (
            <li key={p.titulo}>
              <strong>{p.titulo}</strong>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>
      )}
    </>
  );
}

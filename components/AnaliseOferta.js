// Bloco "Análise do MukiOfertas" da página da oferta.
// Salve como components/AnaliseOferta.js.
//
// Monta um texto próprio para cada oferta a partir dos dados dela (desconto, cupom, frete,
// quando o preço foi conferido) e indica o guia de compra da categoria, quando existe.

import Link from "next/link";
import { calcularDesconto, formatarPreco, tempoAtras } from "../lib/ofertas";
import "./guias.css";

function veredito(desconto, expirada) {
  if (expirada) return { nivel: "encerrada", texto: "Oferta encerrada" };
  if (desconto >= 35) return { nivel: "otimo", texto: "Desconto forte" };
  if (desconto >= 15) return { nivel: "bom", texto: "Bom desconto" };
  if (desconto > 0) return { nivel: "normal", texto: "Desconto pequeno" };
  return { nivel: "normal", texto: "Sem preço anterior informado" };
}

export default function AnaliseOferta({ oferta, guia }) {
  const expirada = oferta.expirada;
  const desconto = calcularDesconto(oferta);
  const economia = desconto > 0 ? Number(oferta.preco_antigo) - Number(oferta.preco_atual) : 0;
  const v = veredito(desconto, expirada);

  const frases = [];
  if (expirada) {
    frases.push(
      `Esta oferta terminou. Quando a publicamos, o produto estava por ${formatarPreco(
        oferta.preco_atual
      )} na ${oferta.loja}. O preço pode ter mudado desde então.`
    );
  } else if (desconto > 0) {
    frases.push(
      `O produto está por ${formatarPreco(oferta.preco_atual)} na ${oferta.loja}, ${desconto}% abaixo do preço anterior informado pela loja (${formatarPreco(
        oferta.preco_antigo
      )}). A economia é de ${formatarPreco(economia)}.`
    );
  } else {
    frases.push(
      `O produto está por ${formatarPreco(oferta.preco_atual)} na ${oferta.loja}. A loja não informou um preço anterior, então compare com outras lojas antes de decidir.`
    );
  }

  if (!expirada && oferta.cupom) {
    frases.push(`Para chegar a esse preço, use o cupom ${oferta.cupom} no carrinho, antes de escolher a forma de pagamento.`);
  }
  if (!expirada && oferta.frete_gratis) frases.push("A loja informa frete grátis para esta oferta, mas confira para o seu CEP.");
  if (!expirada && oferta.relampago) frases.push("É uma oferta relâmpago: esse tipo de promoção costuma durar pouco ou ter estoque limitado.");
  if (oferta.preco_conferido_em) {
    frases.push(`Conferimos o preço na loja pela última vez ${tempoAtras(oferta.preco_conferido_em)}.`);
  }

  return (
    <section className="analise-oferta" aria-labelledby="titulo-analise">
      <h2 id="titulo-analise">Análise do MukiOfertas</h2>
      <span className="analise-veredito" data-nivel={v.nivel}>
        {v.texto}
      </span>
      {frases.map((f, i) => (
        <p key={i} style={{ margin: "0 0 8px" }}>
          {f}
        </p>
      ))}

      {!expirada && (
        <>
          <p style={{ margin: "12px 0 0", fontWeight: 700 }}>Antes de comprar, confira:</p>
          <ul>
            <li>se quem vende é a própria {oferta.loja} ou um vendedor parceiro, e a reputação dele;</li>
            <li>o preço final com frete para o seu CEP e a forma de pagamento (Pix costuma ser mais barato);</li>
            <li>o preço em outras lojas: desconto alto nem sempre quer dizer preço baixo.</li>
          </ul>
        </>
      )}

      <p className="analise-guia">
        {guia ? (
          <Link href={`/guias/${guia.slug}`}>Leia o guia: {guia.titulo} →</Link>
        ) : (
          <Link href="/guias/como-saber-se-uma-promocao-e-real">
            Leia o guia: como saber se uma promoção é real →
          </Link>
        )}
      </p>
    </section>
  );
}

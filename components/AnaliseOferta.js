// Bloco "Análise do MukiOfertas" da página da oferta.
// Salve como components/AnaliseOferta.js.
//
// Monta um texto próprio para cada oferta a partir dos dados dela (desconto, cupom, frete,
// quando o preço foi conferido) e indica o guia de compra da categoria, quando existe.

import { ehRelampago } from "../lib/relampago.mjs";
import Link from "next/link";
import { calcularDesconto, formatarPreco, tempoAtras } from "../lib/ofertas";
import "./guias.css";

const dataLonga = (ms) =>
  new Date(ms).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long" });

// Histórico de preço escrito em texto (o Google e os assistentes de IA leem texto, não gráfico).
// Ex.: "Nos últimos 45 dias, este produto apareceu 3 vezes no MukiOfertas. O menor preço que registramos
//       foi R$ 189,90, em 2 de novembro, e o maior, R$ 249,90. Hoje ele está no menor preço do período."
function frasesDoHistorico(h, oferta) {
  if (!h || h.diasDeHistorico < 1) return [];
  const dias = Math.max(1, Math.min(90, Math.round(h.diasDeHistorico)));
  const atual = Number(oferta.preco_atual);
  const frases = [];
  const vezes = h.vezes > 1 ? ` e apareceu ${h.vezes} vezes no MukiOfertas` : "";
  frases.push(`Acompanhamos o preço deste produto na ${oferta.loja} há ${dias} ${dias === 1 ? "dia" : "dias"}${vezes}.`);
  if (h.maior - h.menor < 0.01) {
    frases.push(`Nesse período o preço ficou estável em ${formatarPreco(h.menor)}.`);
    return frases;
  }
  frases.push(
    `O menor preço que registramos foi ${formatarPreco(h.menor)}, em ${dataLonga(h.menorEm)}, e o maior foi ${formatarPreco(h.maior)}, em ${dataLonga(h.maiorEm)}.`
  );
  if (oferta.expirada) return frases;
  if (h.noMenorPreco) frases.push(`Hoje, por ${formatarPreco(atual)}, ele está no menor preço do período.`);
  else if (h.acimaDoMenor > 0)
    frases.push(
      `Hoje ele está ${formatarPreco(h.acimaDoMenor)} acima do menor preço registrado${h.abaixoDoMaior > 0 ? ` e ${h.abaixoDoMaior}% abaixo do maior` : ""}.`
    );
  if (h.diasDeHistorico < 7) frases.push("Como o acompanhamento começou há pouco, ainda é cedo para dizer se este é o menor preço de verdade.");
  return frases;
}

function veredito(desconto, expirada, h) {
  if (expirada) return { nivel: "encerrada", texto: "Oferta encerrada" };
  // Menor preço com pelo menos 7 dias de acompanhamento vale mais que a % de desconto informada pela loja
  if (h?.noMenorPreco && h.diasDeHistorico >= 7)
    return { nivel: "otimo", texto: `Menor preço em ${Math.min(90, Math.round(h.diasDeHistorico))} dias` };
  if (desconto >= 35) return { nivel: "otimo", texto: "Desconto forte" };
  if (desconto >= 15) return { nivel: "bom", texto: "Bom desconto" };
  if (desconto > 0) return { nivel: "normal", texto: "Desconto pequeno" };
  return { nivel: "normal", texto: "Sem preço anterior informado" };
}

export default function AnaliseOferta({ oferta, guia, historico = null }) {
  const expirada = oferta.expirada;
  const desconto = calcularDesconto(oferta);
  const economia = desconto > 0 ? Number(oferta.preco_antigo) - Number(oferta.preco_atual) : 0;
  const v = veredito(desconto, expirada, historico);
  const textoHistorico = frasesDoHistorico(historico, oferta);

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
  if (!expirada && ehRelampago(oferta)) frases.push("É uma oferta relâmpago: tem hora para acabar e o estoque costuma ser limitado.");
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

      {textoHistorico.length > 0 && (
        <>
          <h3 style={{ margin: "14px 0 6px", fontSize: "1rem" }}>Histórico de preço</h3>
          <p style={{ margin: "0 0 8px" }}>{textoHistorico.join(" ")}</p>
        </>
      )}

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
        {" · "}
        <Link href="/como-escolhemos">Como escolhemos as ofertas</Link>
      </p>
    </section>
  );
}

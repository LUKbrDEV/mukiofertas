import IconeRaio from "./IconeRaio";
import LinhaOfertas from "./LinhaOfertas";

export default function FaixaRelampago({ ofertas }) {
  if (!ofertas || ofertas.length === 0) return null;

  return (
    <section className="faixa" aria-labelledby="titulo-relampago">
      <h2 id="titulo-relampago" className="faixa-titulo">
        <IconeRaio tamanho={22} /> Promoções relâmpago
      </h2>
      <LinhaOfertas ofertas={ofertas} />
    </section>
  );
}
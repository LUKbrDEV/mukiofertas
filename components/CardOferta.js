function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CardOferta({ oferta }) {
  const desconto = oferta.preco_antigo
    ? Math.round(((oferta.preco_antigo - oferta.preco_atual) / oferta.preco_antigo) * 100)
    : 0;

  return (
    <article className="card">
      {oferta.relampago && <span className="selo">⚡ Relâmpago</span>}
      <span className="loja">{oferta.loja}</span>
      <h3>{oferta.titulo}</h3>
      <div className="precos">
        <span className="preco-atual">{formatarPreco(oferta.preco_atual)}</span>
        {oferta.preco_antigo && (
          <>
            <span className="preco-antigo">{formatarPreco(oferta.preco_antigo)}</span>
            <span className="desconto">-{desconto}%</span>
          </>
        )}
      </div>
      <a href={oferta.link} target="_blank" rel="sponsored noopener noreferrer" className="botao">
        Ver oferta
      </a>
    </article>
  );
}
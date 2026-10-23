import LinkAtivo from "./LinkAtivo";

const PAGINAS_DE_TODAS = ["/", "/maiores-descontos", "/relampago"];

export default function LojasAbas({ lojas }) {
  return (
    <nav className="lojas-abas" aria-label="Filtrar por loja">
      <LinkAtivo href="/" tambem={PAGINAS_DE_TODAS} className="loja-aba">
        Todas
      </LinkAtivo>
      {lojas.map((loja) => (
        <LinkAtivo key={loja.slug} href={`/loja/${loja.slug}`} className="loja-aba">
          {loja.nome} <span>{loja.total}</span>
        </LinkAtivo>
      ))}
    </nav>
  );
}

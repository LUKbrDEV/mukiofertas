import CardOferta from "./CardOferta";

export default function ListaOfertas({ ofertas, vazio }) {
  if (ofertas.length === 0) {
    return (
      <p className="vazio">
        {vazio ?? "Nenhuma oferta aqui agora. Novas ofertas aparecem assim que forem encontradas."}
      </p>
    );
  }

  return (
    <div className="grade-cartoes">
      {ofertas.map((oferta) => (
        <CardOferta key={oferta.id} oferta={oferta} />
      ))}
    </div>
  );
}

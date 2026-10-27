import Carrossel from "./Carrossel";
import CardOferta from "./CardOferta";

// Ofertas em uma única linha, com setas e passagem automática
export default function LinhaOfertas({ ofertas }) {
  return (
    <Carrossel auto={5000}>
      {ofertas.map((oferta) => (
        <div key={oferta.id} className="carrossel-item">
          <CardOferta oferta={oferta} />
        </div>
      ))}
    </Carrossel>
  );
}
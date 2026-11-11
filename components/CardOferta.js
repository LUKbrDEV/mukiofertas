// Card de oferta usado nas páginas do site (categorias, busca, relâmpago, cupons, carrosséis, prévia do painel).
// Agora desenha o MESMO card da página inicial (components/CardFeed.js), para o site todo ter um visual só.
// Os estilos ficam no app/card-novo.css; as cores rosé dos departamentos femininos no app/tema-beleza.css.
// Salve como components/CardOferta.js.
// previa = true: usado na prévia do painel admin (links desativados)

import CardFeed from "./CardFeed";

export default function CardOferta({ oferta, previa = false }) {
  return <CardFeed oferta={oferta} previa={previa} />;
}

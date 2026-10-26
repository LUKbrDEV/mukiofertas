import ListaOfertas from "../../components/ListaOfertas";
import { termosMonitores } from "../../data/atalhos";
import { buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;

export const metadata = {
  title: "Monitores em promoção | MukiOfertas",
  description: "Monitores gamer, ultrawide, 4K e para escritório em promoção.",
  alternates: { canonical: "/monitores" },
};

export default async function Monitores() {
  const ofertas = await buscarOfertas({ termos: termosMonitores, limite: 80 });

  return (
    <>
      <h1 className="titulo-pagina">📺 Monitores</h1>
      <p className="subtitulo-pagina">Monitores gamer, 4K, curvos e para escritório.</p>
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhum monitor em oferta agora. Novas ofertas aparecem assim que forem encontradas."
      />
    </>
  );
}
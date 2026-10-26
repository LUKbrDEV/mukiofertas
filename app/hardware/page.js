import ListaOfertas from "../../components/ListaOfertas";
import { termosHardware } from "../../data/atalhos";
import { buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;

export const metadata = {
  title: "Hardware em promoção | MukiOfertas",
  description: "Placas de vídeo, processadores, memórias, SSDs e mais peças de PC em promoção.",
  alternates: { canonical: "/hardware" },
};

export default async function Hardware() {
  const ofertas = await buscarOfertas({ termos: termosHardware, limite: 80 });

  return (
    <>
      <h1 className="titulo-pagina">🖥️ Hardware</h1>
      <p className="subtitulo-pagina">
        Placas de vídeo, processadores, placas-mãe, memórias, SSDs e outras peças de PC.
      </p>
      <ListaOfertas
        ofertas={ofertas}
        vazio="Nenhuma oferta de hardware agora. Novas ofertas aparecem assim que forem encontradas."
      />
    </>
  );
}
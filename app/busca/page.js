import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas } from "../../lib/ofertas";

export const metadata = { title: "Buscar ofertas - MukiOfertas" };

export default async function Busca({ searchParams }) {
  const { q } = await searchParams;
  const termo = (Array.isArray(q) ? q[0] : q ?? "").trim().slice(0, 80);
  const ofertas = termo ? await buscarOfertas({ termo }) : [];

  return (
    <>
      <h1 className="titulo-pagina">
        {termo ? `Resultados para “${termo}”` : "Buscar ofertas"}
      </h1>
      <p className="subtitulo-pagina">
        {termo ? `${ofertas.length} ofertas encontradas` : "Digite o nome de um produto na busca acima."}
      </p>
      {termo && (
        <ListaOfertas
          ofertas={ofertas}
          vazio={`Nenhuma oferta encontrada para “${termo}”. Tente uma palavra mais curta ou escolha uma categoria.`}
        />
      )}
    </>
  );
}
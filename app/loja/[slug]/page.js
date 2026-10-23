import { notFound } from "next/navigation";
import ListaOfertas from "../../../components/ListaOfertas";
import LojasAbas from "../../../components/LojasAbas";
import { buscarOfertas, buscarLojas } from "../../../lib/ofertas";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const lojas = await buscarLojas(200);
  const loja = lojas.find((l) => l.slug === slug);
  return { title: loja ? `Ofertas ${loja.nome} - MukiOfertas` : "Loja - MukiOfertas" };
}

export default async function PaginaLoja({ params }) {
  const { slug } = await params;
  const todas = await buscarLojas(200);
  const loja = todas.find((l) => l.slug === slug);
  if (!loja) notFound();

  const ofertas = await buscarOfertas({ loja: loja.nome });
  // as abas mostram as lojas com mais ofertas; a loja aberta sempre aparece
  const abas = todas.slice(0, 12);
  if (!abas.some((l) => l.slug === slug)) abas.push(loja);

  return (
    <>
      <h1 className="titulo-pagina">Ofertas {loja.nome}</h1>
      <p className="subtitulo-pagina">{loja.total} ofertas ativas nesta loja</p>
      <LojasAbas lojas={abas} />
      <ListaOfertas ofertas={ofertas} vazio="Nenhuma oferta desta loja agora." />
    </>
  );
}

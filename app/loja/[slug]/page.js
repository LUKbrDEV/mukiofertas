// Página de uma loja: todas as ofertas dela, com o campo de departamento (só os que a loja tem)
// e a ordenação no canto superior esquerdo. Salve como app/loja/[slug]/page.js.
import { notFound } from "next/navigation";
import LojasAbas from "../../../components/LojasAbas";
import VitrineLoja from "../../../components/VitrineLoja";
import { lojasAgrupadas, dadosDaLoja, paginaDaLoja, ORDENS } from "../../../lib/vitrine-loja";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const loja = (await lojasAgrupadas()).find((l) => l.slug === slug);
  return {
    title: loja ? `Ofertas ${loja.nome} - MukiOfertas` : "Loja - MukiOfertas",
    description: loja ? `Todas as promoções e cupons ${loja.nome} de hoje, separadas por departamento.` : undefined,
  };
}

export default async function PaginaLoja({ params, searchParams }) {
  const { slug } = await params;
  const filtros = (await searchParams) ?? {};
  const dados = await dadosDaLoja(slug);
  if (!dados) notFound();

  const primeira = await paginaDaLoja({ slug, depto: filtros.depto ?? null, ordem: filtros.ordem ?? "recentes" });

  // as abas mostram as lojas com mais ofertas; a loja aberta sempre aparece
  const todas = await lojasAgrupadas();
  const abas = todas.slice(0, 12);
  if (!abas.some((l) => l.slug === slug)) abas.push(dados.loja);

  return (
    <>
      <h1 className="titulo-pagina">Ofertas {dados.loja.nome}</h1>
      <p className="subtitulo-pagina">{dados.loja.total} ofertas ativas nesta loja</p>
      <LojasAbas lojas={abas} />
      <VitrineLoja
        slug={slug}
        nomeLoja={dados.loja.nome}
        departamentos={dados.departamentos}
        totalLoja={dados.loja.total}
        ordens={ORDENS}
        primeira={primeira}
      />
    </>
  );
}

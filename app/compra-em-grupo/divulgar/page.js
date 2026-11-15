// "Divulgar meu grupo" da compra em grupo. Salve como app/compra-em-grupo/divulgar/page.js.
import Link from "next/link";
import FormGrupo from "../../../components/compra-em-grupo/FormGrupo";
import { CSS_GRUPO } from "../../../components/compra-em-grupo/estilo";

export const metadata = {
  title: "Divulgar meu grupo do AliExpress | MukiOfertas",
  description: "Cole o link do seu grupo de 3 do AliExpress para a comunidade do MukiOfertas ajudar a fechar.",
  robots: { index: false, follow: true },
};

export default async function DivulgarGrupo({ searchParams }) {
  const params = await searchParams;
  const produto = /^\d{6,}$/.test(String(params?.produto ?? "")) ? String(params.produto) : null;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_GRUPO }} />
      <nav style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 12px" }}>
        <Link href="/compra-em-grupo">← Compra em grupo</Link>
      </nav>
      <h1 className="titulo-pagina">Divulgar meu grupo</h1>
      <p className="subtitulo-pagina">
        Criou um grupo de 3 no AliExpress? Cole o link aqui e a comunidade do MukiOfertas ajuda a completar as vagas.
      </p>
      <FormGrupo produtoId={produto} />
    </>
  );
}

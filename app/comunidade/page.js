import Link from "next/link";
import ListaOfertas from "../../components/ListaOfertas";
import { buscarOfertas } from "../../lib/ofertas";

export const revalidate = 60;
export const metadata = { title: "Promoções da Comunidade - MukiOfertas" };

export default async function Comunidade() {
  const ofertas = await buscarOfertas({ comunidade: true });

  return (
    <>
      <div className="cabecalho-secao">
        <div>
          <h1 className="titulo-pagina">Promoções da Comunidade</h1>
          <p className="subtitulo-pagina">
            Achados enviados por quem compra. Cada promoção é revisada antes de aparecer.
          </p>
        </div>
        <Link href="/comunidade/enviar" className="botao">
          Enviar promoção
        </Link>
      </div>

      <ListaOfertas
        ofertas={ofertas}
        vazio="Ainda não há promoções da comunidade. Seja a primeira pessoa a enviar!"
      />
    </>
  );
}

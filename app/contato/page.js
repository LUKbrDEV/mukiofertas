import Link from "next/link";
import { SITE } from "../../lib/site";

export const metadata = {
  title: "Contato | MukiOfertas",
  description: "Fale com o MukiOfertas: dúvidas, sugestões, erros de preço, parcerias e pedidos de privacidade.",
  alternates: { canonical: "/contato" },
};

export default function Contato() {
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL;

  return (
    <article className="texto-pagina">
      <h1>Contato</h1>
      <p>Escreva para a gente. Respondemos assim que possível.</p>

      <p>
        <a className="botao" href={`mailto:${SITE.email}`}>
          {SITE.email}
        </a>
      </p>

      <h2>Sobre o que você quer falar?</h2>
      <ul>
        <li>
          <strong>Oferta com erro ou que já acabou:</strong> mande o link da página da oferta.
        </li>
        <li>
          <strong>Sugestões e dúvidas:</strong> estamos abertos a ideias para melhorar o site.
        </li>
        <li>
          <strong>Parcerias e anúncios:</strong> conte um pouco sobre a sua proposta.
        </li>
        <li>
          <strong>Privacidade e LGPD:</strong> pedidos de acesso, correção ou exclusão de dados
          (veja a <Link href="/privacidade">Política de Privacidade</Link>).
        </li>
      </ul>

      {telegram && (
        <p>
          Prefere o Telegram? Acompanhe as promoções no nosso{" "}
          <a href={telegram} target="_blank" rel="noopener noreferrer">
            canal
          </a>
          .
        </p>
      )}
    </article>
  );
}
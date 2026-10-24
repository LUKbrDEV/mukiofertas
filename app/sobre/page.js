import Link from "next/link";
import { SITE } from "../../lib/site";

export const metadata = {
  title: "Sobre o MukiOfertas",
  description:
    "Conheça o MukiOfertas: ofertas, cupons e promoções das maiores lojas do Brasil, com comentários da comunidade.",
  alternates: { canonical: "/sobre" },
};

export default function Sobre() {
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL;

  return (
    <article className="texto-pagina">
      <h1>Sobre o {SITE.nome}</h1>

      <p>
        O {SITE.nome} nasceu para ajudar você a não pagar mais caro. Reunimos ofertas, cupons e
        promoções das maiores lojas do Brasil e mostramos tudo em um só lugar, com o preço, o
        desconto e a opinião de quem já viu a oferta.
      </p>

      <h2>Como funciona</h2>
      <ul>
        <li>As ofertas chegam por ferramentas automáticas, pelo nosso canal e pela comunidade.</li>
        <li>Você clica na oferta, vai direto para a página da loja e compra por lá.</li>
        <li>Os membros podem comentar em cada oferta, avisar se o preço mudou e tirar dúvidas.</li>
        <li>Quando uma promoção termina, ela fica marcada como Expirado e desce para o fim da lista.</li>
      </ul>

      <h2>Transparência</h2>
      <p>
        O {SITE.nome} pode receber comissão pelas compras feitas através dos links do site, sem
        nenhum custo extra para você. É isso que mantém o site no ar.
        {/* Se você NÃO participa do Programa de Associados da Amazon, apague a frase abaixo. */}{" "}
        Como Associado da Amazon, ganhamos com compras qualificadas.
      </p>
      <p>
        Preços e estoques mudam rápido. Sempre confira o valor final na página da loja antes de
        comprar. Só mostramos o preço antigo quando ele é informado pela própria loja.
      </p>

      <h2>Fale com a gente</h2>
      <p>
        Dúvidas, sugestões ou uma oferta com erro? Veja a página de{" "}
        <Link href="/contato">contato</Link>.
        {telegram && (
          <>
            {" "}
            Quer receber as promoções assim que elas aparecem? Entre no nosso{" "}
            <a href={telegram} target="_blank" rel="noopener noreferrer">
              canal do Telegram
            </a>
            .
          </>
        )}
      </p>
    </article>
  );
}
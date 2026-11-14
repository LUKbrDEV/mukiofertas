// Página "Sobre o MukiOfertas": https://www.mukiofertas.com.br/sobre
// Salve como app/sobre/page.js.
// As regras detalhadas de escolha das ofertas ficam em app/como-escolhemos/page.js.

import Link from "next/link";
import { SITE } from "../../lib/site";

export const metadata = {
  title: "Sobre o MukiOfertas: quem somos e como trabalhamos",
  description:
    "Conheça o MukiOfertas: quem faz o site, de onde vêm as ofertas, como conferimos os preços e como falar com a gente.",
  alternates: { canonical: "/sobre" },
};

export default function Sobre() {
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/mukiofertas";
  const base = SITE.url.replace(/\/+$/, "");

  // Dados estruturados: ajudam o Google e os assistentes de IA a entender quem está por trás do site
  const dados = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `Sobre o ${SITE.nome}`,
    url: `${base}/sobre`,
    inLanguage: "pt-BR",
    mainEntity: {
      "@type": "Organization",
      name: SITE.nome,
      url: base,
      logo: `${base}/logo-mukiofertas.png`,
      email: SITE.email,
      founder: SITE.responsavel ? { "@type": "Person", name: SITE.responsavel } : undefined,
      sameAs: [telegram],
      contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: SITE.email, availableLanguage: "pt-BR" },
    },
  };

  return (
    <article className="texto-pagina">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }}
      />
      <h1>Sobre o {SITE.nome}</h1>

      <p>
        O {SITE.nome} nasceu para ajudar você a não pagar mais caro. Reunimos ofertas, cupons e promoções das maiores
        lojas do Brasil em um só lugar, com o preço, o desconto real, o histórico de preço e a opinião de quem já viu a
        oferta.
      </p>

      <h2>Quem faz o {SITE.nome}</h2>
      <p>
        O site foi criado por {SITE.responsavel || "uma pequena equipe"} e é mantido por uma equipe pequena, que cuida
        da curadoria, revisa as ofertas enviadas pela comunidade e escreve os guias de compra. Por trás disso, um robô
        próprio trabalha 24 horas por dia: busca ofertas nas lojas, confere os preços e tira do ar o que deixou de valer.
      </p>

      <h2>O que você encontra aqui</h2>
      <ul>
        <li>
          <strong>Ofertas conferidas</strong> de lojas como Amazon, Mercado Livre, Shopee, Magalu, KaBuM!, Netshoes e
          AliExpress.
        </li>
        <li>
          <strong>Histórico de preço</strong> em cada oferta: o menor e o maior preço que registramos e quando eles
          aconteceram.
        </li>
        <li>
          <strong>Cupons de desconto</strong> e <strong>ofertas relâmpago</strong>, com aviso de quando acabam.
        </li>
        <li>
          <strong>Alertas de preço</strong>: você escolhe o produto e avisamos quando ele baixar.
        </li>
        <li>
          <strong>Guias de compra</strong> que explicam o que olhar antes de comprar.
        </li>
        <li>
          <strong>Comunidade</strong>: membros comentam, votam nas melhores ofertas com o botão UP e avisam quando o
          preço muda.
        </li>
      </ul>

      <h2>Como escolhemos as ofertas</h2>
      <p>
        Não publicamos qualquer coisa. Mostramos o preço anterior só quando a loja informa, travamos descontos que
        parecem inflados, conferimos os preços de tempos em tempos e só damos o selo de menor preço depois de acompanhar
        o produto por pelo menos 7 dias. Todas as regras, com os números, estão na página{" "}
        <Link href="/como-escolhemos">Como escolhemos as ofertas</Link>.
      </p>

      <h2>Guias de compra</h2>
      <p>
        A equipe escreve <Link href="/guias">guias de compra</Link> sobre o que mais aparece nas ofertas: como escolher
        air fryer, ar-condicionado, monitor, SSD e celular, como saber se uma promoção é real, como usar cupons e como
        comprar com segurança. Cada guia mostra a data da última revisão.
      </p>

      <h2>Transparência</h2>
      <p>
        O {SITE.nome} não é uma loja: a compra, a entrega e a garantia são da loja. Podemos receber comissão pelas
        compras feitas através dos links do site, sem nenhum custo extra para você. É isso que mantém o site no ar. Como
        Associado da Amazon, ganhamos com compras qualificadas.
      </p>
      <p>
        Preços e estoques mudam rápido. Sempre confira o valor final na página da loja antes de comprar.
      </p>

      <h2>Fale com a gente</h2>
      <ul>
        <li>
          E-mail: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </li>
        <li>
          Canal no Telegram:{" "}
          <a href={telegram} target="_blank" rel="noopener noreferrer">
            {telegram.replace(/^https?:\/\//, "")}
          </a>
        </li>
        <li>
          Grupo VIP no WhatsApp: <Link href="/whatsapp">entre por aqui</Link>
        </li>
        <li>
          Dúvidas, sugestões ou uma oferta com erro? Veja a página de <Link href="/contato">contato</Link>.
        </li>
      </ul>
    </article>
  );
}

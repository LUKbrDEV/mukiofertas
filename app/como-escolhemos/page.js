// Página "Como escolhemos as ofertas": https://www.mukiofertas.com.br/como-escolhemos
// Salve como app/como-escolhemos/page.js.
//
// Explica, com as regras REAIS do site, de onde vêm as ofertas e como elas são filtradas.
// Se mudar alguma regra no código ou no painel (prazos, trava de desconto, Super desconto),
// atualize o texto aqui e a data em ATUALIZADO_EM. Página assim passa confiança para
// o visitante, para o Google (E-E-A-T) e para os assistentes de IA que citam fontes.

import Link from "next/link";
import { SITE } from "../../lib/site";
import { DIAS_NO_SITE, DIAS_EXPIRADA_VISIVEL, HORAS_NO_SITE_ML } from "../../lib/prazos.mjs";

const ATUALIZADO_EM = "2026-11-14";

export const metadata = {
  title: "Como escolhemos as ofertas | MukiOfertas",
  description:
    "De onde vêm as ofertas do MukiOfertas, como conferimos os preços, como travamos descontos inflados e quando uma oferta ganha o selo Super desconto ou Menor preço.",
  alternates: { canonical: "/como-escolhemos" },
};

const dataLonga = (iso) =>
  new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

export default function ComoEscolhemos() {
  const base = SITE.url.replace(/\/+$/, "");
  const dados = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Como escolhemos as ofertas",
    url: `${base}/como-escolhemos`,
    inLanguage: "pt-BR",
    dateModified: ATUALIZADO_EM,
    publisher: { "@type": "Organization", name: SITE.nome, url: base, logo: `${base}/logo-mukiofertas.png` },
  };

  return (
    <article className="texto-pagina">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }}
      />
      <h1>Como escolhemos as ofertas</h1>
      <p style={{ color: "#64748b", fontSize: "0.92rem" }}>Atualizado em {dataLonga(ATUALIZADO_EM)}</p>

      <p>
        O {SITE.nome} reúne ofertas das maiores lojas do Brasil, mas não publica qualquer coisa que aparece pela
        frente. Esta página explica, sem rodeios, de onde vêm as ofertas, quais filtros elas passam e o que cada selo
        do site quer dizer.
      </p>

      <h2>Resumo rápido</h2>
      <ul>
        <li>Só mostramos o preço anterior quando a própria loja informa, e travamos descontos que parecem inflados.</li>
        <li>O selo <strong>Super desconto</strong> vai para poucas ofertas: no máximo 10% das que estão no ar.</li>
        <li>O selo <strong>Menor preço</strong> só aparece depois de pelo menos 7 dias acompanhando o produto.</li>
        <li>O robô do site volta à loja para conferir o preço; se ele subir, a oferta ganha a tag Expirado.</li>
        <li>Você sempre compra no site da loja. Podemos ganhar comissão, sem custo extra para você.</li>
      </ul>

      <h2>De onde vêm as ofertas</h2>
      <ul>
        <li>
          <strong>Programas oficiais de afiliados das lojas</strong>, como Amazon, Mercado Livre, Shopee, AliExpress,
          Magalu, KaBuM! e Netshoes. Sempre que a loja oferece, usamos os dados oficiais dela (nome, foto e preço).
        </li>
        <li>
          <strong>Canais e grupos públicos de ofertas</strong> no Telegram, acompanhados por um robô. Uma oferta vinda
          daí só entra no site se conseguirmos o link oficial da loja: links de terceiros são descartados.
        </li>
        <li>
          <strong>Comunidade</strong>: qualquer membro pode enviar uma oferta. Elas passam pela revisão da equipe antes
          de aparecer.
        </li>
        <li>
          <strong>Equipe</strong>: também publicamos à mão as ofertas boas que encontramos.
        </li>
      </ul>

      <h2>Os filtros antes de publicar</h2>
      <ul>
        <li>Ofertas repetidas (mesmo produto, mesma loja e mesmo preço) são recusadas.</li>
        <li>
          Em marketplaces como Shopee e AliExpress, exigimos um preço mínimo e boas avaliações, porque é onde mais
          aparecem anúncios duvidosos.
        </li>
        <li>
          Cada loja tem um limite de ofertas no ar, para a vitrine não ficar dominada por uma loja só, e lojas com
          problemas recorrentes são bloqueadas.
        </li>
        <li>Cada oferta é classificada automaticamente na categoria certa, para você achar o que procura.</li>
      </ul>

      <h2>Como tratamos o desconto</h2>
      <p>
        A porcentagem de desconto é calculada a partir do preço anterior que a loja informa. Como esse preço às vezes é
        inflado (o famoso &quot;metade do dobro&quot;), o site tem uma trava automática. O preço anterior é ignorado
        quando:
      </p>
      <ul>
        <li>o desconto passa de 70% (ou de 60% na Shopee e no AliExpress);</li>
        <li>o preço anterior tem cara de inventado, como R$ 12.000,00 ou R$ 1.111,10;</li>
        <li>o preço anterior é mais de 15% maior que o maior preço que já registramos para o produto.</li>
      </ul>
      <p>
        Nesses casos a oferta continua no site, mas sem o preço anterior e sem selo de desconto. Assim você não é
        enganado por uma porcentagem que não existe.
      </p>

      <h2>O que significa cada selo</h2>
      <h3>Super desconto</h3>
      <p>Ganha o selo apenas a oferta que passa em todas estas regras:</p>
      <ul>
        <li>desconto real a partir de 40%, sem marca de desconto suspeito;</li>
        <li>economia de pelo menos R$ 150;</li>
        <li>quando já temos 7 dias ou mais de histórico, precisa ser o menor preço dos últimos 30 dias;</li>
        <li>na Shopee e no AliExpress, só produtos com nota 4,7 ou mais;</li>
        <li>no máximo 10% das ofertas no ar têm o selo: as de maior economia.</li>
      </ul>
      <h3>Menor preço</h3>
      <p>
        Guardamos cada mudança de preço dos produtos e juntamos todas as vezes que o mesmo produto apareceu no site. O
        selo de menor preço só aparece quando já acompanhamos o produto há pelo menos 7 dias. Antes disso, toda oferta
        nova seria &quot;o menor preço&quot;, o que não seria verdade. Na página de cada oferta mostramos o gráfico e o
        histórico em texto: o menor e o maior preço registrados e quando eles aconteceram.
      </p>
      <h3>Relâmpago</h3>
      <p>Só para ofertas com tempo limitado de verdade, com contagem regressiva até o fim.</p>
      <h3>Expirado</h3>
      <p>
        A promoção acabou ou o preço subiu. A oferta desce para o fim das listas e a página dela continua no ar, com os
        comentários, para quem chegar por um link antigo.
      </p>

      <h2>Conferência de preço e validade</h2>
      <ul>
        <li>
          O robô do site volta à loja de tempos em tempos (em média a cada poucas horas) para conferir o preço da maioria
          das ofertas. Se ele subiu, a oferta expira na hora.
        </li>
        <li>
          Toda oferta tem prazo: em geral {DIAS_NO_SITE} dias no ar. No Mercado Livre são {HORAS_NO_SITE_ML} horas,
          renovadas enquanto o produto continuar em promoção.
        </li>
        <li>
          Ofertas que dependem de cupom ficam menos tempo, porque cupons acabam rápido. Se a comunidade avisar que o
          cupom não funcionou, a oferta é revisada.
        </li>
        <li>
          Depois de expirada, a oferta ainda aparece nas listas por {DIAS_EXPIRADA_VISIVEL} dias com a tag Expirado e
          depois sai delas. A página dela continua acessível.
        </li>
      </ul>

      <h2>Como decidimos o que aparece primeiro</h2>
      <p>
        Na aba Destaques, cada oferta ganha uma pontuação que soma o desconto confiável, os cliques, os votos da
        comunidade (o botão UP), se a marca é conhecida e se a loja é confiável. A pontuação cai conforme a oferta
        envelhece, para a vitrine estar sempre fresca. Ofertas com desconto suspeito perdem pontos em vez de ganhar.
      </p>

      <h2>O papel da comunidade</h2>
      <ul>
        <li>O botão UP mostra que a oferta é boa e faz ela subir na vitrine.</li>
        <li>Nos comentários dá para tirar dúvidas e contar como foi a compra.</li>
        <li>Os avisos &quot;o preço subiu&quot; e &quot;o cupom não funcionou&quot; ajudam a tirar do ar o que já não vale.</li>
      </ul>

      <h2>Transparência</h2>
      <p>
        O {SITE.nome} não é uma loja: a compra, a entrega e a garantia são da loja. Podemos receber comissão pelas
        compras feitas pelos nossos links, sem custo extra para você. A comissão não muda o preço nem os seus direitos.
        Preços e estoques mudam rápido, então confira sempre o valor final na página da loja antes de pagar.
      </p>

      <h2>Achou um erro?</h2>
      <p>
        Se uma oferta estiver com preço errado ou um cupom não funcionar, avise nos comentários da oferta ou pela página
        de <Link href="/contato">contato</Link>. Leia também <Link href="/sobre">quem somos</Link> e os nossos{" "}
        <Link href="/guias">guias de compra</Link>.
      </p>
    </article>
  );
}

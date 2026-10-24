import { SITE } from "../../lib/site";

export const metadata = {
  title: "Termos de Uso | MukiOfertas",
  description: "Regras de uso do MukiOfertas, incluindo contas, comentários, preços e links de afiliados.",
  alternates: { canonical: "/termos" },
};

export default function Termos() {
  return (
    <article className="texto-pagina">
      <h1>Termos de Uso</h1>
      <p className="texto-data">Última atualização: {SITE.atualizadoEm}</p>

      <p>
        Ao usar o {SITE.nome} ({SITE.url}), você concorda com estes termos. Se não concordar, não
        use o site.
      </p>

      <h2>1. O que é o MukiOfertas</h2>
      <p>
        O {SITE.nome} reúne e divulga ofertas, cupons e promoções de lojas online. Nós não
        vendemos produtos. A compra é feita no site da loja, que é a única responsável por preço,
        estoque, entrega, nota fiscal, garantia e atendimento.
      </p>

      <h2>2. Preços e disponibilidade</h2>
      <p>
        Preços, descontos, cupons e estoques mudam rápido e podem acabar a qualquer momento. As
        informações exibidas no site podem estar desatualizadas ou conter erros. Sempre confira o
        valor final e as condições na página da loja antes de comprar. Ofertas encerradas ficam
        marcadas como Expirado.
      </p>

      <h2>3. Links de afiliados</h2>
      <p>
        O site pode receber comissão pelas compras feitas através dos links, sem custo adicional
        para você. Isso não altera o preço que você paga.
      </p>

      <h2>4. Conta de usuário</h2>
      <ul>
        <li>Você deve informar dados verdadeiros e manter a sua senha em segurança.</li>
        <li>Você é responsável por tudo o que acontece na sua conta.</li>
        <li>Podemos suspender ou excluir contas que violem estes termos.</li>
      </ul>

      <h2>5. Comentários e envio de promoções</h2>
      <p>Ao comentar ou enviar uma promoção, você se compromete a não publicar:</p>
      <ul>
        <li>ofensas, discriminação, ameaças ou assédio;</li>
        <li>spam, propaganda não autorizada ou links de afiliado próprios;</li>
        <li>conteúdo ilegal, enganoso ou que viole direitos de terceiros;</li>
        <li>dados pessoais de outras pessoas.</li>
      </ul>
      <p>
        Você continua sendo o autor do que publica, mas nos autoriza a exibir esse conteúdo no
        site. Podemos remover qualquer comentário ou promoção a nosso critério.
      </p>

      <h2>6. Propriedade intelectual</h2>
      <p>
        Nomes, marcas, imagens e descrições de produtos pertencem às respectivas lojas e
        fabricantes e são usados apenas para divulgar as ofertas. O nome e a identidade visual do{" "}
        {SITE.nome} pertencem a {SITE.responsavel}.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        Fazemos o possível para manter o site no ar e as informações corretas, mas não garantimos
        funcionamento sem interrupções nem ausência de erros. Não nos responsabilizamos por
        compras feitas em lojas de terceiros, por divergências de preço ou por problemas de
        entrega ou garantia.
      </p>

      <h2>8. Mudanças nos termos</h2>
      <p>
        Podemos alterar estes termos a qualquer momento. Continuar usando o site depois da
        mudança significa que você concorda com a nova versão.
      </p>

      <h2>9. Lei aplicável</h2>
      <p>Estes termos seguem as leis do Brasil.</p>

      <h2>10. Contato</h2>
      <p>
        Dúvidas sobre estes termos: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </article>
  );
}
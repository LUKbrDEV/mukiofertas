// Bloco "O que é o MukiOfertas" para o fim da página inicial.
// Salve como components/SobreMuki.js.
// Serve para o Google (e a visão geral por IA) entender o que é o site: um texto claro,
// com o nome da marca, o que o site faz e o que ele NÃO é (não é uma loja).

const CSS = `
  .sobre-muki {
    margin: 40px 0 8px;
    padding: 24px;
    background: #fff;
    border: 1px solid var(--linha);
    border-radius: 14px;
    line-height: 1.65;
    color: var(--tinta);
  }
  .sobre-muki h2 {
    margin: 0 0 8px;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    font-size: 1.35rem;
    font-weight: 800;
  }
  .sobre-muki h3 { margin: 18px 0 4px; font-size: 1rem; font-weight: 800; }
  .sobre-muki p { margin: 0 0 10px; max-width: 900px; color: var(--tinta-suave); }
  .sobre-muki .sobre-colunas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 4px 28px;
  }
  @media (max-width: 639px) { .sobre-muki { padding: 16px; } }
`;

const PERGUNTAS = [
  {
    p: "O que é o MukiOfertas?",
    r: "O MukiOfertas é um site brasileiro que reúne ofertas, cupons de desconto e promoções relâmpago das maiores lojas online, como Amazon, Mercado Livre, KaBuM!, Magalu e Shopee. As ofertas são atualizadas o dia todo e também enviadas no canal do MukiOfertas no Telegram.",
  },
  {
    p: "O MukiOfertas é uma loja?",
    r: "Não. O MukiOfertas não vende produtos. Ao clicar em uma oferta, você compra direto no site da loja, que é responsável pelo pagamento, pela entrega e pela garantia.",
  },
  {
    p: "As ofertas são confiáveis?",
    r: "Só publicamos ofertas com desconto real em relação ao preço anterior. Quando o preço muda ou a promoção acaba, a oferta é marcada como expirada, e a comunidade pode comentar cada uma delas.",
  },
  {
    p: "Como o MukiOfertas ganha dinheiro?",
    r: "Por meio de links de afiliado: a loja paga uma pequena comissão quando alguém compra pelo link, sem nenhum custo extra para você.",
  },
];

export default function SobreMuki() {
  const dados = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PERGUNTAS.map((q) => ({
      "@type": "Question",
      name: q.p,
      acceptedAnswer: { "@type": "Answer", text: q.r },
    })),
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, "\\u003c") }}
      />
      <section className="sobre-muki" aria-labelledby="sobre-muki-titulo">
        <h2 id="sobre-muki-titulo">MukiOfertas: as melhores ofertas da internet em um só lugar</h2>
        <p>
          O MukiOfertas encontra e reúne as promoções com desconto de verdade nas maiores lojas do Brasil:
          celulares, hardware, notebooks, games, eletrônicos, casa, beleza, moda e muito mais. Em vez de
          procurar loja por loja, você vê aqui as ofertas do dia, os cupons e as promoções relâmpago, com o
          preço anterior para comparar.
        </p>
        <div className="sobre-colunas">
          {PERGUNTAS.map((q) => (
            <div key={q.p}>
              <h3>{q.p}</h3>
              <p>{q.r}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
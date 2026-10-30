const ICONES = {
  lock: "M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1Zm2 0h8V8a4 4 0 0 0-8 0v2Z",
  shield: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4L11 13.2l4.6-4.6L17 10l-6 6Z",
  check: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.4-4-4 1.4-1.4 2.6 2.6 5-5 1.4 1.4-6.4 6.4Z",
  user: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z",
};

const SELOS = [
  { icone: "lock", titulo: "Site seguro", texto: "Conexão protegida (HTTPS/SSL)" },
  { icone: "shield", titulo: "Compra na loja oficial", texto: "Você paga direto no site da loja" },
  { icone: "check", titulo: "Ofertas verificadas", texto: "Só desconto real sobre o preço anterior" },
  { icone: "user", titulo: "Privacidade (LGPD)", texto: "Seus dados protegidos" },
];

const FAQ = [
  { p: "O que é o MukiOfertas?", r: "Um site brasileiro que reúne ofertas, cupons e promoções relâmpago das maiores lojas online, como Amazon, Mercado Livre, KaBuM!, Magalu e Shopee, atualizadas o dia todo e também enviadas no nosso canal do Telegram." },
  { p: "O MukiOfertas é uma loja?", r: "Não. Ao clicar em uma oferta, você compra direto no site da loja, que é responsável pelo pagamento, pela entrega e pela garantia." },
  { p: "As ofertas são confiáveis?", r: "Só publicamos ofertas com desconto real. Quando o preço muda ou a promoção acaba, a oferta é marcada como expirada." },
  { p: "Como o MukiOfertas ganha dinheiro?", r: "Por links de afiliado: a loja paga uma pequena comissão quando alguém compra pelo link, sem custo extra para você." },
];

export default function SobreMuki() {
  return (
    <section className="sobre">
      <h2 className="sobre-titulo">MukiOfertas: as melhores ofertas da internet em um só lugar</h2>
      <p className="sobre-intro">
        Reunimos promoções com desconto de verdade nas maiores lojas do Brasil, com o preço anterior para você comparar.
      </p>

      <div className="sobre-grid">
        {FAQ.map((i) => (
          <div key={i.p}>
            <h3>{i.p}</h3>
            <p>{i.r}</p>
          </div>
        ))}
      </div>

      <ul className="sobre-selos">
        {SELOS.map((s) => (
          <li key={s.titulo} className="sobre-selo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONES[s.icone]} /></svg>
            <span><strong>{s.titulo}</strong><small>{s.texto}</small></span>
          </li>
        ))}
      </ul>
    </section>
  );
}
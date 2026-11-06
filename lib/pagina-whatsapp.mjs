// Página de entrada no grupo do WhatsApp (mukiofertas.com.br/whatsapp).
// Salve como lib/pagina-whatsapp.mjs. Usada por app/whatsapp/route.js.
//
// Os números da página são reais: quantas ofertas o robô mandou no grupo hoje, as últimas
// ofertas enviadas e quanto elas economizaram (tabela ofertas, coluna postada_whatsapp_em).

const esc = (t) =>
  String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const reaisInteiro = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const descontoDe = (o) =>
  Number(o.preco_antigo) > Number(o.preco_atual) ? Math.round(((o.preco_antigo - o.preco_atual) / o.preco_antigo) * 100) : 0;
const economiaDe = (o) => (Number(o.preco_antigo) > Number(o.preco_atual) ? o.preco_antigo - o.preco_atual : 0);

const ICONE_WPP = `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm6.6 16.1c-.3.8-1.7 1.5-2.3 1.6-.6.1-1.2.3-4.1-.8-3.5-1.4-5.7-4.9-5.9-5.1-.2-.2-1.4-1.9-1.4-3.6s.9-2.6 1.2-2.9c.3-.3.7-.4.9-.4h.6c.2 0 .5-.1.8.6l1 2.5c.1.2.1.4 0 .6-.1.2-.1.4-.3.6l-.5.6c-.1.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.2 2.4 1.5 2.7 1.7.3.1.5.1.7-.1.2-.2.8-1 1-1.2.2-.4.4-.3.7-.2.3.1 2 1 2.3 1.1.3.1.5.2.6.4.1.1.1.8-.2 1.6z"/></svg>`;

export function montarPaginaWhatsapp({ link, siteUrl = "https://www.mukiofertas.com.br", hoje = 0, ultimas = [] }) {
  const economia = ultimas.reduce((s, o) => s + economiaDe(o), 0);
  const agora = new Date(Date.now() - 3 * 3600000);
  const hora = (min) => {
    const d = new Date(agora.getTime() - min * 60000);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  };

  // Mensagens do "celular": as ofertas reais que foram para o grupo
  const mensagens = ultimas
    .slice(0, 3)
    .map((o, i) => {
      const d = descontoDe(o);
      return `
        <div class="msg" style="animation-delay:${0.4 + i * 0.5}s">
          <div class="msg-foto">${o.imagem ? `<img src="${esc(o.imagem)}" alt="" loading="lazy">` : "🛍️"}</div>
          <div class="msg-texto">
            <b>🔥 ${esc(o.titulo)}</b>
            <span class="msg-preco">${d > 0 ? `<s>${reais(o.preco_antigo)}</s> ` : ""}<strong>${reais(o.preco_atual)}</strong>${d > 0 ? ` <em>-${d}%</em>` : ""}</span>
            <span class="msg-loja">🏪 ${esc(o.loja)}</span>
            <span class="msg-link">🛒 Compre aqui: mukiofertas.com.br/...</span>
          </div>
          <span class="msg-hora">${hora(4 + i * 7)} ✓✓</span>
        </div>`;
    })
    .reverse()
    .join("");

  const celular = `
    <div class="celular" aria-hidden="true">
      <div class="celular-topo">
        <span class="celular-voltar">‹</span>
        <img src="/logo-mukiofertas.png" alt="">
        <div><b>MukiOfertas | Ofertas</b><small>somente admins podem enviar mensagens</small></div>
      </div>
      <div class="celular-chat">
        ${mensagens || `<div class="msg msg--vazia">As próximas ofertas chegam aqui 👇</div>`}
      </div>
    </div>`;

  const provas = [
    hoje > 0 ? `<li><b>${hoje}</b><span>${hoje === 1 ? "oferta enviada" : "ofertas enviadas"} no grupo hoje</span></li>` : "",
    economia > 0 ? `<li><b>${reaisInteiro(economia)}</b><span>de economia só nas últimas ${ultimas.length} ofertas</span></li>` : "",
    `<li><b>7h às 23h</b><span>ofertas o dia todo, sem madrugada</span></li>`,
  ].join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Grupo de Ofertas no WhatsApp | MukiOfertas</title>
<meta name="description" content="Entre no grupo do MukiOfertas e receba no WhatsApp as melhores promoções e cupons do dia, com preço conferido. Grátis.">
<meta property="og:title" content="Grupo de Ofertas MukiOfertas no WhatsApp">
<meta property="og:description" content="Promoções e cupons conferidos, direto no seu WhatsApp. Grátis e sem spam.">
<meta property="og:image" content="${esc(siteUrl)}/logo-mukiofertas.png">
<meta property="og:url" content="${esc(siteUrl)}/whatsapp">
<meta name="theme-color" content="#06281c">
<link rel="icon" href="/icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --verde: #25d366; --verde-claro: #7dfcae; --verde-escuro: #0b7a4b;
    --fundo: #041f15; --texto: #ecfdf3; --suave: #a7d7bd; --amarelo: #ffe873; --laranja: #ff8a3d;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--texto); background: var(--fundo); -webkit-font-smoothing: antialiased; overflow-x: hidden;
  }

  /* ===== Fundo: degradê, luzes e textura de pontinhos ===== */
  .fundo { position: fixed; inset: 0; z-index: -1; overflow: hidden;
    background:
      radial-gradient(1200px 700px at 85% -10%, rgba(37,211,102,.35), transparent 60%),
      radial-gradient(900px 600px at -10% 110%, rgba(255,138,61,.22), transparent 60%),
      linear-gradient(160deg, #052e20 0%, #041f15 55%, #03140e 100%);
  }
  .fundo::before { content: ""; position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px); background-size: 22px 22px;
    mask-image: linear-gradient(to bottom, #000, transparent 85%); -webkit-mask-image: linear-gradient(to bottom, #000, transparent 85%);
  }
  .luz { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .55; animation: flutuar 14s ease-in-out infinite; }
  .luz--1 { width: 380px; height: 380px; background: #25d366; top: 10%; right: 8%; }
  .luz--2 { width: 300px; height: 300px; background: #ff8a3d; bottom: 5%; left: 4%; animation-delay: -5s; opacity: .35; }
  .luz--3 { width: 220px; height: 220px; background: #3ee6ff; top: 55%; right: 35%; animation-delay: -9s; opacity: .2; }

  /* ===== Estrutura ===== */
  .pagina { min-height: 100vh; min-height: 100svh; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
    align-items: center; gap: 48px; max-width: 1180px; margin: 0 auto; padding: 48px 32px 56px; }

  .marca { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 26px; text-decoration: none; color: inherit; }
  .marca img { width: 54px; height: 54px; border-radius: 50%; background: #fff; padding: 3px; box-shadow: 0 6px 20px rgba(0,0,0,.35); }
  .marca span { font-weight: 800; font-size: 20px; letter-spacing: -.01em; }
  .marca span i { font-style: normal; color: var(--laranja); }

  .selo { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; margin-bottom: 18px; border-radius: 999px;
    background: rgba(37,211,102,.14); border: 1px solid rgba(37,211,102,.35); color: var(--verde-claro); font-size: 13px; font-weight: 700; }
  .ponto { width: 8px; height: 8px; border-radius: 50%; background: var(--verde); animation: pulsar 1.8s infinite; }

  h1 { margin: 0 0 16px; font-size: clamp(34px, 5vw, 58px); line-height: 1.04; letter-spacing: -.035em; font-weight: 800; }
  h1 .grifo { background: linear-gradient(90deg, var(--verde-claro), var(--amarelo)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { margin: 0 0 28px; max-width: 540px; font-size: clamp(16px, 1.6vw, 19px); line-height: 1.5; color: var(--suave); }
  .sub b { color: var(--texto); }

  .cta { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 12px; width: 100%; max-width: 440px;
    padding: 20px 26px; border-radius: 18px; text-decoration: none; font-size: 19px; font-weight: 800; color: #04210f;
    background: linear-gradient(135deg, #5cf597 0%, #25d366 55%, #16b455 100%);
    box-shadow: 0 14px 40px rgba(37,211,102,.45), inset 0 1px 0 rgba(255,255,255,.5); overflow: hidden;
    transition: transform .15s ease, box-shadow .15s ease; animation: chamar 2.6s ease-in-out infinite; }
  .cta:hover { transform: translateY(-2px); box-shadow: 0 18px 46px rgba(37,211,102,.55); }
  .cta svg { width: 28px; height: 28px; flex: none; }
  .garantia { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 14px 0 0; padding: 0; list-style: none; font-size: 13.5px; color: var(--suave); }
  .garantia li::before { content: "✓ "; color: var(--verde); font-weight: 800; }

  .provas { display: flex; flex-wrap: wrap; gap: 12px; margin: 32px 0 0; padding: 0; list-style: none; }
  .provas li { flex: 1 1 140px; padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); backdrop-filter: blur(6px); }
  .provas b { display: block; font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -.02em; }
  .provas span { font-size: 12.5px; color: var(--suave); line-height: 1.35; }

  .lojas { margin-top: 26px; font-size: 12.5px; color: var(--suave); }
  .lojas ul { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 0; padding: 0; list-style: none; }
  .lojas li { padding: 5px 11px; border-radius: 999px; background: rgba(255,255,255,.08); color: #e6fff0; font-weight: 700; font-size: 12.5px; }

  /* ===== Celular com as ofertas reais ===== */
  .lado { position: relative; display: flex; justify-content: center; }
  .celular { position: relative; width: 340px; max-width: 100%; height: 640px; border-radius: 44px; padding: 12px;
    background: linear-gradient(160deg, #1d2b24, #0c1511); box-shadow: 0 40px 90px rgba(0,0,0,.55), inset 0 0 0 2px rgba(255,255,255,.08);
    transform: rotate(2deg); }
  .celular-topo { display: flex; align-items: center; gap: 10px; padding: 14px 12px; border-radius: 32px 32px 0 0; background: #075e54; color: #fff; }
  .celular-voltar { font-size: 26px; line-height: 1; opacity: .8; }
  .celular-topo img { width: 36px; height: 36px; border-radius: 50%; background: #fff; }
  .celular-topo b { display: block; font-size: 14px; }
  .celular-topo small { display: block; font-size: 11px; opacity: .8; }
  .celular-chat { height: calc(100% - 64px); padding: 14px 10px; border-radius: 0 0 32px 32px; overflow: hidden;
    display: flex; flex-direction: column; justify-content: flex-end; gap: 10px;
    background: #0b141a radial-gradient(rgba(255,255,255,.04) 1px, transparent 1px) 0 0 / 16px 16px; }
  .msg { position: relative; display: grid; grid-template-columns: 58px 1fr; gap: 8px; width: 92%; padding: 8px 8px 18px; border-radius: 12px 12px 12px 4px;
    background: #1f2c34; color: #e9edef; font-size: 12px; line-height: 1.35; box-shadow: 0 2px 6px rgba(0,0,0,.25);
    opacity: 0; transform: translateY(12px); animation: chegar .5s ease forwards; }
  .msg--vazia { display: block; text-align: center; width: 100%; padding: 12px; }
  .msg-foto { width: 58px; height: 58px; border-radius: 8px; background: #fff; display: grid; place-items: center; overflow: hidden; font-size: 22px; }
  .msg-foto img { width: 92%; height: 92%; object-fit: contain; }
  .msg-texto { min-width: 0; display: grid; gap: 2px; }
  .msg-texto b { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .msg-preco s { color: #8696a0; }
  .msg-preco strong { color: #fff; }
  .msg-preco em { font-style: normal; font-weight: 800; color: var(--verde); }
  .msg-loja { color: #8696a0; }
  .msg-link { color: #53bdeb; }
  .msg-hora { position: absolute; right: 8px; bottom: 4px; font-size: 10px; color: #8696a0; }
  .balao { position: absolute; z-index: 2; padding: 12px 16px; border-radius: 16px; background: #fff; color: #0f172a; font-weight: 800; font-size: 14px;
    box-shadow: 0 16px 40px rgba(0,0,0,.35); animation: flutuar 6s ease-in-out infinite; }
  .balao small { display: block; font-weight: 600; font-size: 11.5px; color: #475569; }
  .balao--1 { top: 12%; left: -6%; }
  .balao--2 { bottom: -3%; right: -2%; animation-delay: -3s; }
  .balao--1 b { color: var(--verde-escuro); }
  .balao--2 b { color: #e2640f; }

  /* ===== Seção de baixo ===== */
  .mais { max-width: 1180px; margin: 0 auto; padding: 0 32px 120px; }
  .cartoes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 0; padding: 0; list-style: none; }
  .cartao { padding: 20px 18px; border-radius: 20px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); }
  .cartao i { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 12px; border-radius: 12px; font-style: normal; font-size: 22px; background: rgba(37,211,102,.14); }
  .cartao strong { display: block; margin-bottom: 4px; font-size: 16px; }
  .cartao span { font-size: 13.5px; color: var(--suave); line-height: 1.45; }

  .urgencia { display: flex; align-items: center; gap: 16px; margin: 22px 0; padding: 20px 22px; border-radius: 20px;
    background: linear-gradient(90deg, rgba(255,138,61,.18), rgba(255,138,61,.06)); border: 1px solid rgba(255,138,61,.35); }
  .urgencia i { font-style: normal; font-size: 30px; }
  .urgencia p { margin: 0; color: #ffe2cf; font-size: 15px; line-height: 1.45; }
  .urgencia b { color: #fff; }

  .duas { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .caixa { padding: 22px; border-radius: 20px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); }
  .caixa h2 { margin: 0 0 14px; font-size: 20px; letter-spacing: -.01em; }
  .passos { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; counter-reset: p; }
  .passos li { display: grid; grid-template-columns: 34px 1fr; gap: 12px; align-items: center; font-size: 14.5px; color: var(--suave); }
  .passos li b { color: #fff; }
  .passos li::before { counter-increment: p; content: counter(p); width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
    font-weight: 800; color: #04210f; background: var(--verde); }
  .perguntas details { border-top: 1px solid rgba(255,255,255,.1); padding: 12px 0; }
  .perguntas details:first-of-type { border-top: 0; padding-top: 0; }
  .perguntas summary { cursor: pointer; list-style: none; display: flex; justify-content: space-between; gap: 10px; font-weight: 700; font-size: 14.5px; }
  .perguntas summary::-webkit-details-marker { display: none; }
  .perguntas summary::after { content: "+"; color: var(--verde); font-size: 20px; line-height: 1; }
  .perguntas details[open] summary::after { content: "–"; }
  .perguntas p { margin: 8px 0 0; font-size: 13.5px; color: var(--suave); line-height: 1.5; }

  .final { margin-top: 26px; text-align: center; }
  .final .cta { max-width: 460px; }
  .rodape { margin: 22px 0 0; text-align: center; font-size: 13px; color: var(--suave); }
  .rodape a { color: var(--verde-claro); font-weight: 700; text-decoration: none; }

  /* Botão fixo no celular */
  .fixo { position: fixed; left: 0; right: 0; bottom: 0; z-index: 10; padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: rgba(4,31,21,.88); backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,.08);
    transform: translateY(110%); transition: transform .25s ease; }
  .fixo.mostrar { transform: none; }
  .fixo .cta { max-width: 520px; display: flex; margin: 0 auto; padding: 16px 18px; font-size: 17px; animation: none; }

  @keyframes pulsar { 0% { box-shadow: 0 0 0 0 rgba(37,211,102,.8); } 70% { box-shadow: 0 0 0 9px rgba(37,211,102,0); } 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); } }
  @keyframes chamar { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.025); } }
  @keyframes brilho { 0%, 60% { left: -60%; } 100% { left: 130%; } }
  @keyframes flutuar { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  @keyframes chegar { to { opacity: 1; transform: none; } }

  /* ===== Celular / tablet ===== */
  @media (max-width: 900px) {
    .pagina { grid-template-columns: 1fr; gap: 36px; padding: 28px 18px 32px; text-align: center; }
    .marca { margin-bottom: 18px; }
    .sub, .cta { margin-left: auto; margin-right: auto; }
    .garantia { justify-content: center; }
    .provas li { text-align: left; }
    .lojas ul { justify-content: center; }
    .celular { width: 300px; height: 500px; transform: none; }
    .balao { display: none; }
    .mais { padding: 0 18px 120px; }
    .cartoes { grid-template-columns: 1fr 1fr; }
    .duas { grid-template-columns: 1fr; }
  }
  @media (max-width: 420px) {
    .cartoes { gap: 10px; }
    .cartao { padding: 16px 14px; }
    .balao { font-size: 12.5px; padding: 10px 12px; }
  }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; } .msg { opacity: 1; transform: none; } }
</style>
</head>
<body>
<div class="fundo" aria-hidden="true"><span class="luz luz--1"></span><span class="luz luz--2"></span><span class="luz luz--3"></span></div>

<main class="pagina">
  <section>
    <a class="marca" href="/"><img src="/logo-mukiofertas.png" alt=""><span>Muki<i>Ofertas</i></span></a>
    <div><span class="selo"><span class="ponto"></span> Ofertas chegando agora no grupo</span></div>
    <h1>Pare de pagar caro.<br><span class="grifo">As promoções vêm até você</span> no WhatsApp.</h1>
    <p class="sub">A gente garimpa <b>Amazon, Mercado Livre, Shopee, KaBuM!</b> e outras lojas o dia inteiro e manda no grupo <b>só o que vale a pena</b>, com o preço conferido antes de enviar.</p>
    <a class="cta" id="cta-topo" href="${esc(link)}" rel="noopener">${ICONE_WPP} Entrar no grupo grátis</a>
    <ul class="garantia"><li>100% grátis</li><li>Sem cadastro</li><li>Sai quando quiser</li></ul>
    <ul class="provas">${provas}</ul>
    <div class="lojas">Ofertas de lojas como:
      <ul><li>Amazon</li><li>Mercado Livre</li><li>Shopee</li><li>KaBuM!</li><li>AliExpress</li><li>Magalu</li></ul>
    </div>
  </section>

  <section class="lado">
    <div class="balao balao--1"><b>🔕 Grupo silencioso</b><small>só os admins mandam mensagem</small></div>
    ${celular}
    <div class="balao balao--2"><b>⚡ Você vê primeiro</b><small>relâmpagos e cupons na hora</small></div>
  </section>
</main>

<div class="mais">
  <ul class="cartoes">
    <li class="cartao"><i>✅</i><strong>Preço conferido</strong><span>Desconto falso (o "metade do dobro") é barrado antes de ir para o grupo.</span></li>
    <li class="cartao"><i>🎟️</i><strong>Cupons na hora</strong><span>Cupom bom esgota rápido. No grupo, você recebe assim que sai.</span></li>
    <li class="cartao"><i>🌙</i><strong>Sem spam</strong><span>Ofertas das 7h às 23h, num ritmo que não enche o seu celular.</span></li>
    <li class="cartao"><i>🛡️</i><strong>Compra segura</strong><span>Você compra direto no site oficial da loja. A gente só indica o link.</span></li>
  </ul>

  <div class="urgencia"><i>⏳</i><p><b>As melhores promoções duram minutos.</b> O cupom esgota, o estoque acaba e o preço volta. Quem está no grupo fica sabendo antes de todo mundo.</p></div>

  <div class="duas">
    <section class="caixa">
      <h2>Como entrar</h2>
      <ol class="passos">
        <li><span>Toque em <b>“Entrar no grupo grátis”</b>.</span></li>
        <li><span>No WhatsApp, toque em <b>“Entrar no grupo”</b>.</span></li>
        <li><span><b>Pronto!</b> Fixe o grupo para não perder nenhuma oferta.</span></li>
      </ol>
    </section>
    <section class="caixa perguntas">
      <h2>Dúvidas</h2>
      <details><summary>É grátis mesmo?</summary><p>Sim. O MukiOfertas ganha uma pequena comissão das lojas quando alguém compra pelos nossos links, sem custo nenhum a mais para você.</p></details>
      <details><summary>Vou receber muita mensagem?</summary><p>Não. Só ofertas selecionadas, das 7h às 23h. Se preferir, silencie o grupo e confira quando quiser.</p></details>
      <details><summary>As ofertas são confiáveis?</summary><p>Você compra no site oficial da loja (Amazon, Mercado Livre, Shopee...). Nós conferimos o preço antes de enviar.</p></details>
      <details><summary>Posso sair quando quiser?</summary><p>Pode. É só sair do grupo pelo próprio WhatsApp, a qualquer momento.</p></details>
    </section>
  </div>

  <div class="final"><a class="cta" href="${esc(link)}" rel="noopener">${ICONE_WPP} Quero receber as ofertas</a></div>
  <p class="rodape">Prefere o Telegram? <a href="/telegram">Entre no nosso canal</a> · <a href="/">Ver o site</a></p>
</div>

<div class="fixo" id="fixo"><a class="cta" href="${esc(link)}" rel="noopener">${ICONE_WPP} Entrar no grupo grátis</a></div>

<script>
  (function () {
    var topo = document.getElementById("cta-topo"), fixo = document.getElementById("fixo");
    if (!("IntersectionObserver" in window) || !topo || !fixo || window.innerWidth > 900) return;
    new IntersectionObserver(function (e) { fixo.classList.toggle("mostrar", !e[0].isIntersecting); }).observe(topo);
  })();
</script>
</body>
</html>`;
}

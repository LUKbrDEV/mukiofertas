// Monta a mensagem do WhatsApp a partir do modelo que você escreve no painel admin
// (Configurações → WhatsApp). Usado pelo robô (scripts/postar-whatsapp.mjs) e pela prévia do painel.
// Salve como lib/whatsapp-modelo.mjs
//
// Campos que podem ir no modelo:
//   {titulo} {loja} {preco} {preco_antigo} {desconto} {economia} {preco_pix} {cupom} {link} {link_site}
//   {preco_pix}  preço mais baixo pagando no PIX (a linha some quando a oferta não tem)
//   {frase}  frase engraçada criada pela IA para cada produto (lib/frase-ia.mjs)
//
// Regras para o texto ficar limpo:
//   - Linha com um campo vazio some inteira (ex.: a linha do cupom some quando a oferta não tem cupom)
//   - Trecho entre [[ e ]] some sozinho quando algum campo dentro dele está vazio
//     ex.: "💰 *{preco}*[[ ({desconto} OFF)]]"  →  sem desconto fica só "💰 *R$ 99,90*"
// Formatação do WhatsApp: *negrito*  _itálico_  ~riscado~

import { converterLinkMagalu } from "./afiliado-magalu.mjs";

export const MODELO_PADRAO = `🔥 *{titulo}*
_{frase}_

~De {preco_antigo}~
💰 *Por {preco}*[[ ({desconto} OFF)]]
💠 *{preco_pix} no PIX*
🎟️ Cupom: *{cupom}*
🏪 {loja}

🛒 Compre aqui: {link}`;

export const MODELO_CUPOM_PADRAO = `🎟️ *CUPOM {loja}*
_{frase}_

{titulo}
👉 Código: *{cupom}*

🛒 Use aqui: {link}`;

const reais = (v) =>
  v === null || v === undefined || v === "" || !Number(v)
    ? ""
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Link da mensagem (misto):
//   - link da loja já curto (amzn.to, meli.la, s.shopee.com.br...): vai o link bruto da loja
//   - link comprido (ex.: mercadolivre.com.br/p/MLB...?matt_word=...&matt_tool=...): vai o
//     mukiofertas.com.br/ir/ID, que é curto e leva direto para a loja com o seu link de afiliado
//   - oferta sem link válido: também vai o /ir/
// Para mudar o que conta como "comprido", troque o número abaixo.
export const TAMANHO_MAXIMO_LINK_BRUTO = 45; // caracteres

export function linkDaLoja(oferta, siteUrl = "") {
  const site = String(siteUrl || "").replace(/\/+$/, "");
  const peloSite = oferta.id ? `${site}/ir/${oferta.id}` : "";
  const direto = String(oferta.link ?? "").trim();
  if (!/^https?:\/\//i.test(direto)) return peloSite || direto;
  const daLoja = converterLinkMagalu(direto); // Magalu: sempre a SUA loja
  return daLoja.length > TAMANHO_MAXIMO_LINK_BRUTO && peloSite ? peloSite : daLoja;
}

// Valores de cada campo para uma oferta
export function camposDaOferta(oferta, { siteUrl = "", frase = "" } = {}) {
  const site = String(siteUrl || "").replace(/\/+$/, "");
  const atual = Number(oferta.preco_atual);
  const antigo = Number(oferta.preco_antigo);
  const temDesconto = antigo > 0 && atual > 0 && antigo > atual;
  const desconto = temDesconto ? Math.round(((antigo - atual) / antigo) * 100) : 0;
  return {
    titulo: String(oferta.titulo ?? "").trim(),
    loja: oferta.loja ?? "",
    preco: oferta.categoria === "cupons" ? "" : reais(atual),
    preco_antigo: temDesconto ? reais(antigo) : "",
    desconto: desconto > 0 ? `${desconto}%` : "",
    economia: temDesconto ? reais(antigo - atual) : "",
    preco_pix: Number(oferta.preco_pix) > 0 && Number(oferta.preco_pix) < atual ? reais(oferta.preco_pix) : "",
    cupom: oferta.cupom ?? "",
    // link da loja quando é curto; /ir/ do site quando é comprido (ver linkDaLoja)
    link: linkDaLoja(oferta, site),
    link_site: oferta.id ? `${site}/oferta/${oferta.id}` : "",
    frase,
  };
}

const CAMPO = /\{([a-z_]+)\}/g;

// Troca os campos de um trecho; devolve null se algum campo usado estiver vazio
function preencher(trecho, campos) {
  let vazio = false;
  const texto = trecho.replace(CAMPO, (inteiro, nome) => {
    if (!(nome in campos)) return inteiro; // campo desconhecido: deixa como está
    const v = String(campos[nome] ?? "");
    if (!v) vazio = true;
    return v;
  });
  return vazio ? null : texto;
}

export function montarMensagem(modelo, campos) {
  const linhas = String(modelo || MODELO_PADRAO)
    .replace(/\r/g, "")
    .split("\n")
    .map((linha) => {
      // 1) trechos opcionais [[ ... ]]
      const semOpcionais = linha.replace(/\[\[([\s\S]*?)\]\]/g, (_, dentro) => preencher(dentro, campos) ?? "");
      // 2) a linha toda: some se tiver campo vazio
      return preencher(semOpcionais, campos);
    })
    .filter((l) => l !== null);

  // tira linhas em branco repetidas (que sobram quando várias linhas somem)
  return linhas
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

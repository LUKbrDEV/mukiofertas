// Compra em grupo no grupo do WhatsApp: modelos das mensagens e campos.
// Salve como lib/compra-em-grupo-whatsapp.mjs. Usado por scripts/postar-whatsapp.mjs e pelo painel
// (Configurações → WhatsApp → Compra em grupo). A mensagem é montada pelo mesmo montarMensagem
// das ofertas (lib/whatsapp-modelo.mjs): linha com campo vazio some, [[ ]] é trecho opcional.
//
// Campos: {titulo} {faltam} {preco} {preco_normal} {desconto} {prazo} {link}
//   {faltam}  "falta só 1 pessoa" / "faltam 2 pessoas"
//   {prazo}   "18h" (quanto falta para o grupo vencer)
//   {link}    página do produto no MukiOfertas (mostra todos os grupos abertos e o "Criar meu grupo")

export const MODELO_GRUPO_PADRAO = `👥 *COMPRA EM GRUPO: {faltam}!*

{titulo}

💰 *{preco}* no grupo[[ (sozinho: ~{preco_normal}~)]]
⏰ Fecha em até {prazo}

👉 Entre aqui: {link}`;

export const MODELO_ABRIR_PADRAO = `➕ *ABRA UM GRUPO E PAGUE MENOS*

{titulo}

💰 *{preco}* no grupo de 3[[ (sozinho: ~{preco_normal}~)]]
Crie o grupo no AliExpress e divulgue no site: a comunidade ajuda a fechar.

👉 Veja como: {link}`;

export const PADRAO_GRUPO_WHATSAPP = {
  whatsapp_grupos_ativo: true, // manda os grupos de compra abertos
  whatsapp_grupos_por_dia: 6, // no máximo X por dia (e no máximo 1 por hora)
  whatsapp_grupos_so_falta1: false, // true = só grupos em que falta 1 pessoa
  whatsapp_grupos_abrir_por_dia: 0, // extra: produtos "Para abrir grupo" por dia (0 = desligado)
  whatsapp_modelo_grupo: MODELO_GRUPO_PADRAO,
  whatsapp_modelo_abrir: MODELO_ABRIR_PADRAO,
};

const reais = (v) => (Number(v) > 0 ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "");

const slugTitulo = (t) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const linkDoProdutoNoSite = (produto, siteUrl) =>
  `${String(siteUrl || "").replace(/\/+$/, "")}/compra-em-grupo/p/${produto.id}${produto.titulo ? `/${slugTitulo(produto.titulo)}` : ""}`;

// produto = linha de grupos_produtos; grupo = linha de grupos_compra (ou null para "abra um grupo")
export function camposDoGrupo(produto, grupo, { siteUrl = "" } = {}) {
  const precoGrupo = Number(produto.preco_grupo) || null;
  const precoNormal = Number(produto.preco_normal) || null;
  const preco = precoGrupo ?? precoNormal;
  const temDesconto = precoGrupo && precoNormal && precoNormal > precoGrupo;
  const horas = grupo ? Math.max(1, Math.floor((new Date(grupo.expira_em).getTime() - Date.now()) / 3600000)) : null;
  return {
    titulo: String(produto.titulo ?? "").trim(),
    faltam: grupo ? (grupo.faltam === 1 ? "falta só 1 pessoa" : `faltam ${grupo.faltam} pessoas`) : "",
    preco: reais(preco),
    preco_normal: temDesconto ? reais(precoNormal) : "",
    desconto: temDesconto ? `${Math.round(((precoNormal - precoGrupo) / precoNormal) * 100)}%` : "",
    prazo: horas ? `${horas}h` : "",
    link: linkDoProdutoNoSite(produto, siteUrl),
  };
}

// Busca a foto (e o link do produto) de itens do AliExpress que chegaram sem imagem,
// como os "produtos com cupom" que vêm dos vouchers da Awin.
// Usa a API de afiliados do AliExpress (as mesmas chaves do robô do AliExpress).
import { aliexpressConfigurado, chamarAliExpress } from "./aliexpress.mjs";

// Acha o número do produto do AliExpress dentro de um link (inclusive link de rastreio com o destino codificado)
export function idDoProdutoAliExpress(link) {
  let texto = String(link ?? "");
  for (let i = 0; i < 3; i++) {
    try {
      const d = decodeURIComponent(texto);
      if (d === texto) break;
      texto = d;
    } catch {
      break;
    }
  }
  const m =
    texto.match(/aliexpress\.[a-z.]+\/item\/(?:[^/?#]*\/)?(\d{9,20})\.html/i) ??
    texto.match(/[?&](?:productIds?|product_id|itemId|item_id)=(\d{9,20})/i) ??
    texto.match(/\/item\/(\d{9,20})/i);
  return m ? m[1] : null;
}

// Segue os redirecionamentos do link (sem abrir a página) até achar o endereço do produto
async function seguirLink(link) {
  let atual = link;
  for (let i = 0; i < 6 && atual; i++) {
    const id = idDoProdutoAliExpress(atual);
    if (id) return id;
    try {
      const r = await fetch(atual, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(10000) });
      const proximo = r.headers.get("location");
      if (!proximo) return null;
      atual = new URL(proximo, atual).toString();
    } catch {
      return null;
    }
  }
  return idDoProdutoAliExpress(atual);
}

// Recebe [{ link, destino? }] e devolve Map(item -> url da imagem)
export async function imagensAliExpress(itens) {
  const resultado = new Map();
  if (!itens.length || !aliexpressConfigurado()) return resultado;

  const porId = new Map();
  for (const item of itens) {
    const id = idDoProdutoAliExpress(item.destino) ?? (await seguirLink(item.link));
    if (!id) continue;
    if (!porId.has(id)) porId.set(id, []);
    porId.get(id).push(item);
  }

  const ids = [...porId.keys()];
  for (let i = 0; i < ids.length; i += 20) {
    const lote = ids.slice(i, i + 20);
    try {
      const json = await chamarAliExpress("aliexpress.affiliate.productdetail.get", {
        product_ids: lote.join(","),
        target_currency: "BRL",
        target_language: "PT",
        country: "BR",
        tracking_id: String(process.env.ALIEXPRESS_TRACKING_ID).trim(),
      });
      const resp = json.aliexpress_affiliate_productdetail_get_response?.resp_result;
      const lista = resp?.result?.products?.product ?? resp?.result?.products ?? [];
      for (const p of Array.isArray(lista) ? lista : []) {
        const foto = p.product_main_image_url;
        if (!foto) continue;
        for (const item of porId.get(String(p.product_id)) ?? []) resultado.set(item, foto);
      }
    } catch (erro) {
      console.warn(`[aliexpress] Não consegui buscar as fotos: ${erro.message}`);
    }
  }
  return resultado;
}

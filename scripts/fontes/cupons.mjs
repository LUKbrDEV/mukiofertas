// Fonte de CUPONS: busca os cupons de desconto das redes de afiliados e coloca na aba Cupons
// (categoria "cupons", página /cupons-de-desconto).
// Salve como scripts/fontes/cupons.mjs. Usada pelo scripts/coletar.mjs.
//
// De onde vêm os cupons do site:
//   - Telegram: postagens que são só um cupom (lib/classificar.mjs reconhece sozinho)
//   - Painel admin: aba Cupons (aparecem na página /cupons-de-desconto)
//   - Lomadee: campanhas do tipo cupom das lojas em que você é afiliado (este arquivo)
//   - Awin (KaBuM! e outras lojas da Awin): vouchers do programa (este arquivo)
//   Shopee e AliExpress não têm cupons na API de afiliados; os cupons delas chegam pelo Telegram.
//
// Variáveis (no .env.local e nos Secrets do GitHub):
//   LOMADEE_API_KEY      a mesma da coleta, com o escopo campaigns:read (além dos que já tem)
//   AWIN_API_TOKEN       token da API da Awin (ui.awin.com/awin-api → API Credentials)
//   AWIN_PUBLISHER_ID    o número da sua conta de publisher na Awin (aparece no canto da tela da Awin)
// Se alguma estiver faltando, essa rede é pulada (as outras continuam).
//
// Para testar sem gravar nada:
//   node --env-file=.env.local scripts/testar-cupons.mjs

import { createClient } from "@supabase/supabase-js";
import { CONFIG_ROBO } from "../../lib/prazos.mjs";

// ===== AJUSTES =====
const PADRAO = {
  cupons_ativo: true, // Configurações → Cupons (painel admin)
  cupons_max_por_rede: 40, // cupons por rede a cada execução
};
const MAX_PAGINAS_LOMADEE = 5; // 20 campanhas por página
const MAX_LINKS_NOVOS_LOMADEE = 10; // links de afiliado gerados por execução (cada um é uma chamada)
const DIAS_SEM_VALIDADE = 7; // cupom sem data de fim fica X dias no site (renova se continuar na rede)
// ===================

const ajuste = (chave) => {
  const v = CONFIG_ROBO?.[chave];
  if (typeof PADRAO[chave] === "boolean") return typeof v === "boolean" ? v : PADRAO[chave];
  return v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : PADRAO[chave];
};

const limpar = (t, max = 200) =>
  String(t ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

function validade(fim) {
  const data = fim ? new Date(fim) : null;
  if (data && !Number.isNaN(data.getTime())) return data.toISOString();
  return new Date(Date.now() + DIAS_SEM_VALIDADE * 86400000).toISOString();
}

// Monta a oferta da aba Cupons
function cupom({ loja, id, titulo, codigo, link, imagem, fim, descricao }) {
  return {
    loja,
    id_externo: id,
    titulo: limpar(titulo || `Cupom ${loja}`),
    categoria: "cupons",
    preco_atual: 0,
    preco_antigo: null,
    cupom: codigo ? String(codigo).trim().toUpperCase().slice(0, 40) : null,
    link,
    imagem: imagem || null,
    sobre: descricao ? limpar(descricao, 1500) : null,
    expires_at: validade(fim),
  };
}

// ---------- Lomadee ----------
const API_LOMADEE = "https://api.lomadee.com.br";
let ultimaLomadee = 0;

async function lomadee(caminho, { metodo = "GET", corpo } = {}) {
  const espera = ultimaLomadee + 1100 - Date.now(); // 60 chamadas por minuto
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  ultimaLomadee = Date.now();
  const res = await fetch(`${API_LOMADEE}${caminho}`, {
    method: metodo,
    headers: {
      "x-api-key": process.env.LOMADEE_API_KEY,
      Accept: "application/json",
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const dica = res.status === 403 ? " (a chave precisa do escopo campaigns:read)" : "";
    throw new Error(`Lomadee ${caminho.split("?")[0]} -> ${res.status} ${json?.message ?? ""}${dica}`);
  }
  return json;
}

const lista = (json) => (Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : json?.data ? [json.data] : []);

function escolherCanal(canais) {
  const preferido = (process.env.LOMADEE_CANAL || "").trim().toLowerCase();
  const comLink = (canais ?? []).filter((c) => c.shortUrls?.length && !c.message);
  return (
    (preferido && comLink.find((c) => c.id?.toLowerCase() === preferido || c.name?.toLowerCase() === preferido)) ||
    comLink[0] ||
    null
  );
}

async function cuponsLomadee(existentes) {
  if (!process.env.LOMADEE_API_KEY) return { itens: [], aviso: "sem LOMADEE_API_KEY" };

  // Nome e logo das lojas (a campanha só traz o id da loja)
  const marcas = new Map();
  for (let p = 1; p <= 5; p++) {
    const json = await lomadee(`/affiliate/brands?page=${p}&limit=20`);
    for (const m of lista(json)) marcas.set(m.id, m);
    if (lista(json).length < 20) break;
  }

  const campanhas = [];
  for (let p = 1; p <= MAX_PAGINAS_LOMADEE; p++) {
    const json = await lomadee(`/affiliate/campaigns?types=GenericCoupon,PersonalCoupon&status=onTime&limit=20&page=${p}`);
    campanhas.push(...lista(json));
    const total = json?.meta?.totalPages;
    if (lista(json).length < 20 || (total && p >= total)) break;
  }

  const itens = [];
  let linksNovos = 0;
  for (const c of campanhas) {
    if (!c.code) continue; // cupom sem código (pessoal ainda não gerado): não serve
    const id = `cpl-${c.id}`;
    const marca = marcas.get(c.organizationId);
    let link = existentes.get(id)?.link ?? escolherCanal(c.channels)?.shortUrls?.[0] ?? null;
    if (!link && c.url && marca && linksNovos < MAX_LINKS_NOVOS_LOMADEE) {
      try {
        const canais = await lomadee("/affiliate/shortener/url", {
          metodo: "POST",
          corpo: { organizationId: c.organizationId, type: "Custom", url: c.url, mdasc: "mukiofertas" },
        });
        link = escolherCanal(lista(canais))?.shortUrls?.[0] ?? null;
        linksNovos++;
      } catch {
        // sem link de afiliado para esta loja
      }
    }
    if (!link) continue;
    itens.push(
      cupom({
        loja: marca?.name ?? "Lomadee",
        id,
        titulo: c.name,
        codigo: c.code,
        link,
        imagem: marca?.logo ?? marca?.image ?? marca?.logoUrl ?? null,
        fim: c.period?.endAt,
        descricao: c.description,
      })
    );
    if (itens.length >= ajuste("cupons_max_por_rede")) break;
  }
  return { itens, aviso: `${campanhas.length} campanhas de cupom` };
}

// ---------- Awin (vouchers) ----------
async function cuponsAwin() {
  const token = process.env.AWIN_API_TOKEN;
  const publisher = process.env.AWIN_PUBLISHER_ID;
  if (!token || !publisher) return { itens: [], aviso: "sem AWIN_API_TOKEN/AWIN_PUBLISHER_ID" };

  const res = await fetch(
    `https://api.awin.com/publisher/${encodeURIComponent(publisher)}/promotions?accessToken=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        filters: { membership: "joined", type: "voucher", status: "active", regionCodes: ["BR"] },
        pagination: { page: 1, pageSize: 200 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const dica = res.status === 401 ? " (token inválido)" : res.status === 404 ? " (confira o AWIN_PUBLISHER_ID)" : "";
    throw new Error(`Awin promotions -> ${res.status} ${json?.description ?? json?.message ?? ""}${dica}`);
  }
  const promocoes = Array.isArray(json) ? json : json?.data ?? json?.promotions ?? [];

  const itens = [];
  for (const p of promocoes) {
    const codigo = p.voucher?.code;
    const link = p.urlTracking || p.url;
    if (!codigo || !link) continue; // sem código (programa não aprovado) ou sem link
    itens.push(
      cupom({
        loja: p.advertiser?.name ?? "Awin",
        id: `cpa-${p.promotionId}`,
        titulo: p.title || p.description,
        codigo,
        link,
        // a Awin manda a data em UTC sem o "Z" no fim
        fim: p.endDate ? (/(Z|[+-]\d\d:?\d\d)$/.test(p.endDate) ? p.endDate : `${p.endDate}Z`) : null,
        descricao: [p.description, p.terms].filter(Boolean).join("\n\n"),
      })
    );
    if (itens.length >= ajuste("cupons_max_por_rede")) break;
  }
  return { itens, aviso: `${promocoes.length} vouchers` };
}

// Cupons da Lomadee que já estão no site: reaproveita o link (não gera outro)
async function buscarExistentes() {
  const mapa = new Map();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return mapa;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data } = await db.from("ofertas").select("id_externo, link").like("id_externo", "cpl-%").limit(1000);
  for (const o of data ?? []) mapa.set(o.id_externo, o);
  return mapa;
}

// ---------- Função usada pelo coletar.mjs ----------
export async function buscar() {
  if (!ajuste("cupons_ativo")) {
    console.log("[cupons] Desligado no painel admin: pulando.");
    return [];
  }
  const existentes = await buscarExistentes().catch(() => new Map());
  const itens = [];
  for (const [nome, fn] of [
    ["Lomadee", () => cuponsLomadee(existentes)],
    ["Awin", () => cuponsAwin()],
  ]) {
    try {
      const r = await fn();
      console.log(`[cupons] ${nome}: ${r.itens.length} cupons prontos (${r.aviso}).`);
      itens.push(...r.itens);
    } catch (erro) {
      console.warn(`[cupons] ${nome} falhou: ${erro.message}`);
    }
  }
  return itens;
}

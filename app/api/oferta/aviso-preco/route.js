// Botão "O preço subiu ou a oferta acabou?" (components/BotaoPrecoSubiu.js).
// Salve como app/api/oferta/aviso-preco/route.js
//
// - Visitante: o aviso é guardado (1 por pessoa por oferta). Com X avisos de pessoas diferentes
//   (painel admin → Configurações → Validade), a oferta vira Expirada sozinha.
// - Administrador logado: a oferta expira na hora.
// - Oferta com cupom: quando ela expira por aqui, TODAS as ofertas ativas da mesma loja com o mesmo
//   código de cupom expiram junto (o cupom esgotou para todo mundo).
// Precisa do validade.sql rodado no Supabase (tabela avisos_preco).

import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

const AVISOS_PADRAO = 2;
const MAX_AVISOS_POR_DIA = 20; // por visitante (evita alguém expirar o site inteiro)

const resposta = (dados, status = 200) => Response.json(dados, { status });

function banco() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function ehAdmin(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("eh_admin");
  return !error && data === true;
}

export async function POST(request) {
  const { id } = await request.json().catch(() => ({}));
  const ofertaId = Number(id);
  if (!Number.isFinite(ofertaId) || ofertaId <= 0) return resposta({ erro: "Oferta inválida." }, 400);

  const db = banco();
  const agora = new Date().toISOString();
  // Expira a oferta; se ela tem cupom, expira também as outras da mesma loja com o mesmo código
  const expirar = async () => {
    const r = await db.from("ofertas").update({ expires_at: agora }).eq("id", ofertaId).or(`expires_at.is.null,expires_at.gt.${agora}`);
    if (r.error) return r;
    const { data: o } = await db.from("ofertas").select("loja, cupom").eq("id", ofertaId).maybeSingle();
    if (o?.cupom) {
      const { data: mesmas } = await db
        .from("ofertas")
        .update({ expires_at: agora })
        .eq("loja", o.loja)
        .ilike("cupom", o.cupom.replace(/[%_]/g, ""))
        .neq("id", ofertaId)
        .or(`expires_at.is.null,expires_at.gt.${agora}`)
        .select("id");
      return { ...r, junto: mesmas?.length ?? 0 };
    }
    return r;
  };

  // Administrador: expira na hora
  if (await ehAdmin(request)) {
    const { error, junto = 0 } = await expirar();
    if (error) return resposta({ erro: error.message }, 500);
    return resposta({ ok: true, expirou: true, admin: true, junto });
  }

  // Quem é o visitante: um código guardado no navegador (cookie) + o endereço de internet
  const jar = await cookies();
  let vid = jar.get("muki_vid")?.value;
  if (!vid) {
    vid = randomUUID();
    jar.set("muki_vid", vid, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim();
  const visitante = createHash("sha256").update(`${vid}|${ip}`).digest("hex").slice(0, 32);
  const visitanteIp = createHash("sha256").update(`ip|${ip}`).digest("hex").slice(0, 32);

  // Limite por dia
  const desde = new Date(Date.now() - 86400000).toISOString();
  const { count: hoje } = await db
    .from("avisos_preco")
    .select("id", { count: "exact", head: true })
    .eq("visitante_ip", visitanteIp)
    .gte("criado_em", desde);
  if ((hoje ?? 0) >= MAX_AVISOS_POR_DIA) return resposta({ ok: true, limite: true });

  const { error: erroAviso } = await db
    .from("avisos_preco")
    .upsert({ oferta_id: ofertaId, visitante, visitante_ip: visitanteIp }, { onConflict: "oferta_id,visitante", ignoreDuplicates: true });
  if (erroAviso) return resposta({ erro: `${erroAviso.message} (rodou o validade.sql?)` }, 500);

  // Quantas pessoas diferentes (endereços diferentes) já avisaram
  const { data: avisos } = await db.from("avisos_preco").select("visitante_ip").eq("oferta_id", ofertaId).limit(200);
  const pessoas = new Set((avisos ?? []).map((a) => a.visitante_ip)).size;

  const { data: cfg } = await db.from("config_site").select("dados").eq("id", 1).maybeSingle();
  const precisa = Math.max(1, Number(cfg?.dados?.avisos_para_expirar) || AVISOS_PADRAO);

  if (pessoas >= precisa) {
    const { junto = 0 } = await expirar();
    return resposta({ ok: true, expirou: true, avisos: pessoas, junto });
  }
  return resposta({ ok: true, expirou: false, avisos: pessoas, faltam: precisa - pessoas });
}

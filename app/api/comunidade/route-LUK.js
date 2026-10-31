import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { categorias } from "../../../data/ofertas";
import { validarSugestao } from "../../../lib/sugestoes";

const erro = (mensagem, status) => NextResponse.json({ ok: false, erro: mensagem }, { status });

export async function POST(request) {
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return erro("Requisição inválida.", 400);
  }

  // Robôs: campo escondido preenchido ou formulário enviado rápido demais.
  // Respondemos "ok" para eles não saberem que foram barrados.
  if (corpo.website || Number(corpo.ms ?? 0) < 3000) return NextResponse.json({ ok: true });

  const { dados, erro: mensagem } = validarSugestao(
    corpo,
    categorias.map((c) => c.slug)
  );
  if (mensagem) return erro(mensagem, 400);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.error("Envio da comunidade: faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no servidor.");
    return erro("O envio de promoções está indisponível no momento.", 500);
  }
  const supabase = createClient(url, chave);

  // Limite de envios: 3 por hora por origem e 5 por dia por e-mail
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "desconhecido";
  const ipHash = createHash("sha256")
    .update(ip + (process.env.SUGESTOES_SALT ?? "mukiofertas"))
    .digest("hex")
    .slice(0, 32);

  const umaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const umDia = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [porIp, porEmail] = await Promise.all([
    supabase.from("sugestoes").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("criado_em", umaHora),
    supabase.from("sugestoes").select("id", { count: "exact", head: true }).eq("email", dados.email).gte("criado_em", umDia),
  ]);
  if ((porIp.count ?? 0) >= 3 || (porEmail.count ?? 0) >= 5) {
    return erro("Você já enviou várias promoções. Tente de novo mais tarde.", 429);
  }

  const { error } = await supabase.from("sugestoes").insert({ ...dados, ip_hash: ipHash });
  if (error) {
    console.error("Erro ao gravar sugestão:", error.message);
    return erro("Não foi possível enviar agora. Tente novamente em instantes.", 500);
  }

  return NextResponse.json({ ok: true });
}

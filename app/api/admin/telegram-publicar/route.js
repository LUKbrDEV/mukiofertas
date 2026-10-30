// "Publicar mesmo assim": publica uma postagem do Telegram que o site tinha recusado.
// Salve como app/api/admin/telegram-publicar/route.js
// Só administradores conseguem usar.

import { createClient } from "@supabase/supabase-js";
import { publicarMesmoAssim } from "../../../../lib/salvar-oferta";

export const dynamic = "force-dynamic";

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

const TEXTOS = {
  salva: "Publicada no site!",
  renovada: "Essa oferta já estava no site e ganhou mais dias.",
  duplicada: "Não publicada: essa oferta já está no site (mesmo link).",
  duplicada_titulo: "Não publicada: o mesmo produto, da mesma loja e com o mesmo preço, já está no site.",
  sem_preco: "Não publicada: não foi possível ler o preço na postagem.",
  sem_titulo_ou_link: "Não publicada: a postagem não tem título ou link.",
  categoria_ignorada: "Não publicada: categoria ignorada.",
};

export async function POST(request) {
  if (!(await ehAdmin(request))) return Response.json({ erro: "Somente administradores." }, { status: 403 });

  const { id } = await request.json().catch(() => ({}));
  if (!id) return Response.json({ erro: "Postagem não informada." }, { status: 400 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: registro, error } = await db.from("telegram_log").select("*").eq("id", id).maybeSingle();
  if (error || !registro) return Response.json({ erro: "Postagem não encontrada no registro." }, { status: 404 });
  if (!registro.texto) {
    return Response.json(
      { erro: "Essa postagem é de antes da atualização e não tem o texto guardado. Só as novas podem ser publicadas por aqui." },
      { status: 400 }
    );
  }

  const resultado = await publicarMesmoAssim(registro.texto, registro.origem || "telegram", registro.extras || {});
  const publicada = resultado?.motivo === "salva" || resultado?.motivo === "renovada";

  if (publicada) {
    await db.from("telegram_log").update({ motivo: "publicada_manual", detalhe: "Publicada pelo painel" }).eq("id", id);
  }

  return Response.json(
    {
      ok: publicada,
      motivo: resultado?.motivo,
      mensagem: TEXTOS[resultado?.motivo] ?? (resultado?.detalhe ? `Erro: ${resultado.detalhe}` : `Não publicada (${resultado?.motivo}).`),
    },
    { status: publicada ? 200 : 409 }
  );
}

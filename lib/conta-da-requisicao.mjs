// Confere quem está chamando a rota (pelo token de login enviado no cabeçalho Authorization).
// Salve como lib/conta-da-requisicao.mjs. Usado pelas rotas app/api/comunidade/*.

import { createClient } from "@supabase/supabase-js";

export const bancoServidor = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

export async function contaDaRequisicao(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await bancoServidor().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Limite simples de chamadas por usuário (por instância do servidor)
const chamadas = new Map();
export function passouDoLimite(chave, maximo = 20, janelaMs = 60_000) {
  const agora = Date.now();
  const lista = (chamadas.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  lista.push(agora);
  chamadas.set(chave, lista);
  return lista.length > maximo;
}

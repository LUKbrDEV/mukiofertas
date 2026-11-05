"use client";

// Lista de desejos de quem está logado (tabela desejos, supabase-desejos.sql).
// Salve como lib/desejos.js. Usado pelo BotaoDesejo (coração), pelo ícone do topo e pela página /desejos.
// Busca a lista UMA vez por página e avisa todos os corações quando algo muda.

import { supabase } from "./supabase";

let ids = null; // Set com os ids das ofertas salvas (null = ainda não carregou)
let carregando = null;
let usuarioId = null;
const ouvintes = new Set();

function avisar() {
  for (const fn of ouvintes) fn(ids);
}

export function ouvirDesejos(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export async function carregarDesejos() {
  if (ids) return ids;
  if (carregando) return carregando;
  carregando = (async () => {
    const { data: sessao } = await supabase.auth.getSession();
    usuarioId = sessao?.session?.user?.id ?? null;
    if (!usuarioId) {
      ids = new Set();
    } else {
      const { data, error } = await supabase.from("desejos").select("oferta_id").limit(1000);
      ids = new Set(error ? [] : (data ?? []).map((d) => Number(d.oferta_id)));
    }
    carregando = null;
    avisar();
    return ids;
  })();
  return carregando;
}

// Entrou ou saiu da conta: recarrega a lista
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_e, sessao) => {
    const novo = sessao?.user?.id ?? null;
    if (novo !== usuarioId) {
      ids = null;
      carregarDesejos();
    }
  });
}

export function estaLogado() {
  return Boolean(usuarioId);
}

// Salva ou tira do coração. Devolve true se ficou salvo.
// Sem login devolve null (quem chamou manda a pessoa para /entrar).
export async function alternarDesejo(ofertaId) {
  await carregarDesejos();
  if (!usuarioId) return null;
  const id = Number(ofertaId);
  const salvo = ids.has(id);

  // Muda na hora e desfaz se o banco recusar
  if (salvo) ids.delete(id);
  else ids.add(id);
  ids = new Set(ids);
  avisar();

  const { error } = salvo
    ? await supabase.from("desejos").delete().eq("oferta_id", id)
    : await supabase.from("desejos").insert({ user_id: usuarioId, oferta_id: id });
  if (error) {
    if (salvo) ids.add(id);
    else ids.delete(id);
    ids = new Set(ids);
    avisar();
    console.warn("[desejos]", error.message);
    return salvo;
  }
  return !salvo;
}

import { DIAS_NO_SITE, DIAS_EXPIRADA_VISIVEL } from "./prazos.mjs";

const DIA_MS = 24 * 60 * 60 * 1000;

// Apaga as ofertas que já ficaram expiradas por mais de DIAS_EXPIRADA_VISIVEL dias.
// Uma oferta conta como expirada quando passou de "expires_at" ou de DIAS_NO_SITE dias
// desde a publicação, e a regra abaixo apaga só depois de os dois prazos terem passado.
export async function limparExpiradas(supabase, { simular = false } = {}) {
  const agora = Date.now();
  const cortePorExpiracao = new Date(agora - DIAS_EXPIRADA_VISIVEL * DIA_MS).toISOString();
  const cortePorPublicacao = new Date(
    agora - (DIAS_NO_SITE + DIAS_EXPIRADA_VISIVEL) * DIA_MS
  ).toISOString();

  const { data, error } = await supabase
    .from("ofertas")
    .select("id, loja, id_externo, titulo")
    .eq("ativa", true) // ofertas escondidas ou aguardando revisão não são mexidas
    .or(`expires_at.lt.${cortePorExpiracao},publicada_em.lt.${cortePorPublicacao}`)
    .limit(2000);

  if (error) {
    console.error("Erro ao buscar ofertas para apagar:", error.message);
    return { total: 0, itens: [] };
  }

  const itens = data ?? [];
  if (simular || itens.length === 0) return { total: itens.length, itens };

  // Guarda uma marca de cada oferta apagada, para o coletor não publicar a mesma de novo
  const marcas = itens
    .filter((o) => o.id_externo)
    .map((o) => ({ loja: o.loja, id_externo: o.id_externo }));
  if (marcas.length > 0) {
    const { error: erroMarcas } = await supabase
      .from("ofertas_removidas")
      .upsert(marcas, { onConflict: "loja,id_externo" });
    if (erroMarcas) {
      console.error(
        "Erro ao guardar as marcas (a tabela ofertas_removidas existe?). Nada foi apagado:",
        erroMarcas.message
      );
      return { total: 0, itens: [] };
    }
  }

  let apagadas = 0;
  for (let i = 0; i < itens.length; i += 100) {
    const ids = itens.slice(i, i + 100).map((o) => o.id);
    const { error: erroApagar } = await supabase.from("ofertas").delete().in("id", ids);
    if (erroApagar) console.error("Erro ao apagar ofertas:", erroApagar.message);
    else apagadas += ids.length;
  }

  // Limpa as marcas muito antigas (60 dias)
  await supabase
    .from("ofertas_removidas")
    .delete()
    .lt("removida_em", new Date(agora - 60 * DIA_MS).toISOString());

  return { total: apagadas, itens };
}
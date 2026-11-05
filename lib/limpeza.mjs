import { DIAS_EXPIRADA_VISIVEL } from "./prazos.mjs";

const DIA_MS = 24 * 60 * 60 * 1000;

// As ofertas expiradas NÃO são mais apagadas do banco.
// Depois de DIAS_EXPIRADA_VISIVEL dias expiradas, elas saem das listas do site (lib/ofertas.js faz
// esse filtro pela data), mas a página /oferta/[id] continua funcionando, com o aviso "Expirado" e
// ofertas parecidas que estão no ar. Assim os links compartilhados no WhatsApp, no Telegram e no
// Google não quebram, os comentários ficam guardados e, se a mesma oferta voltar, ela volta na
// mesma página (veja podeVoltar em lib/prazos.mjs).
//
// Esta função agora só conta quantas ofertas estão fora das listas e limpa as marcas antigas da
// tabela ofertas_removidas (do tempo em que as ofertas eram apagadas).
export async function limparExpiradas(supabase, { simular = false } = {}) {
  const agora = Date.now();
  const corte = new Date(agora - DIAS_EXPIRADA_VISIVEL * DIA_MS).toISOString();

  const { count, error } = await supabase
    .from("ofertas")
    .select("id", { count: "exact", head: true })
    .eq("ativa", true)
    .lt("expires_at", corte);
  if (error) console.error("Erro ao contar ofertas arquivadas:", error.message);

  if (!simular) {
    await supabase
      .from("ofertas_removidas")
      .delete()
      .lt("removida_em", new Date(agora - 60 * DIA_MS).toISOString());
  }

  return { total: 0, arquivadas: count ?? 0, itens: [] };
}

import { createClient } from "@supabase/supabase-js";
import { buscar as buscarLomadee } from "./fontes/lomadee.mjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DESCONTO_MINIMO = 20; // só publica acima de 20% de desconto
const DESCONTO_RELAMPAGO = 40; // acima disso, vira "relâmpago"
const DIAS_NO_SITE = 5; // depois desse tempo, a oferta fica como "Expirado" no site

// Lista das fontes ativas. Novas fontes entram aqui.
const fontes = [buscarLomadee];

// Classificação simples por palavras-chave (usada quando a fonte não informa a categoria)
const palavrasPorCategoria = {
  limpeza: ["detergente", "sabão", "sabao", "desinfetante", "amaciante", "limpeza"],
  tecnologia: ["notebook", "celular", "smartphone", "fone", "monitor", "teclado", "mouse", "tv", "ssd"],
  games: ["gamer", "console", "playstation", "xbox", "controle", "headset"],
  casa: ["air fryer", "panela", "liquidificador", "cafeteira", "aspirador"],
};

function classificar(titulo) {
  const t = titulo.toLowerCase();
  for (const [categoria, palavras] of Object.entries(palavrasPorCategoria)) {
    if (palavras.some((p) => t.includes(p))) return categoria;
  }
  return null; // sem categoria reconhecida: não publica
}

async function main() {
  const agora = new Date().toISOString();
  const limiteSite = new Date(Date.now() - DIAS_NO_SITE * 24 * 60 * 60 * 1000);
  let publicadas = 0;

  for (const buscar of fontes) {
    let itens = [];
    try {
      itens = await buscar();
    } catch (erro) {
      console.error("Falha em uma fonte:", erro.message);
      continue; // uma fonte quebrada não derruba as outras
    }

    const linhas = [];
    for (const item of itens) {
      if (!item.preco_antigo || item.preco_antigo <= item.preco_atual) continue;

      const desconto = ((item.preco_antigo - item.preco_atual) / item.preco_antigo) * 100;
      if (desconto < DESCONTO_MINIMO) continue;

      const categoria = item.categoria ?? classificar(item.titulo);
      if (!categoria) continue;

      linhas.push({
        ...item,
        categoria,
        relampago: desconto >= DESCONTO_RELAMPAGO,
        ativa: true,
        expires_at: item.expires_at ?? null, // se a oferta voltou, deixa de estar expirada
        origem: "automatica",
        atualizado_em: agora,
      });
    }

    // Não reativa ofertas que você ocultou no painel nem as que já passaram do prazo no site
    let paraGravar = linhas;
    if (linhas.length > 0) {
      const { data: existentes } = await supabase
        .from("ofertas")
        .select("id_externo, oculta_manual, publicada_em")
        .in("id_externo", linhas.map((l) => l.id_externo));
      const bloqueadas = new Set(
        (existentes ?? [])
          .filter(
            (o) => o.oculta_manual || (o.publicada_em && new Date(o.publicada_em) < limiteSite)
          )
          .map((o) => o.id_externo)
      );
      paraGravar = linhas.filter((l) => !bloqueadas.has(l.id_externo));
    }

    if (paraGravar.length > 0) {
      const { error } = await supabase
        .from("ofertas")
        .upsert(paraGravar, { onConflict: "loja,id_externo" });
      if (error) console.error("Erro ao gravar:", error.message);
      else publicadas += paraGravar.length;
    }
  }

  // Ofertas automáticas que não apareceram nas últimas 48h (provavelmente acabaram)
  // ficam marcadas como expiradas, em vez de saírem do site.
  // As cadastradas à mão no painel não expiram por aqui.
  const limite = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { error: erroExpirar } = await supabase
    .from("ofertas")
    .update({ expires_at: agora })
    .lt("atualizado_em", limite)
    .eq("origem", "automatica")
    .eq("ativa", true)
    .or(`expires_at.is.null,expires_at.gt.${agora}`);
  if (erroExpirar) console.error("Erro ao marcar ofertas como expiradas:", erroExpirar.message);

  console.log(`Coleta concluída: ${publicadas} ofertas publicadas/atualizadas.`);
}

main();
import { createClient } from "@supabase/supabase-js";
import { buscar as buscarTeste } from "./fontes/teste.mjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DESCONTO_MINIMO = 15;    // só publica acima de 15% de desconto
const DESCONTO_RELAMPAGO = 40; // acima disso, vira "relâmpago"

// Lista das fontes ativas. Novas fontes entram aqui.
const fontes = [buscarTeste];

// Classificação simples por palavras-chave
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
        atualizado_em: agora,
      });
    }

    if (linhas.length > 0) {
      const { error } = await supabase
        .from("ofertas")
        .upsert(linhas, { onConflict: "loja,id_externo" });
      if (error) console.error("Erro ao gravar:", error.message);
      else publicadas += linhas.length;
    }
  }

  // Desativa ofertas que não apareceram nas últimas 48h (provavelmente acabaram)
  const limite = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  await supabase.from("ofertas").update({ ativa: false }).lt("atualizado_em", limite);

  console.log(`Coleta concluída: ${publicadas} ofertas publicadas/atualizadas.`);
}

main();
import { createClient } from "@supabase/supabase-js";
import { buscar as buscarLomadee } from "./fontes/lomadee.mjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DESCONTO_MINIMO = 15; // só publica acima de 15% de desconto
const DESCONTO_RELAMPAGO = 40; // acima disso, vira "relâmpago"
const DIAS_NO_SITE = 5; // depois desse tempo, a oferta sai do site automaticamente

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

  // Desativa ofertas automáticas que não apareceram nas últimas 48h (provavelmente acabaram).
  // As cadastradas à mão no painel não expiram sozinhas.
  const limite = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("ofertas")
    .update({ ativa: false })
    .lt("atualizado_em", limite)
    .eq("origem", "automatica");

  // Tira do site, de qualquer origem, as ofertas publicadas há mais de DIAS_NO_SITE dias
  const { error: erroPrazo } = await supabase
    .from("ofertas")
    .update({ ativa: false })
    .eq("ativa", true)
    .lt("publicada_em", limiteSite.toISOString());
  if (erroPrazo) console.error("Erro ao aplicar o prazo das ofertas:", erroPrazo.message);

  console.log(`Coleta concluída: ${publicadas} ofertas publicadas/atualizadas.`);
}

main();

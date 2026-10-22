import { createClient } from "@supabase/supabase-js";

const BASE = "https://api.lomadee.com.br";
const CHAVE = process.env.LOMADEE_API_KEY?.trim();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Quanto mais termos, mais ofertas. Cada termo gasta 1 chamada da Lomadee.
const BUSCAS = [
  // tecnologia
  { termo: "notebook", categoria: "tecnologia" },
  { termo: "smartphone", categoria: "tecnologia" },
  { termo: "fone bluetooth", categoria: "tecnologia" },
  { termo: "smart tv", categoria: "tecnologia" },
  { termo: "monitor", categoria: "tecnologia" },
  { termo: "tablet", categoria: "tecnologia" },
  { termo: "ssd", categoria: "tecnologia" },
  { termo: "caixa de som", categoria: "tecnologia" },
  { termo: "smartwatch", categoria: "tecnologia" },
  // limpeza
  { termo: "detergente", categoria: "limpeza" },
  { termo: "desinfetante", categoria: "limpeza" },
  { termo: "sabão em pó", categoria: "limpeza" },
  { termo: "amaciante", categoria: "limpeza" },
  { termo: "água sanitária", categoria: "limpeza" },
  // casa
  { termo: "air fryer", categoria: "casa" },
  { termo: "liquidificador", categoria: "casa" },
  { termo: "cafeteira", categoria: "casa" },
  { termo: "aspirador", categoria: "casa" },
  { termo: "panela", categoria: "casa" },
  { termo: "ventilador", categoria: "casa" },
  // games
  { termo: "headset gamer", categoria: "games" },
  { termo: "controle", categoria: "games" },
  { termo: "console", categoria: "games" },
  { termo: "cadeira gamer", categoria: "games" },
  { termo: "teclado gamer", categoria: "games" },
];

const DESCONTO_MINIMO = 20;
const DESCONTO_MAXIMO = 70; // acima disso costuma ser erro de cadastro
const MAX_OFERTAS = 150; // total de ofertas atualizadas por execução
const MAX_LINKS_NOVOS = 40; // links de afiliado novos gerados por execução

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function chamar(caminho, opcoes = {}) {
  await esperar(1100); // respeita o limite de 60 chamadas por minuto
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...opcoes,
    headers: { "x-api-key": CHAVE, "Content-Type": "application/json" },
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${caminho.split("?")[0]}`);
  return resposta.json();
}

function nomeDaLoja(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Loja parceira";
  }
}

async function gerarLink(produto) {
  const canais = await chamar("/affiliate/shortener/url", {
    method: "POST",
    body: JSON.stringify({
      organizationId: produto.organizationId,
      type: "Custom",
      url: produto.url,
    }),
  });
  return canais.find((canal) => canal.shortUrls?.length)?.shortUrls[0] ?? null;
}

export async function buscar() {
  if (!CHAVE) {
    console.log("Lomadee: LOMADEE_API_KEY não configurada, fonte ignorada.");
    return [];
  }

  // 1) Procura produtos e guarda só os que têm desconto de verdade
  const candidatos = new Map();

  for (const { termo, categoria } of BUSCAS) {
    try {
      const { data = [] } = await chamar(
        `/affiliate/products?search=${encodeURIComponent(termo)}&limit=100&isAvailable=true`
      );

      for (const p of data) {
        const opcao = p.options?.find((o) => o.available && o.pricing?.length);
        if (!opcao) continue;

        const { price, listPrice } = opcao.pricing[0];
        if (!price || !listPrice || listPrice <= price) continue;

        const desconto = ((listPrice - price) / listPrice) * 100;
        if (desconto < DESCONTO_MINIMO || desconto > DESCONTO_MAXIMO) continue;

        const idExterno = `${p.organizationId}:${p.id}`;
        if (candidatos.has(idExterno)) continue;

        candidatos.set(idExterno, {
          idExterno,
          desconto,
          categoria,
          produto: p,
          preco: price / 100, // a API usa centavos
          precoAntigo: listPrice / 100,
        });
      }
    } catch (erro) {
      console.error(`Lomadee: busca "${termo}" falhou:`, erro.message);
    }
  }

  const melhores = [...candidatos.values()]
    .sort((a, b) => b.desconto - a.desconto)
    .slice(0, MAX_OFERTAS);

  // 2) Descobre quais já têm link de afiliado guardado (não gasta chamada)
  const linksConhecidos = new Map();
  if (melhores.length > 0) {
    const { data, error } = await supabase
      .from("ofertas")
      .select("id_externo, link")
      .in("id_externo", melhores.map((c) => c.idExterno));
    if (error) console.error("Lomadee: erro ao ler links existentes:", error.message);
    for (const linha of data ?? []) linksConhecidos.set(linha.id_externo, linha.link);
  }

  // 3) Monta as ofertas, gerando link só para as novas (até o limite)
  const ofertas = [];
  let linksNovos = 0;

  for (const c of melhores) {
    let link = linksConhecidos.get(c.idExterno);

    if (!link) {
      if (linksNovos >= MAX_LINKS_NOVOS) continue; // fica para a próxima execução
      try {
        link = await gerarLink(c.produto);
        linksNovos++;
      } catch (erro) {
        console.error(`Lomadee: sem link para "${c.produto.name}":`, erro.message);
        continue;
      }
    }
    if (!link) continue; // sem link de afiliado, não publica

    ofertas.push({
      loja: nomeDaLoja(c.produto.url),
      id_externo: c.idExterno,
      titulo: c.produto.name,
      categoria: c.categoria,
      preco_atual: c.preco,
      preco_antigo: c.precoAntigo,
      link,
      imagem: c.produto.images?.[0]?.url ?? null,
    });
  }

  console.log(`Lomadee: ${ofertas.length} ofertas (${linksNovos} com link novo).`);
  return ofertas;
}

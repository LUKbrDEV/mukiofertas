// Fonte de ofertas: Lomadee (API nova, https://api.lomadee.com.br)
// Salve como scripts/fontes/lomadee.mjs (substitui o atual). Usada pelo scripts/coletar.mjs.
//
// O que faz:
//   1) lista as marcas da Lomadee em que você está afiliado
//   2) busca os produtos disponíveis dessas marcas
//   3) fica só com os que têm desconto de verdade (preço "de" maior que o "por")
//   4) gera o seu link de afiliado (encurtado) para cada produto novo
//
// Variáveis (no .env.local e nos Secrets do GitHub):
//   LOMADEE_API_KEY   chave da Lomadee, com os escopos brands:read, products:read e shortener:write
//   LOMADEE_CANAL     (opcional) nome ou id do canal da Lomadee usado nos links. Ex.: MukiOfertas
//
// Para testar sem gravar nada no banco:
//   node --env-file=.env.local scripts/testar-lomadee.mjs

import { createClient } from "@supabase/supabase-js";

// ===== AJUSTES =====
const DESCONTO_MINIMO = 20; // % (o coletar também filtra por isso)
const MAX_PAGINAS_MARCAS = 5; // 20 marcas por página
const MAX_MARCAS = 20; // quantas marcas consultar por execução
const PAGINAS_POR_MARCA = 2; // 100 produtos por página
const MAX_LINKS_NOVOS = 25; // links de afiliado novos por execução (cada um é uma chamada à API)
const MDASC = "mukiofertas"; // identificador que vai no fim dos links (?mdasc=), para relatórios
const MAX_NOVOS_POR_MARCA = 4; // no máximo X ofertas novas da mesma loja por execução (variedade)
const PRECO_MINIMO = 5; // abaixo disso (R$) o preço é considerado erro da loja e a oferta é ignorada

// Lojas que você quer (deixe vazio para usar todas). Use o nome como aparece na Lomadee.
// Ex.: ["Shopee", "Magalu", "Casas Bahia", "Centauro"]
const SO_ESTAS_MARCAS = [];
// Lojas que você NÃO quer no site. Ex.: ["UP Kids"]
const MARCAS_BLOQUEADAS = [];
// ===================

const API = "https://api.lomadee.com.br";
const INTERVALO_MS = 1100; // a API aceita 60 chamadas por minuto
const PREFIXO_ID = "lmd-";

let ultimaChamada = 0;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function chamar(caminho, { metodo = "GET", corpo, tentativa = 1 } = {}) {
  const chave = process.env.LOMADEE_API_KEY;
  if (!chave) throw new Error("Falta LOMADEE_API_KEY");

  const espera = ultimaChamada + INTERVALO_MS - Date.now();
  if (espera > 0) await esperar(espera);
  ultimaChamada = Date.now();

  const res = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      "x-api-key": chave,
      Accept: "application/json",
      ...(corpo ? { "Content-Type": "application/json" } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  if (res.status === 429 && tentativa <= 3) {
    const segundos = Number(res.headers.get("retry-after")) || 30;
    console.warn(`[lomadee] Limite de chamadas atingido, esperando ${segundos}s...`);
    await esperar(segundos * 1000);
    return chamar(caminho, { metodo, corpo, tentativa: tentativa + 1 });
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detalhe = json?.message || json?.error || res.statusText;
    const dica =
      res.status === 401
        ? " (chave inválida)"
        : res.status === 403
          ? " (a chave não tem o escopo necessário: confira brands:read, products:read e shortener:write)"
          : "";
    throw new Error(`Lomadee ${metodo} ${caminho.split("?")[0]} -> ${res.status} ${detalhe}${dica}`);
  }
  return json;
}

const lista = (json) => (Array.isArray(json) ? json : json?.data ?? []);

// ---------- Marcas ----------
async function buscarMarcas() {
  const marcas = [];
  for (let pagina = 1; pagina <= MAX_PAGINAS_MARCAS; pagina++) {
    const json = await chamar(`/affiliate/brands?page=${pagina}&limit=20`);
    const itens = lista(json);
    marcas.push(...itens);
    const totalPaginas = json?.meta?.totalPages;
    if (itens.length < 20 || (totalPaginas && pagina >= totalPaginas)) break;
  }

  const nome = (m) => String(m.name || "").trim().toLowerCase();
  const so = SO_ESTAS_MARCAS.map((n) => n.toLowerCase());
  const bloqueadas = MARCAS_BLOQUEADAS.map((n) => n.toLowerCase());
  const escolhidas = marcas.filter(
    (m) => !bloqueadas.includes(nome(m)) && (so.length === 0 || so.includes(nome(m)))
  );

  // Marcas em que você pode gerar link (afiliado aprovado): têm algum canal com link
  const liberadas = escolhidas.filter((m) => (m.channels ?? []).some((c) => c.shortUrls?.length && !c.message));
  if (liberadas.length === 0 && escolhidas.length > 0) {
    console.warn("[lomadee] Nenhuma marca com link liberado encontrada; tentando todas as marcas.");
    return escolhidas.slice(0, MAX_MARCAS);
  }

  // As de maior comissão primeiro
  return liberadas
    .sort((a, b) => (b.commission?.value ?? 0) - (a.commission?.value ?? 0))
    .slice(0, MAX_MARCAS);
}

// ---------- Produtos ----------
function melhorPreco(produto) {
  let melhor = null;
  for (const opcao of produto.options ?? []) {
    if (opcao.available === false) continue;
    for (const p of opcao.pricing ?? []) {
      const atual = Number(p.price) / 100;
      const antigo = Number(p.listPrice) / 100;
      if (!atual || !antigo || antigo <= atual) continue;
      const desconto = ((antigo - atual) / antigo) * 100;
      if (!melhor || desconto > melhor.desconto) melhor = { atual, antigo, desconto, opcao };
    }
  }
  return melhor;
}

function primeiraImagem(produto, opcao) {
  return produto.images?.[0]?.url || opcao?.images?.[0]?.url || null;
}

async function buscarProdutosDaMarca(marca) {
  const encontrados = [];
  for (let pagina = 1; pagina <= PAGINAS_POR_MARCA; pagina++) {
    const json = await chamar(
      `/affiliate/products?organizationIds=${encodeURIComponent(marca.id)}&isAvailable=true&limit=100&page=${pagina}`
    );
    const itens = lista(json);
    for (const produto of itens) {
      if (produto.available === false || !produto.url || !produto.name) continue;
      const preco = melhorPreco(produto);
      if (!preco || preco.desconto < DESCONTO_MINIMO) continue;
      if (preco.atual < PRECO_MINIMO) continue; // preço errado na loja (ex.: R$ 0,36)
      encontrados.push({
        marca,
        produto,
        id_externo: `${PREFIXO_ID}${produto.id}`,
        titulo: String(produto.name).replace(/\s+/g, " ").trim().slice(0, 300),
        preco_atual: Math.round(preco.atual * 100) / 100,
        preco_antigo: Math.round(preco.antigo * 100) / 100,
        desconto: preco.desconto,
        imagem: primeiraImagem(produto, preco.opcao),
      });
    }
    if (itens.length < 100) break;
  }
  return encontrados;
}

// Mesmo produto em cores/tamanhos diferentes vira uma oferta só
const CORES =
  /\b(preto|preta|branco|branca|azul|cinza|grafite|vermelho|vermelha|verde|rosa|roxo|roxa|amarelo|amarela|laranja|marrom|bege|linho|nude|prata|dourado|dourada|caramelo|off white|vinho|marinho|chumbo|creme)\b/g;
function chaveDoModelo(marca, titulo) {
  const base = String(titulo)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ") // (Preto)
    .replace(/\bcor\s*:?\s*[a-z ]+?(?=\s-|$|,)/g, " ") // Cor Azul
    .replace(/\btamanho\s*:?\s*\S+/g, " ")
    .replace(CORES, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${String(marca).toLowerCase()}|${base}`;
}

// ---------- Link de afiliado ----------
function escolherCanal(canais) {
  const preferido = (process.env.LOMADEE_CANAL || "").trim().toLowerCase();
  const comLink = (canais ?? []).filter((c) => c.shortUrls?.length && !c.message);
  if (preferido) {
    const achado = comLink.find(
      (c) => c.id?.toLowerCase() === preferido || c.name?.toLowerCase() === preferido
    );
    if (achado) return achado;
  }
  return comLink[0] ?? null;
}

async function gerarLink(item) {
  const canais = await chamar("/affiliate/shortener/url", {
    metodo: "POST",
    corpo: { organizationId: item.marca.id, type: "Custom", url: item.produto.url, mdasc: MDASC },
  });
  const canal = escolherCanal(Array.isArray(canais) ? canais : canais?.data);
  return canal?.shortUrls?.[0] ?? null;
}

// ---------- Ofertas que já estão no banco (reaproveita link e data de publicação) ----------
async function buscarExistentes(ids) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mapa = new Map();
  if (!url || !chave || ids.length === 0) return mapa;

  const supabase = createClient(url, chave, { auth: { persistSession: false } });
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("ofertas")
      .select("id_externo, link, publicada_em")
      .in("id_externo", ids.slice(i, i + 200));
    if (error) {
      console.warn("[lomadee] Não consegui ler as ofertas existentes:", error.message);
      break;
    }
    for (const o of data ?? []) mapa.set(o.id_externo, o);
  }
  return mapa;
}

// ---------- Função usada pelo coletar.mjs ----------
export async function buscar() {
  const marcas = await buscarMarcas();
  console.log(`[lomadee] ${marcas.length} marcas consultadas: ${marcas.map((m) => m.name).join(", ")}`);

  let candidatos = [];
  for (const marca of marcas) {
    try {
      candidatos.push(...(await buscarProdutosDaMarca(marca)));
    } catch (erro) {
      console.warn(`[lomadee] Falha nos produtos de ${marca.name}: ${erro.message}`);
    }
  }

  // Remove repetidos (mesmo id ou mesmo modelo em outra cor) e coloca os maiores descontos primeiro
  const vistos = new Set();
  const modelos = new Set();
  candidatos = candidatos
    .sort((a, b) => b.desconto - a.desconto)
    .filter((c) => {
      const modelo = chaveDoModelo(c.marca.name, c.titulo);
      if (vistos.has(c.id_externo) || modelos.has(modelo)) return false;
      vistos.add(c.id_externo);
      modelos.add(modelo);
      return true;
    });
  console.log(`[lomadee] ${candidatos.length} produtos com ${DESCONTO_MINIMO}% ou mais de desconto.`);

  const existentes = await buscarExistentes(candidatos.map((c) => c.id_externo));
  const agora = new Date().toISOString();
  const itens = [];
  let linksNovos = 0;
  const novosPorMarca = new Map();

  for (const c of candidatos) {
    const existente = existentes.get(c.id_externo);
    let link = existente?.link ?? null;

    if (!link) {
      if (linksNovos >= MAX_LINKS_NOVOS) continue; // o resto fica para a próxima execução
      const daMarca = novosPorMarca.get(c.marca.name) ?? 0;
      if (daMarca >= MAX_NOVOS_POR_MARCA) continue; // variedade: as outras dessa loja ficam para depois
      novosPorMarca.set(c.marca.name, daMarca + 1);
      try {
        link = await gerarLink(c);
        linksNovos++;
      } catch (erro) {
        console.warn(`[lomadee] Sem link para "${c.titulo}": ${erro.message}`);
        continue;
      }
      if (!link) continue;
    }

    itens.push({
      loja: c.marca.name,
      id_externo: c.id_externo,
      titulo: c.titulo,
      preco_atual: c.preco_atual,
      preco_antigo: c.preco_antigo,
      link,
      imagem: c.imagem,
      // mantém a data original das ofertas que já estavam no site
      publicada_em: existente?.publicada_em ?? agora,
    });
  }

  console.log(`[lomadee] ${itens.length} ofertas prontas (${linksNovos} links novos gerados).`);
  return itens;
}

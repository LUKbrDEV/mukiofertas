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
import { classificar } from "../../lib/classificar.mjs";
import { descontoMinimoDa } from "../../lib/prazos.mjs";

// ===== AJUSTES =====
const DESCONTO_MINIMO = 20; // % só para o diagnóstico; na coleta vale o desconto por categoria (lib/prazos.mjs)
const MAX_PAGINAS_MARCAS = 20; // 20 marcas por página (lê até 400 lojas para achar as gigantes aceitas)
const MAX_MARCAS = 15; // quantas lojas consultar por execução (se houver mais, elas se revezam a cada 30 min)
const PAGINAS_POR_MARCA = 2; // 100 produtos por página
const MAX_LINKS_NOVOS = 60; // era 40 // links de afiliado novos por execução (cada um é uma chamada à API)
const MDASC = "mukiofertas"; // identificador que vai no fim dos links (?mdasc=), para relatórios
const MAX_NOVOS_POR_MARCA = 6; // era 4 // no máximo X ofertas novas da mesma loja por execução (variedade)
const PRECO_MINIMO = 5; // abaixo disso (R$) o preço é considerado erro da loja e a oferta é ignorada

// Só as GIGANTES conhecidas entram na busca (as outras lojas aceitas na Lomadee são ignoradas).
// O nome é comparado sem acento e sem maiúsculas, e vale também "Nome + algo" ("Samsung Brasil").
// Só entram as que você já tem aceitas (com link liberado); as outras desta lista são puladas.
// Para colocar ou tirar uma loja, é só mexer nesta lista. Deixe vazia para usar todas as aceitas.
const SO_ESTAS_MARCAS = [
  // Varejo geral
  "SHEIN", "Mary Kay", "Dyson", "Guess",
  "Magalu", "Magazine Luiza", "Casas Bahia", "Ponto", "Pontofrio", "Extra", "Americanas", "Submarino", "Shoptime",
  "Carrefour", "Fast Shop", "Walmart",
  // Tecnologia e eletro
  "Samsung", "Dell", "Lenovo", "Motorola", "LG", "Acer", "Asus", "Positivo", "Philips", "Xiaomi", "Apple",
  "Electrolux", "Brastemp", "Consul", "Mondial", "Britania", "Philco", "Arno", "Oster", "Multilaser",
  "Pichau", "Terabyte", "JBL", "Logitech", "Intelbras",
  // Esporte e moda
  "Netshoes", "Centauro", "Nike", "Adidas", "Puma", "Decathlon", "Dafiti", "Zattini", "Renner", "Riachuelo", "C&A",
  "Olympikus", "Havaianas",
  // Fitness, academia e suplementos
  "Under Armour", "Asics", "Mizuno", "Fila", "Lupo", "Live", "Alto Giro", "Track&Field", "Track Field",
  "Integralmedica", "Probiotica", "Dux Nutrition", "Black Skull", "Essential Nutrition", "Atlhetica",
  // Beleza e farmácia
  "O Boticario", "Boticario", "Natura", "Eudora", "Avon", "Sephora", "Epoca Cosmeticos", "Beleza na Web",
  "Drogasil", "Droga Raia", "Drogaria Sao Paulo", "Pague Menos", "Panvel", "Growth Supplements", "Max Titanium",
  // Pet
  "Petz", "Cobasi", "Petlove",
  // Casa, ferramentas e móveis
  "Leroy Merlin", "Tok&Stok", "Tok Stok", "MadeiraMadeira", "Mobly", "Camicado", "Tramontina", "Vonder", "WAP",
  // Brinquedos, livros e mercado
  "Ri Happy", "PBKids", "Estrela", "Saraiva", "Pao de Acucar",
];
// Lojas que entram SEMPRE, mesmo fora da lista acima (são buscadas pelo nome)
const MARCAS_PRIORITARIAS = ["Shopee"];
// Lojas que você NÃO quer no site. Ex.: ["UP Kids"]
const MARCAS_BLOQUEADAS = ["UP Kids", "Sofá na Caixa", "Amakha Paris","LITTLE DUCK", "Mundo Vem", "Vestis","Rovitex"];
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
  // sem acento, sem símbolo: "Época Cosméticos" = "epoca cosmeticos", "Tok&Stok" = "tok stok"
  const limpo = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const so = SO_ESTAS_MARCAS.map(limpo);
  const ehGigante = (m) => {
    const n = limpo(m.name);
    return so.some((g) => n === g || n.startsWith(`${g} `) || n.replace(/ /g, "") === g.replace(/ /g, ""));
  };
  const bloqueadas = MARCAS_BLOQUEADAS.map((n) => n.toLowerCase());
  const escolhidas = marcas.filter(
    (m) => !bloqueadas.some((b) => nome(m).includes(b)) && (so.length === 0 || ehGigante(m))
  );

  // Marcas em que você pode gerar link (afiliado aprovado): têm algum canal com link
  const liberadas = escolhidas.filter((m) => (m.channels ?? []).some((c) => c.shortUrls?.length && !c.message));
  if (liberadas.length === 0 && escolhidas.length > 0) {
    console.warn("[lomadee] Nenhuma marca com link liberado encontrada; tentando todas as marcas.");
    return escolhidas.slice(0, MAX_MARCAS);
  }

  // Lojas prioritárias: procuradas pelo nome, porque podem não estar nas primeiras páginas
  const prioritarias = [];
  for (const alvo of MARCAS_PRIORITARIAS) {
    let achada = escolhidas.find((m) => nome(m) === alvo.toLowerCase());
    if (!achada) {
      const json = await chamar(`/affiliate/brands?search=${encodeURIComponent(alvo)}&limit=20`);
      achada = lista(json).find((m) => nome(m) === alvo.toLowerCase()) ?? lista(json)[0];
    }
    if (achada && !bloqueadas.includes(nome(achada))) prioritarias.push(achada);
    else console.warn(`[lomadee] Loja prioritária "${alvo}" não encontrada na Lomadee.`);
  }

  // As prioritárias sempre entram; as outras gigantes se revezam a cada 30 min (todas são visitadas)
  const ids = new Set(prioritarias.map((m) => m.id));
  const outras = liberadas
    .filter((m) => !ids.has(m.id))
    .sort((a, b) => nome(a).localeCompare(nome(b)));
  const porVez = Math.max(1, MAX_MARCAS - prioritarias.length);
  const blocos = Math.max(1, Math.ceil(outras.length / porVez));
  const vez = Math.floor(Date.now() / (30 * 60 * 1000)) % blocos;
  const demais = outras.slice(vez * porVez, (vez + 1) * porVez);
  console.log(
    `[lomadee] ${outras.length} lojas gigantes aceitas: ${outras.map((m) => m.name).join(", ") || "nenhuma"}` +
      (blocos > 1 ? ` (esta execução: ${demais.map((m) => m.name).join(", ")})` : "")
  );
  return [...prioritarias, ...demais];
}

// ---------- Diagnóstico de uma loja (usado pelo testar-lomadee.mjs --marca "Nome") ----------
export async function diagnosticarMarca(alvo) {
  console.log(`\n=== Diagnóstico: ${alvo} ===`);
  const json = await chamar(`/affiliate/brands?search=${encodeURIComponent(alvo)}&limit=20`);
  const marcas = lista(json);
  if (marcas.length === 0) {
    console.log("Nenhuma loja com esse nome na Lomadee.");
    return;
  }
  const marca = marcas.find((m) => String(m.name).toLowerCase() === alvo.toLowerCase()) ?? marcas[0];
  console.log(`Loja: ${marca.name} (id ${marca.id}) | comissão: ${marca.commission?.value ?? "?"}%`);
  for (const c of marca.channels ?? []) {
    console.log(`  canal "${c.name}": ${c.shortUrls?.length ? "link liberado" : "sem link"}${c.message ? ` (${c.message})` : ""}`);
  }

  const prod = await chamar(
    `/affiliate/products?organizationIds=${encodeURIComponent(marca.id)}&isAvailable=true&limit=100&page=1`
  );
  const itens = lista(prod);
  console.log(`Produtos na API: ${prod?.count ?? itens.length} (lidos nesta página: ${itens.length})`);
  if (itens.length === 0) {
    console.log("A Lomadee não tem catálogo de produtos dessa loja na API (só campanhas/cupons).");
    return;
  }
  const divisor = descobrirDivisor(itens);
  let comDesconto = 0;
  let acimaDoMinimo = 0;
  for (const p of itens) {
    const preco = melhorPreco(p, divisor);
    if (preco) comDesconto++;
    if (preco && preco.desconto >= DESCONTO_MINIMO && preco.atual >= PRECO_MINIMO) acimaDoMinimo++;
  }
  console.log(`Preços em ${divisor === 1 ? "reais" : "centavos"} | com preço "de" maior que o "por": ${comDesconto} | com ${DESCONTO_MINIMO}% ou mais: ${acimaDoMinimo}`);
  for (const p of itens.slice(0, 3)) {
    const pr = p.options?.[0]?.pricing?.[0];
    console.log(`  exemplo: ${String(p.name).slice(0, 60)} | price=${pr?.price} listPrice=${pr?.listPrice}`);
  }
}

// ---------- Produtos ----------
function melhorPreco(produto, divisor) {
  let melhor = null;
  for (const opcao of produto.options ?? []) {
    if (opcao.available === false) continue;
    for (const p of opcao.pricing ?? []) {
      const atual = Number(p.price) / divisor;
      const antigo = Number(p.listPrice) / divisor;
      if (!atual || !antigo || antigo <= atual) continue;
      const desconto = ((antigo - atual) / antigo) * 100;
      if (!melhor || desconto > melhor.desconto) melhor = { atual, antigo, desconto, opcao };
    }
  }
  return melhor;
}

// A API deveria mandar os preços em centavos (12990 = R$ 129,90), mas algumas lojas mandam
// em reais (130 = R$ 130,00). Pela mediana dos preços da loja dá para saber qual é o caso:
// em centavos, a mediana de uma loja quase nunca fica abaixo de 1000 (R$ 10).
function descobrirDivisor(produtos) {
  const valores = [];
  for (const produto of produtos) {
    for (const opcao of produto.options ?? []) {
      for (const p of opcao.pricing ?? []) {
        const v = Number(p.price);
        if (v > 0) valores.push(v);
      }
    }
  }
  if (valores.length === 0) return 100;
  if (valores.some((v) => !Number.isInteger(v))) return 1; // tem casas decimais: já está em reais
  valores.sort((a, b) => a - b);
  const mediana = valores[Math.floor(valores.length / 2)];
  return mediana < 1000 ? 1 : 100;
}

function primeiraImagem(produto, opcao) {
  return produto.images?.[0]?.url || opcao?.images?.[0]?.url || null;
}

async function buscarProdutosDaMarca(marca) {
  const produtos = [];
  for (let pagina = 1; pagina <= PAGINAS_POR_MARCA; pagina++) {
    const json = await chamar(
      `/affiliate/products?organizationIds=${encodeURIComponent(marca.id)}&isAvailable=true&limit=100&page=${pagina}`
    );
    const itens = lista(json);
    produtos.push(...itens);
    if (itens.length < 100) break;
  }

  const divisor = descobrirDivisor(produtos);
  if (divisor === 1) console.log(`[lomadee] ${marca.name}: preços vêm em reais (corrigido).`);

  const encontrados = [];
  for (const produto of produtos) {
    if (produto.available === false || !produto.url || !produto.name) continue;
    const preco = melhorPreco(produto, divisor);
    if (!preco) continue;
    // tecnologia aceita desconto menor (TV, monitor, notebook, celular, hardware)
    const categoria = classificar(produto.name, marca.name);
    if (preco.desconto < descontoMinimoDa(categoria)) continue;
    if (preco.atual < PRECO_MINIMO) continue; // preço errado na loja
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
  console.log(`[lomadee] ${candidatos.length} produtos com desconto suficiente.`);

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

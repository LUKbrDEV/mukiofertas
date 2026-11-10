// Gera o vídeo vertical (1080x1920) de divulgação do MukiOfertas.
//
//   node gerar.mjs              -> ofertas reais do Supabase + roteiro novo (Gemini) + voz da ElevenLabs
//   node gerar.mjs --enviar     -> igual, e manda o vídeo pronto no seu Telegram (VIDEO_TELEGRAM_CHAT_ID)
//   node gerar.mjs --sem-voz    -> sem narração (tempos estimados), para ver o visual
//   node gerar.mjs --teste      -> ofertas de exemplo (não acessa o Supabase)
//   node gerar.mjs --reserva    -> não usa o Gemini (usa um dos roteiros prontos)
//   node gerar.mjs --id=123     -> usa uma oferta específica como destaque
//   node gerar.mjs --id=123 --roteiro=roteiros/ps5-economia.json -> roteiro escrito à mão (só as cenas listadas nele)
//
// O vídeo sai em video-social/saida/ junto com um .txt com o texto para a publicação.
// O arquivo saida/historico.json guarda as ofertas e ganchos já usados para não repetir.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { carregarEnv } from "./lib/env.mjs";
import { buscarOfertas, tituloCurto } from "./lib/ofertas.mjs";
import { LOJAS_PADRAO, roteiroReserva, textoCompleto, temposDasCenas, temposEstimados } from "./lib/roteiro.mjs";
import { escreverRoteiro } from "./lib/ia-roteiro.mjs";
import { gerarVoz } from "./lib/voz.mjs";
import { renderizar, quadros } from "./lib/render.mjs";
import { enviarVideoTelegram } from "./lib/telegram.mjs";

const PASTA = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(PASTA, "saida");
const HISTORICO = path.join(SAIDA, "historico.json");
const DIAS_SEM_REPETIR = 7;
const VIDEOS_GUARDADOS = 9; // apaga os mais antigos da pasta saida

const arg = (n) => process.argv.find((a) => a === `--${n}` || a.startsWith(`--${n}=`));
const valor = (n) => arg(n)?.split("=")[1];

const OFERTAS_TESTE = [
  { id: "t1", loja: "Amazon", titulo: "Fone de Ouvido Bluetooth JBL Tune 520BT Preto", categoria: "audio", preco_atual: 199.9, preco_antigo: 349.9, cupom: "MUKI10", emoji: "🎧" },
  { id: "t2", loja: "Mercado Livre", titulo: "Air Fryer Mondial 4L Family Inox", categoria: "eletrodomesticos", preco_atual: 279.9, preco_antigo: 459.9, emoji: "🍟" },
  { id: "t3", loja: "Shopee", titulo: "Tênis de Corrida Masculino Leve Respirável", categoria: "tenis", preco_atual: 89.9, preco_antigo: 179.9, emoji: "👟" },
  { id: "t4", loja: "Magalu", titulo: "Smart TV 50\" 4K UHD LG ThinQ AI", categoria: "tv", preco_atual: 2199, preco_antigo: 2899, emoji: "📺" },
  { id: "t5", loja: "Amazon", titulo: "Kindle 16GB Tela Antirreflexo", categoria: "eletronicos", preco_atual: 499, preco_antigo: 649, emoji: "📖" },
].map((o) => ({ ...o, titulo_curto: tituloCurto(o.titulo), imagem: null }));

function lerHistorico() {
  try { return JSON.parse(fs.readFileSync(HISTORICO, "utf8")); } catch { return { ofertas: {}, ganchos: [], videos: [] }; }
}
function salvarHistorico(h) {
  const limite = Date.now() - DIAS_SEM_REPETIR * 86400000;
  for (const [id, quando] of Object.entries(h.ofertas)) if (quando < limite) delete h.ofertas[id];
  h.ganchos = h.ganchos.slice(-15);
  h.videos = h.videos.slice(-60);
  fs.writeFileSync(HISTORICO, JSON.stringify(h, null, 2));
}
const hojeBR = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

// lojas que aparecem na tela: as das ofertas do vídeo, completando com as grandes
function lojasDoVideo(ofertas) {
  const lojas = [...new Set(ofertas.map((o) => o.loja).filter(Boolean))];
  for (const l of LOJAS_PADRAO) if (lojas.length < 4 && !lojas.includes(l)) lojas.push(l);
  return lojas.slice(0, 5);
}

function limparSaida() {
  const mp4 = fs.readdirSync(SAIDA).filter((f) => f.endsWith(".mp4")).sort();
  for (const f of mp4.slice(0, Math.max(0, mp4.length - VIDEOS_GUARDADOS))) {
    const base = f.replace(/\.mp4$/, "");
    for (const ext of [".mp4", ".mp3", ".json", ".txt"]) fs.rmSync(path.join(SAIDA, base + ext), { force: true });
  }
}

async function main() {
  const lidos = carregarEnv(PASTA);
  console.log(`Variáveis lidas de: ${lidos.join(", ") || "(nenhum arquivo .env encontrado)"}`);
  fs.mkdirSync(SAIDA, { recursive: true });
  const historico = lerHistorico();
  const numero = Number(valor("numero")) || historico.videos.filter((v) => v.dia === hojeBR()).length + 1;
  const carimbo = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  const base = path.join(SAIDA, `mukiofertas-${carimbo}`);
  console.log(`Vídeo nº ${numero} de hoje`);

  // 1. ofertas
  console.log("1/5 Buscando ofertas...");
  const ofertas = valor("ofertas-json") // (para testes) ofertas de um arquivo JSON
    ? JSON.parse(fs.readFileSync(path.resolve(PASTA, valor("ofertas-json")), "utf8")).map((o) => ({ ...o, titulo_curto: tituloCurto(o.titulo) }))
    : arg("teste")
    ? OFERTAS_TESTE
    : await buscarOfertas({ quantidade: 5, id: valor("id"), excluir: new Set(Object.keys(historico.ofertas)) });
  console.log(`    destaque: ${ofertas[0].titulo} (R$ ${ofertas[0].preco_atual})`);
  const lojas = lojasDoVideo(ofertas);

  // 2. roteiro
  console.log("2/5 Escrevendo o roteiro...");
  const roteiro = valor("roteiro")
    ? { origem: "manual", ...JSON.parse(fs.readFileSync(path.resolve(PASTA, valor("roteiro")), "utf8")) }
    : arg("reserva")
      ? { origem: "reserva", ...roteiroReserva(numero, ofertas[0]) }
      : await escreverRoteiro({ ofertas, lojas, numero, evitar: historico.ganchos });
  console.log(`    gancho: "${roteiro.cenas[0].fala}"`);

  // 3. voz
  let cenas, duracao, audio = null;
  if (arg("sem-voz")) {
    console.log("3/5 Sem voz: estimando tempos das cenas...");
    ({ cenas, duracao } = temposEstimados(roteiro.cenas));
  } else {
    console.log("3/5 Gerando narração na ElevenLabs...");
    const { texto } = textoCompleto(roteiro.cenas);
    audio = `${base}.mp3`;
    const voz = await gerarVoz(texto, audio);
    cenas = temposDasCenas(roteiro.cenas, voz.alinhamento, voz.duracao);
    duracao = cenas[cenas.length - 1].fim;
    console.log(`    narração: ${voz.duracao.toFixed(1)}s`);
  }

  // dados do template
  const logo = `data:image/png;base64,${fs.readFileSync(path.join(PASTA, "..", "public", "logo-mukiofertas.png")).toString("base64")}`;
  const dados = { logo, lojas: roteiro.chips ?? lojas, ofertas, cenas, textos: { gancho_titulo: roteiro.gancho_titulo, cta: roteiro.cta, lojas_titulo: roteiro.lojas_titulo }, tema: roteiro.tema };
  fs.writeFileSync(`${base}.json`, JSON.stringify({ roteiro, cenas, ofertas: ofertas.map((o) => ({ ...o, imagem: o.imagem ? "(ok)" : null })) }, null, 2));

  if (arg("quadros")) {
    await quadros({ pasta: PASTA, dados, tempos: cenas.map((c) => (c.ini + c.fim) / 2 + 0.3), prefixo: base });
    console.log("Quadros salvos em", SAIDA);
    return;
  }

  // 4. render
  console.log(`4/5 Renderizando ${duracao.toFixed(1)}s de vídeo...`);
  const inicio = Date.now();
  const naTela = process.stdout.isTTY;
  await renderizar({
    pasta: PASTA, dados, duracao, audio, saida: `${base}.mp4`,
    aoProgresso: (q, total) => naTela && process.stdout.write(`\r    ${Math.round((q / total) * 100)}%`),
  });
  console.log(`${naTela ? "\r" : ""}    pronto em ${Math.round((Date.now() - inicio) / 1000)}s`);

  // 5. texto do post, histórico e envio
  const textoPost = roteiro.post || "As melhores promoções, de graça, no WhatsApp e no Telegram. Link na bio! #ofertas #promocao #mukiofertas";
  fs.writeFileSync(`${base}.txt`, textoPost + "\n");
  if (!arg("teste")) {
    for (const o of ofertas) historico.ofertas[String(o.id)] = Date.now();
    historico.ganchos.push(roteiro.cenas[0].legenda);
    historico.videos.push({ dia: hojeBR(), arquivo: path.basename(base) + ".mp4", roteiro: roteiro.origem });
    salvarHistorico(historico);
  }
  if (audio) fs.rmSync(audio, { force: true });

  if (arg("enviar")) {
    console.log("5/5 Enviando para o seu Telegram...");
    const ok = await enviarVideoTelegram({ arquivo: `${base}.mp4`, legenda: `🎬 Vídeo ${numero} de hoje — texto para o post:\n\n${textoPost}` });
    if (ok) console.log("    enviado!");
  }
  limparSaida();
  console.log(`Pronto: ${base}.mp4`);
}

main().catch((e) => {
  console.error("\nErro:", e.message);
  process.exit(1);
});

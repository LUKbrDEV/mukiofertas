// Coloca a marca d'água do MukiOfertas na foto do produto antes de enviar para o grupo do WhatsApp.
// Salve como lib/marca-dagua.mjs. Usado pelo scripts/postar-whatsapp.mjs.
//
// A marca d'água é o arquivo public/marca-dagua.png (PNG com fundo transparente).
// Para usar outra (ex.: um selo "ANÚNCIO" seu), é só trocar esse arquivo mantendo o nome.
//
// A foto vira um quadrado de 1000x1000 com fundo branco (o produto inteiro aparece) e a marca
// vai na posição, tamanho e transparência escolhidos no painel (Configurações → WhatsApp).
// Precisa do pacote sharp:  npm install sharp

import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const LADO = 1000; // tamanho final da foto (px)
const MARGEM = 0.04; // distância da borda (4% do lado)
const ARQUIVO = path.join(process.cwd(), "public", "marca-dagua.png");

const NAVEGADOR = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
};

let marcaCache = null;
async function marcaPronta(larguraPx, opacidade) {
  const chave = `${larguraPx}|${opacidade}`;
  if (marcaCache?.chave === chave) return marcaCache;
  const original = await readFile(ARQUIVO);
  let marca = sharp(original).ensureAlpha().resize({ width: larguraPx });
  if (opacidade < 1) {
    // deixa a marca mais transparente (multiplica o canal de transparência)
    marca = sharp(await marca.png().toBuffer()).composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(opacidade * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in",
      },
    ]);
  }
  const buffer = await marca.png().toBuffer();
  const { width, height } = await sharp(buffer).metadata();
  marcaCache = { chave, buffer, width, height };
  return marcaCache;
}

function posicaoDa(posicao, w, h) {
  const m = Math.round(LADO * MARGEM);
  const centroX = Math.round((LADO - w) / 2);
  switch (posicao) {
    case "baixo-direita":
      return { left: LADO - w - m, top: LADO - h - m };
    case "baixo-esquerda":
      return { left: m, top: LADO - h - m };
    case "topo-direita":
      return { left: LADO - w - m, top: m };
    case "topo":
      return { left: centroX, top: m };
    case "centro":
      return { left: centroX, top: Math.round((LADO - h) / 2) };
    default: // "baixo" (centralizada embaixo)
      return { left: centroX, top: LADO - h - m };
  }
}

// Devolve a foto com a marca d'água em base64 (JPEG), ou null se não conseguir
// (aí o robô envia a foto original ou só o texto).
export async function fotoComMarcaDagua(urlImagem, { posicao = "baixo", tamanho = 55, opacidade = 90 } = {}) {
  try {
    const r = await fetch(urlImagem, { headers: NAVEGADOR, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`a loja respondeu ${r.status}`);
    const original = Buffer.from(await r.arrayBuffer());

    const base = await sharp(original)
      .rotate() // respeita a orientação da foto
      .resize(LADO, LADO, { fit: "contain", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .toBuffer();

    const largura = Math.round((LADO * Math.min(95, Math.max(10, Number(tamanho) || 55))) / 100);
    const marca = await marcaPronta(largura, Math.min(1, Math.max(0.1, (Number(opacidade) || 90) / 100)));
    const { left, top } = posicaoDa(posicao, marca.width, marca.height);

    const final = await sharp(base)
      .composite([{ input: marca.buffer, left, top }])
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return final.toString("base64");
  } catch (e) {
    console.warn(`  marca d'água falhou (${e.message}); enviando a foto original`);
    return null;
  }
}

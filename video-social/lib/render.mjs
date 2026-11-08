// Renderiza o template.html quadro a quadro no Chromium (Playwright) e junta tudo com o FFmpeg.
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { chromium } from "playwright";

async function caminhoFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const m = await import("ffmpeg-static");
    if (m.default && fs.existsSync(m.default)) return m.default;
  } catch {}
  return "ffmpeg";
}

export async function renderizar({ pasta, dados, duracao, audio, saida, fps = 30, aoProgresso }) {
  const ffmpeg = await caminhoFfmpeg();
  const totalQuadros = Math.ceil(duracao * fps);

  const args = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-"];
  if (audio) args.push("-i", audio);
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(fps));
  if (audio) args.push("-c:a", "aac", "-b:a", "160k", "-af", "apad", "-t", duracao.toFixed(2));
  args.push("-movflags", "+faststart", saida);

  const proc = spawn(ffmpeg, args, { stdio: ["pipe", "inherit", "inherit"] });
  const terminou = new Promise((ok, erro) => {
    proc.on("error", (e) => erro(new Error(`Não consegui rodar o FFmpeg (${ffmpeg}): ${e.message}`)));
    proc.on("close", (c) => (c === 0 ? ok() : erro(new Error(`FFmpeg saiu com código ${c}`))));
  });

  // opções que economizam memória (a VPS tem só 1 GB)
  const navegador = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu", "--disable-extensions"] });
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await pagina.addInitScript((d) => { window.DADOS = d; }, dados);
    pagina.on("pageerror", (e) => console.error("  [template] erro:", e.message));
    await pagina.goto(pathToFileURL(path.join(pasta, "template.html")).href);
    await pagina.evaluate(() => window.pronto);

    for (let q = 0; q < totalQuadros; q++) {
      await pagina.evaluate((t) => window.seek(t), q / fps);
      const img = await pagina.screenshot({ type: "jpeg", quality: 92 });
      if (!proc.stdin.write(img)) await new Promise((r) => proc.stdin.once("drain", r));
      if (aoProgresso && q % fps === 0) aoProgresso(q, totalQuadros);
    }
  } finally {
    proc.stdin.end();
    await navegador.close();
  }
  await terminou;
}

// tira alguns quadros soltos (para conferir o visual rápido)
export async function quadros({ pasta, dados, tempos, prefixo }) {
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1920 } });
    await pagina.addInitScript((d) => { window.DADOS = d; }, dados);
    await pagina.goto(pathToFileURL(path.join(pasta, "template.html")).href);
    await pagina.evaluate(() => window.pronto);
    for (const t of tempos) {
      await pagina.evaluate((t) => window.seek(t), t);
      await pagina.screenshot({ path: `${prefixo}-${t.toFixed(1)}.jpg`, type: "jpeg", quality: 85 });
    }
  } finally {
    await navegador.close();
  }
}

// Executa os pedidos "Rodar agora" feitos pelo painel admin.
// Salve como scripts/executar-pedidos.mjs
//
// Roda NA VPS, pelo cron, a cada minuto:
//   * * * * * cd ~/mukiofertas-robo && node --env-file=.env.robo scripts/executar-pedidos.mjs >> ~/logs/robo-pedidos.log 2>&1
//
// Segurança: o painel só grava o id da tarefa (ex.: "coleta"). Os comandos ficam aqui, numa lista
// fixa. Qualquer outro id é recusado. Nenhuma porta da VPS fica aberta para a internet.

import { spawn } from "node:child_process";
import { openSync, closeSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { registrarExecucao } from "../lib/prazos.mjs";

const NODE = "node --env-file=.env.robo";
const COMANDOS = {
  coleta: "~/rodar-robo.sh coleta",
  mercadolivre: `${NODE} scripts/fila-mercadolivre.mjs`,
  precos: `${NODE} scripts/conferir-precos.mjs`,
  telegram: `${NODE} scripts/postar-telegram.mjs`,
  whatsapp: "~/rodar-robo.sh whatsapp",
  kabum: "~/rodar-robo.sh kabum",
  alertas: `${NODE} scripts/avisar-alertas.mjs`,
  leitor: "pm2 restart leitor-telegram",
  atualizar: "git pull && npm ci && pm2 restart leitor-telegram",
};

const PASTA = process.cwd(); // o cron entra em ~/mukiofertas-robo antes de rodar
const LIMITE_MIN = 20; // tarefa que passar disso é interrompida
const PEDIDO_VELHO_MIN = 15; // pedido que ficou parado mais que isso é cancelado (a VPS estava fora)
const MAX_POR_RODADA = 4;
const TRAVA = join(tmpdir(), "mukiofertas-pedidos.lock");

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Uma rodada por vez (se uma tarefa demora, a do minuto seguinte não começa outra junto)
function travar() {
  try {
    if (Date.now() - statSync(TRAVA).mtimeMs > (LIMITE_MIN + 5) * 60000) unlinkSync(TRAVA); // trava esquecida
  } catch {}
  try {
    closeSync(openSync(TRAVA, "wx"));
    return true;
  } catch {
    return false;
  }
}

function rodar(cmd) {
  return new Promise((resolve) => {
    let saida = "";
    const guardar = (b) => {
      saida = (saida + b.toString()).slice(-8000); // guarda só o final
    };
    const p = spawn("bash", ["-lc", cmd], { cwd: PASTA, env: process.env });
    p.stdout.on("data", guardar);
    p.stderr.on("data", guardar);
    const relogio = setTimeout(() => {
      guardar(`\n⏱️ Passou de ${LIMITE_MIN} min: tarefa interrompida.`);
      p.kill("SIGTERM");
    }, LIMITE_MIN * 60000);
    p.on("close", (codigo) => {
      clearTimeout(relogio);
      resolve({ ok: codigo === 0, saida: saida.trim() || "(sem saída)" });
    });
    p.on("error", (e) => {
      clearTimeout(relogio);
      resolve({ ok: false, saida: `Não consegui iniciar: ${e.message}` });
    });
  });
}

async function main() {
  if (!travar()) return console.log("Outra rodada ainda está trabalhando; fica para o próximo minuto.");
  let feitas = 0;
  try {
    // pedidos que ficaram esquecidos (VPS desligada, por exemplo)
    const velho = new Date(Date.now() - PEDIDO_VELHO_MIN * 60000).toISOString();
    await db
      .from("robo_pedidos")
      .update({ status: "cancelado", terminado_em: new Date().toISOString(), saida: `A VPS não pegou o pedido em ${PEDIDO_VELHO_MIN} min.` })
      .eq("status", "pendente")
      .lt("criado_em", velho);
    // "rodando" há muito tempo = a VPS reiniciou no meio
    await db
      .from("robo_pedidos")
      .update({ status: "erro", terminado_em: new Date().toISOString(), saida: "A tarefa foi interrompida (a VPS reiniciou no meio?)." })
      .eq("status", "rodando")
      .lt("iniciado_em", new Date(Date.now() - (LIMITE_MIN + 5) * 60000).toISOString());

    while (feitas < MAX_POR_RODADA) {
      const { data: pedido } = await db
        .from("robo_pedidos")
        .select("id, tarefa")
        .eq("status", "pendente")
        .order("criado_em")
        .limit(1)
        .maybeSingle();
      if (!pedido) break;

      // pega o pedido (só se ainda estiver pendente)
      const { data: pego } = await db
        .from("robo_pedidos")
        .update({ status: "rodando", iniciado_em: new Date().toISOString() })
        .eq("id", pedido.id)
        .eq("status", "pendente")
        .select("id")
        .maybeSingle();
      if (!pego) continue;

      const cmd = COMANDOS[pedido.tarefa];
      const r = cmd ? await rodar(cmd) : { ok: false, saida: `Tarefa desconhecida: ${pedido.tarefa}` };
      await db
        .from("robo_pedidos")
        .update({ status: r.ok ? "ok" : "erro", terminado_em: new Date().toISOString(), saida: r.saida })
        .eq("id", pedido.id);
      console.log(`${new Date().toISOString()} ${pedido.tarefa}: ${r.ok ? "ok" : "erro"}`);
      feitas++;
    }

    // sinal de vida (a cada 5 min, ou sempre que rodou algo) para o painel saber que a VPS está ouvindo
    if (feitas || new Date().getMinutes() % 5 === 0) {
      await registrarExecucao(db, "executar-pedidos", true, feitas ? `${feitas} pedido(s) do painel executado(s)` : "Ouvindo os pedidos do painel");
    }
  } finally {
    try {
      unlinkSync(TRAVA);
    } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

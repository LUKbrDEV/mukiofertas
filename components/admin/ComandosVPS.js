"use client";

// Aba "Comandos da VPS" do painel admin (antes ficava no fim da Saúde do robô).
// Salve como components/admin/ComandosVPS.js.
//
// O GitHub Actions está desligado: tudo roda na VPS da Oracle (pasta ~/mukiofertas-robo).
// Cada comando tem um botão Copiar: entre na VPS e cole.

import { useState } from "react";

const PASTA = "cd ~/mukiofertas-robo &&";
const NODE = `${PASTA} node --env-file=.env.robo`;

export const COMANDOS = [
  {
    grupo: "Ver o que está acontecendo",
    icone: "👀",
    itens: [
      { nome: "Agenda dos robôs (cron)", cmd: "crontab -l" },
      { nome: "Registro da coleta (coleta, preços, Telegram, alertas)", cmd: "tail -n 40 ~/logs/robo-coleta.log" },
      { nome: "Registro do WhatsApp", cmd: "tail -n 40 ~/logs/robo-whatsapp.log" },
      { nome: "Registro dos alertas de preço", cmd: "tail -n 40 ~/logs/robo-alertas.log" },
      { nome: "Leitor de canais: está ligado?", cmd: "pm2 status" },
      { nome: "Leitor de canais: registro", cmd: "pm2 logs leitor-telegram --lines 40" },
    ],
  },
  {
    grupo: "Rodar agora (sem esperar o horário)",
    icone: "▶️",
    itens: [
      { nome: "Coleta completa (coleta, preços, Telegram, alertas)", cmd: "~/rodar-robo.sh coleta" },
      { nome: "Postar no WhatsApp", cmd: "~/rodar-robo.sh whatsapp" },
      { nome: "Buscar ofertas da KaBuM!", cmd: "~/rodar-robo.sh kabum" },
      { nome: "Robô do Mercado Livre (publica e enche a fila)", cmd: `${NODE} scripts/fila-mercadolivre.mjs` },
      { nome: "Avisar os alertas de preço", cmd: `${NODE} scripts/avisar-alertas.mjs --detalhes` },
      { nome: "Só conferir preços", cmd: `${NODE} scripts/conferir-precos.mjs` },
      { nome: "Só postar no Telegram", cmd: `${NODE} scripts/postar-telegram.mjs` },
      { nome: "Reiniciar o leitor de canais", cmd: "pm2 restart leitor-telegram" },
    ],
  },
  {
    grupo: "Testar sem gravar nada",
    icone: "🧪",
    itens: [
      { nome: "Conferência de preços (só mostra)", cmd: `${NODE} scripts/conferir-precos.mjs --teste` },
      { nome: "Conferência: testa 4 ofertas de cada loja", cmd: `${NODE} scripts/conferir-precos.mjs --validar` },
      { nome: "Robô do Mercado Livre (só mostra)", cmd: `${NODE} scripts/fila-mercadolivre.mjs --teste` },
    ],
  },
  {
    grupo: "Chaves e atualização",
    icone: "🔑",
    itens: [
      { nome: "Atualizar o código agora (a coleta já faz git pull sozinha)", cmd: `${PASTA} git pull && npm ci && pm2 restart leitor-telegram` },
      { nome: "Guardar as chaves novas no robo.env (o robo-na-vps.sh copia ele por cima do .env.robo)", cmd: "cp ~/mukiofertas-robo/.env.robo ~/robo.env" },
    ],
  },
];

export default function ComandosVPS() {
  const [copiado, setCopiado] = useState("");
  const [busca, setBusca] = useState("");

  async function copiar(cmd) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiado(cmd);
      setTimeout(() => setCopiado(""), 1500);
    } catch {}
  }

  const termo = busca.trim().toLowerCase();
  const grupos = COMANDOS.map((g) => ({
    ...g,
    itens: g.itens.filter((c) => !termo || `${c.nome} ${c.cmd}`.toLowerCase().includes(termo)),
  })).filter((g) => g.itens.length);

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Comandos da VPS</h1>
          <p className="adm-sub">
            Os robôs rodam sozinhos na VPS da Oracle (coleta nos minutos 11 e 41 de cada hora, WhatsApp a cada 10 min,
            leitor de canais sempre ligado no pm2). Use estes comandos só para ver um erro ou rodar algo na hora.
          </p>
        </div>
      </div>

      <input
        className="adm-input adm3-busca"
        placeholder="Procurar comando (ex.: whatsapp, preços, mercado livre)"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      {grupos.length === 0 && <p className="adm-vazio">Nenhum comando com esse nome.</p>}

      <div className="adm3-grade-comandos">
        {grupos.map((g) => (
          <section key={g.grupo} className="adm-bloco">
            <h2>
              {g.icone} {g.grupo}
            </h2>
            <ul className="adm3-comandos">
              {g.itens.map((c) => (
                <li key={c.cmd}>
                  <div className="adm3-comando-texto">
                    <strong>{c.nome}</strong>
                    <code>{c.cmd}</code>
                  </div>
                  <button className="adm-btn" onClick={() => copiar(c.cmd)}>
                    {copiado === c.cmd ? "Copiado ✓" : "Copiar"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

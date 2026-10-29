"use client";

// Botões para rodar o robô agora + últimas execuções do GitHub Actions.
// Salve como components/admin/AcionarRobo.js (é usado dentro da aba Saúde do robô).

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ha, dataHora } from "./util";

const TAREFAS = [
  { id: "tudo", nome: "▶ Rodar tudo agora", dica: "Coleta, conferência de preços e postagem" },
  { id: "coletar", nome: "Coletar Lomadee e Shopee", dica: "Traz ofertas novas e atualiza as do robô" },
  { id: "conferir-precos", nome: "Conferir preços", dica: "Confere as ofertas do Telegram e manuais que já estão na hora" },
  { id: "postar-telegram", nome: "Postar no Telegram", dica: "Envia as ofertas que estão na fila" },
];

const NOME_TAREFA = Object.fromEntries(TAREFAS.map((t) => [t.id, t.nome.replace("▶ ", "")]));

function situacaoDaExecucao(e) {
  if (e.status !== "completed") return { texto: e.status === "queued" ? "Na fila" : "Rodando...", cor: "amarelo" };
  if (e.resultado === "success") return { texto: "Concluída", cor: "verde" };
  if (e.resultado === "cancelled") return { texto: "Cancelada", cor: "cinza" };
  return { texto: "Falhou", cor: "vermelho" };
}

async function chamar(metodo, corpo) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const r = await fetch("/api/admin/robo", {
    method: metodo,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
  });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, ...json };
}

export default function AcionarRobo({ aoTerminar }) {
  const [execucoes, setExecucoes] = useState([]);
  const [configurado, setConfigurado] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState("");
  const rodandoAntes = useRef(false);

  const carregar = useCallback(async () => {
    const r = await chamar("GET");
    if (r.configurado === false) {
      setConfigurado(false);
      return;
    }
    if (!r.ok) {
      setErro(r.erro || "Não foi possível falar com o GitHub.");
      return;
    }
    setErro("");
    setExecucoes(r.execucoes ?? []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Enquanto alguma execução estiver na fila ou rodando, atualiza a cada 10 segundos
  const rodando = execucoes.some((e) => e.status !== "completed");
  useEffect(() => {
    if (!rodando) {
      if (rodandoAntes.current && aoTerminar) aoTerminar(); // terminou: atualiza a tela
      rodandoAntes.current = false;
      return;
    }
    rodandoAntes.current = true;
    const t = setInterval(carregar, 10000);
    return () => clearInterval(t);
  }, [rodando, carregar, aoTerminar]);

  async function rodar(tarefa) {
    if (rodando && !confirm("Já tem uma execução na fila ou rodando. Colocar outra na fila mesmo assim?")) return;
    setEnviando(tarefa);
    setAviso("");
    const r = await chamar("POST", { tarefa });
    setEnviando("");
    if (!r.ok) {
      setErro(r.erro || "Não foi possível acionar o robô.");
      return;
    }
    setAviso(`"${NOME_TAREFA[tarefa]}" foi enviado. Leva uns 10 a 20 segundos para aparecer abaixo e 1 a 3 minutos para terminar.`);
    setTimeout(carregar, 4000);
    setTimeout(carregar, 12000);
  }

  if (!configurado) {
    return (
      <section className="adm-bloco">
        <h2>▶ Rodar o robô agora</h2>
        <p>
          Para acionar o robô por aqui, falta cadastrar na Vercel as variáveis <code>GITHUB_TOKEN_ROBO</code> e{" "}
          <code>GITHUB_REPO</code> (veja as instruções que vieram com este arquivo).
        </p>
      </section>
    );
  }

  return (
    <section className="adm-bloco">
      <div className="adm-titulo-linha">
        <h2>▶ Rodar o robô agora</h2>
        <button className="adm-btn" onClick={carregar}>
          ↻
        </button>
      </div>
      <p>O robô já roda sozinho a cada 30 minutos. Use estes botões quando não quiser esperar.</p>

      <div className="adm-robo-botoes">
        {TAREFAS.map((t) => (
          <button
            key={t.id}
            className={t.id === "tudo" ? "adm-btn adm-btn--primario" : "adm-btn"}
            title={t.dica}
            disabled={Boolean(enviando)}
            onClick={() => rodar(t.id)}
          >
            {enviando === t.id ? "Enviando..." : t.nome}
          </button>
        ))}
      </div>

      {aviso && <p className="adm-aviso">{aviso}</p>}
      {erro && <p className="adm-erro">{erro}</p>}

      <h2 className="adm-bloco-sub">Últimas execuções</h2>
      {execucoes.length === 0 ? (
        <p className="adm-vazio">Nenhuma execução encontrada.</p>
      ) : (
        <ul className="adm-execucoes">
          {execucoes.map((e) => {
            const s = situacaoDaExecucao(e);
            return (
              <li key={e.id}>
                <span className={`adm-exec-status adm-exec-status--${s.cor}`}>{s.texto}</span>
                <span className="adm-exec-info">
                  {e.evento === "schedule" ? "Automática (a cada 30 min)" : "Acionada manualmente"}
                  <small>
                    {dataHora(e.criado_em)} · {ha(e.criado_em)}
                  </small>
                </span>
                <a className="adm-btn" href={e.link} target="_blank" rel="noopener noreferrer">
                  Detalhes ↗
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

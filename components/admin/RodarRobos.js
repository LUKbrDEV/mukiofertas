"use client";

// Botões "Rodar agora" (aparecem no topo da Saúde do robô).
// Salve como components/admin/RodarRobos.js. Usa a rota app/api/admin/rodar/route.js.
//
// O botão cria um pedido; a VPS confere os pedidos a cada minuto, roda e devolve o resultado.
// Enquanto algum pedido está na fila ou rodando, a lista se atualiza sozinha a cada 5 segundos.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { TAREFAS_ROBO, tarefaPorId } from "../../lib/robo-tarefas.mjs";
import { ha, dataHora } from "./util";

const STATUS = {
  pendente: { texto: "Na fila", classe: "amarelo", icone: "⏳" },
  rodando: { texto: "Rodando", classe: "azul", icone: "⚙️" },
  ok: { texto: "Concluído", classe: "verde", icone: "✅" },
  erro: { texto: "Erro", classe: "vermelho", icone: "❌" },
  cancelado: { texto: "Cancelado", classe: "cinza", icone: "🚫" },
};

async function cabecalho() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token}`, "Content-Type": "application/json" };
}

function duracao(p) {
  if (!p.iniciado_em) return "";
  const fim = p.terminado_em ? new Date(p.terminado_em) : new Date();
  const s = Math.max(0, Math.round((fim - new Date(p.iniciado_em)) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`;
}

export default function RodarRobos() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState("");
  const [aberto, setAberto] = useState(null);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/admin/rodar", { headers: await cabecalho(), cache: "no-store" });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) return setErro(json.erro || "Não foi possível carregar os pedidos.");
    setErro("");
    setDados(json);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const ativos = (dados?.pedidos ?? []).filter((p) => p.status === "pendente" || p.status === "rodando");
  // atualiza sozinho enquanto tem pedido em andamento
  useEffect(() => {
    if (!ativos.length) return;
    const t = setInterval(carregar, 5000);
    return () => clearInterval(t);
  }, [ativos.length, carregar]);

  async function pedir(t) {
    if (t.pesada && !confirm(`Rodar agora: ${t.nome}?\n\n${t.descricao}\n\nPode levar alguns minutos.`)) return;
    setEnviando(t.id);
    const r = await fetch("/api/admin/rodar", { method: "POST", headers: await cabecalho(), body: JSON.stringify({ tarefa: t.id }) });
    const json = await r.json().catch(() => ({}));
    setEnviando("");
    if (!r.ok) return setErro(json.erro || "Não foi possível pedir.");
    await carregar();
  }

  const sinal = dados?.ouvindo?.ultima_execucao;
  const minutosSemSinal = sinal ? (Date.now() - new Date(sinal).getTime()) / 60000 : Infinity;
  const ouvindo = minutosSemSinal <= 10;

  return (
    <section className="adm-bloco adm3-rodar">
      <div className="adm-titulo-linha">
        <div>
          <h2>▶️ Rodar agora</h2>
          <p className="adm-legenda" style={{ margin: 0 }}>
            O pedido vai para a VPS e começa em até 1 minuto. Funciona de qualquer lugar, até do celular.
          </p>
        </div>
        <span className={`adm3-status adm3-status--${ouvindo ? "verde" : "vermelho"}`} title={sinal ? dataHora(sinal) : ""}>
          {ouvindo ? `VPS ouvindo · ${ha(sinal)}` : sinal ? `VPS sem sinal ${ha(sinal)}` : "VPS ainda não ouviu"}
        </span>
      </div>

      {erro && <p className="adm-aviso">{erro}</p>}
      {!ouvindo && dados && (
        <p className="adm-aviso">
          A VPS não está conferindo os pedidos. Instale o executor uma vez (aba <strong>Comandos da VPS</strong> →
          &quot;Ligar os botões do painel&quot;). Os pedidos ficam na fila por 15 min e depois são cancelados.
        </p>
      )}

      <div className="adm3-rodar-grade">
        {TAREFAS_ROBO.map((t) => {
          const andamento = ativos.find((p) => p.tarefa === t.id);
          return (
            <button
              key={t.id}
              className={andamento ? "adm3-rodar-botao adm3-rodar-botao--ativo" : "adm3-rodar-botao"}
              onClick={() => pedir(t)}
              disabled={Boolean(andamento) || enviando === t.id || !dados}
              title={t.descricao}
            >
              <span className="adm3-rodar-icone" aria-hidden="true">
                {t.icone}
              </span>
              <span>
                <strong>{t.nome}</strong>
                <small>{andamento ? STATUS[andamento.status].texto + "..." : t.descricao}</small>
              </span>
            </button>
          );
        })}
      </div>

      {dados?.pedidos?.length > 0 && (
        <>
          <h3 className="adm3-rodar-sub">Últimos pedidos</h3>
          <ul className="adm3-pedidos">
            {dados.pedidos.map((p) => {
              const s = STATUS[p.status] ?? STATUS.cancelado;
              const t = tarefaPorId(p.tarefa);
              return (
                <li key={p.id}>
                  <button className="adm3-pedido" onClick={() => setAberto(aberto === p.id ? null : p.id)} aria-expanded={aberto === p.id}>
                    <span className={`adm3-status adm3-status--${s.classe}`}>
                      {s.icone} {s.texto}
                    </span>
                    <strong>
                      {t?.icone} {t?.nome ?? p.tarefa}
                    </strong>
                    <small>
                      {ha(p.criado_em)} · {p.pedido_por}
                      {duracao(p) ? ` · ${duracao(p)}` : ""}
                    </small>
                    <span className="adm3-seta" aria-hidden="true">
                      {p.saida ? (aberto === p.id ? "▴" : "▾") : ""}
                    </span>
                  </button>
                  {aberto === p.id && p.saida && <pre className="adm3-saida">{p.saida}</pre>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

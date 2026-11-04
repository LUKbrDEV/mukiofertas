"use client";

// Ranking do mês na lateral da página inicial (top 5 por XP).
// Salve como components/RankingLateral.js.
// Lê a função ranking_mes do Supabase (criada pelo ranking.sql).

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import { SeloTag, ordenarTags } from "../data/tags";

const MEDALHAS = ["🥇", "🥈", "🥉"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const CSS = `
  .rk { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;
        box-shadow: 0 4px 16px rgba(15, 23, 42, .06); font-size: 13px; }
  .rk-topo { padding: 12px 14px 10px; color: #fff;
             background: linear-gradient(135deg, #0a4bb8 0%, #062a66 100%); }
  .rk-topo strong { display: block; font-size: 15px; font-weight: 800; }
  .rk-topo span { font-size: 11px; opacity: .8; }
  .rk-lista { list-style: none; margin: 0; padding: 6px 0; }
  .rk-item { display: grid; grid-template-columns: 22px 30px minmax(0, 1fr) auto; align-items: center;
             gap: 8px; padding: 7px 12px; }
  .rk-item + .rk-item { border-top: 1px solid #f1f5f9; }
  .rk-item--1 { background: linear-gradient(90deg, #fff8db, #fff 70%); }
  .rk-pos { text-align: center; font-weight: 800; color: #64748b; font-size: 13px; }
  .rk-pos--medalha { font-size: 17px; }
  .rk-info { min-width: 0; }
  .rk-nome { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
             font-weight: 700; color: #0f172a; }
  .rk-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2px; }
  .rk-xp { font-weight: 800; color: #ff7a1a; font-size: 12px; white-space: nowrap; text-align: right; }
  .rk-xp small { display: block; font-weight: 600; color: #94a3b8; font-size: 10px; }
  .rk-vazio { margin: 0; padding: 14px; color: #64748b; text-align: center; line-height: 1.4; }
  .rk-rodape { padding: 10px 12px 12px; border-top: 1px solid #f1f5f9; }
  .rk-botao { display: block; padding: 8px 10px; border-radius: 9px; background: #ff7a1a; color: #fff;
              font-weight: 800; text-align: center; text-decoration: none; font-size: 12.5px; }
  .rk-botao:hover { background: #f06a0a; }
  .rk-carregando { height: 36px; margin: 8px 12px; border-radius: 8px;
                   background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%;
                   animation: rk-brilho 1.2s linear infinite; }
  @keyframes rk-brilho { to { background-position: -200% 0; } }
`;

export default function RankingLateral({ limite = 5 }) {
  const [lista, setLista] = useState(null); // null = carregando
  const mes = MESES[new Date().getMonth()];

  useEffect(() => {
    let ativo = true;
    supabase.rpc("ranking_mes", { limite }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) console.warn("[ranking]", error.message);
      setLista(error ? [] : data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [limite]);

  return (
    <aside className="rk" aria-labelledby="rk-titulo">
      <style>{CSS}</style>
      <div className="rk-topo">
        <strong id="rk-titulo">🏆 Ranking de {mes}</strong>
        <span>Quem mais posta ofertas ganha XP</span>
      </div>

      {lista === null ? (
        <div aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rk-carregando" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="rk-vazio">Ninguém pontuou este mês ainda. Envie uma oferta e seja o primeiro!</p>
      ) : (
        <ol className="rk-lista">
          {lista.map((u) => {
            const tags = ordenarTags(u.tags ?? []).slice(0, 2);
            const usuario = {
              user_metadata: {
                nome: u.nome,
                avatar_url: u.avatar_url,
                avatar_icone: u.avatar_icone,
                avatar_cor: u.avatar_cor,
              },
            };
            return (
              <li key={u.posicao} className={`rk-item rk-item--${u.posicao}`}>
                <span className={`rk-pos${u.posicao <= 3 ? " rk-pos--medalha" : ""}`}>
                  {MEDALHAS[u.posicao - 1] ?? `${u.posicao}º`}
                </span>
                <Avatar usuario={usuario} tamanho={30} borda={false} />
                <span className="rk-info">
                  <span className="rk-nome" title={u.nome}>
                    {u.nome}
                  </span>
                  {tags.length > 0 && (
                    <span className="rk-tags">
                      {tags.map((t) => (
                        <SeloTag key={t} id={t} pequeno />
                      ))}
                    </span>
                  )}
                </span>
                <span className="rk-xp">
                  {u.xp} XP
                  <small>
                    {u.ofertas} {u.ofertas === 1 ? "oferta" : "ofertas"}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="rk-rodape">
        <Link href="/comunidade/enviar" className="rk-botao">
          ➕ Enviar oferta e ganhar XP
        </Link>
      </div>
    </aside>
  );
}

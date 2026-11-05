"use client";

// Rankings da lateral da página inicial:
//   🏆 Ranking do mês (top 5 por XP, zera todo dia 1)
//   👑 Os maiores de todos os tempos (top 5 somando todo o XP)
// Salve como components/RankingLateral.js.
// Lê as funções ranking_mes e ranking_geral do Supabase (ranking.sql e ranking-geral.sql).

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Avatar from "./Avatar";
import { SeloTag, ordenarTags } from "../data/tags";
import { PREMIOS } from "../data/premios";

const MEDALHAS = ["🥇", "🥈", "🥉"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const CSS_RANKING = `
  .rk-coluna { display: flex; flex-direction: column; gap: 12px; font-size: 13px; }
  .rk { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;
        box-shadow: 0 4px 16px rgba(15, 23, 42, .06); }
  .rk-topo { padding: 11px 14px 9px; color: #fff; background: linear-gradient(135deg, #0a4bb8 0%, #062a66 100%); }
  .rk-topo strong { display: block; font-size: 15px; font-weight: 800; }
  .rk-topo span { font-size: 11px; opacity: .8; }
  .rk--lenda .rk-topo { color: #3d2c00; background: linear-gradient(135deg, #ffe27a 0%, #f5b700 100%); }
  .rk--lenda .rk-topo span { opacity: .75; }
  .rk-lista { list-style: none; margin: 0; padding: 4px 0; }
  .rk-item { display: grid; grid-template-columns: 22px 28px minmax(0, 1fr) auto; align-items: center;
             gap: 8px; padding: 6px 12px; }
  .rk-item + .rk-item { border-top: 1px solid #f1f5f9; }
  .rk-item--1 { background: linear-gradient(90deg, #fff8db, #fff 70%); }
  .rk-pos { text-align: center; font-weight: 800; color: #64748b; font-size: 12px; }
  .rk-pos--medalha { font-size: 16px; }
  .rk-info { min-width: 0; }
  .rk-nome { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; color: #0f172a; text-decoration: none; }
  a.rk-nome:hover { color: #0a4bb8; text-decoration: underline; }
  .rk-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2px; }
  .rk-xp { font-weight: 800; color: #ff7a1a; font-size: 12px; white-space: nowrap; text-align: right; }
  .rk--lenda .rk-xp { color: #b07d00; }
  .rk-xp small { display: block; font-weight: 600; color: #94a3b8; font-size: 10px; }
  .rk-vazio { margin: 0; padding: 12px 14px; color: #64748b; text-align: center; line-height: 1.4; font-size: 12.5px; }
  .rk-carregando { height: 30px; margin: 8px 12px; border-radius: 8px;
                   background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9); background-size: 200% 100%;
                   animation: rk-brilho 1.2s linear infinite; }
  @keyframes rk-brilho { to { background-position: -200% 0; } }
  .rk-ver-todos { display: block; padding: 8px 12px 10px; font-size: 12px; font-weight: 800; color: #0a4bb8; text-align: center; text-decoration: none; border-top: 1px solid #f1f5f9; }
  .rk-ver-todos:hover { text-decoration: underline; }
  .rk-item--corte { box-shadow: inset 0 -2px 0 #ff7a1a; }
  .rk-premios { position: relative; overflow: hidden; padding: 12px 14px; border-radius: 14px; color: #fff;
                background: radial-gradient(120% 120% at 100% 0%, rgba(255, 122, 26, .45), transparent 60%), linear-gradient(135deg, #0b1530, #062a66); }
  .rk-premios strong { display: block; margin-bottom: 4px; font-size: 14px; }
  .rk-premios p { margin: 0 0 8px; font-size: 12.5px; line-height: 1.4; color: #e2e8f0; }
  .rk-premios ul { margin: 0 0 8px; padding-left: 16px; font-size: 12px; line-height: 1.5; }
  .rk-premios-dias { display: inline-block; margin-bottom: 8px; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255, .12);
                     font-size: 11.5px; font-weight: 700; }
  .rk-premios-link { display: block; padding: 8px 10px; border-radius: 9px; background: #ff7a1a; color: #fff; font-weight: 800;
                     font-size: 12.5px; text-align: center; text-decoration: none; }
  .rk-premios-link:hover { background: #f06a0a; }
  .rk-premios--completa { padding: 18px 20px; }
  .rk-premios--completa strong { font-size: 18px; }
  .rk-premios--completa p { font-size: 14px; }
  .rk-premios--completa ul { font-size: 14px; }
  .rk-premios-aviso { opacity: .85; }
  .rk-como { padding: 12px 14px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; color: #7c2d12; }
  .rk-como strong { display: block; margin-bottom: 4px; font-size: 13px; }
  .rk-como p { margin: 0 0 10px; font-size: 12px; line-height: 1.4; }
  .rk-regras { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 4px; }
  .rk-regras li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 8px;
                  border-radius: 8px; background: #fff; font-size: 12px; }
  .rk-regras b { flex: none; color: #ff7a1a; font-weight: 800; }
  .rk-botao { display: block; padding: 8px 10px; border-radius: 9px; background: #ff7a1a; color: #fff;
              font-weight: 800; text-align: center; text-decoration: none; font-size: 12.5px; }
  .rk-botao:hover { background: #f06a0a; }
`;

// Altura do cabeçalho que fica preso no topo ao rolar (para o ranking parar logo abaixo dele)
function alturaDoTopoFixo() {
  let fundo = 0;
  const candidatos = document.querySelectorAll("header, nav, [class*='cabecalho'], [class*='topo'], [class*='barra']");
  for (const el of candidatos) {
    const pos = getComputedStyle(el).position;
    if (pos !== "fixed" && pos !== "sticky") continue;
    const r = el.getBoundingClientRect();
    if (r.top <= 1 && r.bottom > fundo && r.height < window.innerHeight / 2) fundo = r.bottom;
  }
  return Math.round(fundo);
}

function useTopoFixo() {
  useEffect(() => {
    let quadro = 0;
    const medir = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() =>
        document.documentElement.style.setProperty("--mk-topo-fixo", `${alturaDoTopoFixo()}px`)
      );
    };
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);
}

export function useRanking(funcao, limite) {
  const [lista, setLista] = useState(null); // null = carregando
  useEffect(() => {
    let ativo = true;
    supabase.rpc(funcao, { limite }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) console.warn(`[ranking] ${funcao}:`, error.message);
      setLista(error ? [] : data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [funcao, limite]);
  return lista;
}

// Dias que faltam para o ranking do mês fechar (horário de Brasília)
export function diasParaFechar(agora = new Date()) {
  const brasilia = new Date(agora.getTime() - 3 * 3600000);
  const fim = Date.UTC(brasilia.getUTCFullYear(), brasilia.getUTCMonth() + 1, 1) + 3 * 3600000; // dia 1, 0h
  return Math.max(0, Math.ceil((fim - agora.getTime()) / 86400000));
}

// Caixa "🎁 Prêmios do mês" (textos em data/premios.js)
export function CaixaPremios({ completa = false }) {
  const [dias, setDias] = useState(null);
  useEffect(() => setDias(diasParaFechar()), []);
  if (!PREMIOS.ativo) return null;
  return (
    <div className={`rk-premios${completa ? " rk-premios--completa" : ""}`}>
      <strong>{PREMIOS.titulo}</strong>
      <p>{PREMIOS.chamada}</p>
      {PREMIOS.lista.length > 0 && (
        <ul>
          {PREMIOS.lista.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {dias !== null && (
        <span className="rk-premios-dias">
          ⏳ {dias <= 1 ? "Último dia" : `Faltam ${dias} dias`} para fechar o ranking de {MESES[new Date().getMonth()]}
        </span>
      )}
      {completa ? <p className="rk-premios-aviso">{PREMIOS.aviso}</p> : (
        <Link href="/ranking" className="rk-premios-link">
          Ver o Top {PREMIOS.top} e as regras →
        </Link>
      )}
    </div>
  );
}

export function Bloco({ id, titulo, subtitulo, lista, vazio, lenda = false, rodape = null, corte = 0 }) {
  return (
    <section className={`rk${lenda ? " rk--lenda" : ""}`} aria-labelledby={id}>
      <div className="rk-topo">
        <strong id={id}>{titulo}</strong>
        <span>{subtitulo}</span>
      </div>

      {lista === null ? (
        <div aria-hidden="true">
          <div className="rk-carregando" />
          <div className="rk-carregando" />
        </div>
      ) : lista.length === 0 ? (
        <p className="rk-vazio">{vazio}</p>
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
              <li key={u.posicao} className={`rk-item rk-item--${u.posicao}${corte && u.posicao === corte ? " rk-item--corte" : ""}`}>
                <span className={`rk-pos${u.posicao <= 3 ? " rk-pos--medalha" : ""}`}>
                  {lenda && u.posicao === 1 ? "👑" : MEDALHAS[u.posicao - 1] ?? `${u.posicao}º`}
                </span>
                <Avatar usuario={usuario} tamanho={28} borda={false} />
                <span className="rk-info">
                  {u.nome && u.nome !== "Membro Muki" ? (
                    <Link href={`/membro/${encodeURIComponent(u.nome)}`} className="rk-nome" title={`Ver o perfil de ${u.nome}`}>
                      {u.nome}
                    </Link>
                  ) : (
                    <span className="rk-nome" title={u.nome}>
                      {u.nome}
                    </span>
                  )}
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
                    {u.ofertas > 0 ? `${u.ofertas} ${u.ofertas === 1 ? "oferta" : "ofertas"}` : ""}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {rodape}
    </section>
  );
}

export default function RankingLateral({ limite = 5 }) {
  useTopoFixo();
  const doMes = useRanking("ranking_mes", limite);
  const geral = useRanking("ranking_geral", limite);
  const mes = MESES[new Date().getMonth()];

  return (
    <aside className="rk-coluna" aria-label="Ranking da comunidade">
      <style>{CSS_RANKING}</style>

      <Bloco
        id="rk-mes"
        titulo={`🏆 Ranking de ${mes}`}
        subtitulo="Poste, curta e comente para ganhar XP"
        lista={doMes}
        vazio="Ninguém pontuou este mês ainda. Seja o primeiro!"
        rodape={
          <Link href="/ranking" className="rk-ver-todos">
            Ver o Top {PREMIOS.top} completo →
          </Link>
        }
      />

      <CaixaPremios />

      <Bloco
        id="rk-geral"
        lenda
        titulo="👑 Hall da Fama"
        subtitulo="Os maiores de todos os tempos"
        lista={geral}
        vazio="O primeiro lugar da história ainda está vago."
      />

      <div className="rk-como">
        <strong>⚡ Como ganhar XP</strong>
        <ul className="rk-regras">
          <li>
            <span>📦 Oferta aprovada</span>
            <b>+10 XP</b>
          </li>
          <li>
            <span>👍 Curtir um produto</span>
            <b>+2 XP</b>
          </li>
          <li>
            <span>💬 Comentar em um produto</span>
            <b>+5 XP</b>
          </li>
        </ul>
        <p>Likes e comentários valem 1 vez por produto. Entre na sua conta para somar. O ranking do mês zera todo dia 1.</p>
        <Link href="/comunidade/enviar" className="rk-botao">
          ➕ Enviar oferta
        </Link>
      </div>
    </aside>
  );
}

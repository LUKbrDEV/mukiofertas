"use client";

// Página do ranking: Top 20 do mês (quem concorre aos prêmios), Hall da Fama, como ganhar XP e os prêmios.
// Salve como app/ranking/page.js. Os textos dos prêmios ficam em data/premios.js.

import Link from "next/link";
import { useRanking, Bloco, CaixaPremios, CSS_RANKING } from "../../components/RankingLateral";
import { PREMIOS } from "../../data/premios";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const CSS = `
  .rkp { margin: 18px 0 40px; }
  .rkp h1 { margin: 0 0 6px; font-size: 28px; color: #0f172a; }
  .rkp-sub { margin: 0 0 18px; color: #475569; max-width: 720px; line-height: 1.5; }
  .rkp-grade { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 18px; align-items: start; }
  .rkp-lado { display: grid; gap: 14px; }
  .rkp .rk-coluna { font-size: 14px; }
  .rkp .rk-item { padding: 8px 14px; }
  .rkp-regras { padding: 16px 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
  .rkp-regras h2 { margin: 0 0 10px; font-size: 17px; }
  .rkp-regras ul { margin: 0; padding-left: 18px; color: #334155; line-height: 1.7; font-size: 14px; }
  .rkp-botao { display: inline-flex; margin-top: 12px; padding: 10px 18px; border-radius: 999px; background: #ff7a1a; color: #fff;
               font-weight: 800; text-decoration: none; }
  .rkp-corte { margin: 0; padding: 8px 14px 12px; font-size: 12px; color: #9a3412; }
  @media (max-width: 860px) { .rkp-grade { grid-template-columns: 1fr; } }
`;

export default function PaginaRanking() {
  const top = PREMIOS.top || 20;
  const doMes = useRanking("ranking_mes", top);
  const geral = useRanking("ranking_geral", 10);
  const mes = MESES[new Date().getMonth()];

  return (
    <div className="rkp">
      <style>{CSS_RANKING + CSS}</style>
      <h1>🏆 Ranking da comunidade</h1>
      <p className="rkp-sub">
        Poste ofertas, curta e comente para ganhar XP. Quem terminar o mês no <strong>Top {top}</strong> concorre aos prêmios
        do mês. O ranking do mês zera todo dia 1.
      </p>

      <div className="rkp-grade">
        <div className="rk-coluna">
          <Bloco
            id="rkp-mes"
            titulo={`🏆 Top ${top} de ${mes}`}
            subtitulo={`Quem está aqui no fim do mês concorre aos prêmios`}
            lista={doMes}
            vazio="Ninguém pontuou este mês ainda. Seja o primeiro!"
            corte={top}
            rodape={
              doMes && doMes.length >= top ? (
                <p className="rkp-corte">A linha laranja marca o {top}º lugar: abaixo dela, ainda dá tempo de subir!</p>
              ) : (
                <p className="rkp-corte">Ainda tem vaga no Top {top}: qualquer XP este mês já coloca você na disputa.</p>
              )
            }
          />
        </div>

        <div className="rkp-lado">
          <div className="rk-coluna">
            <CaixaPremios completa />
          </div>

          <div className="rkp-regras">
            <h2>⚡ Como ganhar XP</h2>
            <ul>
              <li>📦 Oferta sua aprovada: <strong>+10 XP</strong></li>
              <li>👍 Curtir um produto: <strong>+2 XP</strong> (1 vez por produto)</li>
              <li>💬 Comentar em um produto: <strong>+5 XP</strong> (1 vez por produto)</li>
              <li>Precisa estar logado na sua conta para o XP contar.</li>
            </ul>
            <Link href="/comunidade/enviar" className="rkp-botao">
              ➕ Enviar uma oferta
            </Link>
          </div>

          <div className="rk-coluna">
            <Bloco
              id="rkp-geral"
              lenda
              titulo="👑 Hall da Fama"
              subtitulo="Os maiores de todos os tempos"
              lista={geral}
              vazio="O primeiro lugar da história ainda está vago."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

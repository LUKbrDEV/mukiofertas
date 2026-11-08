// Gráfico do histórico de preço, na página do produto. Salve como components/GraficoPreco.js.
// Desenhado em SVG puro (sem biblioteca). Recebe os pontos de lib/historico.js.

import { formatarPreco } from "../lib/ofertas";

const L = 640; // largura do desenho (o SVG estica para a largura da tela)
const A = 200; // altura
const M = { esq: 66, dir: 14, topo: 14, baixo: 28 };

const CSS = `
  .gp { margin-top: 22px; padding: 16px 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; }
  .gp h2 { margin: 0 0 4px; font-size: 18px; color: #0f172a; }
  .gp-sub { margin: 0 0 10px; color: #64748b; font-size: 13px; }
  .gp svg { display: block; width: 100%; height: auto; }
  .gp-linha { fill: none; stroke: #0a4bb8; stroke-width: 2.5; stroke-linejoin: round; }
  .gp-area { fill: #0a4bb8; opacity: .08; }
  .gp-grade { stroke: #e2e8f0; stroke-width: 1; }
  .gp-rotulo { fill: #64748b; font-size: 12px; }
  .gp-ponto { fill: #ff7a1a; stroke: #fff; stroke-width: 2; }
  .gp-resumo { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 10px 0 0; padding: 0; list-style: none; font-size: 13px; color: #334155; }
  .gp-resumo strong { color: #0f172a; }
`;

// Versão compacta, dentro do card de preço (prop compacto)
const CSS_MINI = `
  .gpm { margin-top: 12px; padding: 10px 12px 8px; background: rgba(255,255,255,.75); border: 1px solid #dbe4f0; border-radius: 12px; }
  .gpm-topo { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 12.5px; color: #475569; }
  .gpm-topo strong { color: #0f172a; font-size: 13px; }
  .gpm-status { font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
  .gpm-status.bom { color: #15803d; background: #dcfce7; }
  .gpm-status.neutro { color: #475569; background: #eef2f7; }
  .gpm-status.alto { color: #b45309; background: #fef3c7; }
  .gpm-grafico { position: relative; height: 46px; margin: 6px 0 4px; }
  .gpm-grafico svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .gpm-linha { fill: none; stroke: #0a4bb8; stroke-width: 2; stroke-linejoin: round; }
  .gpm-area { fill: #0a4bb8; opacity: .08; }
  .gpm-ponto { position: absolute; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%; background: #ff7a1a; box-shadow: 0 0 0 2px #fff; }
  .gpm-rodape { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: #64748b; }
  .gpm-rodape strong { color: #334155; }
`;

function GraficoMini({ pontos, precoAtual, resumo }) {
  const agora = Date.now();
  const atual = Number(precoAtual);
  const serie = [...pontos, { preco: atual, em: agora }];
  const t0 = serie[0].em;
  const t1 = Math.max(agora, t0 + 86400000);
  let yMin = resumo.menor;
  let yMax = resumo.maior;
  if (yMax - yMin < yMax * 0.05) {
    yMin = yMin * 0.95;
    yMax = yMax * 1.05;
  }
  const LW = 300, AH = 46;
  const x = (t) => ((t - t0) / (t1 - t0)) * LW;
  const y = (p) => 4 + (1 - (p - yMin) / (yMax - yMin || 1)) * (AH - 8);
  let d = `M ${x(serie[0].em).toFixed(1)} ${y(serie[0].preco).toFixed(1)}`;
  for (let i = 1; i < serie.length; i++) d += ` H ${x(serie[i].em).toFixed(1)} V ${y(serie[i].preco).toFixed(1)}`;
  const area = `${d} V ${AH} H 0 Z`;
  const dias = Math.max(1, Math.round(resumo.diasDeHistorico));

  let status, classe;
  if (resumo.maior - resumo.menor < 0.01) [status, classe] = ["Preço estável", "neutro"];
  else if (atual <= resumo.menor + 0.01) [status, classe] = ["📉 Menor preço registrado", "bom"];
  else if (atual >= resumo.maior - 0.01) [status, classe] = ["Maior preço registrado", "alto"];
  else [status, classe] = [`R$ ${(atual - resumo.menor).toFixed(2).replace(".", ",")} acima do menor`, "alto"];

  return (
    <div className="gpm" aria-label={`Histórico de preço: entre ${formatarPreco(resumo.menor)} e ${formatarPreco(resumo.maior)}`}>
      <style>{CSS_MINI}</style>
      <div className="gpm-topo">
        <span>
          <strong>Histórico de preço</strong> · {dias <= 1 ? "desde hoje" : `${dias} dias`}
        </span>
        <span className={`gpm-status ${classe}`}>{status}</span>
      </div>
      <div className="gpm-grafico">
        <svg viewBox={`0 0 ${LW} ${AH}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="gpm-area" d={area} />
          <path className="gpm-linha" d={d} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="gpm-ponto" style={{ left: `${(x(agora) / LW) * 100}%`, top: `${(y(atual) / AH) * 100}%` }} />
      </div>
      <div className="gpm-rodape">
        <span>
          Menor: <strong>{formatarPreco(resumo.menor)}</strong>
        </span>
        <span>
          Maior: <strong>{formatarPreco(resumo.maior)}</strong>
        </span>
      </div>
    </div>
  );
}

function dataCurta(ms) {
  return new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function GraficoPreco({ pontos, precoAtual, resumo, compacto = false }) {
  if (!pontos?.length || !resumo) return null;
  if (compacto) return <GraficoMini pontos={pontos} precoAtual={precoAtual} resumo={resumo} />;

  // O preço de agora fecha a linha no dia de hoje
  const agora = Date.now();
  const serie = [...pontos, { preco: Number(precoAtual), em: agora }];

  const t0 = serie[0].em;
  const t1 = Math.max(agora, t0 + 86400000);
  let yMin = resumo.menor;
  let yMax = resumo.maior;
  if (yMax - yMin < yMax * 0.05) {
    // preço quase parado: abre um pouco a escala para a linha não colar na borda
    yMin = yMin * 0.95;
    yMax = yMax * 1.05;
  }

  const x = (t) => M.esq + ((t - t0) / (t1 - t0)) * (L - M.esq - M.dir);
  const y = (p) => M.topo + (1 - (p - yMin) / (yMax - yMin || 1)) * (A - M.topo - M.baixo);

  // Linha em degraus: o preço vale até a próxima mudança
  let d = `M ${x(serie[0].em).toFixed(1)} ${y(serie[0].preco).toFixed(1)}`;
  for (let i = 1; i < serie.length; i++) {
    d += ` H ${x(serie[i].em).toFixed(1)} V ${y(serie[i].preco).toFixed(1)}`;
  }
  const base = A - M.baixo;
  const area = `${d} V ${base} H ${x(serie[0].em).toFixed(1)} Z`;

  const marcasY = [yMax, (yMax + yMin) / 2, yMin];
  const marcasX = [t0, t0 + (t1 - t0) / 2, t1];
  const dias = Math.max(1, Math.round(resumo.diasDeHistorico));

  return (
    <section className="gp" aria-labelledby="gp-titulo">
      <style>{CSS}</style>
      <h2 id="gp-titulo">Histórico de preço</h2>
      <p className="gp-sub">
        Preços que o MukiOfertas registrou {dias <= 1 ? "desde hoje" : `nos últimos ${dias} dias`}.
      </p>

      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={`Preço entre ${formatarPreco(resumo.menor)} e ${formatarPreco(resumo.maior)}`}>
        {marcasY.map((p, i) => (
          <g key={`y${i}`}>
            <line className="gp-grade" x1={M.esq} x2={L - M.dir} y1={y(p)} y2={y(p)} />
            <text className="gp-rotulo" x={M.esq - 8} y={y(p) + 4} textAnchor="end">
              {formatarPreco(p).replace(/,\d\d$/, "")}
            </text>
          </g>
        ))}
        {marcasX.map((t, i) => (
          <text
            key={`x${i}`}
            className="gp-rotulo"
            x={x(t)}
            y={A - 8}
            textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
          >
            {i === 2 ? "hoje" : dataCurta(t)}
          </text>
        ))}
        <path className="gp-area" d={area} />
        <path className="gp-linha" d={d} />
        <circle className="gp-ponto" cx={x(agora)} cy={y(Number(precoAtual))} r="5" />
      </svg>

      <ul className="gp-resumo">
        <li>
          Agora: <strong>{formatarPreco(precoAtual)}</strong>
        </li>
        <li>
          Menor: <strong>{formatarPreco(resumo.menor)}</strong>
        </li>
        <li>
          Maior: <strong>{formatarPreco(resumo.maior)}</strong>
        </li>
      </ul>
    </section>
  );
}

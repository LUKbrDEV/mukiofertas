"use client";

// Aba Saúde do robô do painel admin.
// Salve como components/admin/SaudeRobo.js.
//
// Mostra quando o robô rodou pela última vez, a fila do Telegram e as ofertas
// que merecem atenção (sem foto, em "Outras ofertas", preço estranho, repetidas).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { calcularDesconto, formatarPreco, estaExpirada } from "../../lib/ofertas";
import { HORAS_ENTRE_CONFERENCIAS } from "../../lib/prazos.mjs";
import { buscarTudo, ha, dataHora, tituloBase } from "./util";

// Link da página de execuções do GitHub Actions (opcional, no .env.local e na Vercel):
// NEXT_PUBLIC_GITHUB_ACTIONS_URL=https://github.com/SEU_USUARIO/SEU_REPOSITORIO/actions
const LINK_ACTIONS = process.env.NEXT_PUBLIC_GITHUB_ACTIONS_URL;

const HORA = 3600000;
// verde = em dia, amarelo = atrasado, vermelho = parado
function situacao(dataIso, horasOk, horasAlerta) {
  if (!dataIso) return "vermelho";
  const h = (Date.now() - new Date(dataIso).getTime()) / HORA;
  if (h <= horasOk) return "verde";
  if (h <= horasAlerta) return "amarelo";
  return "vermelho";
}

const TEXTO_SITUACAO = { verde: "Em dia", amarelo: "Atrasado", vermelho: "Parado" };

function Indicador({ titulo, quando, cor, detalhe, erro }) {
  const c = erro ? "vermelho" : cor;
  return (
    <div className={`adm-saude adm-saude--${c}`}>
      <div className="adm-saude-topo">
        <span className="adm-saude-luz" aria-hidden="true" />
        <strong>{titulo}</strong>
        <span className="adm-saude-status">{erro ? "Com erro" : TEXTO_SITUACAO[c]}</span>
      </div>
      <p className="adm-saude-quando">
        {ha(quando)} <small>{quando ? `(${dataHora(quando)})` : ""}</small>
      </p>
      {detalhe && <p className="adm-saude-detalhe">{detalhe}</p>}
    </div>
  );
}

function Alerta({ titulo, explicacao, itens, aoEditar, mostrar = 8 }) {
  const [aberto, setAberto] = useState(false);
  const lista = aberto ? itens : itens.slice(0, mostrar);
  return (
    <section className={itens.length ? "adm-bloco adm-alerta" : "adm-bloco adm-alerta adm-alerta--ok"}>
      <h2>
        {itens.length ? "⚠️" : "✅"} {titulo} <span className="adm-alerta-num">{itens.length}</span>
      </h2>
      <p>{explicacao}</p>
      {itens.length > 0 && (
        <ul className="adm-alerta-lista">
          {lista.map((o) => (
            <li key={o.id}>
              <span className="adm-ranking-titulo">
                {o.titulo}
                <small>
                  {o.loja} · {formatarPreco(o.preco_atual)}
                  {o.nota ? ` · ${o.nota}` : ""}
                </small>
              </span>
              <span className="adm-alerta-acoes">
                <a className="adm-btn" href={`/oferta/${o.id}`} target="_blank" rel="noopener noreferrer">
                  Ver ↗
                </a>
                {aoEditar && (
                  <button className="adm-btn" onClick={() => aoEditar(o)}>
                    Editar
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {itens.length > mostrar && (
        <button className="adm-btn adm-btn--link" onClick={() => setAberto((a) => !a)}>
          {aberto ? "Mostrar menos" : `Mostrar todas (${itens.length})`}
        </button>
      )}
    </section>
  );
}

export default function SaudeRobo({ aoEditar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    const [r, statusR] = await Promise.all([
      buscarTudo(() => supabase.from("ofertas").select("*").order("id")),
      supabase.from("robo_status").select("*"),
    ]);
    if (r.error) {
      setErro(`Não foi possível carregar as ofertas: ${r.error.message}`);
      return;
    }

    const ofertas = r.data;
    const noAr = ofertas.filter((o) => o.ativa && !estaExpirada(o));
    const maisRecente = (lista, campo) =>
      lista.reduce((m, o) => (o[campo] && (!m || o[campo] > m) ? o[campo] : m), null);

    const execucoes = new Map((statusR.data ?? []).map((s) => [s.script, s]));

    // Ofertas repetidas: mesma loja e mesmo título no ar
    const grupos = new Map();
    for (const o of noAr) {
      const chave = `${o.loja}|${tituloBase(o.titulo)}`;
      grupos.set(chave, [...(grupos.get(chave) ?? []), o]);
    }
    const repetidas = [...grupos.values()]
      .filter((g) => g.length > 1)
      .flatMap((g) => g.map((o) => ({ ...o, nota: `${g.length} iguais` })));

    const suspeitas = noAr
      .map((o) => {
        const d = calcularDesconto(o);
        if (Number(o.preco_atual) < 5) return { ...o, nota: "preço abaixo de R$ 5" };
        if (d >= 90) return { ...o, nota: `desconto de ${d}%` };
        return null;
      })
      .filter(Boolean);

    const limiteConferencia = HORAS_ENTRE_CONFERENCIAS * 3 * HORA;
    const semConferir = noAr
      .filter((o) => !/amazon|amzn|amaznlink/i.test(`${o.loja} ${o.link}`))
      .filter((o) => {
        const ultima = o.preco_conferido_em || o.publicada_em;
        return ultima && Date.now() - new Date(ultima).getTime() > limiteConferencia;
      })
      .map((o) => ({ ...o, nota: `conferido ${ha(o.preco_conferido_em || o.publicada_em)}` }));

    setDados({
      statusDisponivel: !statusR.error,
      coletar: execucoes.get("coletar"),
      conferir: execucoes.get("conferir-precos"),
      ultimaAutomatica: maisRecente(ofertas.filter((o) => (o.origem ?? "automatica") === "automatica"), "atualizado_em"),
      ultimaConferencia: maisRecente(ofertas, "preco_conferido_em"),
      ultimaTelegramImportada: maisRecente(ofertas.filter((o) => o.origem === "telegram"), "publicada_em"),
      ultimoPostTelegram: maisRecente(ofertas, "postada_telegram_em"),
      fila: noAr.filter((o) => !o.postada_telegram_em),
      semFoto: noAr.filter((o) => !o.imagem),
      outros: noAr.filter((o) => o.categoria === "outros" || !o.categoria),
      semPrecoAntigo: noAr.filter((o) => !o.preco_antigo || Number(o.preco_antigo) <= Number(o.preco_atual)),
      suspeitas,
      repetidas,
      semConferir,
    });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (erro) return <p className="adm-aviso">{erro}</p>;
  if (!dados) return <p className="adm-centro">Verificando o robô...</p>;

  const coletaQuando = dados.coletar?.ultima_execucao ?? dados.ultimaAutomatica;
  const conferirQuando = dados.conferir?.ultima_execucao ?? dados.ultimaConferencia;

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Saúde do robô</h1>
          <p className="adm-sub">O robô roda a cada 30 minutos pelo GitHub Actions.</p>
        </div>
        <div className="adm-acoes">
          {LINK_ACTIONS && (
            <a className="adm-btn" href={LINK_ACTIONS} target="_blank" rel="noopener noreferrer">
              Abrir o GitHub Actions ↗
            </a>
          )}
          <button className="adm-btn" onClick={carregar}>
            ↻ Atualizar
          </button>
        </div>
      </div>

      {!dados.statusDisponivel && (
        <p className="adm-aviso">
          O registro das execuções ainda não está ativo. Rode o arquivo admin-painel.sql no Supabase e suba
          os novos scripts do robô. Enquanto isso, os horários abaixo são estimados pelas ofertas.
        </p>
      )}

      <div className="adm-saude-grade">
        <Indicador
          titulo="Coleta da Lomadee"
          quando={coletaQuando}
          cor={situacao(coletaQuando, 1, 3)}
          erro={dados.coletar && !dados.coletar.ok}
          detalhe={dados.coletar?.resumo ?? "Última oferta do robô atualizada"}
        />
        <Indicador
          titulo="Conferência de preços"
          quando={conferirQuando}
          cor={situacao(conferirQuando, 1, 6)}
          erro={dados.conferir && !dados.conferir.ok}
          detalhe={dados.conferir?.resumo ?? `Cada oferta é conferida a cada ${HORAS_ENTRE_CONFERENCIAS}h`}
        />
        <Indicador
          titulo="Importação do Telegram"
          quando={dados.ultimaTelegramImportada}
          cor={situacao(dados.ultimaTelegramImportada, 12, 48)}
          detalhe="Última oferta que chegou do seu canal"
        />
        <Indicador
          titulo="Postagem no Telegram"
          quando={dados.ultimoPostTelegram}
          cor={situacao(dados.ultimoPostTelegram, 3, 12)}
          detalhe={`${dados.fila.length} ofertas no ar ainda não postadas (fila)`}
        />
      </div>

      <p className="adm-legenda">
        🟢 em dia · 🟡 atrasado · 🔴 parado ou com erro. Se ficar vermelho, abra o GitHub Actions e veja a
        última execução.
      </p>

      <h2 className="adm-secao">Ofertas que merecem atenção (só as que estão no ar)</h2>

      <div className="adm-duas">
        <Alerta
          titulo="Sem foto"
          explicacao="Aparecem sem imagem no site. Edite e cole o endereço da foto."
          itens={dados.semFoto}
          aoEditar={aoEditar}
        />
        <Alerta
          titulo='Em "Outras ofertas"'
          explicacao="O classificador não reconheceu a categoria. Mude a categoria na aba Ofertas."
          itens={dados.outros}
          aoEditar={aoEditar}
        />
        <Alerta
          titulo="Preço estranho"
          explicacao="Preço abaixo de R$ 5 ou desconto de 90% ou mais. Pode ser erro da loja."
          itens={dados.suspeitas}
          aoEditar={aoEditar}
        />
        <Alerta
          titulo="Repetidas"
          explicacao="Mesma loja e mesmo título no ar mais de uma vez. Oculte as sobrando."
          itens={dados.repetidas}
          aoEditar={aoEditar}
        />
        <Alerta
          titulo="Sem preço antigo"
          explicacao="Sem o preço 'de', a oferta aparece sem a tag de desconto."
          itens={dados.semPrecoAntigo}
          aoEditar={aoEditar}
        />
        <Alerta
          titulo="Preço sem conferir há muito tempo"
          explicacao={`Não conferidas há mais de ${HORAS_ENTRE_CONFERENCIAS * 3}h (a Amazon fica de fora de propósito). Normalmente é loja que bloqueia a leitura do preço.`}
          itens={dados.semConferir}
          aoEditar={aoEditar}
        />
      </div>
    </>
  );
}

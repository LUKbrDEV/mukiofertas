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
import AcionarRobo from "./AcionarRobo";
import ImportacaoTelegram from "./ImportacaoTelegram";

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

function Alerta({ titulo, explicacao, itens, aoEditar, acao, mostrar = 8 }) {
  const [aberto, setAberto] = useState(false);
  const lista = aberto ? itens : itens.slice(0, mostrar);
  return (
    <section className={itens.length ? "adm-bloco adm-alerta" : "adm-bloco adm-alerta adm-alerta--ok"}>
      <h2>
        {itens.length ? "⚠️" : "✅"} {titulo} <span className="adm-alerta-num">{itens.length}</span>
      </h2>
      <p>{explicacao}</p>
      {acao && itens.length > 0 && (
        <p>
          <button className="adm-btn adm-btn--primario" onClick={acao.aoClicar} disabled={acao.ocupado}>
            {acao.ocupado ? "Trabalhando..." : acao.nome}
          </button>
        </p>
      )}
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

// Ofertas que o painel pode apagar de vez. As do robô (Lomadee, Shopee, AliExpress, KaBuM!)
// são ocultadas, senão o robô coloca de volta na próxima coleta.
const APAGAVEIS = ["manual", "telegram", "comunidade"];

// Em cada grupo de repetidas, fica a de menor preço (empate: a mais recente)
function escolherQueFica(grupo) {
  return [...grupo].sort(
    (a, b) =>
      Number(a.preco_atual) - Number(b.preco_atual) ||
      new Date(b.publicada_em ?? 0).getTime() - new Date(a.publicada_em ?? 0).getTime()
  )[0];
}

export default function SaudeRobo({ aoEditar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [limpando, setLimpando] = useState(false);
  const [aviso, setAviso] = useState("");

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
    const gruposRepetidos = [...grupos.values()].filter((g) => g.length > 1);
    const repetidas = gruposRepetidos.flatMap((g) => {
      const fica = escolherQueFica(g);
      return g.map((o) => ({ ...o, nota: `${g.length} iguais${o.id === fica.id ? " · esta fica" : ""}` }));
    });

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
      gruposRepetidos,
      semConferir,
    });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Deixa só 1 de cada grupo de repetidas: a de menor preço (empate: a mais recente)
  async function limparRepetidas() {
    const grupos = dados?.gruposRepetidos ?? [];
    const sobrando = grupos.flatMap((g) => {
      const fica = escolherQueFica(g);
      return g.filter((o) => o.id !== fica.id);
    });
    if (!sobrando.length) return;
    if (
      !confirm(
        `Deixar só 1 oferta de cada um dos ${grupos.length} grupos de repetidas?\n\n` +
          `${sobrando.length} ofertas vão sair do site (fica a de menor preço de cada grupo). ` +
          `As do Telegram e manuais são apagadas; as do robô são ocultadas, para ele não colocar de volta.`
      )
    )
      return;

    setLimpando(true);
    setAviso("");
    const apagar = sobrando.filter((o) => APAGAVEIS.includes(o.origem)).map((o) => o.id);
    const ocultar = sobrando.filter((o) => !APAGAVEIS.includes(o.origem)).map((o) => o.id);
    const erros = [];
    for (let i = 0; i < apagar.length; i += 200) {
      const { error } = await supabase.from("ofertas").delete().in("id", apagar.slice(i, i + 200));
      if (error) erros.push(error.message);
    }
    for (let i = 0; i < ocultar.length; i += 200) {
      const { error } = await supabase
        .from("ofertas")
        .update({ ativa: false, oculta_manual: true })
        .in("id", ocultar.slice(i, i + 200));
      if (error) erros.push(error.message);
    }
    setLimpando(false);
    setAviso(
      erros.length
        ? `Algumas não saíram: ${erros[0]}`
        : `Pronto: ${apagar.length} apagadas e ${ocultar.length} ocultadas. Ficou 1 de cada grupo.`
    );
    carregar();
  }

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
          titulo="Coleta (Lomadee, Shopee e AliExpress)"
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

      <AcionarRobo aoTerminar={carregar} />

      <ImportacaoTelegram />

      <h2 className="adm-secao">Ofertas que merecem atenção (só as que estão no ar)</h2>
      {aviso && <p className="adm-aviso">{aviso}</p>}

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
          explicacao="Mesma loja e mesmo título no ar mais de uma vez. O botão deixa só a de menor preço de cada grupo (marcada com “esta fica”)."
          itens={dados.repetidas}
          aoEditar={aoEditar}
          acao={{
            nome: `🧹 Deixar só 1 de cada (${dados.gruposRepetidos.length} grupos)`,
            aoClicar: limparRepetidas,
            ocupado: limpando,
          }}
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

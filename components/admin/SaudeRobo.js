"use client";

// Aba "Saúde do robô" do painel admin.
// Salve como components/admin/SaudeRobo.js.
//
// Só o status de cada robô, uma linha por robô (clique para ver como funciona e o registro completo).
// O que antes ficava aqui embaixo virou aba própria no menu:
//   - Precisam de atenção (OfertasAtencao.js)
//   - Canal do Telegram   (ImportacaoTelegram.js)
//   - Comandos da VPS     (ComandosVPS.js)

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { estaExpirada } from "../../lib/ofertas";
import { HORAS_ENTRE_CONFERENCIAS } from "../../lib/prazos.mjs";
import { buscarTudo, ha, dataHora } from "./util";
import { problemasDasOfertas } from "./OfertasAtencao";
import RodarRobos from "./RodarRobos";

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

function LinhaRobo({ r }) {
  const [aberto, setAberto] = useState(false);
  const cor = r.erro ? "vermelho" : r.cor;
  return (
    <li className={`adm3-robo adm3-robo--${cor}`}>
      <button className="adm3-robo-linha" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        <span className="adm3-luz" aria-hidden="true" />
        <span className="adm3-robo-nome">
          {r.icone} {r.titulo}
          {r.extra && <em>{r.extra}</em>}
        </span>
        <span className={`adm3-status adm3-status--${cor}`}>{r.erro ? "Com erro" : TEXTO_SITUACAO[cor]}</span>
        <span className="adm3-robo-quando" title={r.quando ? dataHora(r.quando) : ""}>
          {ha(r.quando)}
        </span>
        <span className="adm3-robo-resumo">{r.detalhe || "—"}</span>
        <span className="adm3-seta" aria-hidden="true">
          {aberto ? "▴" : "▾"}
        </span>
      </button>
      {aberto && (
        <div className="adm3-robo-mais">
          <p>
            <strong>Como funciona:</strong> {r.como}
          </p>
          <p>
            <strong>Última vez:</strong> {r.quando ? `${dataHora(r.quando)} (${ha(r.quando)})` : "nenhum registro"}
          </p>
          {r.detalhe && (
            <p>
              <strong>Registro:</strong> {r.detalhe}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function SaudeRobo({ irPara }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const carregar = useCallback(async () => {
    setErro("");
    const [r, statusR] = await Promise.all([
      buscarTudo(() => supabase.from("ofertas").select("*").order("id")),
      supabase.from("robo_status").select("*"),
    ]);
    if (r.error) return setErro(`Não foi possível carregar as ofertas: ${r.error.message}`);

    const ofertas = r.data;
    const noAr = ofertas.filter((o) => o.ativa && !estaExpirada(o));
    const maisRecente = (lista, campo) => lista.reduce((m, o) => (o[campo] && (!m || o[campo] > m) ? o[campo] : m), null);
    const execucoes = new Map((statusR.data ?? []).map((s) => [s.script, s]));
    const problemas = problemasDasOfertas(ofertas).tipos.reduce((s, t) => s + t.itens.length, 0);

    setDados({
      statusDisponivel: !statusR.error,
      exec: (nome) => execucoes.get(nome),
      ultimoPostWhatsapp: maisRecente(ofertas, "postada_whatsapp_em"),
      filaWhatsapp: noAr.filter((o) => !o.postada_whatsapp_em).length,
      ultimaAutomatica: maisRecente(ofertas.filter((o) => (o.origem ?? "automatica") === "automatica"), "atualizado_em"),
      ultimaConferencia: maisRecente(ofertas, "preco_conferido_em"),
      ultimaTelegramImportada: maisRecente(ofertas.filter((o) => o.origem === "telegram"), "publicada_em"),
      ultimoPostTelegram: maisRecente(ofertas, "postada_telegram_em"),
      filaTelegram: noAr.filter((o) => !o.postada_telegram_em).length,
      noAr: noAr.length,
      problemas,
    });
    setAtualizadoEm(new Date());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (erro) return <p className="adm-aviso">{erro}</p>;
  if (!dados) return <p className="adm-centro">Verificando o robô...</p>;

  const e = dados.exec;
  const maisNovo = (...datas) => datas.filter(Boolean).sort().pop() ?? null;
  const coletaQuando = e("coletar")?.ultima_execucao ?? dados.ultimaAutomatica;
  const conferirQuando = e("conferir-precos")?.ultima_execucao ?? dados.ultimaConferencia;
  const whatsappQuando = maisNovo(e("postar-whatsapp")?.ultima_execucao, dados.ultimoPostWhatsapp);
  const leitor = e("leitor-telegram");
  const leitorOferta = e("leitor-grupos");
  const ml = e("fila-mercadolivre");
  const alertas = e("avisar-alertas");

  const robos = [
    {
      icone: "📦",
      titulo: "Coleta de ofertas",
      como: "Lomadee, Shopee, AliExpress, KaBuM! (Awin), Netshoes (Rakuten) e cupons · na VPS, a cada 30 min",
      quando: coletaQuando,
      cor: situacao(coletaQuando, 1, 3),
      erro: e("coletar") && !e("coletar").ok,
      detalhe: e("coletar")?.resumo ?? "Última oferta do robô atualizada",
    },
    {
      icone: "💲",
      titulo: "Conferência de preços",
      como: `Roda junto com a coleta · cada oferta é conferida a cada ${HORAS_ENTRE_CONFERENCIAS}h (Shopee com fila própria)`,
      quando: conferirQuando,
      cor: situacao(conferirQuando, 1, 6),
      erro: e("conferir-precos") && !e("conferir-precos").ok,
      detalhe: e("conferir-precos")?.resumo,
    },
    {
      icone: "🛒",
      titulo: "Robô do Mercado Livre",
      como: "Na VPS, junto com a coleta · procura os mais vendidos, publica as melhores com o seu link de afiliado e coloca o resto na Fila Mercado Livre",
      quando: ml?.ultima_execucao,
      cor: situacao(ml?.ultima_execucao, 1, 3),
      erro: ml && !ml.ok,
      detalhe: ml?.resumo ?? "Ainda não deu sinal de vida (confira se o robo-na-vps.sh roda o fila-mercadolivre.mjs)",
    },
    {
      icone: "📨",
      titulo: "Importação do canal MukiOfertas",
      como: "Webhook do site (Vercel) · na hora em que a oferta sai no canal",
      quando: dados.ultimaTelegramImportada,
      cor: situacao(dados.ultimaTelegramImportada, 12, 48),
      detalhe: "Última oferta que chegou do canal",
    },
    {
      icone: "👂",
      titulo: "Leitor de canais do Telegram",
      como: "Na VPS (pm2), sempre ligado · lê os canais escolhidos e publica as ofertas das lojas em que você é afiliado",
      quando: leitor?.ultima_execucao,
      cor: situacao(leitor?.ultima_execucao, 0.75, 2),
      erro: leitor && !leitor.ok,
      detalhe: leitor
        ? `${leitor.resumo ?? ""}${leitorOferta ? ` · última oferta: ${leitorOferta.resumo} (${ha(leitorOferta.ultima_execucao)})` : ""}`
        : "Ainda não deu sinal de vida: ligue com pm2 (veja Comandos da VPS)",
    },
    {
      icone: "✈️",
      titulo: "Postagem no Telegram",
      como: "Roda junto com a coleta · a cada 30 min",
      quando: dados.ultimoPostTelegram,
      cor: situacao(dados.ultimoPostTelegram, 3, 12),
      extra: `${dados.filaTelegram} na fila`,
      detalhe: `${dados.filaTelegram} ofertas no ar ainda não postadas no canal`,
    },
    {
      icone: "🟢",
      titulo: "Postagem no WhatsApp",
      como: "Na VPS, a cada 10 min (dentro do horário do painel) · envio pela Evolution API. Se o registro mostra envio mas nada chega no grupo, confira a conexão na Evolution API.",
      quando: whatsappQuando,
      cor: situacao(whatsappQuando, 1, 3),
      erro: e("postar-whatsapp") && !e("postar-whatsapp").ok,
      extra: `${dados.filaWhatsapp} na fila`,
      detalhe:
        `Último envio para o grupo: ${dados.ultimoPostWhatsapp ? `${ha(dados.ultimoPostWhatsapp)}` : "nenhum registrado"}` +
        (e("postar-whatsapp")?.resumo ? ` · última execução: ${e("postar-whatsapp").resumo}` : ""),
    },
    {
      icone: "🔔",
      titulo: "Alertas de preço",
      como: "Na VPS, a cada 15 min · aviso no site e e-mail pelo Resend para quem criou um alerta",
      quando: alertas?.ultima_execucao,
      cor: situacao(alertas?.ultima_execucao, 1, 3),
      erro: alertas && !alertas.ok,
      detalhe: alertas?.resumo ?? "Ainda não rodou na VPS (veja Comandos da VPS)",
    },
  ];

  const corFinal = (r) => (r.erro ? "vermelho" : r.cor);
  const conta = { verde: 0, amarelo: 0, vermelho: 0 };
  for (const r of robos) conta[corFinal(r)]++;
  // os com problema aparecem primeiro
  const ordem = { vermelho: 0, amarelo: 1, verde: 2 };
  const ordenados = [...robos].sort((a, b) => ordem[corFinal(a)] - ordem[corFinal(b)]);

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Saúde do robô</h1>
          <p className="adm-sub">
            Tudo roda na VPS da Oracle. Clique num robô para ver como ele funciona e o registro completo.
            {atualizadoEm && ` · atualizado às ${atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <button className="adm-btn" onClick={carregar}>
          ↻ Atualizar
        </button>
      </div>

      {!dados.statusDisponivel && (
        <p className="adm-aviso">
          O registro das execuções ainda não está ativo. Rode o arquivo admin-painel.sql no Supabase e suba os novos
          scripts do robô. Enquanto isso, os horários abaixo são estimados pelas ofertas.
        </p>
      )}

      <div className="adm3-placar">
        <div className="adm3-placar-item adm3-placar-item--verde">
          <strong>{conta.verde}</strong> em dia
        </div>
        <div className="adm3-placar-item adm3-placar-item--amarelo">
          <strong>{conta.amarelo}</strong> atrasados
        </div>
        <div className="adm3-placar-item adm3-placar-item--vermelho">
          <strong>{conta.vermelho}</strong> parados ou com erro
        </div>
        <div className="adm3-placar-item">
          <strong>{dados.noAr}</strong> ofertas no ar
        </div>
      </div>

      <RodarRobos />

      <h2 className="adm3-titulo-secao">Status de cada robô</h2>
      <ul className="adm3-robos">
        {ordenados.map((r) => (
          <LinhaRobo key={r.titulo} r={r} />
        ))}
      </ul>

      <div className="adm3-atalhos-rodape">
        <button className="adm3-atalho-card" onClick={() => irPara?.("atencao")}>
          <span>⚠️</span>
          <div>
            <strong>Precisam de atenção</strong>
            <small>{dados.problemas ? `${dados.problemas} avisos em ofertas no ar` : "Nenhum problema agora"}</small>
          </div>
        </button>
        <button className="adm3-atalho-card" onClick={() => irPara?.("telegram")}>
          <span>📨</span>
          <div>
            <strong>Canal do Telegram</strong>
            <small>O que entrou e o que ficou de fora</small>
          </div>
        </button>
        <button className="adm3-atalho-card" onClick={() => irPara?.("vps")}>
          <span>🖥️</span>
          <div>
            <strong>Comandos da VPS</strong>
            <small>Ver registros e rodar um robô na hora</small>
          </div>
        </button>
      </div>
    </>
  );
}

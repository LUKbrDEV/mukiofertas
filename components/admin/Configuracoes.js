"use client";

// Aba Configurações do painel admin.
// Salve como components/admin/Configuracoes.js.
//
// As regras ficam na tabela config_site do Supabase. O banco usa as de Relâmpago e Destaque
// na hora em que a oferta entra (ou muda de preço) e o robô lê as outras a cada execução.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { DIAS_NO_SITE, DIAS_EXPIRADA_VISIVEL, DIAS_BLOQUEIO_REPUBLICAR } from "../../lib/prazos.mjs";
import { MODELO_PADRAO, MODELO_CUPOM_PADRAO, camposDaOferta, montarMensagem } from "../../lib/whatsapp-modelo.mjs";
import { categorias } from "../../data/ofertas";
import { PADRAO_VITRINE } from "../../lib/vitrine.mjs";
import { PADRAO_QUALIDADE } from "../../lib/qualidade.mjs";
import { LOJAS_GRANDES, LOJAS_CUPOM_PADRAO } from "../../lib/lojas-cupom.mjs";
import { lojasDestaque } from "../../data/lojas";

// Departamentos do site (os que não têm "pai"), cada um com as suas subcategorias
const DEPARTAMENTOS = categorias
  .filter((c) => !c.pai)
  .map((d) => ({ ...d, slugs: [d.slug, ...categorias.filter((c) => c.pai === d.slug).map((c) => c.slug)] }));

// Prévia da marca d'água (a foto de verdade é montada pelo robô, igual a esta)
const POSICOES_MARCA = [
  ["baixo", "Embaixo, no centro"],
  ["baixo-direita", "Embaixo, à direita"],
  ["baixo-esquerda", "Embaixo, à esquerda"],
  ["topo", "Em cima, no centro"],
  ["topo-direita", "Em cima, à direita"],
  ["centro", "No meio"],
];
function PreviaMarca({ posicao, tamanho, opacidade }) {
  const m = "4%";
  const lugar = {
    baixo: { bottom: m, left: "50%", transform: "translateX(-50%)" },
    "baixo-direita": { bottom: m, right: m },
    "baixo-esquerda": { bottom: m, left: m },
    topo: { top: m, left: "50%", transform: "translateX(-50%)" },
    "topo-direita": { top: m, right: m },
    centro: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  }[posicao] ?? { bottom: m, left: "50%", transform: "translateX(-50%)" };
  return (
    <div
      style={{
        position: "relative",
        width: 220,
        height: 220,
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        background: "#fff",
        display: "grid",
        placeItems: "center",
        color: "#94a3b8",
        fontSize: 13,
      }}
    >
      <span style={{ width: "55%", height: "62%", display: "grid", placeItems: "center", background: "#f1f5f9", borderRadius: 8 }}>
        foto do produto
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/marca-dagua.png"
        alt=""
        style={{ position: "absolute", width: `${tamanho}%`, height: "auto", opacity: opacidade / 100, ...lugar }}
      />
    </div>
  );
}

// Caixinhas para escolher quais departamentos / lojas vão para o grupo do WhatsApp.
// Nada marcado = todos.
function EscolherVarios({ titulo, dica, opcoes, marcados, aoMudar, semTodos = false }) {
  const todos = marcados.length === 0;
  const alternar = (id) => aoMudar(marcados.includes(id) ? marcados.filter((x) => x !== id) : [...marcados, id]);
  return (
    <div style={{ margin: "14px 0" }}>
      <strong>{titulo}</strong>
      <p className="adm-sub" style={{ margin: "2px 0 8px" }}>{dica}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {!semTodos && (
          <button
            type="button"
            className={todos ? "adm-btn adm-btn--primario" : "adm-btn"}
            onClick={() => aoMudar([])}
          >
            ✅ Todos
          </button>
        )}
        {opcoes.map((o) => {
          const ligado = marcados.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className={ligado ? "adm-btn adm-btn--primario" : "adm-btn"}
              aria-pressed={ligado}
              onClick={() => alternar(o.id)}
            >
              {o.nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Frase de exemplo na prévia (no envio de verdade, a IA cria uma para cada produto)
const FRASE_EXEMPLO = "Setup agradece demais 🖥️";
const ESTILO_PADRAO = "simples, curta e divertida, sem palavrão";

// Ofertas de exemplo para a prévia da mensagem do WhatsApp
const EXEMPLO_OFERTA = {
  id: 123,
  titulo: "Monitor Gamer LG UltraGear 27\" IPS 180Hz",
  loja: "KaBuM!",
  categoria: "monitor",
  preco_atual: 899.9,
  preco_antigo: 1299.9,
  cupom: "MUKI10",
};
const EXEMPLO_CUPOM = { id: 124, titulo: "10% OFF em SSDs selecionados", loja: "KaBuM!", categoria: "cupons", cupom: "SSD10" };
const SITE_EXEMPLO = "https://www.mukiofertas.com.br";

// Caixa de texto do modelo + prévia de como a mensagem fica no grupo
function ModeloWhatsApp({ rotulo, valor, padrao, exemplo, aoMudar }) {
  const texto = valor || padrao;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, margin: "12px 0" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <strong>{rotulo}</strong>
        <textarea
          className="adm-input"
          rows={11}
          value={texto}
          onChange={(e) => aoMudar(e.target.value)}
          style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.45, resize: "vertical" }}
        />
        <button type="button" className="adm-btn adm-btn--link" style={{ alignSelf: "flex-start" }} onClick={() => aoMudar(padrao)}>
          Voltar ao modelo padrão
        </button>
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <strong>Prévia no grupo</strong>
        <div
          style={{
            whiteSpace: "pre-wrap",
            padding: "12px 14px",
            fontSize: 14,
            lineHeight: 1.45,
            background: "#dcf8c6",
            borderRadius: "10px 10px 10px 2px",
            boxShadow: "0 1px 1px rgba(0,0,0,0.12)",
            color: "#111",
            wordBreak: "break-word",
          }}
        >
          {montarMensagem(texto, camposDaOferta(exemplo, { siteUrl: SITE_EXEMPLO, frase: FRASE_EXEMPLO }))}
        </div>
      </div>
    </div>
  );
}

const PADRAO = {
  relampago_preco_minimo: 500, // (não é mais usado: a regra nova usa a economia em reais)
  relampago_desconto_minimo: 40, // Super desconto: desconto mínimo (o nome ficou para não perder o que já foi salvo)
  super_desconto_maximo: 70, // Super desconto: acima disso o desconto é suspeito (preço "de" inflado)
  super_desconto_maximo_marketplace: 60, // o mesmo para Shopee e AliExpress
  super_economia_minima: 150, // R$ economizados, no mínimo
  super_nota_marketplace: 4.7, // Shopee/AliExpress: nota mínima do produto
  super_percentual_maximo: 10, // no máximo X% das ofertas no ar com a tag
  relampago_horas_padrao: 6, // postagem do Telegram com "relâmpago" e sem hora: dura isso
  destaque_desconto_minimo: 60,
  desconto_minimo_publicar: 20,
  desconto_minimo_tecnologia: 15,
  tolerancia_percentual: 10,
  horas_entre_conferencias: 5,
  renovar_se_preco_mantido: true,
  dias_renovacao: 5,
  max_renovacoes: 2,
  coleta_pausada: false,
  conferencia_pausada: false,
  telegram_max_por_hora: 20,
  awin_ativo: true,
  awin_preco_minimo: 30,
  awin_max_por_execucao: 40,
  awin_horas_entre_downloads: 3,
  awin_ler_paginas: true,
  awin_paginas_por_execucao: 80,
  ...PADRAO_VITRINE,
  ...PADRAO_QUALIDADE,
  whatsapp_ativo: false,
  whatsapp_grupo: "",
  whatsapp_modelo: MODELO_PADRAO,
  whatsapp_modelo_cupom: MODELO_CUPOM_PADRAO,
  whatsapp_enviar_cupons: true,
  whatsapp_com_foto: true,
  whatsapp_max_por_execucao: 5,
  whatsapp_max_por_hora: 10,
  whatsapp_intervalo_segundos: 40,
  whatsapp_desconto_minimo: 0,
  whatsapp_hora_inicio: 7,
  whatsapp_hora_fim: 23,
  whatsapp_frase_ia: true,
  whatsapp_preco_minimo: 0,
  whatsapp_marca_dagua: true,
  whatsapp_marca_posicao: "baixo",
  whatsapp_marca_tamanho: 55,
  whatsapp_marca_opacidade: 90,
  whatsapp_departamentos: [], // vazio = todos
  whatsapp_categorias: [], // gerado a partir dos departamentos (usado pelo robô)
  whatsapp_lojas: [], // vazio = todas
  whatsapp_lojas_nomes: [], // gerado a partir das lojas (usado pelo robô)
  whatsapp_frase_estilo: ESTILO_PADRAO,
  whatsapp_frase_palavras: 4,
  awin_desconto_tecnologia: 15,
  awin_max_tecnologia: 40,
  awin_max_por_categoria_tecnologia: 10,
  cupons_ativo: true,
  cupons_max_por_rede: 40,
  cupons_lojas: LOJAS_CUPOM_PADRAO,
  amazon_horas_no_site: 24,
  avisos_para_expirar: 2,
  aliexpress_ativo: true,
  aliexpress_preco_minimo: 50,
  aliexpress_avaliacao_minima: 90,
  aliexpress_vendas_minimas: 50,
  aliexpress_por_busca: 20,
  aliexpress_max_por_execucao: 12,
  aliexpress_buscas_tecnologia: 3,
  aliexpress_buscas_outras: 2,
  aliexpress_max_por_busca: 3,
  aliexpress_entrega_dias: 7,
  aliexpress_so_mais_vendidos: true,
  telegram_desconto_minimo: 25,
  telegram_exigir_desconto: true,
  telegram_pausado: false,
};

function Numero({ rotulo, dica, valor, aoMudar, sufixo, min = 0, max, passo = 1 }) {
  return (
    <label className="adm-campo">
      <span className="adm-rotulo">{rotulo}</span>
      <span className="adm-input-sufixo">
        <input
          className="adm-input"
          type="number"
          min={min}
          max={max}
          step={passo}
          value={valor ?? ""}
          onChange={(e) => aoMudar(e.target.value === "" ? "" : Number(e.target.value))}
        />
        {sufixo && <span>{sufixo}</span>}
      </span>
      {dica && <small>{dica}</small>}
    </label>
  );
}

function Chave({ rotulo, dica, ligado, aoMudar, perigo }) {
  return (
    <label className={`adm-chave${perigo && ligado ? " adm-chave--perigo" : ""}`}>
      <input type="checkbox" checked={Boolean(ligado)} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="adm-chave-trilho" aria-hidden="true" />
      <span>
        <strong>{rotulo}</strong>
        {dica && <small>{dica}</small>}
      </span>
    </label>
  );
}

export default function Configuracoes() {
  const [c, setC] = useState(null);
  const [original, setOriginal] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("config_site").select("dados, atualizado_em").eq("id", 1).maybeSingle();
    if (error || !data) {
      setErro(
        error
          ? `Não foi possível ler as configurações (${error.message}).`
          : "As configurações ainda não existem no banco."
      );
      return;
    }
    const dados = { ...PADRAO, ...data.dados };
    setC(dados);
    setOriginal(dados);
    setAtualizadoEm(data.atualizado_em);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mudar = (campo) => (valor) => setC((atual) => ({ ...atual, [campo]: valor }));
  const alterado = c && original && JSON.stringify(c) !== JSON.stringify(original);
  const regrasMudaram =
    c &&
    original &&
    [
      "relampago_desconto_minimo",
      "super_desconto_maximo",
      "super_desconto_maximo_marketplace",
      "super_economia_minima",
      "super_nota_marketplace",
      "super_percentual_maximo",
      "destaque_desconto_minimo",
    ].some(
      (k) => c[k] !== original[k]
    );

  async function salvar() {
    setAviso("");
    for (const [k, v] of Object.entries(c)) {
      if (v === "" && typeof PADRAO[k] === "number") return setAviso("Preencha todos os campos antes de salvar.");
      if (typeof v === "number" && v < 0) return setAviso("Os valores não podem ser negativos.");
    }
    if (c.whatsapp_ativo && !String(c.whatsapp_grupo || "").includes("@g.us"))
      return setAviso("Coloque o id do grupo do WhatsApp (termina em @g.us) antes de ligar o envio.");
    if (c.horas_entre_conferencias < 1) return setAviso("A conferência de preço precisa ser de no mínimo 1 em 1 hora.");

    setSalvando(true);
    const agora = new Date().toISOString();
    const { error } = await supabase.from("config_site").update({ dados: c, atualizado_em: agora }).eq("id", 1);
    setSalvando(false);
    if (error) return setAviso(`Não foi possível salvar: ${error.message}`);

    setOriginal(c);
    setAtualizadoEm(agora);
    setAviso(
      regrasMudaram
        ? "Salvo! As regras novas valem para as próximas ofertas. Para aplicar nas que já estão no site, clique em \"Aplicar às ofertas atuais\"."
        : "Salvo! O robô usa os valores novos a partir da próxima execução."
    );
  }

  async function aplicarAtuais() {
    if (alterado) return setAviso("Salve as alterações antes de aplicar às ofertas atuais.");
    if (!confirm("Recalcular Super desconto e Destaque de todas as ofertas com as regras atuais? As marcações feitas à mão serão substituídas.")) return;
    setAplicando(true);
    const { data, error } = await supabase.rpc("reaplicar_regras_destaque");
    setAplicando(false);
    setAviso(error ? `Não foi possível aplicar: ${error.message}` : `Pronto! ${data ?? 0} ofertas foram ajustadas.`);
  }

  if (erro)
    return (
      <>
        <h1>Configurações</h1>
        <p className="adm-aviso">
          {erro} Rode o arquivo <strong>admin-painel.sql</strong> no Supabase (SQL Editor) e confira se o seu
          e-mail está na lista de administradores.
        </p>
      </>
    );
  if (!c) return <p className="adm-centro">Carregando configurações...</p>;

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Configurações</h1>
          <p className="adm-sub">
            Regras do site e do robô
            {atualizadoEm && ` · salvas em ${new Date(atualizadoEm).toLocaleString("pt-BR")}`}
          </p>
        </div>
        <button className="adm-btn adm-btn--primario" onClick={salvar} disabled={!alterado || salvando}>
          {salvando ? "Salvando..." : alterado ? "Salvar alterações" : "Tudo salvo"}
        </button>
      </div>

      {aviso && (
        <p className="adm-aviso">
          {aviso}
          <button className="adm-aviso-fechar" onClick={() => setAviso("")} aria-label="Fechar aviso">
            ×
          </button>
        </p>
      )}

      <section className="adm-bloco">
        <h2>⚡ Promoção relâmpago</h2>
        <p>
          Como nas grandes lojas, relâmpago é <strong>oferta com hora para acabar</strong> (não desconto alto).
          A tag e a contagem regressiva aparecem quando a postagem do Telegram fala em &quot;relâmpago&quot; ou
          &quot;flash sale&quot; (se disser &quot;termina às 18h&quot; ou &quot;acaba em 2 horas&quot;, vale essa hora) ou
          quando você marca no cadastro da oferta. Quando a hora passa, a tag some sozinha.
        </p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Sem hora na postagem, dura"
            sufixo="horas"
            max={48}
            valor={c.relampago_horas_padrao}
            aoMudar={mudar("relampago_horas_padrao")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🔥 Super desconto</h2>
        <p>
          A tag é um selo de oferta realmente boa. A oferta precisa passar em <strong>todas</strong> as regras:
          desconto real (nem pouco, nem exagerado), economia que vale a pena, <strong>menor preço dos últimos
          30 dias</strong> (quando já tem histórico) e, na Shopee e no AliExpress, nota alta do produto. Mesmo
          assim, só as de maior economia ficam com a tag, até o limite abaixo. A regra roda no banco
          (supabase/super-desconto-v2.sql).
        </p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Desconto de pelo menos"
            sufixo="%"
            max={99}
            valor={c.relampago_desconto_minimo}
            aoMudar={mudar("relampago_desconto_minimo")}
          />
          <Numero
            rotulo="Economia de pelo menos"
            sufixo="R$"
            passo={10}
            valor={c.super_economia_minima}
            aoMudar={mudar("super_economia_minima")}
            dica="Quanto a pessoa economiza (preço de − preço por)."
          />
          <Numero
            rotulo="Desconto de no máximo"
            sufixo="%"
            max={99}
            valor={c.super_desconto_maximo}
            aoMudar={mudar("super_desconto_maximo")}
            dica="Acima disso o preço “de” costuma ser inflado."
          />
          <Numero
            rotulo="Shopee/AliExpress: desconto de no máximo"
            sufixo="%"
            max={99}
            valor={c.super_desconto_maximo_marketplace}
            aoMudar={mudar("super_desconto_maximo_marketplace")}
          />
          <Numero
            rotulo="Shopee/AliExpress: nota mínima do produto"
            sufixo="★"
            max={5}
            passo={0.1}
            valor={c.super_nota_marketplace}
            aoMudar={mudar("super_nota_marketplace")}
          />
          <Numero
            rotulo="No máximo, das ofertas no ar"
            sufixo="%"
            min={1}
            max={100}
            valor={c.super_percentual_maximo}
            aoMudar={mudar("super_percentual_maximo")}
            dica="Mantém a tag rara: ficam só as de maior economia."
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>⭐ Destaque</h2>
        <p>Ofertas em destaque ganham a borda laranja e sobem na lista.</p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Desconto de pelo menos"
            sufixo="%"
            max={99}
            valor={c.destaque_desconto_minimo}
            aoMudar={mudar("destaque_desconto_minimo")}
          />
        </div>
        <div className="adm-bloco-rodape">
          <button className="adm-btn" onClick={aplicarAtuais} disabled={aplicando}>
            {aplicando ? "Aplicando..." : "Aplicar Super desconto e Destaque às ofertas atuais"}
          </button>
          <small>As regras sempre valem para ofertas novas e quando o preço muda. Este botão recalcula as que já estão no site.</small>
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🤖 Robô</h2>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Publicar só com desconto de pelo menos"
            sufixo="%"
            max={99}
            dica="Vale para as ofertas da Lomadee, Shopee, AliExpress e KaBuM!."
            valor={c.desconto_minimo_publicar}
            aoMudar={mudar("desconto_minimo_publicar")}
          />
          <Numero
            rotulo="Para tecnologia, desconto de pelo menos"
            sufixo="%"
            max={99}
            dica="TVs, monitores, notebooks, tablets, celulares e hardware. Vale para o robô e para o Telegram."
            valor={c.desconto_minimo_tecnologia}
            aoMudar={mudar("desconto_minimo_tecnologia")}
          />
        </div>
        <div className="adm-chaves">
          <Chave
            rotulo="Pausar a coleta da Lomadee"
            dica="Enquanto ligado, o robô não traz ofertas novas nem atualiza as que já existem."
            ligado={c.coleta_pausada}
            aoMudar={mudar("coleta_pausada")}
            perigo
          />
          <Chave
            rotulo="Pausar a conferência de preços"
            dica="Enquanto ligado, os preços das ofertas do Telegram e manuais não são conferidos."
            ligado={c.conferencia_pausada}
            aoMudar={mudar("conferencia_pausada")}
            perigo
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>📨 Ofertas do canal do Telegram</h2>
        <p>
          As postagens do canal chegam ao site na hora, pelo webhook. Estas regras decidem quais entram. Valem
          a partir da próxima postagem (em até 1 minuto).
        </p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Máximo de ofertas novas por hora"
            sufixo="por hora"
            max={500}
            dica="0 = sem limite. Passando do limite, as postagens daquela hora são ignoradas."
            valor={c.telegram_max_por_hora}
            aoMudar={mudar("telegram_max_por_hora")}
          />
          <Numero
            rotulo="Desconto mínimo"
            sufixo="%"
            max={99}
            dica="Quando o desconto é conhecido e é menor que isso, a oferta não entra."
            valor={c.telegram_desconto_minimo}
            aoMudar={mudar("telegram_desconto_minimo")}
          />
        </div>
        <div className="adm-chaves">
          <Chave
            rotulo="Só aceitar ofertas com preço antigo"
            dica="Desligado: entram também as postagens sem o preço 'de' (aparecem sem a tag de desconto)."
            ligado={c.telegram_exigir_desconto}
            aoMudar={mudar("telegram_exigir_desconto")}
          />
          <Chave
            rotulo="Pausar a importação do Telegram"
            dica="Enquanto ligado, nenhuma postagem do canal entra no site."
            ligado={c.telegram_pausado}
            aoMudar={mudar("telegram_pausado")}
            perigo
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🟠 KaBuM! (Awin)</h2>
        <p>O robô baixa o catálogo da KaBuM! pela Awin e publica os produtos com desconto.</p>
        <div className="adm-chaves">
          <Chave
            rotulo="Coletar ofertas da KaBuM!"
            dica="Desligado: o robô não traz ofertas novas da Awin (as que já estão no site continuam)."
            ligado={c.awin_ativo}
            aoMudar={mudar("awin_ativo")}
          />
          <Chave
            rotulo='Ler o preço "de" na página da KaBuM!'
            dica="O feed só traz o preço atual. Ligado: o robô abre a página do produto e usa o preço riscado que a loja mostra. Desligado: usa só o histórico de preços."
            ligado={c.awin_ler_paginas}
            aoMudar={mudar("awin_ler_paginas")}
          />
        </div>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Só ofertas acima de"
            sufixo="R$"
            passo={5}
            valor={c.awin_preco_minimo}
            aoMudar={mudar("awin_preco_minimo")}
          />
          <Numero
            rotulo="Ofertas por download"
            sufixo="ofertas"
            min={1}
            max={200}
            dica="Das outras categorias (fora tecnologia), as de maior desconto, no máximo 6 por categoria."
            valor={c.awin_max_por_execucao}
            aoMudar={mudar("awin_max_por_execucao")}
          />
          <Numero
            rotulo="Baixar o catálogo a cada"
            sufixo="horas"
            min={1}
            max={24}
            dica="O catálogo é grande; não precisa baixar a cada 30 minutos."
            valor={c.awin_horas_entre_downloads}
            aoMudar={mudar("awin_horas_entre_downloads")}
          />
          <Numero
            rotulo="Páginas lidas por download"
            sufixo="páginas"
            min={0}
            max={500}
            dica="Cada página é relida só depois de 20 horas. Mais páginas = mais ofertas, mas o robô demora mais."
            valor={c.awin_paginas_por_execucao}
            aoMudar={mudar("awin_paginas_por_execucao")}
          />
        </div>
        <h3 style={{ margin: "18px 0 4px" }}>🖥️ Regra de tecnologia da KaBuM!</h3>
        <p className="adm-sub" style={{ marginTop: 0 }}>
          Vale para hardware, gabinete, placa-mãe, SSD, memória, placa de vídeo, PlayStation, Xbox, controles, jogos,
          periféricos, monitores, notebooks, celulares, TVs, roteadores e cadeiras gamer. Tem cota própria: não
          disputa espaço com as outras categorias.
        </p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Desconto mínimo para tecnologia"
            sufixo="%"
            min={1}
            max={90}
            valor={c.awin_desconto_tecnologia}
            aoMudar={mudar("awin_desconto_tecnologia")}
          />
          <Numero
            rotulo="Ofertas de tecnologia por download"
            sufixo="ofertas"
            min={0}
            max={300}
            dica="Somam com as 'Ofertas por download' das outras categorias."
            valor={c.awin_max_tecnologia}
            aoMudar={mudar("awin_max_tecnologia")}
          />
          <Numero
            rotulo="Máximo da mesma categoria de tecnologia"
            sufixo="ofertas"
            min={1}
            max={100}
            dica="Variedade: ex.: no máximo 10 SSDs por download."
            valor={c.awin_max_por_categoria_tecnologia}
            aoMudar={mudar("awin_max_por_categoria_tecnologia")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>⏱️ Validade das ofertas</h2>
        <p>
          A Amazon não deixa robôs conferirem o preço na loja, então as ofertas dela ficam menos tempo no ar. Se a
          mesma oferta for postada de novo no canal (com preço igual ou menor), ela volta por mais esse tempo.
        </p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Ofertas da Amazon ficam no ar por"
            sufixo="horas"
            min={2}
            max={240}
            valor={c.amazon_horas_no_site}
            aoMudar={mudar("amazon_horas_no_site")}
          />
          <Numero
            rotulo='Avisos de "o preço subiu" para expirar'
            sufixo="pessoas"
            min={1}
            max={20}
            dica="Botão na página da oferta. Quando você (admin, logado) clica, a oferta expira na hora."
            valor={c.avisos_para_expirar}
            aoMudar={mudar("avisos_para_expirar")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🛍️ Shopee e AliExpress (qualidade)</h2>
        <p>
          Para o site não encher de bugiganga barata e de preço &quot;de&quot; inflado pelo vendedor. Vale para os robôs
          (Shopee, AliExpress, Lomadee) e para o Telegram. Para limpar o que já está no ar, rode o
          scripts/limpar-marketplace.mjs.
        </p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Só produtos a partir de"
            sufixo="R$"
            passo={5}
            valor={c.mkt_preco_minimo}
            aoMudar={mudar("mkt_preco_minimo")}
          />
          <Numero
            rotulo="Desconto máximo aceito"
            sufixo="%"
            min={30}
            max={95}
            dica='Acima disso o preço "de" quase sempre foi inflado pelo vendedor.'
            valor={c.mkt_desconto_maximo}
            aoMudar={mudar("mkt_desconto_maximo")}
          />
          <Numero
            rotulo="Máximo de ofertas da Shopee no ar"
            sufixo="ofertas"
            min={10}
            max={2000}
            passo={10}
            dica="Chegou no limite: novas só entram quando outras saírem."
            valor={c.mkt_max_no_ar_shopee}
            aoMudar={mudar("mkt_max_no_ar_shopee")}
          />
          <Numero
            rotulo="Máximo de ofertas do AliExpress no ar"
            sufixo="ofertas"
            min={10}
            max={2000}
            passo={10}
            valor={c.mkt_max_no_ar_aliexpress}
            aoMudar={mudar("mkt_max_no_ar_aliexpress")}
          />
          <Numero
            rotulo="Shopee: nota mínima do produto"
            sufixo="estrelas"
            min={0}
            max={5}
            passo={0.1}
            valor={c.shopee_nota_minima}
            aoMudar={mudar("shopee_nota_minima")}
          />
          <Numero
            rotulo="Shopee: vendas mínimas"
            sufixo="vendidos"
            min={0}
            max={100000}
            passo={50}
            valor={c.shopee_vendas_minimas}
            aoMudar={mudar("shopee_vendas_minimas")}
          />
          <Numero
            rotulo="Shopee: ofertas novas a cada 30 minutos"
            sufixo="ofertas"
            min={0}
            max={100}
            valor={c.shopee_max_por_execucao}
            aoMudar={mudar("shopee_max_por_execucao")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🏠 Página inicial</h2>
        <p>
          Quem aparece primeiro em "Em alta agora", "Relâmpago" e nas faixas de Hardware, Monitores, Smartphones,
          Games e TVs. Cada oferta ganha pontos por desconto confiável, cliques, marca conhecida e loja confiável, e
          perde pontos com o tempo no ar. Vale em até 1 minuto depois de salvar.
        </p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Desconto suspeito na Shopee e no AliExpress acima de"
            sufixo="%"
            min={30}
            max={95}
            dica="Acima disso a oferta PERDE pontos (preço 'de' inflado pelo vendedor) e cai para o fim."
            valor={c.home_teto_desconto_marketplace}
            aoMudar={mudar("home_teto_desconto_marketplace")}
          />
          <Numero
            rotulo="Desconto suspeito nas outras lojas acima de"
            sufixo="%"
            min={30}
            max={99}
            valor={c.home_teto_desconto_outras}
            aoMudar={mudar("home_teto_desconto_outras")}
          />
          <Numero
            rotulo="Bônus para marca conhecida"
            sufixo="pontos"
            min={0}
            max={60}
            dica="Samsung, LG, JBL, Kingston, Asus, Logitech... (lista no lib/vitrine.mjs)"
            valor={c.home_bonus_marca}
            aoMudar={mudar("home_bonus_marca")}
          />
          <Numero
            rotulo="Bônus para Amazon, Mercado Livre e KaBuM!"
            sufixo="pontos"
            min={0}
            max={60}
            valor={c.home_bonus_loja}
            aoMudar={mudar("home_bonus_loja")}
          />
          <Numero
            rotulo='"Em alta agora": só ofertas das últimas'
            sufixo="horas"
            min={6}
            max={240}
            valor={c.home_horas_destaque}
            aoMudar={mudar("home_horas_destaque")}
          />
          <Numero
            rotulo='"Relâmpago": só ofertas das últimas'
            sufixo="horas"
            min={6}
            max={168}
            valor={c.home_horas_relampago}
            aoMudar={mudar("home_horas_relampago")}
          />
          <Numero
            rotulo="Máximo da mesma categoria por faixa"
            sufixo="ofertas"
            min={1}
            max={12}
            dica="Evita uma faixa cheia de cadeiras, por exemplo. Vale para Em alta e Relâmpago."
            valor={c.home_max_por_categoria}
            aoMudar={mudar("home_max_por_categoria")}
          />
          <Numero
            rotulo="Máximo da mesma loja por faixa"
            sufixo="ofertas"
            min={1}
            max={12}
            valor={c.home_max_por_loja}
            aoMudar={mudar("home_max_por_loja")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🟢 WhatsApp</h2>
        <p>
          O robô envia as ofertas novas do site para o seu grupo, a cada 30 minutos, pelo servidor da Evolution API
          (VPS da Oracle). Só vão as ofertas que entrarem no site depois que você ligar.
        </p>
        <div className="adm-chaves">
          <Chave
            rotulo="Enviar ofertas para o grupo do WhatsApp"
            dica="Desligado: nada é enviado."
            ligado={c.whatsapp_ativo}
            aoMudar={mudar("whatsapp_ativo")}
          />
          <Chave
            rotulo="Enviar com a foto do produto"
            dica="Desligado: só texto, com a prévia do link."
            ligado={c.whatsapp_com_foto}
            aoMudar={mudar("whatsapp_com_foto")}
          />
          <Chave
            rotulo="Enviar os cupons também"
            dica="Os cupons da aba Cupons do site, com o modelo de cupom abaixo."
            ligado={c.whatsapp_enviar_cupons}
            aoMudar={mudar("whatsapp_enviar_cupons")}
          />
        </div>

        <h3 style={{ margin: "18px 0 4px" }}>🖼️ Marca d'água na foto</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div className="adm-chaves">
              <Chave
                rotulo="Colocar a marca d'água nas fotos"
                dica="A foto vira um quadrado com fundo branco e ganha a marca. Para trocar a marca, substitua o arquivo public/marca-dagua.png (PNG sem fundo)."
                ligado={c.whatsapp_marca_dagua}
                aoMudar={mudar("whatsapp_marca_dagua")}
              />
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" }}>
              <strong>Posição</strong>
              <select
                className="adm-input"
                value={c.whatsapp_marca_posicao ?? "baixo"}
                onChange={(e) => mudar("whatsapp_marca_posicao")(e.target.value)}
              >
                {POSICOES_MARCA.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="adm-duas-colunas">
              <Numero
                rotulo="Tamanho"
                sufixo="% da foto"
                min={10}
                max={95}
                passo={5}
                valor={c.whatsapp_marca_tamanho}
                aoMudar={mudar("whatsapp_marca_tamanho")}
              />
              <Numero
                rotulo="Visibilidade"
                sufixo="%"
                min={10}
                max={100}
                passo={5}
                dica="100 = sem transparência."
                valor={c.whatsapp_marca_opacidade}
                aoMudar={mudar("whatsapp_marca_opacidade")}
              />
            </div>
          </div>
          {c.whatsapp_marca_dagua && (
            <PreviaMarca
              posicao={c.whatsapp_marca_posicao}
              tamanho={c.whatsapp_marca_tamanho}
              opacidade={c.whatsapp_marca_opacidade}
            />
          )}
        </div>

        <EscolherVarios
          titulo="Tipos de produto que vão para o grupo"
          dica="Clique para marcar ou desmarcar. Nenhum marcado = todos. Cada departamento leva junto as subcategorias dele."
          opcoes={DEPARTAMENTOS.map((d) => ({ id: d.slug, nome: `${d.emoji} ${d.nome}` }))}
          marcados={c.whatsapp_departamentos ?? []}
          aoMudar={(lista) =>
            setC((atual) => ({
              ...atual,
              whatsapp_departamentos: lista,
              whatsapp_categorias: DEPARTAMENTOS.filter((d) => lista.includes(d.slug)).flatMap((d) => d.slugs),
            }))
          }
        />
        <EscolherVarios
          titulo="Lojas que vão para o grupo"
          dica="Nenhuma marcada = todas as lojas (inclusive as que não estão nesta lista)."
          opcoes={lojasDestaque.map((l) => ({ id: l.slug, nome: l.nome }))}
          marcados={c.whatsapp_lojas ?? []}
          aoMudar={(lista) =>
            setC((atual) => ({
              ...atual,
              whatsapp_lojas: lista,
              whatsapp_lojas_nomes: lojasDestaque.filter((l) => lista.includes(l.slug)).flatMap((l) => l.nomesNoBanco),
            }))
          }
        />

        <label style={{ display: "flex", flexDirection: "column", gap: 6, margin: "12px 0" }}>
          <strong>Id do grupo</strong>
          <input
            className="adm-input"
            placeholder="120363012345678901@g.us"
            value={c.whatsapp_grupo ?? ""}
            onChange={(e) => mudar("whatsapp_grupo")(e.target.value.trim())}
          />
          <small className="adm-sub">
            Para ver o id dos seus grupos, rode no VS Code: node --env-file=.env.local scripts/testar-whatsapp.mjs
          </small>
        </label>

        <p className="adm-sub" style={{ marginBottom: 0 }}>
          Campos: {"{titulo} {frase} {loja} {preco} {preco_antigo} {desconto} {economia} {cupom} {link} {link_site}"}. Linha
          com campo vazio some sozinha; trecho entre [[ e ]] some quando tem campo vazio. Formatação do WhatsApp:
          *negrito*, _itálico_, ~riscado~.
        </p>
        <div className="adm-chaves">
          <Chave
            rotulo="Frase engraçada da IA no campo {frase}"
            dica="A IA (Gemini) cria uma frase para cada produto. Desligado, ou se a IA falhar: o robô sorteia uma frase pronta. Coloque {frase} no modelo para aparecer."
            ligado={c.whatsapp_frase_ia}
            aoMudar={mudar("whatsapp_frase_ia")}
          />
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0 4px" }}>
          <strong>Estilo da frase</strong>
          <input
            className="adm-input"
            value={c.whatsapp_frase_estilo ?? ""}
            placeholder={ESTILO_PADRAO}
            onChange={(e) => mudar("whatsapp_frase_estilo")(e.target.value)}
          />
          <span style={{ maxWidth: 260 }}>
            <Numero
              rotulo="Tamanho da frase"
              sufixo="palavras no máximo"
              min={2}
              max={15}
              dica="A IA nunca cita preço, números ou a loja."
              valor={c.whatsapp_frase_palavras}
              aoMudar={mudar("whatsapp_frase_palavras")}
            />
          </span>
          <small className="adm-sub">
            Como a IA deve escrever. Ex.: "engraçada, com trocadilho", "empolgada, estilo locutor de futebol", "irônica e
            curta". Vazio = estilo padrão.
          </small>
        </label>
        <ModeloWhatsApp
          rotulo="Modelo da mensagem (ofertas)"
          valor={c.whatsapp_modelo}
          padrao={MODELO_PADRAO}
          exemplo={EXEMPLO_OFERTA}
          aoMudar={mudar("whatsapp_modelo")}
        />
        <ModeloWhatsApp
          rotulo="Modelo da mensagem (cupons)"
          valor={c.whatsapp_modelo_cupom}
          padrao={MODELO_CUPOM_PADRAO}
          exemplo={EXEMPLO_CUPOM}
          aoMudar={mudar("whatsapp_modelo_cupom")}
        />

        <div className="adm-duas-colunas">
          <Numero
            rotulo="Mensagens a cada 30 minutos"
            sufixo="msgs"
            min={1}
            max={30}
            valor={c.whatsapp_max_por_execucao}
            aoMudar={mudar("whatsapp_max_por_execucao")}
          />
          <Numero
            rotulo="Máximo por hora"
            sufixo="msgs"
            min={1}
            max={60}
            dica="Grupos com mensagem demais perdem membros (e o WhatsApp desconfia)."
            valor={c.whatsapp_max_por_hora}
            aoMudar={mudar("whatsapp_max_por_hora")}
          />
          <Numero
            rotulo="Intervalo entre mensagens"
            sufixo="segundos"
            min={10}
            max={300}
            dica="Varia um pouco a cada envio, para não parecer robô."
            valor={c.whatsapp_intervalo_segundos}
            aoMudar={mudar("whatsapp_intervalo_segundos")}
          />
          <Numero
            rotulo="Só produtos a partir de"
            sufixo="R$"
            passo={10}
            dica="0 = qualquer preço. Não vale para os cupons."
            valor={c.whatsapp_preco_minimo}
            aoMudar={mudar("whatsapp_preco_minimo")}
          />
          <Numero
            rotulo="Só ofertas com desconto a partir de"
            sufixo="%"
            min={0}
            max={90}
            dica="0 = todas as ofertas que entram no site."
            valor={c.whatsapp_desconto_minimo}
            aoMudar={mudar("whatsapp_desconto_minimo")}
          />
          <Numero
            rotulo="Começar a enviar às"
            sufixo="h"
            min={0}
            max={23}
            valor={c.whatsapp_hora_inicio}
            aoMudar={mudar("whatsapp_hora_inicio")}
          />
          <Numero
            rotulo="Parar de enviar às"
            sufixo="h"
            min={1}
            max={24}
            dica="Horário de Brasília. Fora desse horário o robô não envia."
            valor={c.whatsapp_hora_fim}
            aoMudar={mudar("whatsapp_hora_fim")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🏷️ Cupons</h2>
        <p>
          O robô busca os cupons da Lomadee e da Awin a cada 30 minutos e coloca na aba Cupons do site. Os cupons do
          Telegram e os cadastrados na aba Cupons deste painel também aparecem lá.
        </p>
        <div className="adm-chaves">
          <Chave
            rotulo="Buscar cupons da Lomadee e da Awin"
            dica="Desligado: o robô não traz cupons novos dessas redes (os do Telegram e do painel continuam)."
            ligado={c.cupons_ativo}
            aoMudar={mudar("cupons_ativo")}
          />
        </div>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Cupons por rede"
            sufixo="cupons"
            min={1}
            max={200}
            dica="Máximo de cupons de cada rede (Lomadee, Awin) a cada execução."
            valor={c.cupons_max_por_rede}
            aoMudar={mudar("cupons_max_por_rede")}
          />
        </div>
        <EscolherVarios
          titulo="Lojas que podem ter cupom no site"
          dica="Cupons de outras lojas (vindos da Lomadee, da Awin ou do Telegram) não entram. Os cadastrados à mão na aba Cupons do painel sempre aparecem."
          opcoes={LOJAS_GRANDES.map((l) => ({ id: l.nome, nome: l.nome }))}
          marcados={c.cupons_lojas ?? LOJAS_CUPOM_PADRAO}
          semTodos
          aoMudar={mudar("cupons_lojas")}
        />
      </section>

      <section className="adm-bloco">
        <h2>🛒 AliExpress</h2>
        <p>O robô do AliExpress roda junto com a coleta, a cada 30 minutos.</p>
        <div className="adm-chaves">
          <Chave
            rotulo="Coletar ofertas do AliExpress"
            dica="Desligado: o robô não traz ofertas novas do AliExpress (as que já estão no site continuam)."
            ligado={c.aliexpress_ativo}
            aoMudar={mudar("aliexpress_ativo")}
          />
          <Chave
            rotulo="Só os mais vendidos (top sellers)"
            dica="Busca na lista de produtos em alta do AliExpress. Se ela não tiver nada para a busca, usa a busca comum pelos mais vendidos."
            ligado={c.aliexpress_so_mais_vendidos}
            aoMudar={mudar("aliexpress_so_mais_vendidos")}
          />
        </div>
        <label className="adm-campo" style={{ marginBottom: 14 }}>
          <span className="adm-rotulo">Vem do Brasil: entrega em até</span>
          <select
            className="adm-input adm-input--curto"
            value={c.aliexpress_entrega_dias}
            onChange={(e) => mudar("aliexpress_entrega_dias")(Number(e.target.value))}
          >
            <option value={3}>3 dias</option>
            <option value={5}>5 dias</option>
            <option value={7}>7 dias (recomendado)</option>
            <option value={10}>10 dias</option>
            <option value={0}>Qualquer prazo (inclui envio da China)</option>
          </select>
          <small>
            A API do AliExpress não tem um filtro &quot;Vem do Brasil&quot;. Entrega rápida é o que separa os produtos que já estão
            no estoque nacional dos que vêm da China (20 dias ou mais).
          </small>
        </label>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Só ofertas acima de"
            sufixo="R$"
            passo={5}
            valor={c.aliexpress_preco_minimo}
            aoMudar={mudar("aliexpress_preco_minimo")}
          />
          <Numero
            rotulo="Máximo de ofertas novas por execução"
            sufixo="ofertas"
            min={1}
            max={50}
            valor={c.aliexpress_max_por_execucao}
            aoMudar={mudar("aliexpress_max_por_execucao")}
          />
          <Numero
            rotulo="Buscas de tecnologia por execução"
            sufixo="buscas"
            max={15}
            dica="TV, monitor, notebook, celular, hardware."
            valor={c.aliexpress_buscas_tecnologia}
            aoMudar={mudar("aliexpress_buscas_tecnologia")}
          />
          <Numero
            rotulo="Buscas de outras categorias por execução"
            sufixo="buscas"
            max={15}
            valor={c.aliexpress_buscas_outras}
            aoMudar={mudar("aliexpress_buscas_outras")}
          />
          <Numero
            rotulo="Produtos pedidos à API em cada busca"
            sufixo="produtos"
            min={5}
            max={50}
            dica="Quanto menor, mais rápido e menos chamadas (máximo 50)."
            valor={c.aliexpress_por_busca}
            aoMudar={mudar("aliexpress_por_busca")}
          />
          <Numero
            rotulo="Máximo de ofertas de cada busca"
            sufixo="ofertas"
            min={1}
            max={20}
            valor={c.aliexpress_max_por_busca}
            aoMudar={mudar("aliexpress_max_por_busca")}
          />
          <Numero
            rotulo="Avaliação positiva mínima"
            sufixo="%"
            max={100}
            valor={c.aliexpress_avaliacao_minima}
            aoMudar={mudar("aliexpress_avaliacao_minima")}
          />
          <Numero
            rotulo="Vendas mínimas do produto"
            sufixo="vendas"
            passo={10}
            valor={c.aliexpress_vendas_minimas}
            aoMudar={mudar("aliexpress_vendas_minimas")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>💲 Conferência de preço</h2>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Conferir o preço de cada oferta a cada"
            sufixo="horas"
            min={1}
            max={72}
            valor={c.horas_entre_conferencias}
            aoMudar={mudar("horas_entre_conferencias")}
          />
          <Numero
            rotulo="O preço pode subir até"
            sufixo="%"
            max={100}
            dica="Passando disso, a oferta fica como Expirada. Se o preço cair, a oferta continua."
            valor={c.tolerancia_percentual}
            aoMudar={mudar("tolerancia_percentual")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🔄 Renovação</h2>
        <p>Oferta perto de expirar que continua com o preço de promoção ganha mais dias no site.</p>
        <div className="adm-chaves">
          <Chave
            rotulo="Renovar ofertas que mantêm o preço"
            ligado={c.renovar_se_preco_mantido}
            aoMudar={mudar("renovar_se_preco_mantido")}
          />
        </div>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Dias a mais em cada renovação"
            sufixo="dias"
            min={1}
            max={30}
            valor={c.dias_renovacao}
            aoMudar={mudar("dias_renovacao")}
          />
          <Numero
            rotulo="Máximo de renovações"
            sufixo="vezes"
            dica="0 = sem limite."
            max={20}
            valor={c.max_renovacoes}
            aoMudar={mudar("max_renovacoes")}
          />
        </div>
      </section>

      <section className="adm-bloco adm-bloco--info">
        <h2>📅 Prazos fixos</h2>
        <p>
          Estes ficam no arquivo <code>lib/prazos.mjs</code> porque o site também usa para mostrar a tag Expirado:
        </p>
        <ul className="adm-lista-simples">
          <li>
            Oferta fica no ar por <strong>{DIAS_NO_SITE} dias</strong> antes de expirar
          </li>
          <li>
            Expirada continua visível por <strong>{DIAS_EXPIRADA_VISIVEL} dias</strong> e depois é apagada
          </li>
          <li>
            Oferta apagada não volta pelo robô por <strong>{DIAS_BLOQUEIO_REPUBLICAR} dias</strong>
          </li>
        </ul>
      </section>
    </>
  );
}

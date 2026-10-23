"use client";

import { useState } from "react";
import { categorias } from "../data/ofertas";

const vazio = {
  usuario: "",
  email: "",
  titulo: "",
  loja: "",
  categoria: categorias[0].slug,
  preco_atual: "",
  preco_antigo: "",
  link: "",
  cupom: "",
  aceite: false,
  website: "", // armadilha para robôs: pessoas não veem nem preenchem
};

export default function FormComunidade() {
  const [f, setF] = useState(vazio);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [abertoEm] = useState(() => Date.now());

  const mudar = (campo, valor) => setF((atual) => ({ ...atual, [campo]: valor }));

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const resposta = await fetch("/api/comunidade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, ms: Date.now() - abertoEm }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok || !dados.ok) {
        setErro(dados.erro ?? "Não foi possível enviar agora. Tente novamente em instantes.");
      } else {
        setEnviado(true);
        setF(vazio);
      }
    } catch {
      setErro("Sem conexão com o servidor. Tente novamente.");
    }
    setEnviando(false);
  }

  if (enviado) {
    return (
      <div className="formulario">
        <h2>Recebemos a sua promoção!</h2>
        <p>
          Ela vai passar por uma revisão da equipe. Se for aprovada, aparece na aba Promoções da
          Comunidade com o seu nome de usuário.
        </p>
        <button type="button" className="botao botao-form" onClick={() => setEnviado(false)}>
          Enviar outra promoção
        </button>
      </div>
    );
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <div className="duas">
        <label className="campo">
          <span className="rotulo">Nome de usuário</span>
          <input
            value={f.usuario}
            onChange={(e) => mudar("usuario", e.target.value)}
            maxLength={30}
            autoComplete="nickname"
            required
          />
          <span className="dica">Aparece publicamente na promoção.</span>
        </label>
        <label className="campo">
          <span className="rotulo">E-mail</span>
          <input
            type="email"
            value={f.email}
            onChange={(e) => mudar("email", e.target.value)}
            maxLength={120}
            autoComplete="email"
            required
          />
          <span className="dica">Não é publicado. Usamos só para falar sobre o seu envio.</span>
        </label>
      </div>

      <label className="campo">
        <span className="rotulo">Título da promoção</span>
        <input
          value={f.titulo}
          onChange={(e) => mudar("titulo", e.target.value)}
          maxLength={200}
          required
        />
      </label>

      <div className="duas">
        <label className="campo">
          <span className="rotulo">Loja</span>
          <input
            value={f.loja}
            onChange={(e) => mudar("loja", e.target.value)}
            maxLength={60}
            placeholder="Amazon, Shopee..."
            required
          />
        </label>
        <label className="campo">
          <span className="rotulo">Categoria</span>
          <select value={f.categoria} onChange={(e) => mudar("categoria", e.target.value)}>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="duas">
        <label className="campo">
          <span className="rotulo">Preço atual (R$)</span>
          <input
            inputMode="decimal"
            placeholder="199,90"
            value={f.preco_atual}
            onChange={(e) => mudar("preco_atual", e.target.value)}
            required
          />
        </label>
        <label className="campo">
          <span className="rotulo">Preço antigo (R$)</span>
          <input
            inputMode="decimal"
            placeholder="299,90"
            value={f.preco_antigo}
            onChange={(e) => mudar("preco_antigo", e.target.value)}
          />
          <span className="dica">Opcional.</span>
        </label>
      </div>

      <label className="campo">
        <span className="rotulo">Link da promoção</span>
        <input
          type="url"
          placeholder="https://..."
          value={f.link}
          onChange={(e) => mudar("link", e.target.value)}
          maxLength={500}
          required
        />
        <span className="dica">A equipe pode revisar e ajustar o link antes de publicar.</span>
      </label>

      <label className="campo">
        <span className="rotulo">Cupom</span>
        <input value={f.cupom} onChange={(e) => mudar("cupom", e.target.value)} maxLength={30} />
        <span className="dica">Opcional.</span>
      </label>

      <div className="armadilha" aria-hidden="true">
        <label>
          Não preencha este campo
          <input
            tabIndex={-1}
            autoComplete="off"
            value={f.website}
            onChange={(e) => mudar("website", e.target.value)}
          />
        </label>
      </div>

      <label className="aceite">
        <input
          type="checkbox"
          checked={f.aceite}
          onChange={(e) => mudar("aceite", e.target.checked)}
        />
        <span>
          Concordo que o meu nome de usuário seja exibido junto da promoção e que o meu e-mail seja
          guardado só para contato sobre este envio.
        </span>
      </label>

      {erro && <p className="erro">{erro}</p>}

      <button className="botao botao-form" disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar para revisão"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { tempoAtras } from "../lib/ofertas";

const CAMPOS = "id, autor, texto, criado_em, user_id";

export default function Comentarios({ ofertaId }) {
  const [usuario, setUsuario] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  // Descobre se tem alguém logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUsuario(data.session?.user ?? null));
    const { data: escuta } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setUsuario(sessao?.user ?? null);
    });
    return () => escuta.subscription.unsubscribe();
  }, []);

  // Carrega os comentários
  useEffect(() => {
    let cancelado = false;
    supabase
      .from("comentarios")
      .select(CAMPOS)
      .eq("oferta_id", ofertaId)
      .order("criado_em", { ascending: false })
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) setErro("Não foi possível carregar os comentários.");
        else setComentarios(data ?? []);
        setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [ofertaId]);

  async function publicar(e) {
    e.preventDefault();
    const limpo = texto.trim();
    if (!limpo) return;

    setEnviando(true);
    setErro("");
    const { data, error } = await supabase
      .from("comentarios")
      .insert({ oferta_id: ofertaId, texto: limpo })
      .select(CAMPOS)
      .single();
    setEnviando(false);

    if (error) {
      setErro("Não foi possível publicar seu comentário. Tente de novo.");
      return;
    }
    setComentarios((atuais) => [data, ...atuais]);
    setTexto("");
  }

  async function apagar(id) {
    if (!window.confirm("Apagar este comentário?")) return;
    const { error } = await supabase.from("comentarios").delete().eq("id", id);
    if (error) {
      setErro("Não foi possível apagar o comentário.");
      return;
    }
    setComentarios((atuais) => atuais.filter((c) => c.id !== id));
  }

  return (
    <section className="comentarios" aria-labelledby="titulo-comentarios">
      <h2 id="titulo-comentarios" className="comentarios-titulo">
        Comentários {comentarios.length > 0 && <span>({comentarios.length})</span>}
      </h2>

      {usuario ? (
        <form onSubmit={publicar} className="coment-form">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O preço está bom? Já comprou? Conte para a comunidade..."
            maxLength={1000}
            rows={3}
            required
          />
          <div className="coment-form-rodape">
            <small>{texto.length}/1000</small>
            <button type="submit" className="botao" disabled={enviando}>
              {enviando ? "Publicando..." : "Publicar comentário"}
            </button>
          </div>
        </form>
      ) : (
        <div className="coment-login">
          <p>💬 Entre na sua conta para comentar e ajudar a comunidade.</p>
          <Link href={`/entrar?voltar=/oferta/${ofertaId}`} className="botao">
            Entrar ou inscrever-se
          </Link>
        </div>
      )}

      {erro && <p className="auth-erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando comentários...</p>
      ) : comentarios.length === 0 ? (
        <p className="vazio">Ainda não há comentários. Seja o primeiro a comentar!</p>
      ) : (
        <ul className="coment-lista">
          {comentarios.map((c) => (
            <li key={c.id} className="coment-item">
              <div className="coment-avatar" aria-hidden="true">
                {c.autor.charAt(0).toUpperCase()}
              </div>
              <div className="coment-corpo">
                <p className="coment-meta">
                  <strong>{c.autor}</strong>
                  <span>{tempoAtras(c.criado_em)}</span>
                  {usuario && usuario.id === c.user_id && (
                    <button type="button" className="coment-apagar" onClick={() => apagar(c.id)}>
                      Apagar
                    </button>
                  )}
                </p>
                <p className="coment-texto">{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
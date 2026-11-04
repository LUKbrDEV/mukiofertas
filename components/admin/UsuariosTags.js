"use client";

// Aba "Usuários e tags" do painel admin: procura usuários, mostra o XP do mês
// e coloca/tira as tags (ADMIN, Verificado, Caçador...). Cada clique já salva.
// Salve como components/admin/UsuariosTags.js.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Avatar from "../Avatar";
import { TAGS, SeloTag, ordenarTags, tagDoId } from "../../data/tags";

export default function UsuariosTags() {
  const [busca, setBusca] = useState("");
  const [usuarios, setUsuarios] = useState(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(null); // id do usuário sendo salvo

  const carregar = useCallback(async (texto) => {
    setErro("");
    const { data, error } = await supabase.rpc("admin_usuarios", { busca: texto.trim() });
    if (error) {
      setErro(`${error.message} (rodou o ranking.sql no Supabase?)`);
      setUsuarios([]);
    } else setUsuarios(data ?? []);
  }, []);

  // Busca enquanto digita (espera 400 ms parado)
  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 400);
    return () => clearTimeout(t);
  }, [busca, carregar]);

  async function alternar(usuario, tagId) {
    const atuais = usuario.tags ?? [];
    const novas = atuais.includes(tagId) ? atuais.filter((t) => t !== tagId) : [...atuais, tagId];
    setSalvando(usuario.user_id);
    const { data, error } = await supabase.rpc("admin_definir_tags", { p_user: usuario.user_id, p_tags: novas });
    setSalvando(null);
    if (error) return setErro(`Não foi possível salvar: ${error.message}`);
    setUsuarios((lista) => lista.map((u) => (u.user_id === usuario.user_id ? { ...u, tags: data ?? novas } : u)));
  }

  return (
    <>
      <h1>Usuários e tags</h1>
      <p className="adm-sub">
        Cada oferta da comunidade aprovada vale XP no ranking do mês da página inicial. Clique nas tags para colocar ou
        tirar do usuário (salva na hora).
      </p>

      <div className="adm-filtros">
        <input
          className="adm-input"
          style={{ maxWidth: 360 }}
          placeholder="Procurar por nome ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {erro && <p className="adm-erro">{erro}</p>}
      {usuarios === null && <p className="adm-vazio">Carregando...</p>}
      {usuarios?.length === 0 && !erro && <p className="adm-vazio">Nenhum usuário encontrado.</p>}

      <div className="adm-lista">
        {usuarios?.map((u) => {
          const tags = u.tags ?? [];
          const extras = tags.filter((t) => !TAGS.some((x) => x.id === t)); // tags antigas fora da lista
          return (
            <div key={u.user_id} className="adm-linha" style={{ opacity: salvando === u.user_id ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Avatar
                  usuario={{
                    email: u.email,
                    user_metadata: {
                      nome: u.nome,
                      avatar_url: u.avatar_url,
                      avatar_icone: u.avatar_icone,
                      avatar_cor: u.avatar_cor,
                    },
                  }}
                  tamanho={38}
                  borda={false}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{u.nome || u.email?.split("@")[0]}</strong>{" "}
                  {ordenarTags(tags).map((t) => (
                    <SeloTag key={t} id={t} pequeno />
                  ))}
                  <div className="adm-linha-meta">
                    <span>{u.email}</span>
                    <span>⭐ {u.xp_mes} XP no mês</span>
                    <span>{u.ofertas_total} ofertas aprovadas no total</span>
                  </div>
                </div>
              </div>

              <div className="adm-chips" style={{ marginTop: 10 }}>
                {[...TAGS, ...extras.map(tagDoId)].map((t) => {
                  const ativa = tags.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`adm-chip${ativa ? " adm-chip--ativo" : ""}`}
                      aria-pressed={ativa}
                      disabled={salvando === u.user_id}
                      onClick={() => alternar(u, t.id)}
                      title={ativa ? "Clique para tirar" : "Clique para colocar"}
                    >
                      {ativa ? "✓ " : "+ "}
                      {t.icone} {t.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

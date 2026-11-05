// Perfil público do membro: /membro/nome_de_usuario
// Salve como app/membro/[nome]/page.js.
// Lê a função perfil_publico do Supabase (supabase-melhorias.sql). Nunca mostra o e-mail.

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { estaExpirada } from "../../../lib/ofertas";
import Avatar from "../../../components/Avatar";
import ListaOfertas from "../../../components/ListaOfertas";
import { SeloTag, ordenarTags } from "../../../data/tags";

export const revalidate = 120;

async function buscarPerfil(nome) {
  const { data, error } = await supabase.rpc("perfil_publico", { p_nome: nome });
  if (error) {
    console.error("Erro ao buscar perfil:", error.message);
    return null;
  }
  return data ?? null;
}

export async function generateMetadata({ params }) {
  const { nome } = await params;
  const perfil = await buscarPerfil(decodeURIComponent(nome));
  if (!perfil) return { title: "Membro não encontrado | MukiOfertas", robots: { index: false } };
  return {
    title: `${perfil.nome} na comunidade | MukiOfertas`,
    description: `${perfil.nome} já compartilhou ${perfil.ofertas} ofertas no MukiOfertas e tem ${perfil.xp} XP.`,
    alternates: { canonical: `/membro/${encodeURIComponent(perfil.nome)}` },
  };
}

const CSS = `
  .mb-topo { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin: 18px 0 22px;
             padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
             box-shadow: 0 4px 16px rgba(15, 23, 42, .06); }
  .mb-info { flex: 1; min-width: 200px; }
  .mb-info h1 { margin: 0 0 6px; font-size: 24px; color: #0f172a; word-break: break-word; }
  .mb-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
  .mb-desde { color: #64748b; font-size: 13px; margin: 0; }
  .mb-numeros { display: flex; gap: 10px; flex-wrap: wrap; }
  .mb-numero { min-width: 92px; padding: 10px 14px; border-radius: 12px; background: #f8fafc; text-align: center; }
  .mb-numero strong { display: block; font-size: 22px; color: #ff7a1a; }
  .mb-numero span { font-size: 12px; color: #64748b; }
`;

export default async function PaginaMembro({ params }) {
  const { nome } = await params;
  const perfil = await buscarPerfil(decodeURIComponent(nome));
  if (!perfil) notFound();

  const ids = Array.isArray(perfil.ofertas_ids) ? perfil.ofertas_ids : [];
  let ofertas = [];
  if (ids.length > 0) {
    const { data } = await supabase.from("ofertas").select("*").in("id", ids).eq("ativa", true);
    const porId = new Map((data ?? []).map((o) => [o.id, { ...o, expirada: estaExpirada(o) }]));
    const naOrdem = ids.map((id) => porId.get(id)).filter(Boolean); // mais recentes primeiro
    ofertas = [...naOrdem.filter((o) => !o.expirada), ...naOrdem.filter((o) => o.expirada)];
  }

  const usuario = {
    user_metadata: {
      nome: perfil.nome,
      avatar_url: perfil.avatar_url,
      avatar_icone: perfil.avatar_icone,
      avatar_cor: perfil.avatar_cor,
    },
  };
  const desde = perfil.membro_desde
    ? new Date(perfil.membro_desde).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;

  return (
    <>
      <style>{CSS}</style>
      <nav className="produto-voltar" aria-label="Você está em">
        <Link href="/">Início</Link> › <Link href="/comunidade">Comunidade</Link> › {perfil.nome}
      </nav>

      <section className="mb-topo">
        <Avatar usuario={usuario} tamanho={76} borda={false} />
        <div className="mb-info">
          <h1>{perfil.nome}</h1>
          {perfil.tags?.length > 0 && (
            <div className="mb-tags">
              {ordenarTags(perfil.tags).map((t) => (
                <SeloTag key={t} id={t} />
              ))}
            </div>
          )}
          {desde && <p className="mb-desde">Membro desde {desde}</p>}
        </div>
        <div className="mb-numeros">
          <div className="mb-numero">
            <strong>{perfil.xp}</strong>
            <span>XP total</span>
          </div>
          <div className="mb-numero">
            <strong>{perfil.xp_mes}</strong>
            <span>XP este mês</span>
          </div>
          <div className="mb-numero">
            <strong>{perfil.ofertas}</strong>
            <span>{perfil.ofertas === 1 ? "oferta aprovada" : "ofertas aprovadas"}</span>
          </div>
        </div>
      </section>

      <h2 className="titulo-secao">Ofertas compartilhadas</h2>
      <ListaOfertas
        ofertas={ofertas}
        vazio={`${perfil.nome} ainda não tem ofertas aprovadas.`}
      />
    </>
  );
}

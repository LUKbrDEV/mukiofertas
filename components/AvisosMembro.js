"use client";

// Avisos para quem está logado, no canto da tela:
//   ✅ "Sua oferta foi aprovada! +10 XP"  (função minhas_aprovacoes, supabase-melhorias.sql)
//   🔔 "Apareceu uma oferta do seu alerta" (tabela avisos_alerta, criada pelo robô avisar-alertas.mjs)
// Salve como components/AvisosMembro.js. Usado pelo app/layout.js.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const CHAVE = "muki-aprovacoes-vistas";

const CSS = `
  .avm { position: fixed; right: 16px; bottom: 16px; z-index: 60; width: min(340px, calc(100vw - 32px));
         display: flex; flex-direction: column; gap: 10px; }
  .avm-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px 14px;
              box-shadow: 0 12px 32px rgba(15, 23, 42, .18); font-size: 14px; color: #0f172a;
              animation: avm-entra .25s ease-out; }
  .avm-card strong { display: block; margin-bottom: 4px; font-size: 15px; }
  .avm-card ul { margin: 6px 0 10px; padding-left: 18px; }
  .avm-card li { margin: 3px 0; }
  .avm-card a { color: #0a4bb8; font-weight: 700; text-decoration: none; }
  .avm-card a:hover { text-decoration: underline; }
  .avm-xp { color: #ff7a1a; font-weight: 800; }
  .avm-botoes { display: flex; gap: 8px; justify-content: flex-end; }
  .avm-btn { border: none; border-radius: 8px; padding: 7px 12px; font-weight: 700; cursor: pointer;
             background: #f1f5f9; color: #334155; font-size: 13px; }
  .avm-btn--forte { background: #ff7a1a; color: #fff; }
  @keyframes avm-entra { from { opacity: 0; transform: translateY(10px); } }
`;

function lerVisto() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}
function guardarVisto(iso) {
  try {
    localStorage.setItem(CHAVE, iso);
  } catch {
    // sem localStorage: o aviso pode aparecer de novo, sem problema
  }
}

export default function AvisosMembro() {
  const pathname = usePathname();
  const [aprovadas, setAprovadas] = useState([]);
  const [alertas, setAlertas] = useState([]);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/entrar")) return;
    let ativo = true;

    (async () => {
      const { data: sessao } = await supabase.auth.getSession();
      const usuario = sessao?.session?.user;
      if (!usuario || !ativo) return;

      // Aprovações desde a última vez que a pessoa fechou o aviso (na 1ª vez: últimos 7 dias)
      const desde = lerVisto() || new Date(Date.now() - 7 * 86400000).toISOString();
      const [r1, r2] = await Promise.all([
        supabase.rpc("minhas_aprovacoes", { p_desde: desde }),
        supabase
          .from("avisos_alerta")
          .select("id, criado_em, alerta:alertas(termo), oferta:ofertas(id, titulo, preco_atual)")
          .eq("lido", false)
          .order("criado_em", { ascending: false })
          .limit(5),
      ]);
      if (!ativo) return;
      if (!r1.error) setAprovadas(r1.data ?? []);
      if (!r2.error) setAlertas((r2.data ?? []).filter((a) => a.oferta));
    })();

    return () => {
      ativo = false;
    };
    // roda de novo quando a pessoa troca de página (pega aprovações novas sem recarregar)
  }, [pathname]);

  function fecharAprovadas() {
    const maisNova = aprovadas[0]?.aprovada_em ?? new Date().toISOString();
    guardarVisto(maisNova);
    setAprovadas([]);
  }

  async function fecharAlertas() {
    const ids = alertas.map((a) => a.id);
    setAlertas([]);
    if (ids.length) await supabase.from("avisos_alerta").update({ lido: true }).in("id", ids);
  }

  if (aprovadas.length === 0 && alertas.length === 0) return null;
  const xpTotal = aprovadas.reduce((t, a) => t + (Number(a.xp) || 0), 0);
  const preco = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="avm" role="status" aria-live="polite">
      <style>{CSS}</style>

      {aprovadas.length > 0 && (
        <div className="avm-card">
          <strong>
            ✅ {aprovadas.length === 1 ? "Sua oferta foi aprovada!" : `${aprovadas.length} ofertas suas foram aprovadas!`}{" "}
            {xpTotal > 0 && <span className="avm-xp">+{xpTotal} XP</span>}
          </strong>
          <ul>
            {aprovadas.slice(0, 3).map((a) => (
              <li key={a.id}>
                {a.oferta_id ? <Link href={`/oferta/${a.oferta_id}`}>{a.titulo}</Link> : a.titulo}
              </li>
            ))}
          </ul>
          <div className="avm-botoes">
            <button type="button" className="avm-btn" onClick={fecharAprovadas}>
              Fechar
            </button>
            <Link href="/comunidade/enviar" className="avm-btn avm-btn--forte" onClick={fecharAprovadas}>
              Enviar outra
            </Link>
          </div>
        </div>
      )}

      {alertas.length > 0 && (
        <div className="avm-card">
          <strong>🔔 {alertas.length === 1 ? "Apareceu uma oferta do seu alerta" : "Apareceram ofertas dos seus alertas"}</strong>
          <ul>
            {alertas.map((a) => (
              <li key={a.id}>
                <Link href={`/oferta/${a.oferta.id}`} onClick={fecharAlertas}>
                  {a.oferta.titulo}
                </Link>{" "}
                por {preco(a.oferta.preco_atual)}
              </li>
            ))}
          </ul>
          <div className="avm-botoes">
            <Link href="/alertas" className="avm-btn">
              Meus alertas
            </Link>
            <button type="button" className="avm-btn avm-btn--forte" onClick={fecharAlertas}>
              Ok
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

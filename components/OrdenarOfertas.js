"use client";

// Seletor "Ordenar por" das páginas de categoria. Salve como components/OrdenarOfertas.js.
// Guarda a escolha no endereço (?ordem=menor-preco), então o link pode ser compartilhado.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ORDENS, ORDEM_PADRAO, ordemValida } from "../lib/ordenar";

const CSS = `
  .ordenar { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: #475569; }
  .ordenar select {
    height: 38px;
    padding: 0 34px 0 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center;
    appearance: none;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    cursor: pointer;
  }
  .ordenar select:focus { outline: 2px solid #0a4bb8; outline-offset: 1px; }
  .ordenar[data-carregando="true"] select { opacity: 0.6; }
`;

export default function OrdenarOfertas() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [carregando, iniciar] = useTransition();
  const atual = ordemValida(params.get("ordem"));

  function trocar(e) {
    const novos = new URLSearchParams(params.toString());
    novos.delete("pagina"); // mudou a ordem: volta para a primeira página
    if (e.target.value === ORDEM_PADRAO) novos.delete("ordem");
    else novos.set("ordem", e.target.value);
    const busca = novos.toString();
    iniciar(() => router.replace(busca ? `${pathname}?${busca}` : pathname, { scroll: false }));
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <label className="ordenar" data-carregando={carregando}>
        Ordenar por
        <select value={atual} onChange={trocar}>
          {ORDENS.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.nome}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

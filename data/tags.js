// Tags (selos) que você coloca nos usuários pelo admin (aba "Usuários e tags").
// Salve como data/tags.js.
// Para criar uma tag nova, é só acrescentar uma linha aqui (o "id" é o que fica salvo no banco).

export const TAGS = [
  { id: "admin", nome: "ADMIN", icone: "🛡️", cor: "#ffffff", fundo: "#dc2626" },
  { id: "moderador", nome: "Moderador", icone: "🔧", cor: "#ffffff", fundo: "#7c3aed" },
  { id: "verificado", nome: "Verificado", icone: "✔", cor: "#ffffff", fundo: "#0a4bb8" },
  { id: "cacador", nome: "Caçador", icone: "🎯", cor: "#ffffff", fundo: "#ff7a1a" },
  { id: "top", nome: "Top do mês", icone: "🏆", cor: "#3d2c00", fundo: "#ffd60a" },
  { id: "parceiro", nome: "Parceiro", icone: "🤝", cor: "#ffffff", fundo: "#0891b2" },
  { id: "veterano", nome: "Veterano", icone: "⭐", cor: "#ffffff", fundo: "#334155" },
  { id: "vip", nome: "VIP", icone: "💎", cor: "#ffffff", fundo: "#db2777" },
];

const POR_ID = new Map(TAGS.map((t) => [t.id, t]));

// Tag salva no banco que não existe mais na lista acima aparece em cinza com o próprio nome
export function tagDoId(id) {
  return POR_ID.get(id) ?? { id, nome: id, icone: "", cor: "#ffffff", fundo: "#64748b" };
}

// Ordem de exibição: a da lista acima (ADMIN primeiro)
export function ordenarTags(ids = []) {
  const ordem = (id) => {
    const i = TAGS.findIndex((t) => t.id === id);
    return i === -1 ? 999 : i;
  };
  return [...ids].sort((a, b) => ordem(a) - ordem(b));
}

export function SeloTag({ id, pequeno = false }) {
  const t = tagDoId(id);
  return (
    <span
      title={t.nome}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: pequeno ? "1px 6px" : "3px 9px",
        borderRadius: 999,
        fontSize: pequeno ? 10 : 12,
        fontWeight: 800,
        lineHeight: 1.4,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
        color: t.cor,
        background: t.fundo,
      }}
    >
      {t.icone && <span aria-hidden="true">{t.icone}</span>}
      {t.nome}
    </span>
  );
}

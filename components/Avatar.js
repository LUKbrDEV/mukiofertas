// Foto, ícone ou inicial do usuário, num círculo.
// Salve como components/Avatar.js.
// Lê do perfil do Supabase Auth: user_metadata.avatar_url (foto) ou
// user_metadata.avatar_icone + avatar_cor (ícone escolhido). Sem nenhum dos dois, mostra a inicial.

export const ICONES = ["🦊", "🐼", "🐯", "🐸", "🐙", "🦁", "🐧", "🦉", "🐺", "🐨", "🚀", "🎮", "⚡", "🔥", "💎", "🛒"];
export const CORES = ["#0a4bb8", "#ff7a1a", "#15803d", "#7c3aed", "#db2777", "#0891b2", "#334155", "#ca8a04"];

export function nomeDoUsuario(usuario) {
  return usuario?.user_metadata?.nome || usuario?.email?.split("@")[0] || "Usuário";
}

export default function Avatar({ usuario, tamanho = 36, borda = true }) {
  const meta = usuario?.user_metadata ?? {};
  const base = {
    width: tamanho,
    height: tamanho,
    minWidth: tamanho,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    boxSizing: "border-box",
    border: borda ? "2px solid #ffffff" : "none",
    flex: "none",
  };

  if (meta.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={meta.avatar_url}
        alt=""
        width={tamanho}
        height={tamanho}
        style={{ ...base, objectFit: "cover", background: "#e2e8f0" }}
      />
    );
  }

  if (meta.avatar_icone) {
    return (
      <span
        aria-hidden="true"
        style={{ ...base, background: meta.avatar_cor || CORES[0], fontSize: tamanho * 0.55, lineHeight: 1 }}
      >
        {meta.avatar_icone}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        ...base,
        background: meta.avatar_cor || CORES[0],
        color: "#ffffff",
        fontWeight: 800,
        fontSize: tamanho * 0.45,
        lineHeight: 1,
      }}
    >
      {nomeDoUsuario(usuario).charAt(0).toUpperCase()}
    </span>
  );
}
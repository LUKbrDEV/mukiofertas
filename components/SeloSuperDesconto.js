// Selo "🔥 Super desconto" (regra do painel admin: preço acima de R$ X e Y% de desconto).
// Salve como components/SeloSuperDesconto.js. Usado no CardOferta e na página do produto.

export default function SeloSuperDesconto({ grande = false }) {
  return (
    <span
      title="Super desconto: preço alto com desconto grande"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flex: "none",
        height: grande ? 26 : 20,
        padding: grande ? "0 10px" : "0 7px",
        borderRadius: 999,
        background: "linear-gradient(135deg, #ef4444, #f97316)",
        color: "#fff",
        fontSize: grande ? "0.8rem" : "0.68rem",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      🔥 Super desconto
    </span>
  );
}

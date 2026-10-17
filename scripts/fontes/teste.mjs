// Cada fonte devolve uma lista de ofertas neste mesmo formato.
// Quando você tiver a chave de uma API real (Lomadee, Awin, etc.),
// criaremos outro arquivo igual a este, trocando só o conteúdo.
export async function buscar() {
  return [
    {
      loja: "Loja Teste",
      id_externo: "T-001",
      titulo: "Notebook 15.6'' 8GB 256GB SSD",
      preco_atual: 2299.0,
      preco_antigo: 3199.0,
      link: "https://exemplo.com/notebook",
    },
    {
      loja: "Loja Teste",
      id_externo: "T-002",
      titulo: "Detergente Líquido Neutro 500ml",
      preco_atual: 2.5,
      preco_antigo: 3.9,
      link: "https://exemplo.com/detergente",
    },
    {
      loja: "Loja Teste",
      id_externo: "T-003",
      titulo: "Headset Gamer com Microfone",
      preco_atual: 119.9,
      preco_antigo: 249.9,
      link: "https://exemplo.com/headset",
    },
  ];
}
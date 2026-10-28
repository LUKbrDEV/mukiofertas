// Substitua o "export const categorias = [...]" do data/ofertas.js por este bloco.
// A ordem aqui é a ordem no menu Departamentos (só aparecem as que têm ofertas no ar).
// "pai" = subcategoria: aparece dentro do departamento indicado (ex.: SSD dentro de Hardware).

export const categorias = [
  { slug: "smartphones", nome: "Smartphones", emoji: "📱" },

  { slug: "hardware", nome: "Hardware", emoji: "🧩" },
  { slug: "processadores", nome: "Processadores", emoji: "⚙️", pai: "hardware" },
  { slug: "placa-mae", nome: "Placa-mãe", emoji: "🔌", pai: "hardware" },
  { slug: "ssd", nome: "SSD", emoji: "💾", pai: "hardware" },
  { slug: "placa-de-video", nome: "Placa de vídeo", emoji: "🎞️", pai: "hardware" },
  { slug: "memoria-ram", nome: "Memória RAM", emoji: "🧠", pai: "hardware" },

  { slug: "gabinete", nome: "Gabinetes", emoji: "🗄️" },
  { slug: "perifericos", nome: "Periféricos", emoji: "🖱️" },
  { slug: "computadores", nome: "Computadores", emoji: "🖥️" },
  { slug: "notebooks", nome: "Notebooks e Tablets", emoji: "💻" },
  { slug: "monitores", nome: "Monitores", emoji: "🖥️" },
  { slug: "tv", nome: "TVs", emoji: "📺" },
  { slug: "games", nome: "Video Games", emoji: "🎮" },
  { slug: "cadeiras-mesas", nome: "Cadeiras e Mesas", emoji: "🪑" },

  { slug: "eletronicos", nome: "Eletrônicos", emoji: "🎧" },
  { slug: "caixas-de-som", nome: "Caixas de Som", emoji: "🔊", pai: "eletronicos" },
  { slug: "redes", nome: "Redes e Wi-Fi", emoji: "📡", pai: "eletronicos" },
  { slug: "relogios", nome: "Smartwatch e Relógios", emoji: "⌚", pai: "eletronicos" },

  { slug: "cameras", nome: "Câmeras", emoji: "📷" },

  { slug: "casa", nome: "Casa e Cozinha", emoji: "🏠" },
  { slug: "cama-banho", nome: "Cama e Banho", emoji: "🛏️", pai: "casa" },
  { slug: "limpeza", nome: "Limpeza", emoji: "🧼", pai: "casa" },
  { slug: "casa-inteligente", nome: "Casa Inteligente", emoji: "💡", pai: "casa" },

  { slug: "ferramentas", nome: "Ferramentas", emoji: "🔧" },
  { slug: "perfumaria", nome: "Perfumaria", emoji: "🧴" },
  { slug: "beleza", nome: "Beleza e Saúde", emoji: "💄" },

  { slug: "moda", nome: "Moda", emoji: "👕" },
  { slug: "moda-infantil", nome: "Infantil", emoji: "🧒", pai: "moda" },
  { slug: "moda-masculina", nome: "Masculino", emoji: "👔", pai: "moda" },
  { slug: "moda-feminina", nome: "Feminino", emoji: "👗", pai: "moda" },

  { slug: "sapatos", nome: "Sapatos", emoji: "👟" },
  { slug: "mochilas", nome: "Mochilas e Malas", emoji: "🎒" },
  { slug: "brinquedos", nome: "Brinquedos", emoji: "🧸" },
  { slug: "livros", nome: "Livros", emoji: "📚" },
  { slug: "esporte", nome: "Esporte e Lazer", emoji: "⚽" },
  { slug: "outros", nome: "Outras ofertas", emoji: "🏷️" },
];
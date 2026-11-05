// Substitua o "export const categorias = [...]" do data/ofertas.js por este bloco (até o "];").
// A ordem aqui é a ordem no menu Departamentos (só aparecem as que têm ofertas no ar).
// "pai" = subcategoria: aparece dentro do departamento indicado (ex.: SSD dentro de Hardware).

export const categorias = [
  { slug: "smartphones", nome: "Smartphones", emoji: "📱" },
  { slug: "celulares", nome: "Smartphones", emoji: "📱", pai: "smartphones" },
  { slug: "acessorios-celular", nome: "Acessórios", emoji: "🔌", pai: "smartphones" },

  { slug: "hardware", nome: "Hardware", emoji: "🧩" },
  { slug: "processadores", nome: "Processadores", emoji: "⚙️", pai: "hardware" },
  { slug: "placa-mae", nome: "Placa-mãe", emoji: "🔌", pai: "hardware" },
  { slug: "ssd", nome: "SSD", emoji: "💾", pai: "hardware" },
  { slug: "placa-de-video", nome: "Placa de vídeo", emoji: "🎞️", pai: "hardware" },
  { slug: "memoria-ram", nome: "Memória RAM", emoji: "🧠", pai: "hardware" },
  { slug: "water-cooler", nome: "Water Cooler e Coolers", emoji: "❄️", pai: "hardware" },
  { slug: "fontes", nome: "Fontes", emoji: "⚡", pai: "hardware" },

  { slug: "gabinete", nome: "Gabinetes", emoji: "🗄️" },
  { slug: "perifericos", nome: "Periféricos", emoji: "🖱️" },
  { slug: "computadores", nome: "Computadores", emoji: "🖥️" },
  { slug: "notebooks", nome: "Notebooks e Tablets", emoji: "💻" },
  { slug: "notebook", nome: "Notebooks", emoji: "💻", pai: "notebooks" },
  { slug: "tablets", nome: "Tablets", emoji: "📲", pai: "notebooks" },
  { slug: "acessorios-notebook", nome: "Acessórios para Notebook", emoji: "🧳", pai: "notebooks" },
  { slug: "monitores", nome: "Monitores", emoji: "🖥️" },
  { slug: "monitor", nome: "Monitores", emoji: "🖥️", pai: "monitores" },
  { slug: "acessorios-monitor", nome: "Acessórios para Monitor", emoji: "🦾", pai: "monitores" },
  { slug: "tv", nome: "TVs", emoji: "📺" },
  { slug: "televisores", nome: "TVs", emoji: "📺", pai: "tv" },
  { slug: "acessorios-tv", nome: "Acessórios para TV", emoji: "📡", pai: "tv" },
  { slug: "games", nome: "Video Games", emoji: "🎮" },
  { slug: "jogos", nome: "Jogos", emoji: "💿", pai: "games" },
  { slug: "controles", nome: "Controles", emoji: "🕹️", pai: "games" },
  { slug: "consoles", nome: "Consoles", emoji: "🎮", pai: "games" },
  { slug: "cadeiras-mesas", nome: "Cadeiras e Mesas", emoji: "🪑" },

  // Outros de informática: o que é de PC e não tem categoria mais certa
  { slug: "outros-informatica", nome: "Outros de Informática", emoji: "🔌" },
  { slug: "placas-captura", nome: "Placas de Captura", emoji: "🎥", pai: "outros-informatica" },
  { slug: "filtros-linha", nome: "Filtros de Linha e Proteção", emoji: "🛡️", pai: "outros-informatica" },

  { slug: "eletronicos", nome: "Eletrônicos", emoji: "🎧" },
  { slug: "fones", nome: "Fones de Ouvido", emoji: "🎧", pai: "eletronicos" },
  { slug: "redes", nome: "Roteadores e Wi-Fi", emoji: "📶", pai: "eletronicos" },
  { slug: "caixas-de-som", nome: "Caixas de Som", emoji: "🔊", pai: "eletronicos" },
  { slug: "relogios", nome: "Smartwatch e Relógios", emoji: "⌚", pai: "eletronicos" },

  { slug: "cameras", nome: "Câmeras", emoji: "📷" },

  { slug: "casa", nome: "Casa e Cozinha", emoji: "🏠" },
  { slug: "cama-banho", nome: "Cama e Banho", emoji: "🛏️", pai: "casa" },
  { slug: "limpeza", nome: "Limpeza", emoji: "🧼", pai: "casa" },
  { slug: "casa-inteligente", nome: "Casa Inteligente", emoji: "💡", pai: "casa" },

  { slug: "eletrodomesticos", nome: "Eletrodomésticos", emoji: "🧊" },
  { slug: "geladeiras", nome: "Geladeiras e Freezers", emoji: "🧊", pai: "eletrodomesticos" },
  { slug: "lavadoras", nome: "Lavadoras e Secadoras", emoji: "🧺", pai: "eletrodomesticos" },
  { slug: "fogoes", nome: "Fogões e Cooktops", emoji: "🔥", pai: "eletrodomesticos" },
  { slug: "micro-ondas", nome: "Micro-ondas", emoji: "📦", pai: "eletrodomesticos" },
  { slug: "air-fryer", nome: "Air Fryer", emoji: "🍟", pai: "eletrodomesticos" },
  { slug: "eletroportateis", nome: "Eletroportáteis", emoji: "☕", pai: "eletrodomesticos" },
  { slug: "ar-condicionado", nome: "Ar-condicionado", emoji: "❄️", pai: "eletrodomesticos" },

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
  { slug: "mercado", nome: "Mercado e Bebidas", emoji: "🛒" },
  { slug: "pet", nome: "Pet Shop", emoji: "🐾" },
  { slug: "automotivo", nome: "Automotivo", emoji: "🚗" },
  { slug: "papelaria", nome: "Papelaria e Escritório", emoji: "✏️" },
  // "Outras ofertas" não existe mais. Postagens que são só um cupom ficam na aba Cupons
  // (/cupons-de-desconto), fora dos departamentos.
];

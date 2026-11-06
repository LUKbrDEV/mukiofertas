// Menu "Departamentos" no estilo do Promobit: poucos departamentos principais (lista da esquerda)
// e, ao passar o mouse/tocar, as colunas com as subcategorias (direita).
// Salve como data/menu-departamentos.js. Usado por lib/departamentos.js (montarMenu).
//
// Cada coluna tem um título (que pode levar para uma categoria, campo "slug") e os itens.
// Os "slug" são os mesmos do data/ofertas.js e do classificador (lib/classificar.mjs),
// então nada muda nas páginas /categoria/... — este arquivo só organiza o menu.
// Uma categoria pode aparecer em mais de um lugar (ex.: Moda Infantil em Moda e em Bebês).

export const MOSTRAR_VAZIAS = false; // false = esconde as subcategorias que ainda não têm ofertas no ar
// (um departamento pode mostrar todas com "mostrarVazias: true", como Bebês e Crianças)

export const menuDepartamentos = [
  {
    id: "eletronicos",
    nome: "Smartphones, Eletrônicos e TV",
    icone: "📱",
    colunas: [
      {
        titulo: "Smartphones e Tablets",
        slug: "smartphones",
        itens: [
          { slug: "celulares", nome: "Smartphones" },
          { slug: "acessorios-celular", nome: "Acessórios para celular" },
          { slug: "tablets", nome: "Tablets" },
          { slug: "relogios", nome: "Smartwatch e Relógios" },
        ],
      },
      {
        titulo: "Áudio",
        itens: [
          { slug: "fones", nome: "Fones de ouvido" },
          { slug: "caixas-de-som", nome: "Caixas de som" },
        ],
      },
      {
        titulo: "TV e Vídeo",
        slug: "tv",
        itens: [
          { slug: "televisores", nome: "TVs" },
          { slug: "acessorios-tv", nome: "Acessórios para TV" },
        ],
      },
      {
        titulo: "Câmeras",
        itens: [{ slug: "cameras", nome: "Câmeras e filmadoras" }],
      },
    ],
  },
  {
    id: "informatica",
    nome: "Informática e Games",
    icone: "🎮",
    colunas: [
      {
        titulo: "Hardware",
        slug: "hardware",
        itens: [
          { slug: "processadores", nome: "Processadores" },
          { slug: "placa-mae", nome: "Placa-mãe" },
          { slug: "placa-de-video", nome: "Placa de vídeo" },
          { slug: "memoria-ram", nome: "Memória RAM" },
          { slug: "ssd", nome: "SSD" },
          { slug: "water-cooler", nome: "Water Cooler e Coolers" },
          { slug: "fontes", nome: "Fontes" },
          { slug: "gabinete", nome: "Gabinetes" },
        ],
      },
      {
        titulo: "Notebooks e PCs",
        slug: "notebooks",
        itens: [
          { slug: "notebook", nome: "Notebooks" },
          { slug: "computadores", nome: "Computadores" },
          { slug: "acessorios-notebook", nome: "Acessórios para notebook" },
        ],
      },
      {
        titulo: "Monitores e Periféricos",
        itens: [
          { slug: "monitor", nome: "Monitores" },
          { slug: "acessorios-monitor", nome: "Suportes e acessórios para monitor" },
          { slug: "perifericos", nome: "Mouse, teclado e headset" },
          { slug: "redes", nome: "Roteadores e Wi-Fi" },
          { slug: "cadeiras-mesas", nome: "Cadeiras e mesas" },
        ],
      },
      {
        titulo: "Outros",
        slug: "outros-informatica",
        itens: [
          { slug: "placas-captura", nome: "Placas de captura" },
          { slug: "filtros-linha", nome: "Filtros de linha e proteção" },
          { slug: "outros-informatica", nome: "Outros acessórios de PC" },
        ],
      },
      {
        titulo: "Games",
        slug: "games",
        itens: [
          { slug: "consoles", nome: "Consoles" },
          { slug: "jogos", nome: "Jogos" },
          { slug: "controles", nome: "Controles" },
        ],
      },
    ],
  },
  {
    id: "casa",
    nome: "Casa e Eletrodomésticos",
    icone: "🏠",
    colunas: [
      {
        titulo: "Casa e Cozinha",
        slug: "casa",
        itens: [
          { slug: "cama-banho", nome: "Cama, mesa e banho" },
          { slug: "limpeza", nome: "Limpeza" },
          { slug: "casa-inteligente", nome: "Casa inteligente" },
        ],
      },
      {
        titulo: "Eletrodomésticos",
        slug: "eletrodomesticos",
        itens: [
          { slug: "geladeiras", nome: "Geladeiras e freezers" },
          { slug: "lavadoras", nome: "Lavadoras e secadoras" },
          { slug: "fogoes", nome: "Fogões e cooktops" },
          { slug: "micro-ondas", nome: "Micro-ondas" },
        ],
      },
      {
        titulo: "Eletroportáteis",
        slug: "eletroportateis",
        itens: [
          { slug: "air-fryer", nome: "Air fryer" },
          { slug: "eletroportateis", nome: "Cafeteiras, liquidificadores e mais" },
        ],
      },
      {
        titulo: "Climatização",
        itens: [{ slug: "ar-condicionado", nome: "Ar-condicionado" }],
      },
    ],
  },
  {
    id: "moda",
    nome: "Moda e Acessórios",
    icone: "👕",
    colunas: [
      {
        titulo: "Roupas",
        slug: "moda",
        itens: [
          { slug: "moda-masculina", nome: "Masculino" },
          { slug: "moda-feminina", nome: "Feminino" },
          { slug: "moda-infantil", nome: "Infantil" },
          { slug: "roupas-fitness", nome: "Fitness e academia" },
        ],
      },
      {
        titulo: "Calçados e Acessórios",
        itens: [
          { slug: "sapatos", nome: "Tênis e sapatos" },
          { slug: "mochilas", nome: "Mochilas e malas" },
        ],
      },
    ],
  },
  {
    id: "bebes",
    nome: "Bebês e Crianças",
    icone: "🧸",
    mostrarVazias: true, // mostra todas as subcategorias, mesmo as que ainda não têm ofertas
    colunas: [
      {
        titulo: "Brinquedos",
        slug: "brinquedos",
        itens: [
          { slug: "bonecas", nome: "Bonecas e bonecos" },
          { slug: "carrinhos", nome: "Carrinhos e controle remoto" },
          { slug: "blocos-de-montar", nome: "Blocos de montar e LEGO" },
          { slug: "jogos-infantis", nome: "Jogos e quebra-cabeças" },
          { slug: "pelucias", nome: "Pelúcias" },
          { slug: "educativos", nome: "Educativos e faz de conta" },
          { slug: "brinquedos-ao-ar-livre", nome: "Brinquedos ao ar livre" },
        ],
      },
      {
        titulo: "Bebês",
        slug: "bebes",
        itens: [
          { slug: "passeio-bebe", nome: "Carrinhos de bebê e cadeirinhas" },
          { slug: "alimentacao-bebe", nome: "Mamadeiras e alimentação" },
          { slug: "quarto-bebe", nome: "Quarto do bebê e infantil" },
          { slug: "seguranca-bebe", nome: "Segurança e babá eletrônica" },
          { slug: "higiene-bebe", nome: "Fraldas, higiene e saúde" },
        ],
      },
      {
        titulo: "Para as crianças",
        itens: [
          { slug: "bicicletas-infantis", nome: "Bicicletas, velotrol e patinetes" },
          { slug: "moda-infantil", nome: "Roupas e calçados infantis" },
          { slug: "escolar-infantil", nome: "Mochilas e material escolar" },
          { slug: "eletronicos-infantis", nome: "Eletrônicos infantis" },
          { slug: "livros-infantis", nome: "Livros infantis" },
        ],
      },
    ],
  },
  {
    id: "beleza",
    nome: "Saúde e Beleza",
    icone: "💄",
    colunas: [
      {
        titulo: "Beleza",
        slug: "beleza",
        itens: [
          { slug: "perfumaria", nome: "Perfumes" },
          { slug: "maquiagem", nome: "Maquiagem e unhas" },
          { slug: "skincare", nome: "Skincare" },
          { slug: "cabelos", nome: "Cabelos" },
          { slug: "barbear", nome: "Barbear e cuidados masculinos" },
        ],
      },
      {
        titulo: "Saúde e bem-estar",
        itens: [
          { slug: "suplementos", nome: "Suplementos" },
          { slug: "saude", nome: "Saúde (pressão, termômetro...)" },
          { slug: "higiene-pessoal", nome: "Higiene pessoal" },
        ],
      },
    ],
  },
  {
    id: "esporte",
    nome: "Esporte e Lazer",
    icone: "⚽",
    colunas: [
      {
        titulo: "Esporte",
        slug: "esporte",
        itens: [
          { slug: "academia", nome: "Academia e musculação" },
          { slug: "roupas-fitness", nome: "Roupas fitness" },
          { slug: "ciclismo", nome: "Ciclismo" },
          { slug: "esportes-bola", nome: "Futebol e outras modalidades" },
          { slug: "skate-patins", nome: "Skate, patins e patinetes" },
          { slug: "camping-pesca", nome: "Camping e pesca" },
        ],
      },
      {
        titulo: "Nutrição esportiva",
        itens: [{ slug: "suplementos", nome: "Whey, creatina e suplementos" }],
      },
    ],
  },
  {
    id: "mercado",
    nome: "Supermercado e Pet",
    icone: "🛒",
    colunas: [
      {
        titulo: "Supermercado",
        slug: "mercado",
        itens: [
          { slug: "bebidas", nome: "Bebidas" },
          { slug: "cafe", nome: "Café e cápsulas" },
          { slug: "doces-snacks", nome: "Doces e snacks" },
          { slug: "alimentos", nome: "Alimentos e mercearia" },
          { slug: "limpeza", nome: "Limpeza da casa" },
        ],
      },
      {
        titulo: "Pet",
        slug: "pet",
        itens: [
          { slug: "racao", nome: "Ração e petiscos" },
          { slug: "higiene-pet", nome: "Higiene e saúde pet" },
          { slug: "acessorios-pet", nome: "Camas, brinquedos e acessórios" },
        ],
      },
    ],
  },
  {
    id: "livros",
    nome: "Livros e Papelaria",
    icone: "📚",
    colunas: [
      {
        titulo: "Livros",
        slug: "livros",
        itens: [
          { slug: "mangas-hqs", nome: "Mangás e HQs" },
          { slug: "livros-infantis", nome: "Livros infantis" },
          { slug: "e-readers", nome: "Kindle e e-readers" },
        ],
      },
      {
        titulo: "Papelaria",
        slug: "papelaria",
        itens: [
          { slug: "escolar-infantil", nome: "Material escolar" },
          { slug: "escritorio", nome: "Escritório" },
        ],
      },
    ],
  },
  {
    id: "ferramentas",
    nome: "Ferramentas e Automotivo",
    icone: "🔧",
    colunas: [
      {
        titulo: "Ferramentas",
        slug: "ferramentas",
        itens: [
          { slug: "ferramentas-eletricas", nome: "Ferramentas elétricas" },
          { slug: "ferramentas-manuais", nome: "Ferramentas manuais e kits" },
          { slug: "jardim", nome: "Jardim" },
        ],
      },
      {
        titulo: "Automotivo",
        slug: "automotivo",
        itens: [
          { slug: "acessorios-carro", nome: "Acessórios para carro" },
          { slug: "som-automotivo", nome: "Som e eletrônicos" },
          { slug: "pneus-pecas", nome: "Pneus, óleo e peças" },
          { slug: "moto", nome: "Moto" },
        ],
      },
    ],
  },
];

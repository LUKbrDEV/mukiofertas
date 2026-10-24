// Classificador automático de categorias.
// Devolve o "slug" da categoria (o mesmo de data/ofertas.js) ou null se não reconhecer.
//
// fortes = palavras que identificam a categoria com quase certeza (3 pontos)
// fracas = palavras que ajudam, mas aparecem em várias categorias (1 ponto)
// Empate: vale a categoria que aparece primeiro na lista.
// Para melhorar a detecção, é só acrescentar palavras nas listas.

const CATEGORIAS = [
  {
    slug: "games",
    fortes: [
      "playstation", "ps5", "ps4", "ps3", "xbox", "nintendo", "switch", "joystick",
      "gamepad", "console", "steam", "game pass", "cadeira gamer",
    ],
    fracas: ["gamer", "game", "jogo", "headset", "controle"],
  },
  {
    slug: "tecnologia",
    fortes: [
      "notebook", "celular", "smartphone", "iphone", "galaxy", "xiaomi", "redmi",
      "motorola", "tablet", "ipad", "monitor", "teclado", "mouse", "ssd", "pendrive",
      "memoria ram", "placa de video", "processador", "placa mae", "gabinete",
      "roteador", "smart tv", "tv", "televisao", "fone", "fone de ouvido", "headphone",
      "earbuds", "bluetooth", "caixa de som", "soundbar", "carregador", "power bank",
      "hdmi", "webcam", "impressora", "camera", "smartwatch", "alexa", "echo dot",
      "fire tv", "chromecast", "kindle",
    ],
    fracas: ["cabo", "usb", "wifi", "4k", "led", "speaker", "relogio", "bateria", "adaptador", "hd"],
  },
  {
    slug: "perfumaria",
    fortes: [
      "perfume", "eau de parfum", "eau de toilette", "parfum", "toilette", "colonia",
      "deo colonia", "deo parfum", "body splash", "edp", "edt", "fragrancia",
      "invictus", "one million", "azzaro", "giorgio armani", "paco rabanne",
      "carolina herrera", "good girl", "212", "hugo boss", "jean paul gaultier",
      "lancome", "dior", "chanel", "ysl", "versace", "dolce gabbana", "antonio banderas",
    ],
    fracas: ["eau", "fragrance"],
  },
  {
    slug: "beleza",
    fortes: [
      "shampoo", "condicionador", "hidratante", "maquiagem", "batom", "protetor solar",
      "desodorante", "barbeador", "aparelho de barbear", "secador de cabelo", "chapinha",
      "prancha de cabelo", "escova de cabelo", "creatina", "whey", "whey protein",
      "suplemento", "colageno", "vitamina", "omega 3", "pre treino", "bcaa",
      "multivitaminico", "melatonina", "termogenico", "proteina", "sabonete",
      "pasta de dente", "escova de dente", "fio dental", "absorvente", "base facial",
      "serum", "skincare", "mascara capilar", "tintura",
    ],
    fracas: ["creme", "secador", "cabelo", "pele", "saude", "capsula", "cuidados", "facial", "barba"],
  },
  {
    slug: "limpeza",
    fortes: [
      "detergente", "sabao", "sabao em po", "amaciante", "desinfetante", "agua sanitaria",
      "alvejante", "desengordurante", "limpador", "esponja", "vassoura", "rodo", "balde",
      "pano de chao", "papel higienico", "saco de lixo", "lava roupa", "lava louca",
      "saco de lavagem", "saco para lavar", "limpa vidro", "lustra movel", "inseticida",
    ],
    fracas: ["limpeza", "lavagem", "lavar", "lava", "multiuso", "pano", "microfibra"],
  },
  {
    slug: "casa",
    fortes: [
      "air fryer", "fritadeira", "panela", "frigideira", "liquidificador", "batedeira",
      "cafeteira", "geladeira", "fogao", "microondas", "ventilador", "ar condicionado",
      "aspirador", "colchao", "travesseiro", "edredom", "lencol", "toalha", "sofa", "cama",
      "guarda roupa", "estante", "mesa", "cadeira", "armario", "prateleira", "organizador",
      "lixeira", "faqueiro", "talher", "copo", "garrafa termica", "cortina", "tapete",
      "luminaria", "lampada", "furadeira", "parafusadeira", "ferramenta", "assadeira",
      "jogo de panela", "jogo de cama", "jogo de toalha", "jogo de talher",
    ],
    fracas: ["cozinha", "banheiro", "quarto", "sala", "utensilio", "pote", "jarra", "decoracao"],
  },
  {
    slug: "moda",
    fortes: [
      "camiseta", "camisa", "calca", "jeans", "bermuda", "vestido", "saia", "jaqueta",
      "casaco", "moletom", "blusa", "cueca", "meia", "tenis", "sapato", "sapatenis", "bota",
      "sandalia", "chinelo", "rasteira", "bolsa", "mochila", "mala", "carteira", "cinto",
      "bone", "oculos de sol", "regata", "short", "legging", "pijama", "lingerie", "sutia",
      "biquini", "sunga", "cropped", "polo", "camisola",
    ],
    fracas: ["streetwear", "moda", "look", "relogio"],
  },
  {
    slug: "esporte",
    fortes: [
      "bicicleta", "bike", "esteira", "halter", "kettlebell", "tapete de yoga",
      "bola de futebol", "bola de basquete", "skate", "patins", "patinete", "barraca",
      "camping", "corda de pular", "luva de boxe", "elastico de treino", "banco de supino",
      "anilha", "chuteira", "raquete", "oculos de natacao", "caiaque", "vara de pesca",
      "squeeze", "shaker", "bola de pilates", "caneleira",
    ],
    fracas: ["bola", "treino", "fitness", "academia", "esporte", "yoga", "corrida", "ciclismo", "pesca", "natacao", "trilha", "futebol"],
  },
];

// Tira acentos e pontuação e coloca espaços nas pontas, para achar só palavras inteiras
function normalizar(texto) {
  const limpo = String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${limpo} `;
}

// Conta quantas palavras da lista aparecem no texto (aceita plural com "s" ou "es")
function contar(texto, palavras) {
  let total = 0;
  for (const palavra of palavras) {
    const base = normalizar(palavra).trim();
    if (
      texto.includes(` ${base} `) ||
      texto.includes(` ${base}s `) ||
      texto.includes(` ${base}es `)
    ) {
      total++;
    }
  }
  return total;
}

export function classificar(titulo) {
  const texto = normalizar(titulo);
  let melhor = null;
  let melhorPontos = 0;

  for (const categoria of CATEGORIAS) {
    const pontos = contar(texto, categoria.fortes) * 3 + contar(texto, categoria.fracas);
    if (pontos > melhorPontos) {
      melhor = categoria.slug;
      melhorPontos = pontos;
    }
  }
  return melhor; // null = não reconheceu
}
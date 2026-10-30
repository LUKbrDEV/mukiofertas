// Classificador automático de categorias.
// Devolve o "slug" da categoria (o mesmo de data/ofertas.js) ou null se não reconhecer.
//
// fortes = palavras que identificam a categoria com quase certeza
//          (3 pontos, +2 por palavra extra: "processador de alimentos" vale mais que "processador")
// fracas = palavras que ajudam, mas aparecem em várias categorias (1 ponto)
// Empate: vale a categoria que aparece primeiro na lista, por isso as mais específicas vêm antes.
// Para melhorar a detecção, é só acrescentar palavras nas listas.

export const CATEGORIAS = [
  // ----- Acessórios (vêm antes dos aparelhos: "Capinha para iPhone" é acessório, não celular) -----
  {
    slug: "acessorios-celular",
    fortes: [
      "capa para celular", "capinha", "capa celular", "capa para iphone", "capa iphone", "capa galaxy",
      "capa anti impacto", "capa magsafe", "pelicula", "pelicula de vidro", "pelicula 3d", "pelicula hidrogel",
      "carregador", "carregador turbo", "carregador rapido", "carregador veicular", "carregador sem fio",
      "carregador por inducao", "carregador portatil", "power bank", "powerbank", "bateria portatil",
      "cabo usb c", "cabo lightning", "cabo para iphone", "cabo tipo c", "cabo usb", "cabo micro usb",
      "suporte para celular", "suporte celular", "suporte veicular", "popsocket", "pop socket",
      "pau de selfie", "bastao de selfie", "estabilizador para celular", "lente para celular",
      "adaptador usb c", "adaptador lightning", "carregador magsafe", "fonte usb c",
    ],
    fracas: ["para celular", "magsafe", "20w", "25w", "33w", "45w", "65w"],
  },
  {
    slug: "acessorios-notebook",
    fortes: [
      "suporte para notebook", "suporte notebook", "base para notebook", "base refrigerada", "cooler para notebook",
      "carregador para notebook", "carregador notebook", "fonte para notebook", "fonte notebook",
      "capa para notebook", "case para notebook", "sleeve para notebook", "bateria para notebook",
      "dock station", "docking station", "hub usb c", "capa para tablet", "capa tablet", "capa para ipad",
      "capa ipad", "pelicula para tablet", "pelicula ipad", "teclado para tablet", "teclado para ipad",
      "caneta para tablet", "caneta stylus", "stylus", "apple pencil", "s pen", "mouse para notebook",
    ],
    fracas: ["para notebook", "para tablet", "para ipad", "para macbook"],
  },
  {
    slug: "acessorios-monitor",
    fortes: [
      "suporte para monitor", "suporte monitor", "suporte de monitor", "braco articulado para monitor",
      "braco para monitor", "suporte articulado para monitor", "suporte de mesa para monitor",
      "suporte duplo para monitor", "elevador de monitor", "base para monitor", "cabo displayport",
      "displayport", "filtro de privacidade", "monitor arm",
    ],
    fracas: ["para monitor", "vesa"],
  },
  {
    slug: "acessorios-tv",
    fortes: [
      "suporte para tv", "suporte de tv", "suporte tv", "suporte articulado para tv", "suporte fixo para tv",
      "controle remoto para tv", "controle remoto tv", "controle para tv", "controle universal",
      "controle remoto universal", "controle remoto smart tv",
      "antena digital", "antena para tv", "antena interna", "conversor digital", "tv box", "receptor digital",
      "cabo hdmi", "cabo hdmi 2 1", "cabo optico",
    ],
    fracas: ["para tv", "smart tv"],
  },
  // ----- Video Games e suas subcategorias -----
  {
    slug: "controles",
    fortes: [
      "controle ps5", "controle ps4", "controle xbox", "controle playstation", "controle nintendo",
      "controle sem fio para", "dualsense", "dualsense edge", "dualshock", "pro controller", "joy con",
      "joystick", "gamepad", "controle gamer", "controle bluetooth", "volante gamer", "volante logitech",
      "driving force", "g29", "g920", "g923", "base carregadora para controle", "base carregadora dualsense", "carregador de controle",
    ],
    fracas: ["controle sem fio", "controle"],
  },
  {
    slug: "consoles",
    fortes: [
      "console", "console playstation", "playstation 5", "playstation 4", "ps5 slim", "ps5 pro",
      "xbox series x", "xbox series s", "xbox series", "nintendo switch", "switch oled", "switch lite",
      "nintendo switch 2", "steam deck", "rog ally", "legion go", "console portatil", "console retro",
      "video game", "videogame",
    ],
    fracas: ["825gb", "1tb", "edicao digital", "bundle"],
  },
  {
    slug: "jogos",
    fortes: [
      "jogo", "jogo ps5", "jogo ps4", "jogo xbox", "jogo nintendo", "jogo switch", "jogo para", "midia fisica",
      "game pass", "cartao psn", "gift card playstation", "gift card xbox", "nintendo eshop",
      "edicao de colecionador", "edicao standard", "edicao deluxe", "goty",
    ],
    fracas: ["game", "edicao", "ps5", "ps4", "xbox", "switch"],
  },
  // ----- Eletrônicos: fones -----
  {
    slug: "fones",
    fortes: [
      "fone de ouvido", "fone", "fones", "earbuds", "earphone", "headphone", "airpods", "galaxy buds",
      "fone bluetooth", "fone sem fio", "fone tws", "tws", "jbl tune", "jbl wave", "jbl vibe",
      "fone com fio", "fone intra auricular", "fone over ear", "redmi buds", "soundpeats", "qcy",
    ],
    fracas: ["cancelamento de ruido", "anc", "intra auricular", "bluetooth 5"],
  },
  {
    slug: "celulares", // só os aparelhos (o departamento "smartphones" junta celulares + acessórios)
    fortes: [
      "celular", "smartphone", "iphone", "galaxy s", "galaxy a", "galaxy m", "galaxy z",
      "redmi", "redmi note", "poco", "moto g", "moto e", "motorola edge", "motorola razr",
      "realme", "zenfone", "pixel", "infinix", "tecno spark",
    ],
    fracas: ["5g", "dual chip", "android", "ios", "128gb", "256gb"],
  },
  {
    slug: "tablets", // só os tablets (o departamento "notebooks" junta notebooks + tablets + acessórios)
    fortes: [
      "tablet", "ipad", "ipad air", "ipad pro", "ipad mini", "galaxy tab", "tab s9", "tab s10", "tab a9",
      "redmi pad", "xiaomi pad", "lenovo tab", "tab m10", "tab m11", "tab p12", "kindle", "e reader",
      "leitor de livros digitais", "tablet infantil",
    ],
    fracas: ["wi fi", "lte", "polegadas", "64gb", "128gb"],
  },
  {
    slug: "notebook", // só os notebooks
    fortes: [
      "notebook", "laptop", "macbook", "macbook air", "macbook pro", "chromebook", "ultrabook",
      "notebook gamer", "ideapad", "vivobook", "zenbook", "inspiron", "galaxy book", "nitro v",
      "acer aspire", "legion", "thinkpad", "vostro", "latitude", "expertbook", "tuf gaming f15",
    ],
    fracas: ["portatil", "tela 15", "tela 14", "ssd", "intel core", "ryzen"],
  },
  {
    slug: "computadores",
    fortes: [
      "pc gamer", "computador", "desktop", "mini pc", "all in one", "imac", "mac mini",
      "pc completo", "computador gamer",
    ],
    fracas: ["pc"],
  },
  {
    slug: "monitor", // só os monitores (o departamento "monitores" junta monitor + acessórios)
    fortes: ["monitor", "monitor gamer", "monitor curvo", "monitor ultrawide"],
    fracas: ["hz", "ips", "ultrawide", "curvo"],
  },
  // ----- Hardware e suas subcategorias -----
  {
    slug: "placa-de-video",
    fortes: [
      "placa de video", "placa grafica", "placa video", "rtx", "gtx", "geforce", "radeon",
      "rx 6600", "rx 7600", "rx 7700", "rx 7800", "rx 9060", "rx 9070", "arc a750", "arc b580",
    ],
    fracas: ["gddr6", "gddr6x", "gddr7", "vram", "dlss"],
  },
  {
    slug: "placa-mae",
    fortes: ["placa mae", "motherboard", "mainboard"],
    fracas: [
      "a520m", "a620m", "b450m", "b550m", "b650m", "b760m", "b660m", "h610m", "h510m",
      "a520", "a620", "b450", "b550", "b650", "b760", "b660", "h610", "h510", "z790", "z690",
      "x670", "x870", "b850", "atx", "matx", "micro atx",
    ],
  },
  {
    slug: "memoria-ram",
    fortes: ["memoria ram", "memoria ddr4", "memoria ddr5", "ddr3", "ddr4", "ddr5", "sodimm", "so dimm", "udimm"],
    fracas: ["memoria", "3200mhz", "3600mhz", "5600mhz", "6000mhz", "cl16", "cl18", "dimm"],
  },
  {
    slug: "ssd",
    fortes: ["ssd", "nvme", "ssd externo", "ssd m 2", "ssd sata", "m 2 2280"],
    fracas: ["m 2", "pcie", "sata", "armazenamento", "1tb", "2tb", "480gb", "512gb", "960gb", "mb s"],
  },
  {
    slug: "processadores",
    fortes: [
      "processador", "processador amd", "processador intel", "ryzen", "intel core", "core ultra",
      "core i3", "core i5", "core i7", "core i9", "athlon", "xeon", "threadripper",
    ],
    fracas: ["nucleos", "threads", "ghz", "cache", "lga 1700", "lga 1851", "am4", "am5", "box"],
  },
  {
    slug: "hardware",
    fortes: [
      "kit upgrade", "kit processador", "hd interno", "hd externo",
      "fonte de alimentacao", "fonte atx", "fonte gamer", "cooler", "water cooler", "air cooler",
      "pasta termica", "pendrive", "cartao de memoria", "micro sd", "fan", "ventoinha",
    ],
    fracas: ["fonte", "80 plus", "watts", "rgb", "argb", "pfc ativo"],
  },
  {
    slug: "gabinete",
    fortes: ["gabinete", "gabinete gamer", "mid tower", "full tower", "mini tower", "gabinete atx"],
    fracas: ["lateral de vidro", "vidro temperado", "aquario"],
  },
  {
    slug: "perifericos",
    fortes: [
      "mouse", "teclado", "headset", "mousepad", "mouse pad", "webcam", "microfone",
      "teclado mecanico", "mouse gamer", "headset gamer",
      "impressora", "mesa digitalizadora",
    ],
    fracas: ["gamer", "usb", "sem fio", "wireless", "switch blue", "switch red"],
  },
  {
    slug: "redes",
    fortes: [
      "roteador", "repetidor", "repetidor de sinal", "mesh", "switch de rede",
      "adaptador wifi", "adaptador wi fi", "placa de rede", "access point", "modem",
      "cabo de rede",
    ],
    fracas: ["wifi", "wi fi", "rede", "mbps", "gigabit", "dual band"],
  },
  {
    slug: "games",
    fortes: ["playstation", "ps5", "ps4", "xbox", "nintendo", "headset para ps5", "headset para xbox"],
    fracas: ["game", "gamer"],
  },
  {
    slug: "cadeiras-mesas",
    fortes: [
      "cadeira gamer", "cadeira de escritorio", "cadeira escritorio", "cadeira ergonomica",
      "mesa gamer", "escrivaninha", "mesa de escritorio", "mesa para computador",
      "apoio de pes",
    ],
    fracas: ["ergonomica", "reclinavel", "escritorio"],
  },
  {
    slug: "casa-inteligente",
    fortes: [
      "alexa", "echo dot", "echo show", "echo pop", "google nest", "nest mini",
      "lampada inteligente", "tomada inteligente", "smart plug", "fire tv stick",
      "fire tv", "chromecast", "camera de seguranca", "camera wifi", "fechadura digital",
      "fechadura eletronica", "interruptor inteligente", "aspirador robo", "robo aspirador",
    ],
    fracas: ["inteligente", "smart home", "automacao", "compativel com alexa"],
  },
  {
    slug: "eletronicos",
    fortes: [
      "projetor", "adaptador hdmi", "pilha", "bateria recarregavel", "microfone de lapela",
      "localizador", "rastreador", "smart tag", "airtag", "kindle paperwhite",
    ],
    fracas: ["bluetooth", "4k", "bateria", "cabo", "adaptador", "hdmi"],
  },
  {
    slug: "televisores", // só as TVs (o departamento "tv" junta TVs + acessórios)
    fortes: [
      "smart tv", "tv", "televisao", "televisor", "tv led", "tv qled", "tv oled", "tv 4k",
      "tv 32", "tv 43", "tv 50", "tv 55", "tv 65", "tv 75",
    ],
    fracas: ["polegadas", "uhd", "qled", "oled", "google tv", "android tv", "webos", "tizen", "4k"],
  },
  {
    slug: "caixas-de-som",
    fortes: [
      "caixa de som", "soundbar", "home theater", "subwoofer", "alto falante", "caixa bluetooth",
      "speaker", "jbl charge", "jbl flip", "jbl go", "jbl boombox", "partybox", "torre de som",
      "caixa amplificada", "microsystem", "radio",
    ],
    fracas: ["jbl", "watts rms", "rms", "graves", "bass", "som"],
  },
  {
    slug: "cameras",
    fortes: [
      "camera", "camera digital", "camera fotografica", "camera instantanea", "instax", "polaroid",
      "gopro", "camera de acao", "dji osmo", "osmo pocket", "lente", "lente objetiva", "tripe",
      "ring light", "ringlight", "ringlinght", "estabilizador gimbal", "gimbal", "filmadora",
      "cartao sd para camera", "canon", "nikon", "sony alpha", "fujifilm",
    ],
    fracas: ["fotografia", "foto", "megapixels", "mp", "zoom optico", "lentes", "selfie", "vlog"],
  },
  {
    slug: "ferramentas",
    fortes: [
      "furadeira", "parafusadeira", "ferramenta", "ferramentas", "jogo de ferramentas", "kit ferramentas",
      "maleta de ferramentas", "chave catraca", "jogo de chaves", "alicate", "martelo", "serra",
      "serra circular", "serra tico tico", "esmerilhadeira", "lixadeira", "tupia", "plaina",
      "lavadora de alta pressao", "compressor de ar", "calibrador", "pistola finca pino", "finca pino", "pinador",
      "grampeador pneumatico", "trena", "nivel a laser", "multimetro", "ferro de solda", "soprador termico",
      "chave de fenda", "chave philips", "jogo de soquetes", "jogo de brocas", "jogo de bits", "morsa", "torno", "escada", "extensao eletrica",
      "carrinho de mao", "rocadeira", "cortador de grama", "motosserra", "pulverizador", "snow foam",
      "extratora", "aspirador de po e liquido", "gerador", "inversor de solda",
    ],
    fracas: ["bivolt", "bateria 12v", "bateria 20v", "volts", "mandril", "rpm", "obra", "profissional", "jardinagem"],
  },
  {
    slug: "mochilas",
    fortes: [
      "mochila", "mochila para notebook", "mochila notebook", "mala de viagem", "mala de bordo", "mala", "pochete", "bolsa para notebook",
      "case para notebook", "frasqueira",
    ],
    fracas: ["viagem", "bordo"],
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
      "fralda", "fraldas", "lenco umedecido", "lencos umedecidos", "pampers", "huggies", "mamypoko",
      "desodorante", "barbeador", "aparelho de barbear", "secador de cabelo", "chapinha",
      "prancha de cabelo", "escova de cabelo", "creatina", "whey", "whey protein",
      "suplemento", "colageno", "vitamina", "omega 3", "pre treino", "bcaa",
      "multivitaminico", "melatonina", "termogenico", "proteina", "sabonete",
      "pasta de dente", "escova de dente", "escova de dente eletrica", "fio dental",
      "absorvente", "base facial", "serum", "skincare", "mascara capilar", "tintura",
      "cilios", "cilios posticos", "cilio", "extensao de cilios", "cola para cilios", "cola de cilios",
      "fio a fio", "lash", "rimel", "mascara de cilios", "curvex", "delineador", "sobrancelha",
      "pinca", "esmalte", "unha", "unhas", "unha postica", "unhas posticas", "kit manicure",
      "manicure", "alicate de cuticula", "lixa de unha", "gel para unha", "cabine led", "paleta de sombras",
      "pincel de maquiagem", "pinceis de maquiagem", "esponja de maquiagem", "corretivo", "po compacto",
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
    slug: "ar-condicionado",
    fortes: [
      "ar condicionado", "ar condicionado split", "split inverter", "split hi wall", "hi wall",
      "ar portatil", "condicionador de ar", "climatizador", "climatizador de ar", "btu",
    ],
    fracas: ["split", "inverter", "quente frio", "so frio", "frio"],
  },
  {
    slug: "casa",
    fortes: [
      "air fryer", "fritadeira", "panela", "frigideira", "liquidificador", "batedeira",
      "cafeteira", "geladeira", "fogao", "microondas", "micro ondas", "ventilador",
      "aspirador", "aspirador de po", "colchao",
      "sofa", "guarda roupa", "estante", "mesa de jantar", "cadeira", "armario",
      "prateleira", "organizador", "lixeira", "faqueiro", "talher", "copo", "garrafa termica",
      "cortina", "tapete", "luminaria", "lampada",
      "assadeira", "jogo de panela", "jogo de talher",
      "processador de alimentos", "mixer", "sanduicheira", "torradeira", "chaleira",
      "purificador de agua", "maquina de lavar", "lava e seca", "churrasqueira",
      "gabinete para banheiro", "gabinete de banheiro", "gabinete banheiro", "gabinete de cozinha",
      "gabinete para cozinha", "gabinete cozinha",
      "churrasqueira eletrica", "grill", "forno eletrico", "panela eletrica", "cooktop",
      "depurador", "coifa", "bebedouro", "adega", "freezer", "almofada", "capa de almofada",
      "quadro decorativo", "espelho", "vaso", "jogo americano", "jogo de copos", "jogo de pratos", "jogo de jantar", "jogo de tacas", "jogo de xicaras", "rack para tv", "painel para tv", "mesa console", "aparador", "panificadora", "kit potes", "pote hermetico", "porta condimento",
    ],
    fracas: ["cozinha", "banheiro", "quarto", "sala", "utensilio", "pote", "jarra", "decoracao", "mesa"],
  },
  {
    slug: "relogios",
    fortes: [
      "relogio", "relogio de pulso", "relogio masculino", "relogio feminino", "relogio analogico",
      "relogio digital", "casio", "g shock", "orient", "technos", "seiko", "citizen", "invicta",
      "mondaine", "champion", "fossil", "lince", "smartwatch", "smartband", "relogio inteligente",
      "smart watch", "apple watch", "galaxy watch", "amazfit", "mi band", "xiaomi smart band",
    ],
    fracas: ["pulseira de aco", "pulseira de couro", "a prova d agua", "cronografo", "analogico"],
  },
  {
    slug: "livros",
    fortes: [
      "livro", "livros", "box de livros", "box livros", "capa dura", "capa comum", "brochura",
      "hq", "historia em quadrinhos", "quadrinhos", "graphic novel", "audiolivro", "colecao de livros",
    ],
    fracas: ["edicao", "autor", "volume", "romance", "literatura", "editora"],
  },
  {
    slug: "cama-banho",
    fortes: [
      "jogo de cama", "jogo de lencol", "jogo de lencois", "lencol", "lencol com elastico", "edredom", "cobre leito", "colcha", "cobertor",
      "manta", "fronha", "travesseiro", "protetor de colchao", "capa protetora colchao", "saia de cama",
      "toalha", "toalha de banho", "toalha de rosto", "jogo de toalha", "jogo de toalhas", "roupao",
      "tapete de banheiro", "piso de banheiro", "cortina de box", "kit banheiro", "duvet", "pillow top",
    ],
    fracas: ["queen", "king", "casal", "solteiro", "fio", "algodao egipcio", "percal", "microfibra", "banho"],
  },
  {
    slug: "sapatos",
    fortes: [
      "tenis", "sapato", "sapatenis", "bota", "coturno", "sandalia", "chinelo", "rasteira", "rasteirinha",
      "mocassim", "loafer", "scarpin", "sapatilha", "tamanco", "mule", "slide", "babuche", "crocs",
      "papete", "oxford", "salto alto", "tenis casual", "tenis de corrida",
    ],
    fracas: ["calcado", "solado", "palmilha", "cano alto", "cano curto", "numeracao"],
  },
  {
    slug: "brinquedos",
    fortes: [
      "brinquedo", "carrinho de controle remoto", "controle remoto 7 funcoes", "boneca", "boneco",
      "lego", "blocos de montar", "quebra cabeca", "pelucia", "hot wheels", "nerf", "barbie",
      "jogo de tabuleiro", "massinha", "playmobil", "pista de carrinho", "garagem", "drone infantil",
      "patinete infantil", "slime", "carrinho de brinquedo", "carro de controle remoto",
      "carrinho de bebe", "bebe conforto", "berco", "kit berco", "cadeirinha para carro", "andador",
      "mamadeira", "chupeta", "mordedor", "baba eletronica", "banheira de bebe", "cadeira de alimentacao",
      "trocador", "lousa magica", "lousa digital", "lousa infantil", "tablet lcd", "tablet de desenho",
      "tablet magico", "prancheta magica", "quadro magico", "quadro de desenho", "lousa lcd",
    ],
    fracas: ["infantil", "crianca", "criancas", "controle remoto", "carrinho", "kids"],
  },
  {
    slug: "moda",
    fortes: [
      "camiseta", "camisa", "calca", "jeans", "bermuda", "vestido", "saia", "jaqueta",
      "casaco", "moletom", "blusa", "cueca", "meia", "bolsa", "carteira", "cinto", "bone",
      "oculos de sol", "regata", "short", "legging", "pijama", "lingerie", "sutia",
      "biquini", "sunga", "cropped", "polo", "camisola", "body", "macacao", "jardineira",
      "macaquinho", "top cropped",
    ],
    fracas: ["streetwear", "moda", "look", "conjunto", "manga longa", "manga curta", "ribana", "malha", "moletom"],
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

// Achou a palavra no texto? (aceita plural com "s" ou "es")
function achou(texto, palavra) {
  const base = normalizar(palavra).trim();
  return (
    texto.includes(` ${base} `) ||
    texto.includes(` ${base}s `) ||
    texto.includes(` ${base}es `)
  );
}

// Fortes: 3 pontos + 2 por palavra extra (termos mais longos são mais específicos)
function pontosFortes(texto, palavras) {
  let total = 0;
  for (const palavra of palavras) {
    if (achou(texto, palavra)) {
      const qtdPalavras = normalizar(palavra).trim().split(" ").length;
      total += 3 + (qtdPalavras - 1) * 2;
    }
  }
  return total;
}

function pontosFracas(texto, palavras) {
  let total = 0;
  for (const palavra of palavras) {
    if (achou(texto, palavra)) total++;
  }
  return total;
}

// Posição da palavra no texto (-1 se não aparece)
function posicao(texto, palavra) {
  const base = normalizar(palavra).trim();
  const achados = [` ${base} `, ` ${base}s `, ` ${base}es `]
    .map((p) => texto.indexOf(p))
    .filter((i) => i >= 0);
  return achados.length ? Math.min(...achados) : -1;
}

// O produto principal costuma vir no começo do título:
// "Notebook Lenovo ... Intel Core i5" é notebook, não processador.
// A palavra forte que aparece primeiro no título dá um bônus grande à sua categoria
// (empate na posição: vale o termo mais longo, ex.: "processador de alimentos").
const BONUS_PRODUTO_PRINCIPAL = 10;

function categoriaDoProdutoPrincipal(texto) {
  let melhor = null;
  for (const categoria of CATEGORIAS) {
    for (const palavra of categoria.fortes) {
      const pos = posicao(texto, palavra);
      if (pos < 0) continue;
      const tamanho = normalizar(palavra).trim().length;
      if (!melhor || pos < melhor.pos || (pos === melhor.pos && tamanho > melhor.tamanho)) {
        melhor = { slug: categoria.slug, pos, tamanho };
      }
    }
  }
  return melhor?.slug ?? null;
}

// Moda é dividida por público (Infantil, Feminino, Masculino); unissex fica em "Moda"
const PUBLICO_MODA = [
  { slug: "moda-infantil", palavras: ["infantil", "menino", "menina", "kids", "juvenil", "crianca", "criancas", "bebe", "teen"] },
  { slug: "moda-feminina", palavras: ["feminino", "feminina", "mulher", "women", "dama", "lingerie", "sutia", "vestido", "saia", "biquini", "cropped", "camisola", "legging"] },
  { slug: "moda-masculina", palavras: ["masculino", "masculina", "homem", "men", "cueca", "sunga"] },
];

// Lojas que só vendem roupa de criança (o título nem sempre diz "infantil")
const LOJAS_INFANTIS = /\b(kids|infantil|baby|bebe)\b|crianca/i;

function refinarModa(texto, loja) {
  const tem = (p) => texto.includes(` ${p} `);
  if (loja && LOJAS_INFANTIS.test(normalizar(loja))) return "moda-infantil";
  const genero = (p) => /^(feminino|feminina|masculino|masculina)$/.test(p);
  // "Masculino e Feminino" / "Unissex": fica em Moda
  if (tem("unissex") || tem("unisex") || (tem("masculino") && tem("feminino"))) return "moda";
  for (const grupo of PUBLICO_MODA) {
    if (grupo.palavras.some((p) => tem(p) && !(grupo.slug === "moda-feminina" && !genero(p) && tem("masculino"))))
      return grupo.slug;
  }
  return "moda";
}

// Acessório que cita o aparelho ("Suporte Articulado para Monitor", "Capa iPad") não é o aparelho:
// se uma destas palavras aparece logo no começo do título, vai para os acessórios do departamento.
const ACESSORIO_DE = {
  monitor: "acessorios-monitor",
  televisores: "acessorios-tv",
  celulares: "acessorios-celular",
  notebook: "acessorios-notebook",
  tablets: "acessorios-notebook",
};
const PALAVRAS_DE_ACESSORIO = new Set([
  "suporte", "suportes", "braco", "bracos", "cabo", "cabos", "capa", "capas", "capinha", "capinhas",
  "pelicula", "peliculas", "carregador", "carregadores", "controle", "antena", "base", "filtro",
  "adaptador", "case", "fonte", "bateria", "protetor", "caneta", "hub", "conversor", "receptor",
  "estabilizador", "lente", "tripe", "teclado", "mochila", "bolsa", "sleeve", "cooler", "bastao", "pau",
  "refil", "tela", "display", "pecas", "peca", "botao",
]);

function ehAcessorio(texto) {
  const primeiras = texto.trim().split(" ").slice(0, 4);
  return primeiras.some((p) => PALAVRAS_DE_ACESSORIO.has(p));
}

// loja é opcional: ajuda a separar a moda infantil (ex.: "UP Kids")
export function classificar(titulo, loja) {
  const texto = normalizar(titulo);
  const principal = categoriaDoProdutoPrincipal(texto);
  let melhor = null;
  let melhorPontos = 0;

  for (const categoria of CATEGORIAS) {
    const pontos =
      pontosFortes(texto, categoria.fortes) +
      pontosFracas(texto, categoria.fracas) +
      (categoria.slug === principal ? BONUS_PRODUTO_PRINCIPAL : 0);
    // Só palavras fracas não bastam: precisa de pelo menos uma forte ou 2 fracas
    const temForte = pontosFortes(texto, categoria.fortes) > 0;
    if (!temForte && pontos < 2) continue;
    if (pontos > melhorPontos) {
      melhor = categoria.slug;
      melhorPontos = pontos;
    }
  }
  if (melhor === "moda") return refinarModa(texto, loja);
  if (ACESSORIO_DE[melhor] && ehAcessorio(texto)) return ACESSORIO_DE[melhor];
  return melhor; // null = não reconheceu
}

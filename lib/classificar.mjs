// Classificador automático de categorias.
// Devolve o "slug" da categoria (o mesmo de data/ofertas.js), "cupons" para postagens que são
// só um cupom, ou null se não reconhecer (oferta sem categoria não é publicada).
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
      "capa para galaxy", "capa para samsung", "capa para xiaomi", "capa para redmi", "capa para motorola",
      "capa para moto g", "pelicula para galaxy", "pelicula para iphone", "pelicula para samsung",
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
      "video game", "videogame", "playstation 5 slim", "playstation 5 pro", "ps5 digital", "xbox series x 1tb",
      "nintendo switch oled", "meta quest", "quest 3", "quest 3s", "playstation portal", "r36s", "game stick",
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
      "pc completo", "computador gamer", "pc home", "pc office", "pc escritorio", "computador completo",
      "cpu completa", "kit pc", "pc intel", "pc amd",
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
      "kit upgrade", "kit processador", "hd interno", "hd externo", "cooler",
      "pasta termica", "pendrive", "cartao de memoria", "micro sd", "fan", "ventoinha",
    ],
    fracas: ["rgb", "argb"],
  },
  {
    slug: "water-cooler",
    fortes: [
      "water cooler", "watercooler", "water cooler aio", "air cooler", "cooler para processador",
      "cooler processador", "cooler cpu", "cooler de cpu", "cooler para cpu", "aio", "radiador 240mm",
      "radiador 280mm", "radiador 360mm", "dissipador", "dissipador para processador",
      "refrigerador de cpu", "refrigerador para cpu", "refrigerador de processador", "refrigerador para processador",
      "refrigeracao liquida", "refrigeracao a agua", "sistema de refrigeracao liquida", "cooler de ar para cpu",
      "ventilador de cpu", "ventilador para cpu",
      "ventilador de gabinete", "ventilador para gabinete", "fan de gabinete", "fan para gabinete",
      "cooler de gabinete", "cooler para gabinete", "ventoinha de gabinete", "ventoinha para gabinete",
    ],
    fracas: ["120mm", "240mm", "280mm", "360mm", "tdp", "lga1700", "lga 1700", "am4", "am5"],
  },
  {
    slug: "fontes",
    fortes: [
      "fonte de alimentacao", "fonte atx", "fonte gamer", "fonte modular", "fonte semi modular",
      "fonte 80 plus", "fonte real", "fonte pc", "fonte para pc", "fonte de pc",
    ],
    fracas: ["fonte", "80 plus", "watts", "pfc ativo", "modular", "bronze", "gold", "platinum"],
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
  // ----- Outros de informática (o que é de PC e não tem categoria mais certa) -----
  {
    slug: "placas-captura",
    fortes: [
      "placa de captura", "placa de captura de video", "captura de video", "capturadora", "capturadora de video",
      "capture card", "cam link", "elgato hd60", "elgato 4k",
    ],
    fracas: ["obs", "streaming", "live", "1080p 60fps"],
  },
  {
    slug: "filtros-linha",
    fortes: [
      "filtro de linha", "protetor contra surtos", "protetor eletronico", "regua de energia", "regua de tomadas",
      "nobreak", "no break", "dps", "clamper", "estabilizador de tensao", "estabilizador bivolt", "protetor de surto",
    ],
    fracas: ["tomadas", "bivolt", "surtos"],
  },
  {
    slug: "outros-informatica",
    fortes: [
      // (pendrive, HD externo, pasta térmica e cartão de memória continuam em Hardware; cabo HDMI em Acessórios de TV)
      "ssd externo", "case para hd", "case para ssd", "gaveta para hd", "leitor de cartao",
      "cabo displayport", "adaptador hdmi", "adaptador displayport", "conversor hdmi", "splitter hdmi",
      "switch hdmi", "kvm", "stream deck", "controladora de fans", "fita led rgb",
      "limpa contato", "kit limpeza pc", "suporte para cpu", "suporte para gabinete", "leitor de cd", "gravador de dvd",
    ],
    fracas: ["para pc", "usb 3 0", "computador"],
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
      "trena", "nivel a laser", "jogo de chaves", "kit ferramentas", "maleta de ferramentas", "alicate", "martelo", "serrote", "chave de fenda", "parafusadeira", "furadeira", "esmerilhadeira", "lixadeira", "serra", "tupia", "compressor", "lavadora de alta pressao", "wap", "vonder", "bosch", "makita", "dewalt", "black decker", "tramontina pro", "multimetro", "ferro de solda", "pistola de cola quente", "cola quente", "fita isolante", "escada de aluminio", "carrinho de mao", "cortador de grama", "rocadeira", "soprador", "gerador", "inversor de solda", "maquina de solda",
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
      "escova secadora", "escova rotativa", "escova alisadora", "modelador de cachos", "babyliss", "cortador de cabelo", "maquina de cortar cabelo", "maquina de corte", "aparador de pelos", "aparador de barba", "aparador de cabelo", "depilador", "epilador", "gel de limpeza", "limpeza facial", "sabonete facial", "sabonete liquido", "agua micelar", "protetor labial", "creme facial", "creme hidratante", "locao hidratante", "oleo capilar", "oleo corporal", "pomada modeladora", "balm para barba", "oleo para barba", "gloss", "primer", "bb cream", "neutrogena", "nivea", "cerave", "la roche posay", "vichy", "eucerin", "loreal", "l oreal", "elseve", "pantene", "dove", "garnier", "natura", "boticario", "o boticario", "eudora", "avon", "massageador", "escova facial", "termometro", "medidor de pressao", "oximetro", "balanca de bioimpedancia", "balanca digital", "nebulizador", "inalador", "preservativo", "lubrificante intimo", "kit skincare", "demaquilante", "tonico facial", "acido hialuronico", "retinol", "vitamina c", "creme dental", "enxaguante bucal", "antitranspirante", "roll on",
      "shampoo", "condicionador", "hidratante", "maquiagem", "batom", "protetor solar",
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
  // ----- Eletrodomésticos (vêm antes de "casa": "Geladeira Brastemp" é eletrodoméstico) -----
  {
    slug: "geladeiras",
    fortes: [
      "geladeira", "refrigerador", "geladeira frost free", "geladeira duplex", "geladeira inverse",
      "side by side", "freezer", "freezer horizontal", "freezer vertical", "frigobar", "cervejeira",
    ],
    fracas: ["frost free", "duplex", "inverse", "litros", "degelo"],
  },
  {
    slug: "lavadoras",
    fortes: [
      "maquina de lavar", "maquina de lavar roupas", "lavadora", "lavadora de roupas", "lava e seca",
      "lavadora e secadora", "secadora", "secadora de roupas", "tanquinho", "centrifuga de roupas",
      "lava loucas eletrica", "maquina de lavar loucas", "lavadora de loucas",
    ],
    fracas: ["kg", "cesto inox", "agua quente"],
  },
  {
    slug: "micro-ondas",
    fortes: ["micro ondas", "microondas", "forno micro ondas", "forno microondas"],
    fracas: ["descongelar", "prato giratorio"],
  },
  {
    slug: "air-fryer",
    fortes: [
      "air fryer", "airfryer", "fritadeira", "fritadeira eletrica", "fritadeira sem oleo",
      "fritadeira air fryer", "forno air fryer", "oven fryer",
    ],
    fracas: ["sem oleo", "cesto"],
  },
  {
    slug: "fogoes",
    fortes: [
      "fogao", "fogao 4 bocas", "fogao 5 bocas", "fogao de piso", "fogao de embutir", "cooktop",
      "cooktop por inducao", "forno de embutir", "forno eletrico de embutir", "coifa", "depurador",
      "depurador de ar",
    ],
    fracas: ["bocas", "queimadores", "acendimento automatico", "inducao"],
  },
  {
    slug: "eletroportateis",
    fortes: [
      "liquidificador", "batedeira", "batedeira planetaria", "cafeteira", "cafeteira eletrica",
      "maquina de cafe", "cafeteira expresso", "nespresso", "dolce gusto", "tres coracoes",
      "sanduicheira", "torradeira", "mixer", "processador de alimentos", "multiprocessador",
      "panela eletrica", "panela de pressao eletrica", "panela de arroz", "panificadora", "chaleira eletrica",
      "forno eletrico", "espremedor de frutas", "centrifuga de frutas", "extrator de suco",
      "aspirador", "aspirador de po", "aspirador vertical", "ventilador", "ventilador de coluna",
      "ventilador de mesa", "circulador de ar", "ferro de passar", "bebedouro",
      "grill eletrico", "pipoqueira", "iogurteira", "mopa eletrica",
    ],
    fracas: ["eletrico", "eletrica", "110v", "220v", "bivolt", "watts"],
  },
  {
    slug: "casa",
    fortes: [
      "faca", "jogo de facas", "tabua de corte", "caneca", "garrafa", "garrafinha", "pote", "potes", "marmita", "porta tempero", "escorredor", "ralador", "espremedor", "abridor", "saca rolha", "forma de bolo", "travessa", "refratario", "pirex", "jarra", "bule", "chaleira eletrica", "garrafa de agua", "copo termico", "cuia", "kit churrasco", "espeto", "acendedor", "fruteira", "porta copos", "descanso de panela", "pano de prato", "avental", "luva termica", "umidificador", "purificador de ar", "aquecedor", "desumidificador", "climatizador portatil", "organizador de geladeira", "purificador de agua", "filtro de agua", "filtro para torneira", "filtro de torneira", "filtro universal para torneira", "torneira", "torneira gourmet", "arejador", "refil filtro", "refil para filtro", "filtro de barro", "capa para geladeira", "capa de geladeira", "puxador de geladeira", "capa para fogao", "capa para maquina de lavar", "capa para micro ondas", "capa para microondas", "tampa para air fryer", "forro para air fryer", "papel para air fryer", "cabide", "cabides", "sapateira", "varal", "tabua de passar", "ferro de passar", "vaporizador de roupas", "maquina de costura", "relogio de parede", "porta retrato", "vela aromatica", "difusor", "aromatizador", "fechadura", "olho magico", "escada", "extensao eletrica", "filtro de linha", "pilha", "pilhas", "bateria recarregavel", "lanterna", "cofre", "nicho", "cabeceira", "colchonete", "puff", "poltrona", "banqueta", "mesa de cabeceira", "penteadeira", "comoda", "cristaleira", "sapateira", "vasos", "planta artificial", "jardim", "mangueira", "regador", "vaso de planta", "terra adubada",
      "panela", "frigideira",
      "colchao", "cama montessoriana", "cama solteiro", "cama de solteiro", "cama casal", "cama de casal", "cama box", "cama viuva", "bicama", "cama queen", "cama king",
      "sofa", "guarda roupa", "estante", "mesa de jantar", "cadeira", "armario",
      "prateleira", "organizador", "lixeira", "faqueiro", "talher", "copo", "garrafa termica",
      "cortina", "tapete", "luminaria", "lampada",
      "assadeira", "jogo de panela", "jogo de talher",
            "churrasqueira",
      "gabinete para banheiro", "gabinete de banheiro", "gabinete banheiro", "gabinete de cozinha",
      "gabinete para cozinha", "gabinete cozinha",
      "churrasqueira eletrica", "grill",
      "adega", "almofada", "capa de almofada",
      "quadro decorativo", "espelho", "vaso", "jogo americano", "jogo de copos", "jogo de pratos", "jogo de jantar", "jogo de tacas", "jogo de xicaras", "rack para tv", "painel para tv", "mesa console", "aparador", "kit potes", "pote hermetico", "porta condimento",
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
      "manga vol", "manga volume", "mangas", "panini comics", "jbc", "newpop", "one piece", "naruto", "dragon ball", "jujutsu kaisen", "demon slayer", "attack on titan", "chainsaw man", "berserk", "omnibus",
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
  // ----- Bebês e Crianças -----
  // Subcategorias específicas primeiro; "brinquedos" (geral) fica por último para o que não se encaixar.
  {
    slug: "passeio-bebe",
    fortes: [
      "carrinho de bebe", "carrinho bebe", "travel system", "bebe conforto", "cadeirinha para carro",
      "cadeirinha de carro", "cadeira para auto", "cadeirinha auto", "assento de elevacao", "assento booster", "booster infantil", "booster para carro", "cadeira booster",
      "andador", "andador infantil", "canguru para bebe", "canguru ergonomico", "sling", "espelho retrovisor para bebe", "espelho para bebe", "espelho banco traseiro", "protetor de banco infantil", "protetor de banco para cadeirinha", "cortina de sol para carro infantil", "bolsa de passeio",
    ],
    fracas: ["isofix", "0 a 13kg", "0 a 25kg", "reclinavel"],
  },
  {
    slug: "alimentacao-bebe",
    fortes: [
      "mamadeira", "kit mamadeira", "chupeta", "mordedor", "cadeira de alimentacao", "cadeirao",
      "esterilizador de mamadeira", "aquecedor de mamadeira", "bomba tira leite", "extrator de leite",
      "copo de transicao", "copo de treinamento", "babador", "prato infantil", "kit alimentacao infantil",
      "avent", "mam baby", "lillo", "nuk",
      "papinha", "leite em po infantil", "formula infantil", "nan supreme", "nan comfor", "aptamil", "milnutri", "mucilon",
      "almofada de amamentacao", "prato de silicone", "kit talheres infantil", "talher infantil", "copo infantil",
      "garrafa infantil", "garrafinha infantil", "pote infantil", "porta papinha",
    ],
    fracas: ["bico", "anticolica", "livre de bpa"],
  },
  {
    slug: "quarto-bebe",
    fortes: [
      "berco", "kit berco", "mini berco", "berco portatil", "berco desmontavel", "berco cercado",
      "trocador", "trocador portatil", "mobile para berco",
      "comoda infantil", "guarda roupa infantil", "cama infantil", "cama montessoriana infantil", "beliche infantil", "bicama infantil",
      "cabeceira infantil", "abajur infantil", "luminaria infantil", "tapete infantil", "tapete de eva", "tapete emborrachado",
      "nicho infantil", "adesivo de parede infantil", "papel de parede infantil", "kit enxoval", "enxoval de bebe",
      "jogo de lencol infantil", "jogo de cama infantil", "edredom infantil", "cobertor de bebe", "manta de bebe",
      "travesseiro de bebe", "travesseiro infantil", "protetor de berco", "umidificador infantil", "poltrona de amamentacao",
      "cabideiro infantil", "organizador infantil", "bau de brinquedos", "mesa infantil", "mesinha infantil", "cadeira infantil",
      "tapete de atividades", "ginasio de atividades", "cercadinho", "chiqueirinho", "mosquiteiro",
      "ninho redutor", "bolsa maternidade", "mochila maternidade",
    ],
    fracas: ["quarto de bebe", "recem nascido"],
  },
  {
    slug: "higiene-bebe",
    fortes: [
      "fralda", "fraldas", "fralda descartavel", "fralda de pano", "lenco umedecido", "lencos umedecidos",
      "pampers", "huggies", "mamypoko", "personal baby", "pom pom", "banheira de bebe", "banheira infantil",
      "pomada para assadura", "creme para assadura", "kit higiene bebe", "termometro infantil",
      "aspirador nasal", "cortador de unha bebe",
      "shampoo infantil", "sabonete infantil", "colonia infantil", "johnsons baby", "johnson s baby", "protetor solar infantil",
      "repelente infantil", "escova de dente infantil", "creme dental infantil", "sabao para roupa de bebe", "granado bebe",
      "mustela", "lenco umedecido infantil", "hidratante infantil", "kit higiene infantil",
    ],
    fracas: ["baby", "bebe", "recem nascido", "rn", "tamanho p", "tamanho m", "tamanho g", "xg", "xxg"],
  },
  {
    slug: "seguranca-bebe",
    fortes: [
      "baba eletronica", "baba eletronica com camera", "camera baba", "monitor de bebe", "camera para bebe",
      "camera de bebe", "camera baba eletronica", "protetor de tomada", "trava de seguranca infantil",
      "trava para gaveta", "trava de gaveta", "trava de armario", "trava para armario", "portao de seguranca",
      "grade de protecao", "grade de seguranca", "protetor de quina", "protetor de canto", "cerca de seguranca",
      "tela de protecao infantil", "kit seguranca bebe",
    ],
    fracas: ["seguranca infantil", "bebe", "baby"],
  },
  {
    slug: "eletronicos-infantis",
    fortes: [
      "tablet infantil", "tablet para criancas", "smartwatch infantil", "relogio infantil", "relogio gps infantil",
      "fone infantil", "fone de ouvido infantil", "headphone infantil", "camera infantil", "camera fotografica infantil",
      "microfone infantil", "karaoke infantil", "caixa de som infantil", "walkie talkie infantil", "projetor infantil",
      "luminaria projetor infantil", "notebook infantil", "laptop infantil",
    ],
    fracas: ["infantil", "kids"],
  },
  {
    slug: "escolar-infantil",
    fortes: [
      "mochila infantil", "mochila escolar", "mochila de rodinha", "mochila de rodinhas", "lancheira", "lancheira infantil",
      "lancheira termica", "estojo escolar", "estojo infantil", "material escolar", "kit escolar", "kit material escolar",
      "squeeze infantil", "caderno infantil", "lapis de cor", "giz de cera", "canetinha", "canetinhas", "kit pintura escolar",
    ],
    fracas: ["escolar", "volta as aulas"],
  },
  {
    slug: "livros-infantis",
    fortes: [
      "livro infantil", "livros infantis", "livro de colorir", "livro para colorir", "livro sonoro", "livro de banho",
      "livro de pano", "livro de historia infantil", "livro de atividades infantil", "livro de atividades",
      "box infantil", "colecao infantil", "turma da monica", "gibi",
    ],
    fracas: ["infantil", "para criancas", "colorir"],
  },
  {
    slug: "bicicletas-infantis",
    fortes: [
      "bicicleta infantil", "bike infantil", "bicicleta aro 12", "bicicleta aro 14", "bicicleta aro 16",
      "bicicleta aro 20", "bicicleta balance", "bicicleta sem pedal", "bicicleta de equilibrio",
      "bicicleta com rodinhas", "velotrol", "triciclo", "triciclo infantil", "motoca", "motoca infantil",
      "patinete infantil", "patinete 3 rodas", "patinete com luz", "skate infantil", "patins infantil",
      "carrinho eletrico infantil", "carro eletrico infantil", "moto eletrica infantil",
      "quadriciclo infantil", "jipe eletrico infantil", "rodinha lateral",
    ],
    fracas: ["aro 12", "aro 16", "rodinhas", "infantil"],
  },
  {
    slug: "bonecas",
    fortes: [
      "boneca", "boneco", "barbie", "baby alive", "polly pocket", "bebe reborn", "boneca bebe reborn",
      "boneca reborn", "my little pony", "funko", "funko pop", "action figure", "figura de acao",
      "boneco articulado", "casa da barbie", "casinha de boneca", "lol surprise", "monster high",
    ],
    fracas: ["articulado", "colecionavel"],
  },
  {
    slug: "carrinhos",
    fortes: [
      "carrinho de controle remoto", "carro de controle remoto", "controle remoto 7 funcoes",
      "caminhao de controle remoto", "helicoptero de controle remoto", "drone infantil",
      "hot wheels", "pista hot wheels", "hot wheels track", "pista de carrinho", "pista de corrida",
      "carrinho de ferro", "carrinho de brinquedo", "caminhao de brinquedo", "trem de brinquedo",
      "miniatura", "garagem de brinquedo", "matchbox",
    ],
    fracas: ["controle remoto", "carrinho", "escala 1"],
  },
  {
    slug: "blocos-de-montar",
    fortes: [
      "lego", "blocos de montar", "bloco de montar", "playmobil", "magnetico de montar",
      "blocos magneticos", "pecas de montar", "kit de montar",
    ],
    fracas: ["pecas", "montar"],
  },
  {
    slug: "jogos-infantis",
    fortes: [
      "jogo de tabuleiro", "quebra cabeca", "jogo da memoria", "jogo de cartas", "domino", "baralho",
      "xadrez", "jogo de xadrez", "jogo de dama", "cubo magico", "banco imobiliario", "detetive",
      "jenga", "uno", "jogo uno", "beyblade", "pokemon tcg", "carta pokemon", "box pokemon",
      "cara a cara", "pula pirata", "jogo da vida",
    ],
    fracas: ["tabuleiro", "pecas"],
  },
  {
    slug: "pelucias",
    fortes: ["pelucia", "pelucias", "urso de pelucia", "pelucia stitch", "ursinho de pelucia"],
    fracas: ["antialergico", "fofinho"],
  },
  {
    slug: "educativos",
    fortes: [
      "brinquedo educativo", "montessori", "massa de modelar", "massinha", "massinha play doh", "play doh",
      "slime", "kit slime", "lousa magica", "lousa digital", "lousa infantil", "lousa lcd", "tablet lcd",
      "tablet de desenho", "tablet magico", "prancheta magica", "quadro magico", "quadro de desenho",
      "kit medico infantil", "cozinha infantil", "ferramentas de brinquedo", "fantasia", "fantasia infantil",
      "kit pintura infantil", "brinquedo musical", "teclado infantil", "mesa de atividades",
    ],
    fracas: ["educativo", "coordenacao motora", "aprendizado"],
  },
  {
    slug: "brinquedos-ao-ar-livre",
    fortes: [
      "piscina de bolinhas", "pula pula", "cama elastica", "casinha infantil", "piscina infantil",
      "escorregador", "escorregador infantil", "gangorra", "balanco infantil", "nerf", "lancador nerf",
      "arminha de agua", "pistola de agua", "bola de sabao", "barraca infantil", "cabana infantil",
    ],
    fracas: ["playground", "ao ar livre", "quintal"],
  },
  {
    slug: "brinquedos",
    fortes: ["brinquedo", "brinquedos", "brinquedo infantil"],
    fracas: ["infantil", "crianca", "criancas", "kids"],
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
  // ----- Departamentos que antes caíam em "Outras ofertas" -----
  {
    slug: "mercado",
    fortes: [
      "cafe", "cafe em graos", "cafe moido", "cafe soluvel", "capsula de cafe", "capsulas de cafe", "nescafe", "capsulas", "capsula dolce gusto", "capsulas dolce gusto", "capsula nespresso", "capsulas nespresso", "capsulas tres coracoes", "capsula tres coracoes",
      "chocolate", "bombom", "bombons", "barra de chocolate", "caixa de bombom", "nutella", "kinder", "lacta",
      "cerveja", "vinho", "espumante", "whisky", "vodka", "gin", "cachaca", "licor", "tequila", "rum",
      "refrigerante", "energetico", "red bull", "monster energy", "agua mineral", "agua com gas", "suco",
      "leite", "leite em po", "leite condensado", "creme de leite", "achocolatado", "nescau", "toddy",
      "biscoito", "bolacha", "salgadinho", "pipoca", "azeite", "oleo de soja", "arroz", "feijao", "acucar",
      "macarrao", "molho de tomate", "tempero", "cha", "cha verde", "granola", "aveia", "cereal matinal",
      "barra de cereal", "barra de proteina", "pasta de amendoim", "mel", "doce de leite", "geleia",
      "atum", "sardinha", "miojo", "lamen", "cesta basica", "kit cervejas", "heineken", "coca cola",
      "guarana", "stella artois", "budweiser", "corona", "amstel", "johnnie walker", "jack daniels",
    ],
    fracas: ["bebida", "alimento", "alimentos", "lata", "fardo", "pack", "sabor", "gourmet"],
  },
  {
    slug: "pet",
    fortes: [
      "camera para pet", "camera para caes", "camera para cachorro", "camera para gato", "camera pet", "racao", "racao umida", "areia para gato", "areia sanitaria", "areia higienica", "tapete higienico",
      "arranhador", "caminha pet", "cama pet", "cama para cachorro", "cama para gato", "casinha de cachorro",
      "coleira", "peitoral", "guia para cachorro", "comedouro", "bebedouro pet", "fonte para gato", "petisco",
      "petiscos", "sache", "golden", "premier pet", "pedigree", "whiskas", "royal canin", "special dog",
      "special cat", "gran plus", "antipulgas", "nexgard", "bravecto", "simparic", "credeli", "vermifugo",
      "brinquedo para cachorro", "brinquedo para gato", "caixa de transporte", "transportadora pet",
      "shampoo para cachorro", "shampoo pet", "tosador", "tapete pet", "aquario", "gaiola",
    ],
    fracas: ["pet", "cachorro", "cachorros", "gato", "gatos", "caes", "felinos", "filhote", "filhotes"],
  },
  {
    slug: "automotivo",
    fortes: [
      "pneu", "pneus", "oleo de motor", "oleo para motor", "oleo lubrificante", "aspirador automotivo",
      "aspirador veicular", "capa de banco", "capa para banco", "tapete automotivo", "calibrador",
      "compressor de ar portatil", "cera automotiva", "shampoo automotivo", "limpador de parabrisa",
      "palheta", "multimidia automotiva", "central multimidia", "som automotivo", "radio automotivo",
      "alto falante automotivo", "modulo amplificador", "camera de re", "sensor de estacionamento",
      "dash cam", "camera veicular", "capacete", "bateria automotiva", "carregador de bateria automotiva",
      "lampada automotiva", "super led", "farol", "engate", "rack de teto", "bagageiro", "bauleto",
      "jaqueta motociclista", "luva motociclista", "intercomunicador", "macaco hidraulico", "chave de roda",
      "kit emergencia", "polidora", "lava jato", "aromatizador automotivo",
      "carplay", "android auto", "dvr", "dvr automotivo", "camera veicular", "suporte para moto",
      "suporte de celular para moto", "gps moto", "gps automotivo", "retrovisor",
    ],
    fracas: ["automotivo", "automotiva", "veicular", "carro", "carros", "moto", "motos", "para carro", "para moto"],
  },
  {
    slug: "papelaria",
    fortes: [
      "caderno", "cadernos", "caderno universitario", "caneta", "canetas", "lapis", "lapiseira", "marca texto",
      "estojo", "agenda", "planner", "papel sulfite", "resma", "grampeador", "calculadora", "post it",
      "bloco de notas", "tesoura escolar", "fichario", "borracha", "apontador", "kit escolar",
      "material escolar", "giz de cera", "lapis de cor", "canetinha", "canetinhas", "quadro branco",
      "etiquetadora", "organizador de mesa", "cartucho de tinta", "toner", "papel fotografico",
      "fragmentadora", "caneta gel", "bic", "faber castell", "tilibra", "stabilo", "pilot",
    ],
    fracas: ["escolar", "escritorio", "papelaria", "a4", "folhas"],
  },
  {
    slug: "esporte",
    fortes: [
      "bicicleta", "bike", "esteira", "halter", "kettlebell", "tapete de yoga",
      "bola de futebol", "bola de basquete", "skate", "patins", "patinete", "barraca",
      "camping", "corda de pular", "luva de boxe", "elastico de treino", "banco de supino",
      "anilha", "chuteira", "raquete", "oculos de natacao", "caiaque", "vara de pesca",
      "squeeze", "shaker", "bola de pilates", "caneleira",
      // Academia (mais termos para pegar mais ofertas)
      "colchonete", "mini band", "roda abdominal", "barra fixa", "saco de pancada", "estacao de musculacao",
      "bicicleta ergometrica", "faixa elastica", "tornozeleira de peso", "luva de academia", "cinto de musculacao",
      "munhequeira", "hand grip", "barra olimpica", "prancha abdominal", "suporte para halter", "kit halteres",
      "bola suica", "tapete de exercicio", "elastico extensor", "power band",
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

function categoriaDoProdutoPrincipal(texto, ignorar = null) {
  let melhor = null;
  for (const categoria of CATEGORIAS) {
    if (ignorar?.has(categoria.slug)) continue;
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

// ----- Cupons -----
// Postagens que são só um cupom (ex.: "20% OFF, Limite de R$ 20", "Cupom Mercado Livre"),
// sem um produto: vão para a aba Cupons, não para um departamento.
const COMECO_DE_CUPOM = [
  /^ (cupom|cupons|cupao|cupon) /,
  /^ \d+ ?(off|de desconto|desconto) /,
  /^ r \d+( \d+)? (off|de desconto|desconto) /,
  /^ (ganhe|resgate|resgatar|use o cupom|codigo|codigo promocional|desconto de|desconto progressivo|frete gratis acima) /,
];
const SINAIS_DE_CUPOM = [
  " cupom ", " cupons ", " off ", " limite de ", " compras acima ", " acima de r ", " valido para ", " codigo ",
  " desconto em compras ", " primeira compra ", " desconto no app ", " frete gratis acima ",
];

// Título que COMEÇA como cupom ("R$ 400 OFF na compra do Console...", "14% OFF no Notebook...
// com o cupom NOTE14", "Cupom Mercado Livre") é sempre cupom, mesmo citando um produto
export const comecaComoCupom = (titulo) => COMECO_DE_CUPOM.some((re) => re.test(normalizar(titulo)));

export function ehCupom(titulo) {
  const texto = normalizar(titulo);
  if (COMECO_DE_CUPOM.some((re) => re.test(texto))) return true;
  return SINAIS_DE_CUPOM.filter((s) => texto.includes(s)).length >= 2;
}

// Modelos de celular (o número vem colado: "galaxy s25", "iphone 16", "redmi note 14", "moto g85")
const MODELO_DE_CELULAR =
  / (smartphone|celular|iphone( \d+)?|galaxy (s|a|m|z|note|flip|fold) ?\d+|redmi( note)? ?\d+|poco [a-z]?\d+|moto (g|e) ?\d+|motorola edge|realme \d+|pixel \d+) /;

// Computador completo: começa com PC/computador, ou cita processador + memória + armazenamento
function ehComputadorCompleto(texto) {
  if (/^ (pc|computador|desktop|cpu completa|mini pc|kit pc|all in one) /.test(texto)) return true;
  const temProcessador = / (intel|core i\d|core ultra|ryzen|celeron|pentium|athlon) /.test(texto);
  const temMemoria = / \d+ ?gb (de )?(ram|memoria|ddr\d)| ram \d+ ?gb| memoria \d+ ?gb/.test(texto);
  const temArmazenamento = / (ssd|hd|nvme|hdd) /.test(texto);
  return temProcessador && temMemoria && temArmazenamento && !/ notebook | laptop /.test(texto);
}

const VEICULO = /\b(moto|motos|motocicleta|carro|carros|veicular|automotiv[oa]|carplay|android auto|dvr|retrovisor|painel do carro)\b/;
const ehDeVeiculo = (texto) => VEICULO.test(texto);

// ----- Games: jogo x console x controle -----
// "Grand Theft Auto VI - PlayStation 5": a plataforma vem no FIM do título → é um jogo.
// Console de verdade cita "console", armazenamento, "edição digital", "slim"... ou começa pela marca.
const PLATAFORMA_NO_FIM =
  /(?:[-–—|:,]|\bpara\b|\bpro\b)?\s*(?:playstation\s*[45]?|ps\s?[45]|xbox(?:\s+series\s+[xs]|\s+one)?|nintendo\s+switch(?:\s*2)?|switch(?:\s*2)?)\s*$/i;
const PALAVRAS_DE_CONSOLE =
  / (console|consoles|videogame|video game|slim|825gb|1tb|2tb|edicao digital|digital edition|bundle|steam deck|rog ally|legion go|oled|lite|portatil|controle|controles) /;
const COMECA_PELA_MARCA = /^ (sony|microsoft|nintendo|playstation|xbox|console|ps5|ps4|switch) /;
// Começa com "Controle/Joystick/Gamepad" de video game → Controles (não "Games" nem "Consoles")
const COMECA_COMO_CONTROLE = /^ (controle|controles|joystick|gamepad|manete) /;
const COMECA_COMO_CONTROLE_REMOTO = /^ controle remoto /;

// Eletrodoméstico x peça de PC: "Refrigerador de CPU", "Ventilador 120mm ARGB" são de computador.
const ELETRODOMESTICOS = new Set(["geladeiras", "lavadoras", "micro-ondas", "air-fryer", "fogoes", "eletroportateis", "ar-condicionado"]);
const CONTEXTO_DE_PC =
  / (cpu|gpu|processador|processadores|placa de video|placa mae|pc|pc gamer|computador|gabinete|notebook|am4|am5|lga ?\d+|lga\d+|intel|ryzen|rgb|argb|\d{2,3} ?mm|pwm|rpm|aio|vga|chipset|ssd|nvme|m 2|ddr\d) /;
const ehDePc = (texto) => CONTEXTO_DE_PC.test(texto);
const COOLER_NO_COMECO = / (cooler|coolers|ventilador|ventiladores|ventoinha|ventoinhas|fan|fans|refrigerador|refrigeracao|dissipador|radiador|water cooler) /;
// Onde um cooler de PC pode ficar sem ser corrigido (gabinete com fans, base de notebook, placa de vídeo...)
const RESULTADOS_DE_PC_OK = new Set(["water-cooler", "hardware", "gabinete", "acessorios-notebook", "placa-de-video", "notebook", "computadores"]);
const primeirasPalavras = (texto, n) => ` ${texto.trim().split(" ").slice(0, n).join(" ")} `;

// ----- Bebês e Crianças: tudo que é para bebê ou criança vai para esse departamento -----
const PARA_CRIANCA = / (bebe|bebes|baby|infantil|infantis|crianca|criancas|kids|kid|menino|menina|meninos|meninas|recem nascido|nenem|maternidade) /;
const NAO_E_CRIANCA =
  / (baby look|babylook|babyliss|baby doll|babydoll|jogo|jogos|ps4|ps5|xbox|nintendo|switch|sexy|sensual|lingerie|sem bojo|com bojo|fio dental|erotico|erotica|sex shop|adulto|adulta|cao|caes|cachorro|cachorros|gato|gatos|pet|pets|estimacao|solteiro|viuva|casal|queen|king) /;
const DE_PET = / (cao|caes|cachorro|cachorros|gato|gatos|pet|pets|estimacao) /;
const CATEGORIAS_CRIANCA = new Set([
  "brinquedos", "bonecas", "carrinhos", "blocos-de-montar", "jogos-infantis", "pelucias", "educativos",
  "brinquedos-ao-ar-livre", "bicicletas-infantis", "bebes", "passeio-bebe", "alimentacao-bebe", "quarto-bebe",
  "seguranca-bebe", "higiene-bebe", "moda-infantil", "escolar-infantil", "eletronicos-infantis", "livros-infantis",
]);
// Categorias que ficam onde estão mesmo citando criança (games e pet têm departamento próprio)
const FICA_ONDE_ESTA = new Set(["jogos", "consoles", "controles", "games", "pet", "cupons"]);
const DE_BEBE = / (bebe|bebes|baby|recem nascido|nenem|maternidade) /;
const DE_COZINHA = / (garrafa|garrafinha|copo|copos|pote|potes|prato|pratos|talher|talheres|marmita|squeeze) /;
const DE_PEDALAR = / (bicicleta|bike|patinete|skate|patins|triciclo) /;

function paraCrianca(resultado, texto) {
  // Câmera/monitor para cães e gatos é Pet Shop (mesmo dizendo "também para bebês")
  if (["cameras", "casa-inteligente", "seguranca-bebe"].includes(resultado) && DE_PET.test(texto)) return "pet";
  if (CATEGORIAS_CRIANCA.has(resultado) || FICA_ONDE_ESTA.has(resultado)) return resultado;
  if (!PARA_CRIANCA.test(texto) || NAO_E_CRIANCA.test(texto)) return resultado;
  switch (resultado) {
    case "moda": case "moda-masculina": case "moda-feminina": case "sapatos":
      return "moda-infantil";
    case "mochilas": case "papelaria":
      return "escolar-infantil";
    case "livros":
      return "livros-infantis";
    case "cameras": case "casa-inteligente": case "monitor": case "redes":
      return DE_BEBE.test(texto) || / (monitor|baba) /.test(texto) ? "seguranca-bebe" : "eletronicos-infantis";
    case "tablets": case "relogios": case "fones": case "celulares": case "eletronicos": case "caixas-de-som":
    case "notebook": case "notebooks": case "perifericos": case "acessorios-celular": case "televisores":
      return "eletronicos-infantis";
    case "beleza": case "perfumaria": case "limpeza":
      return "higiene-bebe";
    case "mercado":
      return "alimentacao-bebe";
    case "automotivo":
      return "passeio-bebe";
    case "esporte":
      return DE_PEDALAR.test(texto) ? "bicicletas-infantis" : "brinquedos-ao-ar-livre";
    case "ferramentas":
      return "educativos";
    case "casa": case "cama-banho": case "cadeiras-mesas": case "eletroportateis": case "ar-condicionado":
      return DE_COZINHA.test(texto) ? "alimentacao-bebe" : "quarto-bebe";
    case null: case undefined:
      return DE_BEBE.test(texto) ? "bebes" : "brinquedos";
    default:
      return resultado;
  }
}

// ----- Subcategorias por palavra (Saúde e Beleza, Esporte, Mercado, Pet, Livros, Papelaria, Ferramentas, Automotivo) -----
// Depois de achar a categoria-mãe, a palavra que aparece primeiro no título escolhe a subcategoria.
// Para melhorar, é só acrescentar palavras. Sem nenhuma palavra, a oferta fica na categoria-mãe.
export const SUBCATEGORIAS = {
  "beleza": [
    { slug: "suplementos", palavras: ["creatina", "whey", "whey protein", "suplemento", "colageno", "vitamina", "vitaminas", "omega 3", "pre treino", "bcaa", "multivitaminico", "melatonina", "termogenico", "proteina", "hipercalorico", "glutamina", "maltodextrina", "coqueteleira"] },
    { slug: "saude", palavras: ["termometro", "medidor de pressao", "aparelho de pressao", "monitor de pressao", "oximetro", "balanca de bioimpedancia", "balanca digital", "balanca corporal", "nebulizador", "inalador", "massageador", "pistola de massagem", "preservativo", "lubrificante intimo", "glicosimetro", "curativo", "meia de compressao", "bolsa termica"] },
    { slug: "barbear", palavras: ["barbeador", "aparelho de barbear", "aparador de barba", "aparador de pelos", "balm para barba", "oleo para barba", "pomada modeladora", "maquina de cortar cabelo", "maquina de corte", "cortador de cabelo", "gillette", "lamina de barbear", "espuma de barbear", "kit barba", "shaver"] },
    { slug: "cabelos", palavras: ["shampoo", "condicionador", "mascara capilar", "oleo capilar", "secador de cabelo", "chapinha", "prancha de cabelo", "escova secadora", "escova rotativa", "escova alisadora", "modelador de cachos", "babyliss", "escova de cabelo", "tintura", "elseve", "pantene", "finalizador", "leave in", "creme de pentear", "kit capilar"] },
    { slug: "maquiagem", palavras: ["maquiagem", "batom", "gloss", "primer", "bb cream", "base facial", "corretivo", "po compacto", "paleta de sombras", "pincel de maquiagem", "pinceis de maquiagem", "esponja de maquiagem", "rimel", "mascara de cilios", "delineador", "cilios", "cilios posticos", "lash", "curvex", "sobrancelha", "esmalte", "unha", "unhas", "unha postica", "kit manicure", "manicure", "alicate de cuticula", "lixa de unha", "gel para unha", "cabine led", "blush", "iluminador", "contorno"] },
    { slug: "skincare", palavras: ["skincare", "kit skincare", "serum", "acido hialuronico", "retinol", "protetor solar", "creme facial", "gel de limpeza", "limpeza facial", "sabonete facial", "agua micelar", "tonico facial", "demaquilante", "hidratante facial", "cerave", "la roche posay", "vichy", "neutrogena", "eucerin", "mascara facial", "escova facial"] },
    { slug: "higiene-pessoal", palavras: ["desodorante", "antitranspirante", "roll on", "sabonete", "sabonete liquido", "creme dental", "pasta de dente", "escova de dente", "escova de dente eletrica", "fio dental", "enxaguante bucal", "absorvente", "hidratante", "creme hidratante", "locao hidratante", "oleo corporal", "protetor labial", "depilador", "epilador", "dove", "nivea", "irrigador oral"] },
  ],
  "esporte": [
    { slug: "academia", palavras: ["esteira", "bicicleta ergometrica", "spinning", "halter", "halteres", "kettlebell", "anilha", "banco de supino", "elastico de treino", "corda de pular", "tapete de yoga", "bola de pilates", "caneleira", "luva de academia", "shaker", "squeeze", "colchonete", "estacao de musculacao", "roda abdominal", "step", "luva de boxe", "saco de pancada", "barra fixa", "mini band", "faixa elastica"] },
    { slug: "ciclismo", palavras: ["bicicleta", "bike", "ciclismo", "capacete de ciclismo", "capacete bike", "selim", "pedal", "farol para bike", "bomba de ar", "camara de ar", "aro 29", "aro 26", "mtb", "bicicleta eletrica"] },
    { slug: "skate-patins", palavras: ["skate", "patins", "patinete", "patinete eletrico", "longboard", "hoverboard"] },
    { slug: "camping-pesca", palavras: ["barraca", "camping", "saco de dormir", "lanterna de camping", "colchao inflavel", "caixa termica", "vara de pesca", "molinete", "carretilha", "isca", "anzol", "caiaque", "mochila de trilha", "cadeira de praia", "guarda sol", "fogareiro"] },
    { slug: "esportes-bola", palavras: ["bola de futebol", "bola de basquete", "bola de volei", "chuteira", "rede de volei", "raquete", "beach tennis", "tenis de mesa", "ping pong", "luva de goleiro", "camisa de time", "oculos de natacao", "touca de natacao", "bola"] },
  ],
  "mercado": [
    { slug: "cafe", palavras: ["cafe", "cafe em graos", "cafe moido", "cafe soluvel", "capsula de cafe", "capsulas de cafe", "nescafe", "capsula", "capsulas"] },
    { slug: "bebidas", palavras: ["cerveja", "vinho", "espumante", "whisky", "vodka", "gin", "cachaca", "licor", "tequila", "rum", "refrigerante", "energetico", "red bull", "monster energy", "agua mineral", "agua com gas", "suco", "kit cervejas", "heineken", "coca cola", "guarana", "stella artois", "budweiser", "corona", "amstel", "johnnie walker", "jack daniels"] },
    { slug: "doces-snacks", palavras: ["chocolate", "bombom", "bombons", "barra de chocolate", "caixa de bombom", "nutella", "kinder", "lacta", "biscoito", "bolacha", "salgadinho", "pipoca", "barra de cereal", "barra de proteina", "doce de leite", "geleia", "pasta de amendoim", "mel"] },
    { slug: "alimentos", palavras: ["leite", "leite em po", "leite condensado", "creme de leite", "achocolatado", "nescau", "toddy", "azeite", "oleo de soja", "arroz", "feijao", "acucar", "macarrao", "molho de tomate", "tempero", "cha", "cha verde", "granola", "aveia", "cereal matinal", "atum", "sardinha", "miojo", "lamen", "cesta basica"] },
  ],
  "pet": [
    { slug: "racao", palavras: ["racao", "racao umida", "petisco", "petiscos", "sache", "golden", "premier pet", "pedigree", "whiskas", "royal canin", "special dog", "special cat", "gran plus", "biscoito para cachorro"] },
    { slug: "higiene-pet", palavras: ["areia para gato", "areia sanitaria", "areia higienica", "tapete higienico", "tapete pet", "antipulgas", "nexgard", "bravecto", "simparic", "credeli", "vermifugo", "shampoo para cachorro", "shampoo pet", "tosador", "escova pet", "cortador de unha pet"] },
    { slug: "acessorios-pet", palavras: ["camera para pet", "camera para caes", "camera para cachorro", "camera para gato", "camera pet", "arranhador", "caminha pet", "cama pet", "cama para cachorro", "cama para gato", "casinha de cachorro", "coleira", "peitoral", "guia para cachorro", "comedouro", "bebedouro pet", "fonte para gato", "brinquedo para cachorro", "brinquedo para gato", "caixa de transporte", "transportadora pet", "aquario", "gaiola", "roupa pet", "roupa para cachorro"] },
  ],
  "livros": [
    { slug: "mangas-hqs", palavras: ["manga vol", "manga volume", "one piece", "naruto", "dragon ball", "jujutsu kaisen", "demon slayer", "attack on titan", "chainsaw man", "berserk", "jbc", "newpop", "manga", "mangas", "hq", "hqs", "historia em quadrinhos", "quadrinhos", "graphic novel", "marvel", "dc comics", "omnibus", "panini"] },
  ],
  "tablets": [
    { slug: "e-readers", palavras: ["kindle", "kobo", "e reader", "leitor de livros digitais", "leitor digital"] },
  ],
  "papelaria": [
    { slug: "escritorio", palavras: ["papel sulfite", "resma", "grampeador", "calculadora", "post it", "etiquetadora", "organizador de mesa", "cartucho de tinta", "toner", "papel fotografico", "fragmentadora", "quadro branco", "agenda", "planner", "fichario", "pasta catalogo", "perfurador"] },
  ],
  "ferramentas": [
    { slug: "jardim", palavras: ["cortador de grama", "rocadeira", "soprador de folhas", "motosserra", "pulverizador", "mangueira", "regador", "jardim", "jardinagem", "vaso de planta", "terra adubada", "aspersor", "tesoura de poda", "carrinho de mao", "enxada", "pa de jardinagem"] },
    { slug: "ferramentas-eletricas", palavras: ["furadeira", "parafusadeira", "esmerilhadeira", "lixadeira", "serra circular", "serra tico tico", "tupia", "plaina", "lavadora de alta pressao", "compressor", "compressor de ar", "gerador", "inversor de solda", "maquina de solda", "soprador termico", "pistola de cola quente", "ferro de solda", "extratora", "aspirador de po e liquido", "pinador", "finca pino", "pistola finca pino", "nivel a laser", "multimetro", "grampeador pneumatico", "marteletes", "martelete", "serra marmore", "politriz"] },
    { slug: "ferramentas-manuais", palavras: ["kit ferramentas", "maleta de ferramentas", "jogo de ferramentas", "jogo de chaves", "chave catraca", "alicate", "martelo", "serrote", "chave de fenda", "chave philips", "jogo de soquetes", "jogo de brocas", "jogo de bits", "trena", "morsa", "torno", "escada", "fita isolante", "extensao eletrica", "caixa de ferramentas", "chave inglesa", "nivel de bolha"] },
  ],
  "casa": [
    { slug: "jardim", palavras: ["mangueira", "regador", "jardim", "jardinagem", "vaso de planta", "terra adubada", "aspersor", "tesoura de poda", "planta artificial"] },
  ],
  "automotivo": [
    { slug: "moto", palavras: ["capacete", "bauleto", "bau para moto", "jaqueta motociclista", "luva motociclista", "intercomunicador", "suporte para moto", "suporte de celular para moto", "gps moto", "para moto", "motociclista", "viseira", "antena corta pipa", "capa para moto"] },
    { slug: "pneus-pecas", palavras: ["pneu", "pneus", "oleo de motor", "oleo para motor", "oleo lubrificante", "bateria automotiva", "palheta", "limpador de parabrisa", "lampada automotiva", "super led", "farol", "filtro de oleo", "pastilha de freio", "amortecedor", "vela de ignicao"] },
    { slug: "som-automotivo", palavras: ["multimidia automotiva", "central multimidia", "som automotivo", "radio automotivo", "alto falante automotivo", "modulo amplificador", "camera de re", "sensor de estacionamento", "dash cam", "camera veicular", "carplay", "android auto", "dvr", "dvr automotivo", "gps automotivo", "subwoofer", "caixa de som automotiva"] },
    { slug: "acessorios-carro", palavras: ["capa de banco", "capa para banco", "tapete automotivo", "aspirador automotivo", "aspirador veicular", "cera automotiva", "shampoo automotivo", "aromatizador automotivo", "engate", "rack de teto", "bagageiro", "calibrador", "compressor de ar portatil", "macaco hidraulico", "chave de roda", "kit emergencia", "polidora", "lava jato", "retrovisor", "organizador para carro", "capa para carro", "protetor solar para carro", "carregador de bateria automotiva"] },
  ],
};

function refinarSubcategoria(resultado, texto) {
  const subs = SUBCATEGORIAS[resultado];
  if (!subs) return resultado;
  let melhor = null;
  for (const sub of subs) {
    for (const palavra of sub.palavras) {
      const pos = posicao(texto, palavra);
      if (pos < 0) continue;
      const tamanho = palavra.length;
      if (!melhor || pos < melhor.pos || (pos === melhor.pos && tamanho > melhor.tamanho)) melhor = { slug: sub.slug, pos, tamanho };
    }
  }
  return melhor?.slug ?? resultado;
}

// loja é opcional: ajuda a separar a moda infantil (ex.: "UP Kids")
export function classificar(titulo, loja) {
  const texto = normalizar(titulo);
  const resultado = refinarSubcategoria(paraCrianca(classificarSemCrianca(titulo, loja), texto), texto);
  return corrigirCasosEspeciais(refinarFitness(resultado, texto), texto, titulo, loja);
}

// ----- Correções de casos que confundiam o classificador -----
// Câmera/aparelho que "conecta no celular" não é celular; babá eletrônica vai para Bebês
const DE_BABA = / (baba eletronica|baba digital|monitor de bebe|camera baba|camera para bebe|camera de bebe) /;
const USA_O_CELULAR = / (conecta|conecta no|conecta ao|conecta com|pelo|no|via|com o|ao|app no|app do|controle pelo) (celular|smartphone) /;
// Peça/acessório PARA o celular ("Lente compatível com iPhone 15", "Converter para iPhone 18")
const ACESSORIO_DE_CELULAR = / (compativel com|compativeis com|para iphone|para galaxy|para celular|para smartphone|lente|lentes|diafragma|converter|conversor|kit de lente|capa|capinha|pelicula|suporte|carcaca|tampa traseira|vidro traseiro) /;
// TV stick, dongle, transmissor HDMI sem fio etc. são acessórios de TV, não TVs
// (Roku sozinho NÃO: "Smart TV Philco Roku TV" é uma TV; o Roku Express/Stick cai em "stick"/"express")
const ACESSORIO_DE_TV = / (stick|tv stick|dongle|chromecast|fire tv|tv box|roku express|roku streaming|mi box|transmissor|receptor|extensor|hdmi sem fio|sem fio hdmi|adaptador|conversor|antena|controle remoto|suporte) /;
// TV de verdade tem o tamanho da tela no título ("Smart TV 43\"", "32 Polegadas")
const TAMANHO_DE_TELA = / \d{2}\s?(polegadas|pol|") /;
const NUNCA_E_TV = / (stick|dongle|chromecast|fire tv|tv box|transmissor|receptor|extensor|suporte|antena|controle remoto) /;
// Móvel para TV (rack, painel, estante) é Casa, não TV
const MOVEL_DE_TV = / (rack|painel|estante|prateleira|nicho|suspenso|suspensa|ripado|aparador|movel|bancada|home suspenso) /;

// Jogos famosos (para o jogo não cair em Consoles só porque cita "PlayStation 5" ou "Xbox")
const JOGOS_FAMOSOS = [
  "final fantasy", "fifa", "ea sports fc", "ea fc", "call of duty", "gta", "grand theft auto", "god of war",
  "spider man", "spiderman", "homem aranha", "the last of us", "horizon", "gran turismo", "mortal kombat",
  "street fighter", "tekken", "resident evil", "assassins creed", "assassin s creed", "elden ring", "minecraft",
  "zelda", "mario kart", "super mario", "mario party", "mario bros", "pokemon", "sonic", "crash bandicoot",
  "red dead", "cyberpunk", "hogwarts legacy", "battlefield", "forza", "halo", "diablo", "need for speed",
  "nba 2k", "madden", "f1 24", "f1 25", "ghost of tsushima", "ghost of yotei", "death stranding", "astro bot",
  "ratchet", "uncharted", "demons souls", "demon s souls", "sekiro", "black myth", "stellar blade", "star wars",
  "dragon ball", "naruto", "one piece", "monster hunter", "persona", "metal gear", "silent hill",
  "kingdom hearts", "dead space", "alan wake", "it takes two", "split fiction", "the sims", "just dance",
  "overcooked", "borderlands", "doom", "fallout", "skyrim", "the witcher", "starfield", "baldurs gate",
  "baldur s gate", "dying light", "far cry", "watch dogs", "ghost recon", "rainbow six", "hollow knight",
  "hades", "cuphead", "sackboy", "kirby", "metroid", "donkey kong", "animal crossing", "splatoon",
  "xenoblade", "fire emblem", "luigi s mansion", "luigis mansion", "smash bros", "princess peach",
  "lego star wars", "lego marvel", "lego batman", "avatar frontiers", "marvel s", "wukong", "palworld",
  "atomic heart", "lies of p", "hogwarts", "the crew", "nioh", "returnal", "days gone", "until dawn",
  "detroit become human", "life is strange", "tomb raider", "hitman", "prince of persia", "rayman",
  "sifu", "kena", "stray", "ea sports college football", "pes", "efootball", "wwe 2k", "ufc 5", "nhl",
];
const JOGO_FAMOSO = new RegExp(` (${JOGOS_FAMOSOS.map((j) => j.replace(/ /g, " ")).join("|")}) `);
const CONSOLE_DE_VERDADE = / (console|slim|edicao digital|pro 2tb|1tb|825gb|controle|headset|carregador|suporte|base|volante|cabo|case|bolsa) /;
// Console com jogo de brinde ("Bundle GTA VI + PlayStation 5 Slim Digital 825GB"): tem a palavra console,
// bundle, o modelo (slim/digital) ou o armazenamento do aparelho (825GB, 1TB) em qualquer parte do título
const CONSOLE_NO_TITULO = / (console|bundle|slim|edicao digital|\d{3,4}\s?gb|\d\s?tb) /;
// Celular "+ Capa + Película" continua celular: o título começa pelo aparelho e diz a memória
const COMECA_COMO_CELULAR = / (celular|smartphone|iphone \d|galaxy|moto g|moto e|motorola|xiaomi|redmi|poco|realme|samsung galaxy) /;

function corrigirCasosEspeciais(resultado, texto, titulo, loja) {
  const t = ` ${texto} `;
  // Jogo que caiu em Consoles: tem nome de jogo famoso (ou "jogo") e não é aparelho/acessório
  if (resultado === "consoles" && (JOGO_FAMOSO.test(t) || / (jogo|game) /.test(primeirasPalavras(texto, 2)) || / jogo /.test(t)) && !CONSOLE_DE_VERDADE.test(primeirasPalavras(texto, 3)) && !CONSOLE_NO_TITULO.test(t))
    return "jogos";
  if (DE_BABA.test(t) && !["pet"].includes(resultado)) return "seguranca-bebe";
  if (resultado === "celulares") {
    if (COMECA_COMO_CELULAR.test(primeirasPalavras(texto, 3)) && / \d{2,4}\s?gb /.test(t)) return resultado;
    if (USA_O_CELULAR.test(t)) {
      const outro = classificarBase(titulo, loja, new Set(["celulares", "smartphones"]));
      if (outro) return outro;
    }
    if (ACESSORIO_DE_CELULAR.test(t)) return "acessorios-celular";
  }
  if (resultado === "televisores") {
    // o móvel vem no começo do título ("Painel Ripado para TV", "Rack Suspenso"); "TV ... com Painel Antirreflexo" é TV
    if (MOVEL_DE_TV.test(primeirasPalavras(texto, 3))) return "casa";
    const bruto = ` ${String(titulo ?? "").toLowerCase().replace(/[”″“]/g, '"')} `;
    if ((TAMANHO_DE_TELA.test(t) || / \d{2}\s?"/.test(bruto)) && !NUNCA_E_TV.test(t)) return resultado;
    if (ACESSORIO_DE_TV.test(t)) return "acessorios-tv";
  }
  // Fire TV Stick / Chromecast citam "Alexa" ou "Google" mas são acessórios de TV
  if (resultado === "casa-inteligente" && / (fire tv|tv stick|chromecast|roku|google tv streamer|mi stick|mi box) /.test(t)) return "acessorios-tv";
  // Aparelho de streaming sozinho ("Roku Express 4K", "Fire TV Stick")
  if (!resultado && / (roku express|roku streaming|roku ultra|fire tv stick|tv stick|chromecast) /.test(t)) return "acessorios-tv";
  // Celular pelo modelo ("Samsung Galaxy A15 128GB", "Galaxy S24 Ultra")
  if (!resultado && / galaxy (a|s|m|z|fold|flip) ?\d{1,2}/.test(t))
    return ACESSORIO_DE_CELULAR.test(t) ? "acessorios-celular" : "celulares";
  return resultado;
}

// ----- Roupas fitness (Esporte e Lazer > Roupas Fitness) -----
// Roupa que cita treino/academia/fitness sai de Moda e vai para Roupas Fitness.
// Roupa infantil continua em Moda Infantil. "Slim fit", "regular fit" etc. não contam como fitness.
const DE_FITNESS =
  / (fitness|fit|academia|treino|treinar|dry fit|dryfit|suplex|compressao|crossfit|yoga|pilates|corrida|running|esportivo|esportiva|esportivos|esportivas|sport|gym|musculacao|bike|ciclista|ciclismo) /;
const FIT_DE_MODELAGEM = / (slim|regular|skinny|super|comfort|relaxed|oversized|loose|muscle) fit /;
const PECA_DE_ROUPA =
  / (legging|leggings|calca|top|tops|cropped|conjunto|short|shorts|bermuda|regata|camiseta|camisa|blusa|macaquinho|macacao|jaqueta|corta vento|moletom|saia|meia|meias|sutia|body|bodysuit|jogger|segunda pele) /;
const MODA_ADULTA = new Set(["moda", "moda-feminina", "moda-masculina", "esporte"]);

function refinarFitness(resultado, texto) {
  if (resultado && !MODA_ADULTA.has(resultado)) return resultado;
  const limpo = texto.replace(FIT_DE_MODELAGEM, " ");
  // Legging é quase sempre de treino; as outras peças precisam citar fitness/treino
  const ehLegging = / (legging|leggings) /.test(limpo);
  if (!PECA_DE_ROUPA.test(limpo)) return resultado;
  if (ehLegging || DE_FITNESS.test(limpo)) return "roupas-fitness";
  return resultado;
}

function classificarSemCrianca(titulo, loja) {
  let resultado = classificarBase(titulo, loja);
  const texto = normalizar(titulo);

  // Peça de PC que caiu em eletrodoméstico: refaz sem as categorias de eletrodomésticos
  if (ELETRODOMESTICOS.has(resultado) && ehDePc(texto)) resultado = classificarBase(titulo, loja, ELETRODOMESTICOS) ?? resultado;

  // Cooler/ventoinha de PC ("Refrigerador de ar para CPU", "Ventilador 120mm ARGB para PC"):
  // a palavra de refrigeração vem no começo do título e o resto fala de PC → Water Cooler e Coolers
  if (ehDePc(texto) && COOLER_NO_COMECO.test(primeirasPalavras(texto, 5)) && !RESULTADOS_DE_PC_OK.has(resultado))
    return "water-cooler";
  // Título que JÁ COMEÇA com cooler/ventilador ("Ventilador de gabinete ARGB 12cm") é o cooler,
  // mesmo citando gabinete, PC gamer etc. (base de notebook continua em Acessórios para notebook)
  if (ehDePc(texto) && COOLER_NO_COMECO.test(primeirasPalavras(texto, 1)) && !["water-cooler", "hardware", "acessorios-notebook"].includes(resultado))
    return "water-cooler";


  // Controle de video game (não controle remoto de TV/ar)
  if (["games", "consoles", "jogos", "perifericos", "controles"].includes(resultado) && COMECA_COMO_CONTROLE.test(texto) && !COMECA_COMO_CONTROLE_REMOTO.test(texto))
    return "controles";

  // Jogo com a plataforma no fim do título
  if (
    ["consoles", "games"].includes(resultado) &&
    PLATAFORMA_NO_FIM.test(String(titulo || "").trim()) &&
    !PALAVRAS_DE_CONSOLE.test(texto) &&
    !COMECA_PELA_MARCA.test(texto)
  )
    return "jogos";

  // "Games" e "Jogos" são a mesma coisa: o classificador nunca usa a categoria geral "games".
  // Jogo vai para Jogos; acessório de console ("Suporte vertical para PS5") vai para Consoles.
  if (resultado === "games") return ehAcessorio(texto) ? "consoles" : "jogos";

  return resultado;
}

function classificarBase(titulo, loja, ignorar = null) {
  const texto = normalizar(titulo);
  const principal = categoriaDoProdutoPrincipal(texto, ignorar);
  let melhor = null;
  let melhorPontos = 0;

  for (const categoria of CATEGORIAS) {
    if (ignorar?.has(categoria.slug)) continue;
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
  // Tela/monitor/suporte de carro ou moto (CarPlay, DVR, multimídia) é Automotivo, não Monitor/TV
  if (["monitor", "acessorios-monitor", "televisores", "acessorios-tv", "tablets", "cameras"].includes(melhor) && ehDeVeiculo(texto))
    return "automotivo";
  // Cupom: título que começa como cupom, ou só um cupom sem produto reconhecido → aba Cupons
  if (comecaComoCupom(titulo)) return "cupons";
  if (ehCupom(titulo) && (!melhor || !principal)) return "cupons";

  // Acessório que cita o modelo do celular ("Capa ... Galaxy S25") sem outra categoria reconhecida
  if (!melhor && MODELO_DE_CELULAR.test(texto) && ehAcessorio(texto)) return "acessorios-celular";

  // Celular que cita a câmera ("Galaxy S25 Edge... Câmera 200MP") é celular, não câmera
  if (melhor === "cameras" && MODELO_DE_CELULAR.test(texto)) return "celulares";

  // Computador completo cita processador + memória + SSD ("PC Home Essential, Intel Core i3, 8GB RAM, SSD 120GB")
  if (["processadores", "memoria-ram", "ssd", "placa-de-video", "hardware", "water-cooler", "fontes"].includes(melhor) && ehComputadorCompleto(texto))
    return "computadores";
  if (melhor === "moda") return refinarModa(texto, loja);
  if (ACESSORIO_DE[melhor] && ehAcessorio(texto)) return ACESSORIO_DE[melhor];
  return melhor; // null = não reconheceu
}

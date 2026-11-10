// Textos de SEO de cada categoria: título para o Google, descrição e um parágrafo de introdução.
// Salve como lib/seo-categorias.js.
// "termo" é como as pessoas pesquisam (usado no título); "intro" aparece no topo da página.
// Para melhorar o SEO de uma categoria, é só editar o texto dela aqui.

const SEO = {
  smartphones: {
    termo: "Celulares e smartphones em promoção",
    intro:
      "Ofertas de celulares Samsung, Motorola, Xiaomi, Apple e outras marcas, com os menores preços encontrados hoje nas maiores lojas do Brasil. Compare o desconto, confira se há cupom e veja o que a comunidade comentou antes de comprar.",
  },
  celulares: {
    termo: "Celulares e smartphones em promoção",
    intro:
      "Ofertas de celulares Samsung, Motorola, Xiaomi, Apple e outras marcas, com os menores preços encontrados hoje nas maiores lojas do Brasil. Compare o desconto, confira se há cupom e veja o que a comunidade comentou antes de comprar.",
  },
  hardware: {
    termo: "Hardware em promoção: peças para PC",
    intro:
      "Processadores, placas-mãe, SSDs, placas de vídeo, memórias RAM, fontes e coolers com desconto. Reunimos as melhores ofertas de hardware para quem quer montar ou fazer upgrade do PC gastando menos.",
  },
  processadores: {
    termo: "Processadores em promoção: AMD Ryzen e Intel Core",
    intro:
      "Ofertas de processadores AMD Ryzen e Intel Core para PC gamer, trabalho e estudo. Confira o soquete (AM4, AM5, LGA 1700) antes de comprar para garantir que ele é compatível com a sua placa-mãe.",
  },
  "placa-mae": {
    termo: "Placa-mãe em promoção",
    intro:
      "Placas-mãe para AMD e Intel com os melhores preços do dia. Antes de comprar, confira o soquete do processador, o tipo de memória (DDR4 ou DDR5) e o tamanho do gabinete (ATX ou Micro-ATX).",
  },
  ssd: {
    termo: "SSD em promoção: NVMe e SATA",
    intro:
      "SSDs NVMe M.2 e SATA com desconto para deixar o PC e o notebook muito mais rápidos. Os modelos NVMe são os mais velozes; os SATA de 2,5\" funcionam em praticamente qualquer computador.",
  },
  "placa-de-video": {
    termo: "Placa de vídeo em promoção: RTX e Radeon",
    intro:
      "Ofertas de placas de vídeo NVIDIA GeForce RTX e AMD Radeon para jogos e edição. Confira se a sua fonte tem potência suficiente e se a placa cabe no gabinete antes de comprar.",
  },
  "memoria-ram": {
    termo: "Memória RAM em promoção: DDR4 e DDR5",
    intro:
      "Memórias RAM DDR4 e DDR5 para desktop e notebook com os menores preços encontrados. Verifique qual tipo a sua placa-mãe aceita e prefira kits com dois pentes para ativar o dual channel.",
  },
  gabinete: {
    termo: "Gabinete gamer em promoção",
    intro:
      "Gabinetes gamer e para escritório com lateral de vidro, fans RGB e boa ventilação, todos com desconto. Confira o tamanho da placa-mãe e da placa de vídeo que cabem antes de escolher.",
  },
  perifericos: {
    termo: "Periféricos em promoção: mouse, teclado e headset",
    intro:
      "Mouses, teclados mecânicos, headsets, webcams e microfones com desconto. As melhores ofertas de periféricos para jogar, trabalhar e estudar, atualizadas o dia todo.",
  },
  computadores: {
    termo: "PC gamer e computadores em promoção",
    intro:
      "Computadores completos, PCs gamer e mini PCs com preço baixo. Compare processador, placa de vídeo, memória e armazenamento para escolher a melhor configuração pelo seu orçamento.",
  },
  notebooks: {
    termo: "Notebooks e tablets em promoção",
    intro:
      "Notebooks para trabalho, estudo e jogos, além de tablets e Kindles, com os menores preços do dia. Veja processador, memória RAM e tipo de armazenamento para fazer a escolha certa.",
  },
  notebook: {
    termo: "Notebooks e tablets em promoção",
    intro:
      "Notebooks para trabalho, estudo e jogos, além de tablets e Kindles, com os menores preços do dia. Veja processador, memória RAM e tipo de armazenamento para fazer a escolha certa.",
  },
  monitores: {
    termo: "Monitores em promoção: gamer, 4K e ultrawide",
    intro:
      "Monitores gamer de 144Hz a 240Hz, modelos 4K, ultrawide e para escritório com desconto. Compare tamanho, resolução, taxa de atualização e tipo de painel (IPS, VA) antes de comprar.",
  },
  monitor: {
    termo: "Monitores em promoção: gamer, 4K e ultrawide",
    intro:
      "Monitores gamer de 144Hz a 240Hz, modelos 4K, ultrawide e para escritório com desconto. Compare tamanho, resolução, taxa de atualização e tipo de painel (IPS, VA) antes de comprar.",
  },
  eletrodomesticos: {
    termo: "Eletrodomésticos em promoção: geladeira, lavadora, fogão e mais",
    intro:
      "Geladeiras, máquinas de lavar, fogões, micro-ondas, air fryers e outros eletrodomésticos com desconto nas maiores lojas do Brasil. Confira a voltagem (110V, 220V ou bivolt), as medidas do espaço e o selo Procel antes de comprar.",
  },
  geladeiras: {
    termo: "Geladeira em promoção: frost free, duplex e inverse",
    intro:
      "Ofertas de geladeiras, freezers e frigobares Brastemp, Electrolux, Consul, Panasonic e outras marcas. Meça o espaço da cozinha, confira a capacidade em litros e a voltagem antes de fechar a compra.",
  },
  lavadoras: {
    termo: "Máquina de lavar em promoção: lavadora e lava e seca",
    intro:
      "Lavadoras, lava e seca, secadoras e tanquinhos com desconto. A capacidade em kg indica quanta roupa cabe por ciclo: para casal, 11 a 13 kg costuma bastar; para família grande, 15 kg ou mais.",
  },
  fogoes: {
    termo: "Fogão em promoção: 4 bocas, 5 bocas e cooktop",
    intro:
      "Fogões de piso e de embutir, cooktops a gás e por indução, fornos de embutir e coifas com os melhores preços do dia. Cooktop por indução exige panela compatível e tomada adequada.",
  },
  "micro-ondas": {
    termo: "Micro-ondas em promoção",
    intro:
      "Micro-ondas de 20 a 40 litros com desconto, das principais marcas. Confira a capacidade, a voltagem e se cabe no espaço da cozinha (algumas medidas pedem folga para ventilação).",
  },
  "air-fryer": {
    termo: "Air fryer em promoção: fritadeira sem óleo",
    intro:
      "Air fryers e fornos air fryer Mondial, Philco, Britânia, Electrolux e outras marcas em oferta. Para 1 a 2 pessoas, 3 a 4 litros bastam; para família, prefira 5 litros ou mais.",
  },
  eletroportateis: {
    termo: "Eletroportáteis em promoção: cafeteira, liquidificador e mais",
    intro:
      "Cafeteiras, liquidificadores, batedeiras, sanduicheiras, aspiradores, ventiladores e outros eletroportáteis com desconto. Confira a voltagem antes de comprar: muitos modelos não são bivolt.",
  },
  "ar-condicionado": {
    termo: "Ar-condicionado em promoção: split inverter e portátil",
    intro:
      "Ar-condicionado split inverter, portátil e climatizadores com desconto. Compare a potência em BTUs pelo tamanho do ambiente, se é só frio ou quente e frio, e o selo de economia de energia antes de comprar.",
  },
  games: {
    termo: "Games em promoção: PS5, Xbox e Nintendo Switch",
    intro:
      "Jogos, consoles, controles e acessórios para PlayStation, Xbox e Nintendo Switch com os melhores preços. Ofertas de lançamentos e clássicos atualizadas o dia todo.",
  },
  volantes: {
    termo: "Volantes e pedais em promoção para PS5, Xbox e PC",
    intro:
      "Volantes gamer, pedais, câmbios e cockpits para simulador de corrida da Logitech, Thrustmaster e outras marcas com desconto. Confira se o modelo é compatível com o seu console ou PC e se tem force feedback antes de comprar.",
  },
  "cadeiras-mesas": {
    termo: "Cadeiras gamer e mesas em promoção",
    intro:
      "Cadeiras gamer, cadeiras de escritório ergonômicas, mesas e escrivaninhas com desconto para montar um setup mais confortável em casa ou no trabalho.",
  },
  eletronicos: {
    termo: "Eletrônicos em promoção: TVs, fones e smartwatches",
    intro:
      "Smart TVs, fones de ouvido, caixas de som, smartwatches, carregadores e outros eletrônicos com os menores preços encontrados hoje nas maiores lojas do Brasil.",
  },
  "casa-inteligente": {
    termo: "Casa inteligente em promoção: Alexa e Fire TV",
    intro:
      "Echo Dot com Alexa, Fire TV Stick, lâmpadas e tomadas inteligentes, câmeras de segurança e robôs aspiradores com desconto para automatizar a sua casa.",
  },
  redes: {
    termo: "Roteadores e Wi-Fi em promoção",
    intro:
      "Roteadores, repetidores, sistemas mesh e adaptadores Wi-Fi com desconto para melhorar a internet em todos os cômodos da casa.",
  },
  casa: {
    termo: "Casa e cozinha em promoção",
    intro:
      "Air fryers, panelas, eletrodomésticos, utensílios, cama, mesa e banho com os melhores preços do dia. Ofertas para equipar a casa gastando menos.",
  },
  limpeza: {
    termo: "Produtos de limpeza em promoção",
    intro:
      "Sabão, amaciante, detergente, desinfetante e utensílios de limpeza com desconto, muitos em kits que deixam o preço por unidade ainda mais baixo.",
  },
  perfumaria: {
    termo: "Perfumes em promoção: masculinos e femininos",
    intro:
      "Perfumes importados, árabes e nacionais, além de body splash, com os menores preços encontrados. Confira o volume (ml) e a concentração (EDP ou EDT) ao comparar ofertas.",
  },
  beleza: {
    termo: "Beleza e saúde em promoção: skincare e suplementos",
    intro:
      "Skincare, cuidados com o cabelo, barbeadores, creatina, whey protein e vitaminas com desconto. As melhores ofertas de beleza e saúde atualizadas o dia todo.",
  },
  moda: {
    termo: "Roupas e calçados em promoção",
    intro:
      "Camisetas, calças, tênis, bonés e acessórios das marcas mais procuradas com desconto. Confira a tabela de medidas da loja antes de comprar.",
  },
  relogios: {
    termo: "Smartwatch e relógios em promoção",
    intro:
      "Smartwatches, smartbands e relógios analógicos e digitais de marcas como Samsung, Xiaomi, Amazfit, Casio e Tommy Hilfiger com os melhores preços do dia.",
  },
  mochilas: {
    termo: "Mochilas e malas em promoção",
    intro:
      "Mochilas para notebook, malas de viagem e de bordo com desconto, para o dia a dia, a escola e as férias.",
  },
  livros: {
    termo: "Livros em promoção",
    intro:
      "Livros, boxes e quadrinhos com desconto: lançamentos, best-sellers e clássicos com os menores preços encontrados nas maiores lojas.",
  },
  esporte: {
    termo: "Artigos esportivos em promoção",
    intro:
      "Equipamentos de academia, bicicletas, acessórios de treino, camping e esportes com desconto para cuidar da saúde gastando menos.",
  },
  "cama-banho": {
    termo: "Cama e banho em promoção: jogos de cama e toalhas",
    intro:
      "Jogos de cama, edredons, travesseiros, toalhas e acessórios de banheiro com desconto. Confira o tamanho da cama (solteiro, casal, queen ou king) e a quantidade de fios antes de comprar.",
  },
  sapatos: {
    termo: "Sapatos e tênis em promoção",
    intro:
      "Tênis, sapatos, sandálias, chinelos e botas das marcas mais procuradas com desconto. Confira a numeração e a tabela de medidas da loja antes de finalizar a compra.",
  },
  bebe: {
    termo: "Produtos para bebê em promoção: fraldas e enxoval",
    intro:
      "Fraldas, lenços umedecidos, carrinhos, berços, roupinhas e acessórios para bebê com os menores preços encontrados. Kits e pacotes maiores costumam sair mais baratos por unidade.",
  },
  bonecas: {
    termo: "Bonecas e bonecos em promoção",
    intro:
      "Barbie, Baby Alive, bonecas reborn, bonecos articulados e Funko com desconto. Confira a idade indicada na embalagem antes de comprar.",
  },
  carrinhos: {
    termo: "Carrinhos de controle remoto e Hot Wheels em promoção",
    intro:
      "Carrinhos de controle remoto, pistas Hot Wheels, caminhões e miniaturas com os melhores preços. Veja se o controle usa pilha ou bateria recarregável.",
  },
  "blocos-de-montar": {
    termo: "LEGO e blocos de montar em promoção",
    intro:
      "Kits LEGO, blocos magnéticos e brinquedos de montar com desconto. O número de peças e a idade indicada ajudam a escolher o kit certo.",
  },
  "jogos-infantis": {
    termo: "Jogos de tabuleiro e quebra-cabeças em promoção",
    intro:
      "Jogos de tabuleiro, cartas, UNO, quebra-cabeças e jogos para a família com desconto, ótimos para presentear no Natal.",
  },
  pelucias: {
    termo: "Pelúcias em promoção",
    intro:
      "Ursos e personagens de pelúcia com desconto. Prefira modelos antialérgicos e com costura reforçada para crianças pequenas.",
  },
  educativos: {
    termo: "Brinquedos educativos em promoção",
    intro:
      "Brinquedos Montessori, massinha, lousas mágicas, kits de faz de conta e brinquedos musicais com desconto, para aprender brincando.",
  },
  "brinquedos-ao-ar-livre": {
    termo: "Brinquedos para quintal e ao ar livre em promoção",
    intro:
      "Piscinas de bolinha, pula-pula, escorregadores, casinhas e Nerf com desconto. Confira as medidas e o peso máximo antes de comprar.",
  },
  "bicicletas-infantis": {
    termo: "Bicicletas infantis, velotrol e patinetes em promoção",
    intro:
      "Bicicletas aro 12, 16 e 20, bicicletas de equilíbrio, velotrol, triciclos e patinetes infantis com desconto. O aro certo depende da altura da criança: aro 12 para 2 a 4 anos, aro 16 para 4 a 7 e aro 20 para 7 a 10.",
  },
  bebes: {
    termo: "Produtos para bebê em promoção",
    intro:
      "Carrinhos, cadeirinhas, berços, mamadeiras, fraldas e tudo para o bebê com desconto nas maiores lojas do Brasil.",
  },
  "passeio-bebe": {
    termo: "Carrinho de bebê e cadeirinha em promoção",
    intro:
      "Carrinhos de bebê, travel systems, bebê conforto e cadeirinhas para carro com desconto. Cadeirinha para carro precisa ter o selo do Inmetro.",
  },
  "alimentacao-bebe": {
    termo: "Mamadeiras e alimentação do bebê em promoção",
    intro:
      "Mamadeiras, chupetas, cadeiras de alimentação, esterilizadores e bombas tira-leite com desconto, das marcas Avent, MAM, NUK, Lillo e outras.",
  },
  "quarto-bebe": {
    termo: "Berço e quarto do bebê em promoção",
    intro:
      "Berços, mini berços, babás eletrônicas, trocadores, cercadinhos e tapetes de atividades com desconto.",
  },
  "higiene-bebe": {
    termo: "Fraldas em promoção: Pampers, Huggies e mais",
    intro:
      "Fraldas descartáveis, lenços umedecidos, banheiras e cuidados para o bebê com desconto. Compare o preço por unidade da fralda, não só o do pacote.",
  },
  "seguranca-bebe": {
    termo: "Babá eletrônica e segurança do bebê em promoção",
    intro:
      "Babás eletrônicas com câmera, protetores de tomada, travas de gaveta, portões e protetores de quina com desconto, para deixar a casa segura para o bebê.",
  },
  "escolar-infantil": {
    termo: "Mochilas escolares e material escolar em promoção",
    intro:
      "Mochilas infantis, mochilas de rodinha, lancheiras, estojos e material escolar com desconto. Ótimo para comprar antes da volta às aulas.",
  },
  "eletronicos-infantis": {
    termo: "Eletrônicos infantis em promoção",
    intro:
      "Tablets infantis, smartwatches com GPS, fones com limitador de volume, câmeras e karaokês para crianças com desconto.",
  },
  "livros-infantis": {
    termo: "Livros infantis em promoção",
    intro:
      "Livros de histórias, livros para colorir, livros sonoros e de banho, gibis e coleções infantis com desconto.",
  },
  "suplementos": {
    termo: "Whey, creatina e suplementos em promoção",
    intro:
      "Whey protein, creatina, colágeno, vitaminas, pré-treino e outros suplementos com desconto. Compare o preço por grama ou por dose, não só o preço do pote.",
  },
  "saude": {
    termo: "Produtos de saúde em promoção",
    intro:
      "Medidores de pressão, termômetros, oxímetros, nebulizadores, balanças e massageadores com desconto nas maiores lojas.",
  },
  "barbear": {
    termo: "Barbeador e aparador em promoção",
    intro:
      "Barbeadores, aparadores de barba e pelos, máquinas de cortar cabelo, óleos e balms para barba com desconto.",
  },
  "cabelos": {
    termo: "Produtos para cabelo em promoção",
    intro:
      "Shampoos, condicionadores, máscaras, secadores, chapinhas e escovas secadoras com desconto. Confira a voltagem dos aparelhos antes de comprar.",
  },
  "maquiagem": {
    termo: "Maquiagem em promoção",
    intro:
      "Bases, batons, máscaras de cílios, paletas, pincéis, esmaltes e kits de manicure com desconto.",
  },
  "skincare": {
    termo: "Skincare em promoção: protetor solar, sérum e mais",
    intro:
      "Protetores solares, séruns, hidratantes faciais e produtos de limpeza de pele de marcas como CeraVe, La Roche-Posay e Neutrogena com desconto.",
  },
  "higiene-pessoal": {
    termo: "Higiene pessoal em promoção",
    intro:
      "Desodorantes, sabonetes, cremes dentais, escovas elétricas, absorventes e hidratantes corporais com desconto. Kits e embalagens grandes costumam sair mais em conta.",
  },
  "academia": {
    termo: "Equipamentos de academia em promoção",
    intro:
      "Halteres, anilhas, kettlebells, esteiras, bicicletas ergométricas, elásticos e tapetes de yoga com desconto para treinar em casa.",
  },
  "roupas-fitness": {
    termo: "Roupas fitness e de academia em promoção",
    intro:
      "Leggings, tops, shorts, conjuntos fitness, regatas dry fit e bermudas de compressão com desconto, femininos e masculinos, para treinar gastando menos.",
  },
  "ciclismo": {
    termo: "Bicicletas e acessórios de ciclismo em promoção",
    intro:
      "Bicicletas aro 29, mountain bikes, capacetes, luzes, bombas de ar e acessórios de ciclismo com desconto.",
  },
  "skate-patins": {
    termo: "Skate, patins e patinetes em promoção",
    intro:
      "Skates, longboards, patins e patinetes elétricos com desconto. No patinete elétrico, confira a autonomia e o peso máximo suportado.",
  },
  "camping-pesca": {
    termo: "Camping e pesca em promoção",
    intro:
      "Barracas, sacos de dormir, caixas térmicas, varas, molinetes e carretilhas com desconto.",
  },
  "esportes-bola": {
    termo: "Bolas, chuteiras e artigos esportivos em promoção",
    intro:
      "Bolas de futebol, vôlei e basquete, chuteiras, raquetes de beach tennis e artigos de natação com desconto.",
  },
  "cafe": {
    termo: "Café e cápsulas em promoção",
    intro:
      "Café em grãos, moído, solúvel e cápsulas Dolce Gusto, Nespresso e Três Corações com desconto. Compare o preço por quilo ou por cápsula.",
  },
  "bebidas": {
    termo: "Bebidas em promoção: cerveja, vinho e destilados",
    intro:
      "Cervejas, vinhos, espumantes, whiskies, energéticos e refrigerantes com desconto. Venda proibida para menores de 18 anos.",
  },
  "doces-snacks": {
    termo: "Chocolates, doces e snacks em promoção",
    intro:
      "Chocolates, bombons, biscoitos, salgadinhos e barras de cereal com desconto.",
  },
  "alimentos": {
    termo: "Alimentos e mercearia em promoção",
    intro:
      "Azeite, arroz, feijão, leite, achocolatado, macarrão, granola e itens de mercearia com desconto. Compras em fardo ou kit costumam sair mais baratas.",
  },
  "racao": {
    termo: "Ração e petiscos em promoção",
    intro:
      "Rações Golden, Premier, Royal Canin, Pedigree, Whiskas e petiscos para cães e gatos com desconto. Compare o preço por quilo.",
  },
  "higiene-pet": {
    termo: "Higiene e saúde pet em promoção",
    intro:
      "Areia para gato, tapete higiênico, antipulgas (NexGard, Bravecto, Simparic), vermífugos e shampoos pet com desconto.",
  },
  "acessorios-pet": {
    termo: "Acessórios pet em promoção",
    intro:
      "Camas, arranhadores, coleiras, comedouros, fontes, brinquedos e caixas de transporte para cães e gatos com desconto.",
  },
  "mangas-hqs": {
    termo: "Mangás e HQs em promoção",
    intro:
      "Mangás, quadrinhos, graphic novels e encadernados Marvel, DC e Panini com desconto.",
  },
  "e-readers": {
    termo: "Kindle em promoção",
    intro:
      "Kindle, Kobo e outros leitores de livros digitais com desconto. A tela de tinta eletrônica cansa menos a vista e a bateria dura semanas.",
  },
  "escritorio": {
    termo: "Material de escritório em promoção",
    intro:
      "Papel sulfite, calculadoras, grampeadores, toners, cartuchos, planners e organizadores de mesa com desconto.",
  },
  "jardim": {
    termo: "Jardinagem em promoção",
    intro:
      "Cortadores de grama, roçadeiras, mangueiras, regadores, vasos e ferramentas de jardim com desconto.",
  },
  "ferramentas-eletricas": {
    termo: "Ferramentas elétricas em promoção",
    intro:
      "Furadeiras, parafusadeiras, esmerilhadeiras, serras, lavadoras de alta pressão e compressores com desconto. Confira a voltagem e se a bateria vem inclusa.",
  },
  "ferramentas-manuais": {
    termo: "Ferramentas manuais e kits em promoção",
    intro:
      "Kits e maletas de ferramentas, jogos de chaves e soquetes, alicates, trenas e escadas com desconto.",
  },
  "moto": {
    termo: "Acessórios para moto em promoção",
    intro:
      "Capacetes, baús, jaquetas, luvas, intercomunicadores e suportes de celular para moto com desconto. Capacete precisa ter o selo do Inmetro.",
  },
  "pneus-pecas": {
    termo: "Pneus, óleo e peças em promoção",
    intro:
      "Pneus, óleo de motor, baterias, palhetas, lâmpadas e peças automotivas com desconto. Confira a medida do pneu e a especificação do óleo no manual do carro.",
  },
  "som-automotivo": {
    termo: "Som e eletrônicos automotivos em promoção",
    intro:
      "Centrais multimídia, som automotivo, câmeras de ré, sensores de estacionamento e dash cams com desconto.",
  },
  "acessorios-carro": {
    termo: "Acessórios para carro em promoção",
    intro:
      "Capas de banco, tapetes, aspiradores, compressores portáteis, ceras e produtos de limpeza automotiva com desconto.",
  },
  brinquedos: {
    termo: "Brinquedos em promoção",
    intro:
      "Carrinhos de controle remoto, bonecas, LEGO, jogos de tabuleiro, pelúcias e outros brinquedos com desconto. Confira a faixa etária indicada antes de comprar.",
  },
  tv: {
    termo: "Smart TVs em promoção: 4K, QLED e OLED",
    intro:
      "Smart TVs de 32 a 85 polegadas com desconto, de marcas como Samsung, LG, TCL e Philips. Compare tamanho, resolução (Full HD ou 4K), tipo de tela e sistema antes de escolher.",
  },
  televisores: {
    termo: "Smart TVs em promoção: 4K, QLED e OLED",
    intro:
      "Smart TVs de 32 a 85 polegadas com desconto, de marcas como Samsung, LG, TCL e Philips. Compare tamanho, resolução (Full HD ou 4K), tipo de tela e sistema antes de escolher.",
  },
  "caixas-de-som": {
    termo: "Caixas de som em promoção: JBL, soundbar e home theater",
    intro:
      "Caixas de som Bluetooth, soundbars, home theaters e caixas amplificadas com desconto. Confira a potência (RMS), a bateria e a resistência à água ao comparar.",
  },
  cameras: {
    termo: "Câmeras em promoção: digitais, instantâneas e de ação",
    intro:
      "Câmeras digitais, instantâneas, de ação (GoPro e similares), lentes, tripés e ring lights com desconto para fotografar e gravar vídeos gastando menos.",
  },
  ferramentas: {
    termo: "Ferramentas em promoção: furadeiras, parafusadeiras e kits",
    intro:
      "Furadeiras, parafusadeiras, jogos de ferramentas, lavadoras de alta pressão, compressores e outras ferramentas para casa e obra com os melhores preços do dia.",
  },
  "moda-infantil": {
    termo: "Moda infantil em promoção",
    intro: "Roupas para meninos e meninas com desconto: conjuntos, camisetas, vestidos e pijamas. Confira a tabela de tamanhos da loja antes de comprar.",
  },
  "moda-masculina": {
    termo: "Moda masculina em promoção",
    intro: "Camisetas, camisas, calças, bermudas, cuecas e moletons masculinos com desconto das marcas mais procuradas.",
  },
  natal: {
    termo: "Ofertas de Natal: decoração, árvores, pisca-pisca e panetones",
    intro:
      "Árvores de Natal, enfeites, pisca-pisca, guirlandas, presépios, panetones e roupas natalinas com desconto nas maiores lojas do Brasil. Compre com antecedência: perto do Natal os preços sobem e a entrega demora mais.",
  },
  "arvores-de-natal": {
    termo: "Árvores de Natal em promoção",
    intro:
      "Árvores de Natal de 1,20 m a 2,10 m, pinheiros nevados, árvores com LED e kits com enfeites, com desconto. Confira a altura, a quantidade de galhos e se a base é de metal antes de comprar.",
  },
  "decoracao-natal": {
    termo: "Decoração de Natal em promoção: enfeites, pisca-pisca e guirlandas",
    intro:
      "Bolas e enfeites para árvore, pisca-pisca, cortinas de LED, guirlandas, presépios e enfeites de porta com desconto para decorar a casa gastando menos.",
  },
  "camisas-de-time": {
    termo: "Camisas de time em promoção",
    intro:
      "Camisas de clubes brasileiros, de times de fora e de seleções com desconto: Flamengo, Corinthians, Palmeiras, São Paulo, Real Madrid, Seleção Brasileira e muito mais. Confira se é a versão torcedor ou jogador e a tabela de tamanhos da loja.",
  },
  "moda-feminina": {
    termo: "Moda feminina em promoção",
    intro: "Blusas, vestidos, calças, leggings, lingerie e moda praia femininos com desconto das marcas mais procuradas.",
  },
  outros: {
    termo: "Outras ofertas do dia",
    intro: "Promoções variadas que não se encaixam nas outras categorias, todas com desconto real.",
  },
};

export function seoDaCategoria(categoria) {
  const seo = SEO[categoria.slug] ?? {};
  const termo = seo.termo ?? `${categoria.nome} em promoção`;
  const intro =
    seo.intro ??
    `As melhores ofertas de ${categoria.nome} nas maiores lojas do Brasil, com desconto real e atualizadas o dia todo.`;
  return {
    titulo: `${termo}${termo.includes(":") ? "" : " hoje"} | MukiOfertas`,
    descricao: `${intro.split(". ")[0].replace(/\.$/, "")}. Ofertas atualizadas o dia todo.`.slice(0, 160),
    intro,
  };
}

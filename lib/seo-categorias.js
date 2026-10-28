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
  monitores: {
    termo: "Monitores em promoção: gamer, 4K e ultrawide",
    intro:
      "Monitores gamer de 144Hz a 240Hz, modelos 4K, ultrawide e para escritório com desconto. Compare tamanho, resolução, taxa de atualização e tipo de painel (IPS, VA) antes de comprar.",
  },
  games: {
    termo: "Games em promoção: PS5, Xbox e Nintendo Switch",
    intro:
      "Jogos, consoles, controles e acessórios para PlayStation, Xbox e Nintendo Switch com os melhores preços. Ofertas de lançamentos e clássicos atualizadas o dia todo.",
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
    termo: "Relógios em promoção: masculinos e femininos",
    intro:
      "Relógios analógicos e digitais de marcas como Casio, Tommy Hilfiger, Orient e Technos com os melhores preços do dia.",
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
  brinquedos: {
    termo: "Brinquedos em promoção",
    intro:
      "Carrinhos de controle remoto, bonecas, LEGO, jogos de tabuleiro, pelúcias e outros brinquedos com desconto. Confira a faixa etária indicada antes de comprar.",
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
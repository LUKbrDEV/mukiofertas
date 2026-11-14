// Guias de compra do MukiOfertas (conteúdo original do site, usado em /guias).
// Salve como data/guias.js.
//
// Para escrever um guia novo, copie um bloco { ... } inteiro e troque os textos.
//   slug        = endereço do guia (/guias/slug), sem acentos e com hífens
//   linkOfertas = (opcional) endereço do botão "Ver todas" no fim do guia
//   categorias  = slugs das categorias do site (data/ofertas.js) ligadas ao guia;
//                 as ofertas dessas categorias aparecem no fim do guia e o guia aparece nas ofertas
//   atualizadoEm = data no formato AAAA-MM-DD (mude sempre que revisar o texto)
//   secoes      = cada seção tem um título e parágrafos; "lista" é opcional
//
// Dica para o AdSense: escreva com as suas palavras, revise de vez em quando e não copie
// texto de outros sites. Guias bons e atualizados são o que mais conta na aprovação.

export const guias = [
  {
    slug: "como-saber-se-uma-promocao-e-real",
    titulo: "Como saber se uma promoção é real (e não cair no “metade do dobro”)",
    descricao:
      "Um passo a passo para conferir se o desconto é de verdade: histórico de preço, comparação entre lojas, frete, cupom e os truques mais comuns.",
    tema: "Compras",
    categorias: [],
    atualizadoEm: "2026-11-04",
    minutos: 7,
    resumo: [
      "Desconfie do preço “de”: o que importa é quanto o produto custou nas últimas semanas.",
      "Compare o preço final (com frete e cupom) em pelo menos três lojas.",
      "Contagem regressiva e “últimas unidades” não provam que a oferta é boa.",
    ],
    secoes: [
      {
        titulo: "Por que o preço “de” engana",
        paragrafos: [
          "Quase toda oferta mostra dois preços: o riscado e o atual. O problema é que o preço riscado é informado pela própria loja e nem sempre corresponde ao valor que o produto realmente custava. Às vezes ele é o preço sugerido pelo fabricante, que quase ninguém pratica. Outras vezes a loja sobe o preço dias antes de uma data promocional e depois “baixa” de volta, mostrando um desconto grande que, na prática, não existe.",
          "Esse truque ficou conhecido no Brasil como “metade do dobro”, por causa das primeiras edições da Black Friday por aqui. Ele ainda acontece, principalmente em datas como Black Friday, Dia do Consumidor e Prime Day. Por isso, a porcentagem de desconto sozinha diz pouco sobre a qualidade da oferta.",
        ],
      },
      {
        titulo: "1. Olhe o histórico de preço",
        paragrafos: [
          "A forma mais confiável de saber se o preço está bom é ver quanto o produto custou nos últimos 30, 60 ou 90 dias. Comparadores de preço como o Buscapé e o Zoom mostram esse histórico para muitos produtos, e algumas extensões de navegador fazem o mesmo direto na página da loja.",
          "Se o preço de hoje é o menor do período, é uma boa oferta. Se ele está igual à média ou acima dela, o desconto anunciado provavelmente é de fachada, mesmo que a loja diga que são 50% de desconto.",
        ],
      },
      {
        titulo: "2. Compare o preço final, não o preço da vitrine",
        paragrafos: [
          "Um produto R$ 30 mais barato pode sair mais caro se o frete for de R$ 50. Antes de decidir, coloque o produto no carrinho e veja o valor final com frete para o seu CEP. Faça isso em pelo menos três lojas.",
          "Repare também na forma de pagamento. Muitas lojas dão desconto no Pix ou no boleto, e o preço parcelado no cartão costuma ser maior. Compare sempre a mesma forma de pagamento entre as lojas.",
        ],
        lista: [
          "Preço à vista no Pix versus preço parcelado",
          "Frete e prazo de entrega para o seu CEP",
          "Cupom que vale para aquele produto (e o valor mínimo da compra)",
          "Se o vendedor é a própria loja ou um parceiro do marketplace",
        ],
      },
      {
        titulo: "3. Desconfie da pressa",
        paragrafos: [
          "Relógios em contagem regressiva, avisos de “só restam 2 unidades” e “50 pessoas estão vendo este produto” existem para fazer você decidir rápido. Às vezes são reais, mas muitas vezes o mesmo aviso aparece o dia inteiro. Uma oferta boa continua boa depois de cinco minutos de pesquisa.",
        ],
      },
      {
        titulo: "4. Confira quem está vendendo",
        paragrafos: [
          "Em marketplaces como Mercado Livre, Amazon e Shopee, o mesmo produto pode ser vendido pela própria loja ou por vendedores parceiros. Um preço muito abaixo dos outros, vindo de um vendedor novo ou com poucas avaliações, é sinal de alerta. Veja a reputação do vendedor e leia as avaliações mais recentes antes de comprar.",
        ],
      },
      {
        titulo: "Como o MukiOfertas ajuda",
        paragrafos: [
          "Nas ofertas do site, mostramos o preço anterior só quando a loja informa e conferimos o preço da maioria delas de tempos em tempos. Quando o preço sobe ou a promoção acaba, a oferta ganha a tag Expirado. Mesmo assim, preço muda rápido: confira sempre o valor final na página da loja antes de pagar.",
        ],
      },
    ],
    faq: [
      {
        p: "Desconto de 70% é sempre bom?",
        r: "Não necessariamente. Se o preço “de” estava inflado, o desconto real pode ser pequeno. Compare com o histórico de preço e com outras lojas.",
      },
      {
        p: "Vale a pena esperar a Black Friday?",
        r: "Para eletrônicos, muitas vezes sim, mas nem todo produto baixa de preço na data. Se você acompanhar o histórico e o preço de hoje já for o menor do período, não há motivo para esperar.",
      },
    ],
  },

  {
    slug: "como-escolher-um-monitor",
    titulo: "Como escolher um monitor: tamanho, resolução, painel e taxa de atualização",
    descricao:
      "O que olhar antes de comprar um monitor para trabalho, estudo ou jogos, explicado sem complicação: tamanho e resolução, IPS x VA, Hz, conexões e HDR.",
    tema: "Monitores",
    categorias: ["monitores", "monitor"],
    atualizadoEm: "2026-11-04",
    minutos: 8,
    resumo: [
      "Até 24 polegadas, Full HD fica nítido; em 27, o ideal é QHD (2560 × 1440).",
      "Para jogos, 144 Hz ou mais faz diferença; para trabalho, 75 Hz já atende.",
      "IPS tem as melhores cores; VA tem preto mais profundo; TN é rápido, mas perde cor de lado.",
    ],
    secoes: [
      {
        titulo: "Tamanho e resolução andam juntos",
        paragrafos: [
          "A nitidez de um monitor depende da combinação entre o tamanho da tela e a resolução. Um monitor Full HD (1920 × 1080) de 24 polegadas tem cerca de 92 pixels por polegada, o que deixa textos e imagens bem definidos a uma distância normal de mesa. O mesmo Full HD esticado para 27 polegadas cai para cerca de 82 pixels por polegada, e a diferença aparece principalmente em textos pequenos.",
          "Por isso, para 27 polegadas, a resolução QHD (2560 × 1440) é a mais equilibrada. Monitores 4K fazem mais sentido a partir de 27 polegadas para quem edita foto e vídeo ou quer muito espaço de tela, mas exigem mais do computador em jogos.",
        ],
        lista: [
          "21,5 a 24 polegadas: Full HD é suficiente",
          "27 polegadas: QHD é o ponto ideal; Full HD funciona, mas fica menos nítido",
          "32 polegadas ou mais: QHD no mínimo, 4K para trabalho com imagem",
        ],
      },
      {
        titulo: "Tipo de painel: IPS, VA ou TN",
        paragrafos: [
          "O painel IPS é o mais indicado para a maioria das pessoas: tem cores mais fiéis e a imagem não muda quando você olha de lado. É a escolha certa para trabalho, estudo, edição e também para jogos.",
          "O painel VA costuma ter preto mais profundo e bom contraste, o que agrada em filmes e em ambientes escuros. Em compensação, alguns modelos deixam rastro em cenas rápidas. O painel TN é o mais barato e rápido, mas as cores mudam bastante quando você olha de cima ou de lado, por isso hoje vale a pena só em casos bem específicos.",
        ],
      },
      {
        titulo: "Taxa de atualização (Hz) e tempo de resposta",
        paragrafos: [
          "A taxa de atualização diz quantas vezes por segundo a imagem é redesenhada. Monitores comuns têm 60 ou 75 Hz, e isso atende bem quem usa o computador para trabalhar e estudar. Para jogos, 144 Hz ou mais deixa o movimento muito mais fluido, e a diferença é fácil de perceber.",
          "Para aproveitar 144 Hz em jogos, o computador precisa entregar essa quantidade de quadros por segundo. Tecnologias como FreeSync e G-Sync Compatible evitam cortes na imagem quando o número de quadros varia. Já o tempo de resposta anunciado (1 ms, por exemplo) costuma ser medido de formas diferentes por cada fabricante, então use esse número só como referência.",
        ],
      },
      {
        titulo: "Conexões: confira antes de comprar",
        paragrafos: [
          "Veja quais entradas o monitor tem e quais saídas o seu computador ou notebook oferece. Para usar 144 Hz ou mais, prefira DisplayPort ou HDMI 2.0 ou superior, e confira se o cabo que vem na caixa suporta essa taxa. Alguns monitores também têm USB-C com vídeo, o que é prático para notebooks: um único cabo leva imagem e, em alguns modelos, também carrega o notebook.",
        ],
      },
      {
        titulo: "HDR e base ajustável",
        paragrafos: [
          "Muitos monitores baratos anunciam HDR, mas não têm brilho suficiente para mostrar o efeito de verdade. Selos como HDR400 indicam um HDR bem básico. Se HDR é importante para você, procure modelos com brilho alto e selos mais exigentes.",
          "Uma base com ajuste de altura e o encaixe VESA (para usar suporte articulado) fazem mais diferença no dia a dia do que parece, principalmente para quem passa muitas horas na frente do computador.",
        ],
      },
    ],
    faq: [
      {
        p: "Monitor curvo vale a pena?",
        r: "Em telas grandes e ultrawide, a curvatura ajuda a enxergar as bordas com menos movimento de cabeça. Em telas de 24 polegadas, a diferença é pequena.",
      },
      {
        p: "Posso usar uma TV como monitor?",
        r: "Pode, mas TVs costumam ter mais atraso de imagem e textos menos nítidos de perto. Para uso na mesa, um monitor é mais confortável.",
      },
    ],
  },

  {
    slug: "como-escolher-um-ssd",
    titulo: "Como escolher um SSD: SATA ou NVMe, capacidade e durabilidade",
    descricao:
      "Entenda a diferença entre SSD SATA e NVMe, quanto espaço comprar, o que é TBW e como saber se o SSD é compatível com o seu computador.",
    tema: "Hardware",
    categorias: ["ssd", "hardware"],
    atualizadoEm: "2026-11-04",
    minutos: 7,
    resumo: [
      "Trocar HD por SSD é o upgrade que mais deixa um computador antigo rápido.",
      "Confira o encaixe antes: SATA de 2,5 polegadas, M.2 SATA ou M.2 NVMe.",
      "Para a maioria das pessoas, 1 TB é a capacidade mais equilibrada hoje.",
    ],
    secoes: [
      {
        titulo: "Por que trocar o HD por um SSD",
        paragrafos: [
          "Um SSD não tem partes móveis e lê dados muito mais rápido que um HD tradicional. Na prática, o computador liga em poucos segundos, os programas abrem quase na hora e o sistema para de “travar” quando você faz várias coisas ao mesmo tempo. Para quem ainda usa HD, é o upgrade com o melhor custo-benefício.",
        ],
      },
      {
        titulo: "SATA, M.2 SATA e M.2 NVMe: qual cabe no seu computador",
        paragrafos: [
          "O primeiro passo é saber qual encaixe o seu computador tem. O SSD SATA de 2,5 polegadas tem o mesmo formato de um HD de notebook e funciona em praticamente qualquer computador com entrada SATA. Ele chega a cerca de 550 MB/s, que já é muito mais rápido que um HD.",
          "O SSD M.2 parece um pente pequeno e vai direto na placa-mãe. Existem dois tipos com o mesmo formato: M.2 SATA, que tem a mesma velocidade de um SSD SATA comum, e M.2 NVMe, que usa a conexão PCIe e é bem mais rápido. Nem todo slot M.2 aceita os dois tipos, então confira no manual da placa-mãe ou do notebook antes de comprar.",
        ],
        lista: [
          "SATA 2,5 polegadas: até cerca de 550 MB/s, compatível com quase tudo",
          "NVMe PCIe 3.0: até cerca de 3.500 MB/s",
          "NVMe PCIe 4.0: até cerca de 7.000 MB/s",
          "NVMe PCIe 5.0: ainda mais rápido, mas caro e só em placas recentes",
        ],
      },
      {
        titulo: "Quanto espaço comprar",
        paragrafos: [
          "Para um computador de uso geral, 500 GB atendem, mas enchem rápido com fotos, programas e atualizações. Hoje, 1 TB costuma ter o melhor preço por gigabyte e dá folga por bastante tempo. Para quem joga, 1 TB é o mínimo recomendado, porque muitos jogos atuais passam de 100 GB cada.",
          "Vale lembrar que um SSD muito cheio pode ficar mais lento. Deixar uma parte livre ajuda a manter o desempenho.",
        ],
      },
      {
        titulo: "Durabilidade: o que é TBW",
        paragrafos: [
          "Todo SSD tem um limite de gravação, informado pelo fabricante como TBW (terabytes gravados). Um SSD de 1 TB costuma ter TBW de algumas centenas de terabytes, o que, para uso doméstico, significa muitos anos de uso. Compare o TBW e o tempo de garantia entre modelos parecidos: eles indicam quanto o fabricante confia no produto.",
          "Detalhes técnicos como memória TLC ou QLC e presença de cache DRAM também influenciam. SSDs com memória QLC costumam ser mais baratos e ficar mais lentos em cópias longas. Para o dia a dia, a diferença é pequena; para quem copia arquivos grandes com frequência, TLC com cache é melhor.",
        ],
      },
    ],
    faq: [
      {
        p: "SSD NVMe deixa os jogos mais rápidos?",
        r: "O tempo de carregamento cai bastante em relação ao HD. Entre um SSD SATA e um NVMe, a diferença nos jogos atuais é menor do que os números sugerem, mas cresce em jogos feitos para aproveitar SSDs rápidos.",
      },
      {
        p: "Preciso reinstalar o Windows ao trocar o HD pelo SSD?",
        r: "Não obrigatoriamente. Dá para clonar o HD para o SSD com programas de clonagem, muitas vezes oferecidos pelo próprio fabricante do SSD.",
      },
    ],
  },

  {
    slug: "como-escolher-um-celular-custo-beneficio",
    titulo: "Como escolher um celular custo-benefício sem se arrepender",
    descricao:
      "Processador, memória, armazenamento, bateria, câmera, atualizações e versão nacional ou global: o que realmente importa na hora de escolher um smartphone.",
    tema: "Smartphones",
    categorias: ["smartphones", "celulares"],
    atualizadoEm: "2026-11-04",
    minutos: 8,
    resumo: [
      "Compre com no mínimo 128 GB de armazenamento: 64 GB enchem rápido.",
      "Veja por quantos anos o fabricante promete atualizações de sistema e segurança.",
      "Megapixels não definem a qualidade da câmera; o processamento e o sensor importam mais.",
    ],
    secoes: [
      {
        titulo: "Processador e memória",
        paragrafos: [
          "O processador define a rapidez do celular e por quanto tempo ele vai continuar rodando bem os aplicativos. Em vez de comparar só números de núcleos e gigahertz, procure análises e testes do modelo, que mostram como ele se comporta no uso real e em jogos.",
          "Para memória RAM, 6 GB atendem a maioria das pessoas hoje, e 8 GB dão mais folga para quem deixa muitos aplicativos abertos ou joga. Mais do que isso só faz diferença em usos bem pesados.",
        ],
      },
      {
        titulo: "Armazenamento: não economize aqui",
        paragrafos: [
          "Fotos, vídeos, conversas do WhatsApp e atualizações ocupam muito espaço com o tempo. Um celular com 64 GB costuma ficar cheio em poucos meses. Prefira 128 GB como mínimo e 256 GB se você grava muitos vídeos ou não gosta de apagar nada. Confira também se o modelo aceita cartão de memória, porque muitos aparelhos novos já não aceitam.",
        ],
      },
      {
        titulo: "Atualizações: o detalhe que muita gente esquece",
        paragrafos: [
          "Um celular que deixa de receber atualizações fica mais vulnerável e, aos poucos, perde compatibilidade com aplicativos. Os fabricantes divulgam por quantos anos vão atualizar o sistema e enviar correções de segurança, e esse prazo varia muito entre marcas e linhas. Um aparelho um pouco mais caro, mas com mais anos de suporte, pode sair mais barato no fim.",
        ],
      },
      {
        titulo: "Bateria, carregamento e tela",
        paragrafos: [
          "A capacidade da bateria (em mAh) dá uma ideia, mas a eficiência do processador e da tela também pesam. Leia testes de duração de bateria antes de decidir. Veja também se o carregador vem na caixa, porque várias marcas deixaram de incluir.",
          "Telas AMOLED têm preto de verdade e cores mais vivas. Taxas de atualização de 90 ou 120 Hz deixam a rolagem mais suave, o que hoje já aparece em aparelhos intermediários.",
        ],
      },
      {
        titulo: "Câmera: megapixels não são tudo",
        paragrafos: [
          "Um número alto de megapixels chama atenção no anúncio, mas a qualidade da foto depende muito mais do tamanho do sensor, da lente e do processamento de imagem do celular. Fotos de amostra e comparações em análises mostram muito melhor como a câmera se sai, principalmente à noite.",
          "Desconfie de aparelhos com muitas câmeras traseiras em modelos baratos: às vezes, algumas delas são sensores de baixa resolução que pouco acrescentam.",
        ],
      },
      {
        titulo: "Versão nacional ou global",
        paragrafos: [
          "A versão nacional é vendida oficialmente no Brasil, tem garantia do fabricante aqui e é homologada pela Anatel. A versão global costuma ser importada, pode sair mais barata e, em geral, funciona nas redes brasileiras, mas a garantia pode depender do vendedor e não do fabricante. Leia com atenção a descrição do anúncio antes de comprar.",
        ],
      },
    ],
    faq: [
      {
        p: "Preciso de 5G?",
        r: "Se você troca de celular a cada poucos anos, vale ter, porque a cobertura 5G continua crescendo. Mas não pague muito a mais só por isso se ele ainda não chega bem na sua região.",
      },
      {
        p: "NFC é importante?",
        r: "Sim, para quem quer pagar por aproximação com o celular. Muitos modelos de entrada não têm, então confira na ficha técnica.",
      },
    ],
  },

  {
    slug: "como-usar-cupons-de-desconto",
    titulo: "Como usar cupons de desconto e por que às vezes eles não funcionam",
    descricao:
      "Tipos de cupom, valor mínimo, categorias, primeira compra, aplicativo e validade: entenda as regras e aproveite os cupons nas lojas online.",
    tema: "Cupons",
    categorias: ["cupons"],
    linkOfertas: "/cupons-de-desconto",
    atualizadoEm: "2026-11-04",
    minutos: 6,
    resumo: [
      "Leia as regras: valor mínimo, categorias, vendedor e validade.",
      "Alguns cupons só funcionam no aplicativo ou na primeira compra.",
      "Compare: um cupom de porcentagem nem sempre vale mais que um de valor fixo.",
    ],
    secoes: [
      {
        titulo: "Os tipos de cupom mais comuns",
        paragrafos: [
          "Os cupons de desconto aparecem em três formatos principais: porcentagem (por exemplo, 10% de desconto), valor fixo (R$ 20 de desconto) e frete grátis. Cada um vale mais em situações diferentes. Em compras pequenas, um cupom de valor fixo costuma ser melhor; em compras grandes, a porcentagem rende mais, a não ser que exista um limite máximo de desconto.",
        ],
        lista: [
          "Porcentagem: 10% de desconto, às vezes com limite (até R$ 50, por exemplo)",
          "Valor fixo: R$ 20 de desconto em compras acima de um valor mínimo",
          "Frete grátis: zera ou reduz o frete, comum em lojas e marketplaces",
        ],
      },
      {
        titulo: "Por que o cupom não funcionou",
        paragrafos: [
          "Quando um cupom dá erro, quase sempre é uma regra que não foi cumprida. As mais comuns são: o carrinho não chegou ao valor mínimo, o produto é de uma categoria que não participa, o item é vendido por um parceiro e não pela própria loja, ou o cupom já expirou ou atingiu o limite de usos.",
          "Também existem cupons que valem só para a primeira compra, só no aplicativo ou só para determinadas formas de pagamento. Essas regras costumam aparecer em letras pequenas junto do cupom.",
        ],
      },
      {
        titulo: "Dá para juntar cupons?",
        paragrafos: [
          "Na maioria das lojas, só um cupom pode ser usado por pedido. Em alguns marketplaces, porém, é possível usar um cupom da plataforma junto com um cupom do vendedor, ou um cupom junto com o desconto do Pix. Vale testar no carrinho antes de fechar a compra.",
        ],
      },
      {
        titulo: "Dicas para aproveitar melhor",
        paragrafos: [
          "Copie o código exatamente como aparece, sem espaços antes ou depois. Aplique o cupom antes de escolher a forma de pagamento, porque algumas lojas recalculam o valor no fim. E compare: às vezes, outro produto sem cupom, mas com preço menor, sai mais barato do que o produto com cupom.",
          "No MukiOfertas, os cupons ficam na aba Cupons e, quando uma oferta precisa de cupom, o código aparece junto dela. Quando um cupom deixa de funcionar, os membros podem avisar nos comentários.",
        ],
      },
    ],
    faq: [
      {
        p: "Cupom de influenciador é diferente?",
        r: "Funciona do mesmo jeito. A diferença é que o influenciador recebe uma comissão pelas compras feitas com o código dele.",
      },
      {
        p: "O desconto do cupom aparece na nota fiscal?",
        r: "Sim. O valor final pago, já com o desconto, é o que aparece no pedido e na nota.",
      },
    ],
  },

  {
    slug: "como-comprar-com-seguranca-em-marketplaces",
    titulo: "Como comprar com segurança no Mercado Livre, Amazon e Shopee",
    descricao:
      "Como avaliar o vendedor, evitar golpes, entender prazos de importados e usar o direito de arrependimento e a garantia nas compras online.",
    tema: "Compras",
    categorias: [],
    atualizadoEm: "2026-11-04",
    minutos: 7,
    resumo: [
      "Veja se quem vende é a própria loja ou um vendedor parceiro, e confira a reputação.",
      "Nunca pague fora da plataforma, mesmo que o vendedor ofereça desconto.",
      "Em compras online, você tem 7 dias para desistir depois de receber o produto.",
    ],
    secoes: [
      {
        titulo: "Loja oficial ou vendedor parceiro",
        paragrafos: [
          "Nos marketplaces, a mesma página pode ter o produto vendido pela própria plataforma, por lojas oficiais das marcas ou por milhares de vendedores parceiros. Na Amazon, procure a informação de quem vende e quem entrega o produto. No Mercado Livre, veja a reputação e a quantidade de vendas do vendedor. Na Shopee, lojas oficiais e vendedores com boas avaliações são os mais seguros.",
          "Vendedores parceiros não são um problema por si só, e muitos são ótimos. O cuidado é com vendedores novos, sem histórico ou com reclamações recentes de produto diferente do anunciado.",
        ],
      },
      {
        titulo: "Sinais de golpe",
        paragrafos: [
          "Preço muito abaixo de todos os outros, vendedor pedindo para continuar a conversa pelo WhatsApp, pedido de pagamento por Pix direto para uma pessoa e links enviados por mensagem são os sinais mais comuns de golpe. Quando o pagamento é feito fora da plataforma, você perde a proteção de compra que ela oferece.",
        ],
        lista: [
          "Pague sempre dentro do site ou aplicativo da loja",
          "Desconfie de preços muito abaixo do mercado",
          "Não clique em links de “oferta” recebidos por mensagem de desconhecidos",
          "Confira se o endereço do site é o oficial da loja",
        ],
      },
      {
        titulo: "Produtos importados: prazo e impostos",
        paragrafos: [
          "Produtos enviados do exterior costumam ter prazo de entrega maior e podem ter impostos de importação cobrados na compra ou na entrega, conforme as regras em vigor. Antes de comprar, veja se o preço exibido já inclui os impostos e qual o prazo estimado. Para quem precisa do produto com urgência, um item com estoque no Brasil pode valer a diferença de preço.",
        ],
      },
      {
        titulo: "Seus direitos: arrependimento e garantia",
        paragrafos: [
          "Pelo Código de Defesa do Consumidor, quem compra pela internet pode desistir da compra em até 7 dias a partir do recebimento do produto, sem precisar explicar o motivo, e tem direito ao reembolso do valor pago. Esse é o chamado direito de arrependimento.",
          "Além da garantia do fabricante, existe a garantia legal: 30 dias para produtos não duráveis e 90 dias para produtos duráveis, como eletrônicos, para reclamar de defeitos. Se a loja não resolver, você pode registrar uma reclamação no consumidor.gov.br ou procurar o Procon da sua cidade.",
        ],
      },
      {
        titulo: "Guarde tudo",
        paragrafos: [
          "Salve o anúncio (um print da página já ajuda), o número do pedido, a nota fiscal e as conversas com o vendedor. Se algo der errado, esses registros facilitam a devolução e qualquer reclamação.",
        ],
      },
    ],
    faq: [
      {
        p: "O MukiOfertas vende os produtos?",
        r: "Não. Ao clicar em uma oferta, você vai para o site da loja, que é responsável pela venda, pela entrega e pela garantia.",
      },
      {
        p: "Comprar pelo link do MukiOfertas muda alguma coisa?",
        r: "Não muda o preço nem os seus direitos. A loja pode pagar uma pequena comissão ao site, sem custo extra para você.",
      },
    ],
  },
  {
    slug: "black-friday-2026-como-nao-cair-em-desconto-falso",
    titulo: "Black Friday 2026: como se preparar e não cair em desconto falso",
    descricao:
      "A Black Friday 2026 é em 27 de novembro. Veja como montar sua lista, acompanhar o histórico de preço, fugir do “metade do dobro” e dos golpes, e quais são os seus direitos depois da compra.",
    tema: "Black Friday",
    categorias: [],
    linkOfertas: "/black-friday",
    publicadoEm: "2026-11-14",
    atualizadoEm: "2026-11-14",
    minutos: 8,
    resumo: [
      "A Black Friday 2026 cai na sexta-feira, 27 de novembro, mas muitas lojas começam as promoções dias antes.",
      "Monte a lista do que você precisa agora e acompanhe o preço desde já: é o histórico que mostra se o desconto é real.",
      "Desconfie de preço bom demais em site desconhecido e nunca pague por Pix para quem você não conhece.",
      "Em compras pela internet você tem 7 dias para desistir, contados a partir do recebimento.",
    ],
    secoes: [
      {
        titulo: "Quando é a Black Friday 2026",
        paragrafos: [
          "A Black Friday acontece sempre na última sexta-feira de novembro. Em 2026, ela cai no dia 27 de novembro. Na prática, porém, o evento virou uma temporada: muitas lojas começam a anunciar ofertas no início do mês, e algumas estendem as promoções pelo fim de semana até a segunda-feira seguinte, a Cyber Monday, quando o foco costuma ser eletrônicos.",
          "Isso é bom para quem se planeja: dá tempo de comparar com calma em vez de decidir tudo em uma madrugada.",
        ],
      },
      {
        titulo: "Antes: faça a lista e comece a acompanhar os preços",
        paragrafos: [
          "O maior erro na Black Friday é comprar o que não estava nos planos só porque parece barato. Faça uma lista curta com o que você realmente precisa, com um valor máximo que aceita pagar por cada item.",
          "Depois, comece a acompanhar o preço desses produtos o quanto antes. É o histórico que mostra se o preço da Black Friday é mesmo o menor: se um produto custou R$ 900 durante o mês inteiro e aparece “de R$ 1.800 por R$ 900” na sexta-feira, o desconto é de fachada.",
        ],
        lista: [
          "Anote o modelo exato (o mesmo nome às vezes tem versões diferentes)",
          "Crie um alerta de preço no MukiOfertas para receber o aviso quando o produto baixar",
          "Veja na página de cada oferta o histórico: o menor e o maior preço que registramos",
          "Separe o limite do cartão ou o valor no Pix antes, para não estourar o orçamento",
        ],
      },
      {
        titulo: "Durante: como saber se o desconto é real",
        paragrafos: [
          "Na hora da compra, a porcentagem anunciada importa menos do que o preço final. Compare o valor com frete para o seu CEP em pelo menos três lojas e confira se o preço de hoje está abaixo do que o produto custou nas últimas semanas.",
          "No MukiOfertas, o selo Super desconto só vai para poucas ofertas com desconto real de pelo menos 40% e economia de R$ 150 ou mais, e o selo de menor preço só aparece depois de 7 dias acompanhando o produto. Descontos que parecem inflados perdem o preço anterior automaticamente.",
        ],
        lista: [
          "Compare a mesma forma de pagamento (Pix costuma ser mais barato que o parcelado)",
          "Confira se quem vende é a própria loja ou um vendedor parceiro do marketplace",
          "Leia as condições do cupom: valor mínimo, categorias e data de validade",
          "Contagem regressiva e “últimas unidades” não provam que a oferta é boa",
        ],
      },
      {
        titulo: "Cuidado com golpes",
        paragrafos: [
          "A Black Friday é a época favorita dos golpistas. Os golpes mais comuns são sites falsos que imitam lojas conhecidas, links enviados por WhatsApp ou SMS com preços impossíveis e anúncios em redes sociais que levam para páginas de pagamento falsas.",
        ],
        lista: [
          "Digite você mesmo o endereço da loja ou use links de sites confiáveis",
          "Confira o endereço na barra do navegador: letras trocadas são sinal de site falso",
          "Desconfie de preço muito abaixo do de todas as outras lojas",
          "Nunca pague por Pix ou boleto para pessoa física ou empresa que você não reconhece",
          "Pesquise a reputação da loja antes de comprar em um site que você não conhece",
        ],
      },
      {
        titulo: "Depois: seus direitos",
        paragrafos: [
          "Pelo Código de Defesa do Consumidor, quem compra pela internet tem 7 dias para desistir da compra, sem precisar explicar o motivo. O prazo conta a partir do recebimento do produto, e o valor pago deve ser devolvido.",
          "Guarde o anúncio (um print da página já ajuda), o número do pedido e a nota fiscal. Se o produto não chegar, chegar diferente do anunciado ou a loja não cumprir a oferta, procure primeiro a loja e, se não resolver, o Procon da sua cidade ou o consumidor.gov.br.",
        ],
      },
    ],
    faq: [
      {
        p: "Quando é a Black Friday de 2026?",
        r: "Na sexta-feira, 27 de novembro de 2026. Muitas lojas começam as promoções antes e algumas seguem até a segunda-feira seguinte, a Cyber Monday.",
      },
      {
        p: "Os preços da Black Friday são sempre os menores do ano?",
        r: "Não. Muitos produtos baixam de verdade, mas outros aparecem com o preço anterior inflado. Acompanhe o histórico de preço desde antes do evento para saber se vale a pena.",
      },
      {
        p: "Posso devolver um produto comprado na Black Friday?",
        r: "Sim. Em compras feitas pela internet, você tem 7 dias a partir do recebimento para desistir, com direito à devolução do valor pago.",
      },
    ],
  },

  {
    slug: "como-escolher-uma-air-fryer",
    titulo: "Como escolher uma air fryer: tamanho, potência, voltagem e tipo de cesto",
    descricao:
      "Quantos litros você precisa, qual potência escolher, cesto ou forno air fryer, voltagem, limpeza e consumo de energia: o guia para acertar na compra da air fryer.",
    tema: "Air Fryer",
    categorias: ["air-fryer"],
    linkOfertas: "/categoria/air-fryer",
    publicadoEm: "2026-11-14",
    atualizadoEm: "2026-11-14",
    minutos: 7,
    resumo: [
      "Para 1 ou 2 pessoas, 3 a 4 litros bastam; para família de 4, prefira 5 litros ou mais.",
      "Cesto quadrado aproveita melhor o espaço que o redondo com a mesma capacidade.",
      "Confira a voltagem antes de comprar: a maioria não é bivolt.",
      "Quer assar várias coisas ao mesmo tempo? Considere um forno air fryer.",
    ],
    secoes: [
      {
        titulo: "Quantos litros você precisa",
        paragrafos: [
          "A capacidade é o ponto mais importante. Uma air fryer pequena demais obriga a fazer a comida em várias levas, e uma grande demais ocupa espaço à toa. O segredo é que a air fryer funciona melhor com o cesto sem estar lotado: o ar quente precisa circular entre os alimentos para deixar tudo crocante.",
        ],
        lista: [
          "1 pessoa: 2,5 a 3,5 litros",
          "2 a 3 pessoas: 4 a 5 litros",
          "4 pessoas ou mais: 5,5 litros ou mais, ou um modelo com dois cestos",
          "Para assar um frango inteiro, procure 5 litros ou mais e confira a altura do cesto",
        ],
      },
      {
        titulo: "Cesto quadrado, redondo, dois cestos ou forno",
        paragrafos: [
          "Com a mesma capacidade em litros, o cesto quadrado aproveita melhor o fundo e cabe mais comida em uma camada só, o que faz diferença com batata, nuggets e empanados. Os modelos com dois cestos permitem preparar dois alimentos ao mesmo tempo, com temperaturas diferentes.",
          "O forno air fryer tem porta frontal e prateleiras, como um forninho elétrico. É bom para quem quer assar pizza, bolo e várias coisas ao mesmo tempo, mas ocupa mais espaço na bancada e pode demorar um pouco mais para dourar.",
        ],
      },
      {
        titulo: "Potência e voltagem",
        paragrafos: [
          "A maioria dos modelos tem entre 1.200 e 1.800 watts. Mais potência aquece mais rápido e ajuda a manter a temperatura com o cesto cheio, mas também puxa mais da tomada. Em modelos grandes, potência mais alta é o esperado.",
          "Atenção à voltagem: quase todas as air fryers são de 127 V ou de 220 V, e poucas são bivolt. Ligar um aparelho de 127 V numa tomada de 220 V pode queimá-lo na hora. Confira a voltagem da sua cozinha e escolha a versão certa no anúncio.",
        ],
      },
      {
        titulo: "Recursos que fazem diferença no dia a dia",
        paragrafos: [
          "Painel digital com funções prontas é prático, mas o modelo com botões giratórios de tempo e temperatura funciona igualmente bem e costuma ser mais barato. Mais importante que a quantidade de funções é ter controle de temperatura e desligamento automático.",
        ],
        lista: [
          "Revestimento antiaderente de boa qualidade no cesto (e se ele pode ir à lava-louças)",
          "Janela para acompanhar o preparo sem abrir o cesto",
          "Desligamento automático e alça que não esquenta",
          "Selo do Inmetro, que indica que o aparelho passou pelos testes de segurança",
        ],
      },
      {
        titulo: "Gasta muita energia?",
        paragrafos: [
          "Uma air fryer de 1.500 W ligada por 30 minutos consome cerca de 0,75 kWh. Como o preparo é rápido e a câmara é pequena, para porções do dia a dia ela costuma gastar menos que o forno elétrico grande. O consumo real depende da potência do modelo e de quanto tempo você usa por dia.",
        ],
      },
      {
        titulo: "Como saber se a oferta de air fryer está boa",
        paragrafos: [
          "Air fryer é um dos produtos que mais aparecem com desconto, então vale comparar com calma. Veja na página da oferta o histórico de preço que registramos e compare modelos com a mesma capacidade e potência. O mesmo modelo às vezes tem preço diferente entre a versão de 127 V e a de 220 V.",
        ],
      },
    ],
    faq: [
      {
        p: "Qual o tamanho ideal de air fryer para um casal?",
        r: "Entre 3,5 e 5 litros atende bem um casal. Se vocês cozinham muito ou recebem visitas, 5 litros ou mais dá mais folga.",
      },
      {
        p: "Air fryer bivolt existe?",
        r: "Existe, mas é raro. A maioria é vendida em versões separadas de 127 V e 220 V. Confira sempre a voltagem no anúncio antes de comprar.",
      },
      {
        p: "Vale a pena um forno air fryer?",
        r: "Vale para quem quer substituir o forninho elétrico e assar várias coisas ao mesmo tempo. Para porções rápidas do dia a dia, a air fryer de cesto costuma ser mais prática.",
      },
    ],
  },

  {
    slug: "como-escolher-um-ar-condicionado",
    titulo: "Como escolher um ar-condicionado: BTUs, inverter, tipos e instalação",
    descricao:
      "Calcule quantos BTUs você precisa, entenda a diferença entre inverter e convencional, split, janela e portátil, e o que conferir na instalação antes de comprar o ar-condicionado.",
    tema: "Ar-condicionado",
    categorias: ["ar-condicionado"],
    linkOfertas: "/categoria/ar-condicionado",
    publicadoEm: "2026-11-14",
    atualizadoEm: "2026-11-14",
    minutos: 8,
    resumo: [
      "Regra prática: cerca de 600 BTUs por metro quadrado, mais 600 para cada pessoa a mais e para cada aparelho que esquenta.",
      "Quarto que pega sol da tarde precisa de mais BTUs.",
      "O inverter costuma custar mais na compra, mas gasta bem menos energia e é mais silencioso.",
      "Some o custo da instalação ao preço do aparelho e use um instalador qualificado para não perder a garantia.",
    ],
    secoes: [
      {
        titulo: "Quantos BTUs você precisa",
        paragrafos: [
          "BTU é a medida da capacidade de refrigeração do aparelho. Um ar-condicionado fraco demais fica ligado no máximo o tempo todo e não resolve o calor; um forte demais liga e desliga sem parar e gasta mais do que precisa.",
          "A conta mais usada é simples: multiplique a área do ambiente em metros quadrados por 600 BTUs, para até duas pessoas. Some 600 BTUs para cada pessoa a mais e para cada aparelho que esquenta o ambiente, como TV ou computador. Se o cômodo pega sol forte à tarde, use cerca de 800 BTUs por metro quadrado.",
          "Depois, escolha a capacidade comercial igual ou logo acima do resultado. Exemplo: um quarto de 12 m², com duas pessoas e sem sol da tarde, dá 12 × 600 = 7.200 BTUs, então um aparelho de 7.500 ou 9.000 BTUs atende bem.",
        ],
        lista: [
          "Até cerca de 12 m²: 7.500 a 9.000 BTUs",
          "Cerca de 15 a 20 m²: 12.000 BTUs",
          "Cerca de 25 a 30 m²: 18.000 BTUs",
          "Ambientes maiores ou salas integradas: 24.000 BTUs ou mais (vale pedir a avaliação de um instalador)",
        ],
      },
      {
        titulo: "Inverter ou convencional",
        paragrafos: [
          "O ar-condicionado convencional liga o compressor na potência máxima, desliga quando chega à temperatura e liga de novo quando ela sobe. O inverter ajusta a velocidade do compressor e mantém a temperatura sem esses picos. Na prática, o inverter costuma gastar bem menos energia, faz menos barulho e deixa a temperatura mais estável.",
          "O inverter custa mais na hora da compra, mas para quem usa o aparelho várias horas por dia a economia na conta de luz tende a compensar a diferença com o tempo. Para uso raro, o convencional pode fazer sentido.",
        ],
      },
      {
        titulo: "Tipos de ar-condicionado",
        lista: [
          "Split hi-wall: o mais comum em casas e apartamentos; silencioso, com a parte barulhenta do lado de fora",
          "Janela: mais barato e fácil de instalar, mas mais barulhento e precisa de uma abertura na parede",
          "Portátil: não precisa de obra, mas é menos eficiente e precisa de uma saída de ar para fora pela janela",
          "Piso-teto e cassete: para ambientes grandes e comerciais",
        ],
        paragrafos: [
          "Para a maioria das casas, o split hi-wall é a melhor escolha. O portátil é uma alternativa para quem mora de aluguel e não pode fazer furos, sabendo que ele refrigera menos que um split da mesma capacidade.",
        ],
      },
      {
        titulo: "Consumo de energia e etiqueta",
        paragrafos: [
          "Antes de comprar, olhe a etiqueta de eficiência energética do Inmetro e o selo Procel. Quanto melhor a classificação, menor o consumo para a mesma capacidade. Compare sempre aparelhos com a mesma quantidade de BTUs.",
          "Também vale escolher entre o modelo só frio e o quente e frio. O quente e frio custa um pouco mais e é útil em cidades com inverno rigoroso.",
        ],
      },
      {
        titulo: "Instalação: não deixe para depois",
        paragrafos: [
          "Na maioria das lojas a instalação do split não está inclusa no preço, então some esse custo ao comparar ofertas. Muitos fabricantes exigem instalação feita por profissional qualificado para manter a garantia, então guarde a nota do serviço.",
          "Antes de comprar, confira onde ficarão a unidade interna e a externa, a distância entre elas, se há tomada ou circuito adequado e a voltagem do aparelho. Modelos de maior capacidade costumam ser de 220 V.",
        ],
      },
      {
        titulo: "Quando comprar",
        paragrafos: [
          "A procura por ar-condicionado dispara no verão, e os preços tendem a acompanhar. Comprar antes da onda de calor, ou aproveitar a Black Friday, costuma ser mais vantajoso, e ainda dá tempo de agendar a instalação com calma. Veja na página de cada oferta o histórico de preço que registramos para saber se o valor está bom.",
        ],
      },
    ],
    faq: [
      {
        p: "Quantos BTUs para um quarto de 12 m²?",
        r: "Para duas pessoas e sem sol forte à tarde, cerca de 7.200 BTUs, então um aparelho de 7.500 ou 9.000 BTUs atende. Com sol da tarde ou mais gente no quarto, prefira 9.000 BTUs ou mais.",
      },
      {
        p: "Ar-condicionado inverter vale a pena?",
        r: "Para quem usa o aparelho várias horas por dia, normalmente sim: ele gasta menos energia e é mais silencioso. A diferença de preço na compra tende a ser compensada na conta de luz.",
      },
      {
        p: "A instalação está inclusa no preço?",
        r: "Na maioria das lojas, não. Confira no anúncio e some o custo da instalação ao comparar as ofertas.",
      },
    ],
  },
  {
    slug: "como-montar-um-computador",
    titulo: "Como montar um computador do jeito certo: peças compatíveis e montagem passo a passo",
    descricao:
      "Do planejamento ao primeiro boot: como escolher processador, placa-mãe, memória, fonte e gabinete compatíveis, como dividir o orçamento e como montar o PC sem erros.",
    tema: "Hardware",
    categorias: ["processadores", "placa-mae", "placa-de-video", "memoria-ram", "fontes", "gabinete", "water-cooler", "hardware"],
    linkOfertas: "/categoria/hardware",
    publicadoEm: "2026-11-14",
    atualizadoEm: "2026-11-14",
    minutos: 10,
    resumo: [
      "Defina primeiro o uso (jogos, trabalho, estudo) e o orçamento: é isso que decide as peças.",
      "Processador e placa-mãe precisam ter o mesmo soquete, e a memória precisa ser do tipo que a placa aceita (DDR4 ou DDR5).",
      "Não economize na fonte: escolha uma marca confiável, com certificação 80 Plus e potência com folga.",
      "Teste as peças antes de fechar o gabinete e, no fim, ative o perfil da memória (XMP ou EXPO) na BIOS.",
    ],
    secoes: [
      {
        titulo: "1. Comece pelo uso e pelo orçamento",
        paragrafos: [
          "Antes de escolher qualquer peça, responda: para que o computador vai servir? Um PC para estudo e escritório não precisa de placa de vídeo dedicada, enquanto um PC para jogos depende principalmente dela. Para edição de vídeo, processador com mais núcleos e mais memória fazem diferença.",
          "Em um PC para jogos, uma divisão que costuma funcionar é colocar a maior fatia do orçamento na placa de vídeo, depois no processador, e não deixar a fonte e o SSD para o fim, com o dinheiro que sobrou. Uma peça muito mais fraca que as outras vira gargalo e desperdiça o investimento no resto.",
        ],
      },
      {
        titulo: "2. Processador e placa-mãe: o par que manda em tudo",
        paragrafos: [
          "O processador só encaixa em placas-mãe com o mesmo soquete. Os processadores Ryzen mais recentes da AMD usam o soquete AM5, e os anteriores, AM4. Os Intel Core recentes usam soquetes como o LGA 1700 e o LGA 1851, conforme a geração. Antes de comprar, confira na página do fabricante da placa a lista de processadores compatíveis.",
          "O chipset da placa define os recursos: quantas entradas para SSD M.2, se dá para fazer overclock, quantas portas USB e o suporte a PCIe mais rápido. Repare também no tamanho da placa (ATX, Micro-ATX ou Mini-ITX), que precisa caber no gabinete escolhido.",
        ],
        lista: [
          "Soquete igual no processador e na placa-mãe",
          "Placa com BIOS compatível com a geração do processador (às vezes precisa de atualização)",
          "Tamanho da placa compatível com o gabinete",
          "Processador sem vídeo integrado exige placa de vídeo dedicada para dar imagem",
        ],
      },
      {
        titulo: "3. Memória RAM e armazenamento",
        paragrafos: [
          "A placa-mãe aceita só um tipo de memória: DDR4 ou DDR5. Elas não são intercambiáveis, então confira antes. Para jogos e uso geral hoje, 16 GB é o mínimo confortável e 32 GB dá folga para jogos pesados, edição e muitas abas abertas.",
          "Prefira um kit com dois pentes (por exemplo, 2 × 8 GB em vez de 1 × 16 GB): com dois pentes a memória trabalha em dual channel, que é mais rápido. Para armazenamento, use um SSD NVMe M.2 para o sistema e os programas; ele é muito mais rápido que um HD. O HD ainda serve para guardar arquivos grandes por um preço menor.",
        ],
      },
      {
        titulo: "4. Fonte: a peça que você não deve economizar",
        paragrafos: [
          "Uma fonte ruim pode desligar o PC sob carga, causar travamentos e até danificar as outras peças. Escolha uma marca conhecida, com certificação 80 Plus (Bronze já é um bom começo; Gold é mais eficiente) e boas avaliações de quem testa fontes.",
          "Para a potência, some o consumo do processador e da placa de vídeo e deixe uma folga de 30% a 50%. O fabricante da placa de vídeo costuma indicar a potência mínima recomendada da fonte. Confira também se a fonte tem os conectores que a placa de vídeo pede.",
        ],
      },
      {
        titulo: "5. Gabinete e refrigeração",
        paragrafos: [
          "Além de bonito, o gabinete precisa ter espaço para a placa de vídeo (confira o comprimento máximo), para a altura do cooler do processador e boa entrada e saída de ar. Um gabinete com a frente fechada esquenta mais as peças.",
          "Alguns processadores vêm com cooler na caixa, outros não. Processadores mais fortes pedem um cooler melhor: um air cooler de torre ou um water cooler. Confira se o cooler é compatível com o soquete da placa.",
        ],
      },
      {
        titulo: "6. A montagem, passo a passo",
        paragrafos: [
          "Monte em uma mesa limpa e bem iluminada, longe de tapete, e toque em uma superfície de metal antes de pegar as peças, para descarregar a eletricidade estática. Tenha à mão uma chave Phillips e os manuais da placa-mãe e do gabinete.",
        ],
        lista: [
          "Instale o processador na placa-mãe fora do gabinete, alinhando a marcação do canto, sem forçar",
          "Coloque o SSD M.2 e a memória (em placas com 4 slots, use os slots que o manual indica para dois pentes, geralmente o 2º e o 4º)",
          "Instale o cooler: confira se a pasta térmica já vem aplicada e retire o plástico protetor da base",
          "Faça um teste fora do gabinete: ligue com processador, memória, cooler, fonte e placa de vídeo e veja se aparece imagem",
          "Coloque os espaçadores no gabinete, se ele não tiver, e parafuse a placa-mãe",
          "Instale a fonte, a placa de vídeo e conecte os cabos: o de 24 pinos da placa-mãe, o de 8 pinos do processador (EPS) e os da placa de vídeo",
          "Ligue os cabos do painel do gabinete (botão de ligar, USB e áudio) seguindo o manual da placa",
          "Organize os cabos para o ar circular e feche o gabinete",
        ],
      },
      {
        titulo: "7. Depois de ligar",
        paragrafos: [
          "Ao entrar na BIOS pela primeira vez, confira se ela reconhece o processador, toda a memória e o SSD. Ative o perfil XMP (Intel) ou EXPO (AMD) da memória: sem isso, ela trabalha abaixo da velocidade para a qual você pagou. Se a placa tiver uma BIOS mais nova, vale atualizar.",
          "Depois, instale o sistema operacional, os drivers do chipset da placa-mãe e o driver da placa de vídeo direto do site do fabricante.",
        ],
      },
      {
        titulo: "Erros mais comuns",
        lista: [
          "Ligar o cabo do monitor na placa-mãe em vez da placa de vídeo",
          "Esquecer o cabo de 8 pinos do processador: o PC liga, mas não dá imagem",
          "Colocar os dois pentes de memória em slots vizinhos e perder o dual channel",
          "Deixar o plástico protetor na base do cooler",
          "Comprar placa-mãe e processador de soquetes diferentes",
        ],
        paragrafos: [
          "Montar um PC parece complicado na primeira vez, mas com as peças certas e calma é como um quebra-cabeça com manual. Na dúvida sobre alguma etapa, o manual da placa-mãe quase sempre tem a resposta.",
        ],
      },
    ],
    faq: [
      {
        p: "Montar um PC sai mais barato que comprar pronto?",
        r: "Muitas vezes sim, e você escolhe exatamente cada peça. Os computadores prontos às vezes economizam justamente na fonte, na memória ou no SSD. Compare o preço das peças somadas com o do PC pronto equivalente.",
      },
      {
        p: "Quanto de memória RAM preciso para jogos?",
        r: "16 GB, em dois pentes, é o mínimo confortável hoje. 32 GB dá mais folga para jogos pesados, transmissões e edição.",
      },
      {
        p: "Preciso de placa de vídeo dedicada?",
        r: "Para estudo, escritório e jogos leves, um processador com vídeo integrado pode bastar. Para jogos atuais e edição de vídeo, a placa de vídeo dedicada faz a maior diferença.",
      },
    ],
  },

  {
    slug: "como-escolher-uma-smart-tv",
    titulo: "Como escolher uma Smart TV: tamanho, 4K, QLED ou OLED, 120 Hz e sistema",
    descricao:
      "Qual tamanho de TV para a sua sala, a diferença entre LED, QLED, Mini LED e OLED, quando vale 120 Hz, HDR, HDMI 2.1 e o que olhar no sistema da Smart TV.",
    tema: "TVs",
    categorias: ["tv", "televisores"],
    linkOfertas: "/categoria/tv",
    publicadoEm: "2026-11-14",
    atualizadoEm: "2026-11-14",
    minutos: 8,
    resumo: [
      "Com TV 4K, dá para sentar mais perto: em uma sala com sofá a uns 2 metros, 50 a 55 polegadas costuma ficar bom.",
      "OLED tem o melhor preto e contraste; QLED e Mini LED brilham mais e vão bem em sala clara.",
      "Para PS5 e Xbox Series, procure 120 Hz e HDMI 2.1.",
      "Compare a mesma polegada e o mesmo tipo de tela: o nome comercial engana.",
    ],
    secoes: [
      {
        titulo: "Tamanho: pense na distância do sofá",
        paragrafos: [
          "Com resolução 4K, a imagem continua nítida mesmo de perto, então dá para escolher uma TV maior do que se imaginava. Uma referência prática para TVs 4K é sentar a uma distância de 1 a 1,5 vez a diagonal da tela. Na prática, quem senta a cerca de 2 metros costuma ficar bem servido com 50 a 55 polegadas, e a cerca de 2,5 a 3 metros, com 65 polegadas.",
          "Meça também o espaço do rack ou da parede. TVs maiores pedem rack mais largo ou suporte de parede compatível com o padrão de furação (VESA) do modelo.",
        ],
      },
      {
        titulo: "Resolução: 4K virou o padrão",
        paragrafos: [
          "A partir de 43 polegadas, praticamente todas as TVs à venda são 4K, e é o que vale a pena comprar. Full HD ainda aparece em telas menores, de 32 a 43 polegadas, para quarto ou cozinha. TVs 8K existem, mas quase não há conteúdo nessa resolução e o preço é bem maior.",
        ],
      },
      {
        titulo: "Tipo de tela: LED, QLED, Mini LED ou OLED",
        lista: [
          "LED: a mais comum e barata; boa para o dia a dia",
          "QLED: tela LED com uma camada que melhora as cores e o brilho",
          "Mini LED: iluminação com muito mais zonas, mais brilho e preto melhor que o LED comum",
          "OLED: cada ponto acende sozinho, com preto perfeito e o melhor contraste; brilha menos que as Mini LED mais fortes",
        ],
        paragrafos: [
          "Para sala escura e quem assiste muito filme, a OLED é a mais impressionante. Para sala muito clara, com sol entrando, uma QLED ou Mini LED com bastante brilho costuma se sair melhor. Cuidado com os nomes comerciais: cada marca batiza a tecnologia de um jeito, então confira na ficha técnica qual é o tipo de tela.",
        ],
      },
      {
        titulo: "120 Hz, HDMI 2.1 e jogos",
        paragrafos: [
          "A maioria das TVs de entrada é de 60 Hz, o que basta para filmes, séries e futebol. Para quem joga no PS5, no Xbox Series ou no PC, uma tela de 120 Hz com entradas HDMI 2.1 deixa os jogos mais fluidos. Recursos como VRR (taxa variável) e ALLM (modo jogo automático) também ajudam.",
          "Cuidado: alguns anúncios falam em “120 Hz” por processamento de imagem, mas o painel é de 60 Hz. Confira a taxa nativa na ficha técnica.",
        ],
      },
      {
        titulo: "HDR, som e conexões",
        paragrafos: [
          "HDR deixa as cenas claras mais brilhantes e as escuras com mais detalhe. Os formatos mais comuns são HDR10, HDR10+, HLG e Dolby Vision. O HDR só faz diferença de verdade em TVs com bom brilho; nas mais simples, o selo aparece, mas o efeito é pequeno.",
          "O som das TVs finas costuma ser fraco. Se você pretende usar uma soundbar, procure HDMI com eARC. Conte também quantas entradas HDMI você vai precisar para videogame, TV a cabo e outros aparelhos.",
        ],
      },
      {
        titulo: "Sistema da Smart TV",
        paragrafos: [
          "Os sistemas mais comuns são Google TV, webOS (LG), Tizen (Samsung), Roku TV e VIDAA. Todos rodam os principais aplicativos de streaming. Diferenças importantes estão na rapidez do menu, no tempo de atualizações e no controle remoto. Se o sistema de uma TV mais barata ficar lento com o tempo, um aparelho de streaming ligado no HDMI resolve.",
        ],
      },
      {
        titulo: "Como saber se a oferta de TV está boa",
        paragrafos: [
          "TVs estão entre os produtos que mais aparecem com desconto na Black Friday, e também com preço anterior inflado. Compare o modelo exato (o código muda entre anos e tamanhos) e veja na página da oferta o histórico de preço que registramos.",
        ],
      },
    ],
    faq: [
      {
        p: "Qual tamanho de TV para um quarto?",
        r: "Depende da distância da cama, mas em quartos comuns 32 a 50 polegadas costumam atender. Em 32 e 40 polegadas, Full HD ainda é aceitável; acima disso, prefira 4K.",
      },
      {
        p: "OLED ou QLED: qual é melhor?",
        r: "OLED tem o preto perfeito e o melhor contraste, ótima para sala escura e filmes. QLED e Mini LED brilham mais e se saem melhor em sala muito clara.",
      },
      {
        p: "TV de 60 Hz serve para PS5?",
        r: "Serve, e a maioria dos jogos roda bem. Para aproveitar os jogos a 120 quadros por segundo, a TV precisa de painel de 120 Hz nativo e HDMI 2.1.",
      },
    ],
  },

  {
    slug: "compras-de-natal-pela-internet",
    titulo: "Compras de Natal pela internet: prazos de entrega, trocas e presentes sem dor de cabeça",
    descricao:
      "Até quando comprar para chegar antes do Natal, como evitar atrasos, o que a lei diz sobre troca de presente e dicas para economizar nos presentes comprados pela internet.",
    tema: "Natal",
    categorias: ["natal", "decoracao-natal", "arvores-de-natal"],
    linkOfertas: "/natal",
    publicadoEm: "2026-11-14",
    atualizadoEm: "2026-11-14",
    minutos: 6,
    resumo: [
      "Compre com antecedência: em dezembro as entregas atrasam mais, principalmente em compras internacionais.",
      "Antes de pagar, confira o prazo estimado para o seu CEP e quem faz a entrega.",
      "Troca de presente sem defeito não é obrigatória por lei: combine com a loja e peça a nota ou o cupom de troca.",
      "Em compras pela internet, quem comprou tem 7 dias para desistir a partir do recebimento.",
    ],
    secoes: [
      {
        titulo: "Compre cedo para não depender da sorte",
        paragrafos: [
          "Em dezembro o volume de entregas dispara e os prazos ficam mais longos. Quanto mais perto do Natal, maior o risco de o presente chegar depois da data. A melhor estratégia é aproveitar a Black Friday e o começo de dezembro para resolver a lista.",
          "Compras internacionais, como em lojas e vendedores de fora do país, costumam levar bem mais tempo e podem ter impostos de importação. Para presente com data marcada, prefira produtos que saem de estoque no Brasil.",
        ],
        lista: [
          "Confira o prazo estimado para o seu CEP antes de pagar, não só o prazo do anúncio",
          "Prefira produtos com envio rápido ou entregues pela própria loja",
          "Desconfie de prazos muito curtos em vendedores desconhecidos",
          "Se for mandar direto para outra pessoa, confirme o endereço completo e alguém para receber",
        ],
      },
      {
        titulo: "Troca de presente: o que a lei diz",
        paragrafos: [
          "O Código de Defesa do Consumidor obriga a loja a resolver problemas de defeito, mas não obriga a trocar um produto sem defeito só porque não serviu ou a pessoa não gostou. Muitas lojas aceitam a troca por política própria, especialmente no fim do ano, mas as regras e os prazos variam.",
          "Por isso, antes de comprar, veja a política de troca da loja e peça a nota fiscal ou o cupom de troca. Se a loja prometeu a troca no anúncio ou no momento da compra, ela precisa cumprir.",
        ],
      },
      {
        titulo: "Direito de arrependimento nas compras online",
        paragrafos: [
          "Quem compra pela internet tem 7 dias, a partir do recebimento, para desistir da compra sem explicar o motivo, com devolução do valor pago. Esse direito é de quem fez a compra, então se o presente não agradar e ainda estiver no prazo, quem comprou pode pedir a devolução.",
        ],
      },
      {
        titulo: "Como economizar nos presentes",
        lista: [
          "Faça uma lista com nome, ideia de presente e valor máximo para cada pessoa",
          "Acompanhe o preço desde já: crie alertas de preço no MukiOfertas",
          "Veja na página da oferta o histórico de preço antes de decidir",
          "Junte compras na mesma loja para alcançar o frete grátis ou o valor mínimo do cupom",
          "Compare kits e combos com o preço dos itens separados",
        ],
        paragrafos: [
          "No departamento de Natal do MukiOfertas reunimos árvores, decorações e ideias de presentes com desconto, e o selo de menor preço ajuda a saber quando o valor está bom de verdade.",
        ],
      },
      {
        titulo: "Cuidado com golpes de fim de ano",
        paragrafos: [
          "Golpistas aproveitam a pressa do fim de ano: sites falsos de lojas conhecidas, mensagens com falsa taxa de entrega e links de rastreio por SMS ou WhatsApp. Acompanhe o pedido sempre pelo site ou aplicativo da loja e nunca pague taxas extras por links recebidos por mensagem.",
        ],
      },
    ],
    faq: [
      {
        p: "Até quando comprar para chegar antes do Natal?",
        r: "Não existe uma data única, porque o prazo depende da loja, do produto e do seu CEP. O mais seguro é comprar até o começo de dezembro e conferir o prazo estimado no carrinho antes de pagar. Compras internacionais precisam de bem mais antecedência.",
      },
      {
        p: "A loja é obrigada a trocar presente que não serviu?",
        r: "Não, se o produto não tem defeito. A troca depende da política da loja, que precisa ser cumprida se foi prometida. Peça a nota fiscal ou o cupom de troca.",
      },
    ],
  },
];

export function guiaPorSlug(slug) {
  return guias.find((g) => g.slug === slug) ?? null;
}

// Guia mais ligado a uma categoria (usado na página da oferta)
export function guiaDaCategoria(slugCategoria, slugPai) {
  if (!slugCategoria && !slugPai) return null;
  return (
    guias.find((g) => g.categorias.includes(slugCategoria)) ??
    (slugPai ? guias.find((g) => g.categorias.includes(slugPai)) : null) ??
    null
  );
}

export function formatarDataGuia(iso) {
  return new Date(`${iso}T12:00:00-03:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

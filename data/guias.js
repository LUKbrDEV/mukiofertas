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

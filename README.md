# MukiOfertas Social Automation

Starter kit para integrar produção diária de vídeos (ofertas/curiosidades), Motion Graphics, voz masculina pt-BR, Supabase Storage, Instagram Reels e TikTok.

## Importante antes de ativar

- Instagram: requer conta profissional (Business ou Creator), app Meta, token válido e permissão de publicação.
- TikTok: o modo padrão é `inbox`, que envia o vídeo para a caixa de entrada do TikTok para a pessoa concluir a publicação no app. Direct Post público exige `video.publish`, aprovação/auditoria, UX de revisão e consentimento explícito. Não ative publicação silenciosa fora das regras da plataforma.
- As diretrizes TikTok restringem logos, marcas d'água, links e textos promocionais sobre o conteúdo compartilhado pela API. O template não coloca logotipo no vídeo. Por segurança, ofertas ficam fora do envio automático ao TikTok por padrão (`TIKTOK_ALLOW_OFFERS=false`); curiosidades podem seguir para a caixa de entrada.
- O mesmo MP4 é usado nas duas plataformas. Para ofertas, avalie as políticas comerciais e de conteúdo de cada rede antes de publicar.
- O kit é uma base integrável, não uma garantia de aprovação das APIs. Teste primeiro em contas e apps de desenvolvimento.

## O que faz

1. Escolhe um tipo de conteúdo alternado: `offer` ou `curiosity`.
2. Para oferta, lê a tabela `ofertas` existente no Supabase.
3. Para curiosidade, gera roteiro estruturado com OpenAI.
4. Gera voz com ElevenLabs (português brasileiro).
5. Renderiza MP4 vertical 1080x1920/30fps com Remotion (Motion Graphics).
6. Envia MP4 para Supabase Storage.
7. Publica Reel no Instagram.
8. Envia o vídeo para a caixa de entrada de publicação do TikTok.
9. Registra o resultado em `social_posts`.

## Distribuição

Uma publicação por dia, alternando tipos. Isso dá 3 ou 4 de cada tipo por semana; em ciclos contínuos, fica próximo de 50/50.

## Estrutura

- `supabase/migrations/20261102_social_automation.sql`: tabelas, índices e bucket.
- `worker/`: motor de geração, voz, renderização e publicação.
- `.github/workflows/social-media.yml`: execução diária às 09h de Brasília (12:00 UTC).
- `app/api/social/run/route.js`: endpoint opcional para disparo manual protegido por segredo.

## Instalação

### 1. Copie os arquivos

Extraia o ZIP na raiz do projeto Next.js existente. Mescle as pastas; não substitua arquivos existentes com o mesmo nome sem conferir.

### 2. Supabase

Execute a migration no SQL Editor do Supabase:
`supabase/migrations/20261102_social_automation.sql`

O projeto já usa a tabela `ofertas`. A consulta deste kit espera estas colunas existentes:
`id, titulo, categoria, preco_atual, preco_antigo, link, imagem, ativa, cupom, expires_at`.

Se sua tabela tiver algum nome/tipo diferente, ajuste `worker/src/content.js`.

Crie/valide o bucket público `social-videos`. O bucket é público porque as APIs de publicação precisam buscar o vídeo por URL.

### 3. Variáveis de ambiente

Copie `.env.example` para `worker/.env` para teste local. Nunca envie `.env` ao Git.

No GitHub, cadastre os mesmos valores em Settings > Secrets and variables > Actions > New repository secret.

### 4. Dependências e teste local

Requer Node.js 20+ e FFmpeg instalado e acessível no PATH.

```bash
cd worker
npm install
npx remotion browser ensure
cp .env.example .env
# preencha as credenciais
npm run generate
```

O `npm run generate` gera o vídeo, salva no Supabase e tenta publicar nas plataformas habilitadas.

Para testar apenas renderização sem publicar, defina:
`DRY_RUN=true`

Para testar o fluxo todo sem redes sociais:
`DRY_RUN=true` ainda gera e armazena o vídeo, mas não publica.

### 5. GitHub Actions

O workflow executa diariamente às 12:00 UTC (09:00 em Brasília). Pode ser executado manualmente em Actions > MukiOfertas Social Automation > Run workflow.

O workflow começa com `DRY_RUN=true`: ele gera e armazena o MP4, sem publicar. Depois de validar o vídeo e as credenciais, altere `DRY_RUN` para `false` no YAML. Adicione `OPENAI_API_KEY`, `OPENAI_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`, `META_GRAPH_VERSION`, `TIKTOK_ACCESS_TOKEN` e `TIKTOK_MODE` como secrets/variables.

### 6. Instagram

Use uma conta Instagram profissional. Configure o app Meta e a permissão de publicação apropriada. O token precisa ter acesso ao Instagram Professional Account ID informado em `INSTAGRAM_USER_ID`.

O fluxo utilizado:
1. `POST /{ig-user-id}/media` com `media_type=REELS` e `video_url`.
2. Aguarda `status_code=FINISHED`.
3. `POST /{ig-user-id}/media_publish` com `creation_id`.

### 7. TikTok

Modo padrão: `TIKTOK_MODE=inbox`.

O vídeo é enviado pelo endpoint Upload-to-Inbox. O criador precisa abrir o TikTok e concluir a publicação na caixa de entrada. Este é o modo de fallback mais seguro enquanto a aplicação Direct Post não está aprovada. Curiosidades são enviadas; ofertas são retidas para revisão por padrão, porque as regras de compartilhamento do TikTok restringem elementos promocionais. Não habilite `TIKTOK_ALLOW_OFFERS=true` sem verificar as regras e aprovar o fluxo.

Direct Post público não é um simples interruptor técnico: requer aprovação do escopo `video.publish`, auditoria, interface com revisão/edição, escolha manual de privacidade e consentimento explícito antes de enviar o conteúdo. O código não tenta contornar essas exigências.

### 8. Segurança

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, tokens Meta/TikTok ou chaves de IA no navegador.
- O endpoint manual usa `SOCIAL_RUN_SECRET`.
- Use apenas URLs públicas de vídeo do seu próprio domínio/bucket.
- Rotacione qualquer token que tenha sido compartilhado acidentalmente.
- Não publique conteúdo gerado sem revisar fatos, preços e disponibilidade, especialmente nas primeiras execuções.

## Limitações e pontos de integração

- O projeto MukiOfertas existente usa JavaScript. Os arquivos adicionados também usam JavaScript.
- O worker roda separado do Next.js para não exceder limites de execução da Vercel.
- A migration cria tabelas próprias `social_settings` e `social_posts`; não altera a tabela `ofertas`.
- O kit seleciona uma oferta ativa e com prazo válido. Verifique a regra `ativa` e `expires_at` de acordo com seu banco real.
- A geração de curiosidades usa IA; a revisão editorial de fatos continua recomendada. A IA não deve inventar estatísticas, datas ou números.

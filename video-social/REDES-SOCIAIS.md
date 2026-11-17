# Postagem automática: Instagram, YouTube e Pinterest

O código já está pronto. Falta você criar as permissões em cada rede (uma vez só) e colar as
chaves na VPS. Cada rede funciona sozinha: pode ligar uma de cada vez.

As chaves vão em **dois arquivos da VPS** (o segundo é cópia do primeiro):

```
nano ~/robo.env
nano ~/mukiofertas-robo/.env.robo
```

---

## 1. Instagram (Reels)

1. No app do Instagram: a conta do MukiOfertas precisa ser **profissional** (Configurações → Tipo de conta → Comercial ou Criador de conteúdo).
2. Entre em developers.facebook.com → **Criar app** → escolha o caso de uso de **Instagram** (API do Instagram).
3. No painel do app, abra **API com login do Instagram** → adicione a sua conta do Instagram → **Gerar token**.
   O app pode continuar em modo de desenvolvimento, porque só vai postar na sua própria conta.
4. Copie o token e o id da conta do Instagram que aparecem ali e cole na VPS:

```
PUBLICAR_REDES=instagram
IG_USER_ID=...
IG_ACCESS_TOKEN=...
```

O token vale 60 dias e o robô renova sozinho toda semana. Se um dia der erro de token, gere outro e cole por cima.

## 2. YouTube (Shorts)

1. Entre em console.cloud.google.com → crie um projeto "MukiOfertas".
2. **APIs e serviços → Biblioteca** → ative a **YouTube Data API v3**.
3. **Tela de consentimento OAuth** → Externo → preencha nome e e-mail → em Escopos adicione `youtube.upload` → depois clique em **Publicar app** (status **Em produção**).
   Se ficar em "Teste", a permissão expira em 7 dias e o robô para de postar.
4. **Credenciais → Criar credenciais → ID do cliente OAuth → App para computador**. Copie o ID e a chave secreta.
5. No PC, dentro da pasta do projeto:

```
cd video-social
node autorizar-youtube.mjs SEU_CLIENT_ID SUA_CHAVE_SECRETA
```

   Faça login com a conta do canal do YouTube. Se aparecer "o Google não verificou este app", clique em Avançado → continuar.
   O terminal mostra 3 linhas: cole na VPS, junto com `youtube` no `PUBLICAR_REDES`:

```
PUBLICAR_REDES=instagram,youtube
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

**Atenção:** o Google pode deixar os vídeos como **privados** até o projeto passar por uma auditoria.
O aviso chega no seu Telegram junto com o vídeo. Se acontecer, peça a auditoria no formulário
"YouTube API Services - Audit and Quota Extension" do Google.

## 3. Ligar os vídeos

Depois de colar as chaves, atualize o código na VPS e gere um vídeo de teste:

```
cd ~/mukiofertas-robo && git pull
~/rodar-video.sh
tail -n 30 ~/logs/robo-video.log
```

Daí em diante, os 3 vídeos do dia já saem postados. Cada um continua chegando no seu Telegram,
agora com o resultado da postagem e os links. Para pausar: deixe `PUBLICAR_REDES=` vazio.

**TikTok** ficou de fora: a postagem por robô exige aprovação do app pelo TikTok.
Os vídeos continuam chegando no seu Telegram para você postar lá.

---

## 4. Pinterest (pins de ofertas)

1. A conta do Pinterest precisa ser **empresarial** (business.pinterest.com).
2. Entre em developers.pinterest.com → **Meus apps → Conectar app**. O app começa em acesso **Trial**.
3. No app, em **Redirect URIs**, cadastre: `http://localhost:8766/`
4. No PC, dentro da pasta do projeto:

```
node scripts/autorizar-pinterest.mjs SEU_APP_ID SEU_APP_SECRET
```

   Cole na VPS as 4 linhas que aparecerem.
5. Na VPS, crie o quadro e cole o id que ele mostrar (`PINTEREST_BOARD_ID=...`):

```
cd ~/mukiofertas-robo
node --env-file=.env.robo scripts/postar-pinterest.mjs --criar-quadro="Achadinhos e ofertas do dia"
```

6. **Acesso Standard (obrigatório para os pins ficarem públicos).** No Trial, o Pinterest não deixa criar pins de verdade.
   Peça o acesso Standard no app: ele pede um vídeo curto mostrando o login e o pin sendo criado.
   Para gravar, use o ambiente de teste: coloque `PINTEREST_SANDBOX=1` no `.env.robo`, rode o
   `autorizar-pinterest.mjs` de novo com `PINTEREST_SANDBOX=1` e depois o robô. Quando aprovar, apague o `PINTEREST_SANDBOX=1`
   e gere o token normal de novo.
7. Ver o que seria postado, sem postar nada:

```
node --env-file=.env.robo scripts/postar-pinterest.mjs --teste
```

8. Agendar a cada 2 horas (2 pins por vez, no máximo 15 por dia):

```
mkdir -p ~/logs
( crontab -l; echo "17 */2 * * * cd ~/mukiofertas-robo && timeout 10m node --env-file=.env.robo scripts/postar-pinterest.mjs >> ~/logs/pinterest.log 2>&1" ) | crontab -
```

Ver o resultado: `tail -n 20 ~/logs/pinterest.log`

Quantidade de pins, desconto mínimo e pausa entre pins: bloco `AJUSTES` no começo do `scripts/postar-pinterest.mjs`.

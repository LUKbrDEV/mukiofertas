# Vídeos do MukiOfertas (TikTok / Reels)

Gera um vídeo vertical 1080x1920 com motion graphics, ofertas reais do Supabase,
narração da ElevenLabs e legenda sincronizada com a voz.

## Primeira vez (no PC ou na VPS)

```
cd video-social
npm install
npx playwright install chromium
```

Na VPS (Ubuntu), use `npx playwright install --with-deps chromium`.

## Variáveis

O gerador lê o `.env.local` do site (pasta de cima), o `.env.robo` e um `.env` dentro de `video-social/`.
Ele precisa de:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (já existem no .env.local)
- opcional: `ELEVENLABS_MODEL` (padrão: eleven_multilingual_v2)
- opcional: `ELEVENLABS_SPEED` velocidade da fala, de 0.7 a 1.2 (padrão: 0.95; menor = mais devagar)

Para receber os vídeos no Telegram: `VIDEO_TELEGRAM_CHAT_ID` (seu id; mande /start para o bot e pergunte seu Id ao @userinfobot).

## Gerar

```
npm run video            # ofertas reais + voz
npm run video:teste      # ofertas de exemplo + voz (não usa o Supabase)
npm run video:sem-voz    # só o visual, sem gastar créditos da ElevenLabs
node gerar.mjs --id=123  # uma oferta específica como destaque
node gerar.mjs --enviar  # manda o vídeo pronto no seu Telegram
node gerar.mjs --reserva # não usa o Gemini (roteiro pronto)
```

O vídeo sai em `video-social/saida/`.

Cada vídeo tem um roteiro novo escrito pelo Gemini (GEMINI_API_KEY). Se o Gemini falhar,
usa um dos 4 roteiros prontos de `lib/roteiro.mjs`. As ofertas e os ganchos usados ficam em
`saida/historico.json` e não se repetem por 7 dias.

## 3 vídeos por dia na VPS

1. No PC: `git add video-social` → `git commit -m "videos"` → `git push`
2. Na VPS: `bash ~/mukiofertas-robo/video-social/instalar-na-vps.sh`

Ele instala tudo, pede as chaves que faltarem e agenda às 11:26, 17:26 e 20:26 (Brasília).
Para mudar: `HORARIOS="10:15 15:15 21:15" bash ~/mukiofertas-robo/video-social/instalar-na-vps.sh`
Registro: `tail -n 40 ~/logs/robo-video.log`

## Onde mudar

- Regras do roteiro do Gemini: `lib/ia-roteiro.mjs`
- Roteiros prontos (reserva): `lib/roteiro.mjs`
- Visual e animações de cada cena: `template.html`
- Quais ofertas entram: `lib/ofertas.mjs`

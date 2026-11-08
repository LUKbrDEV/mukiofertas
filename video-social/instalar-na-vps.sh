#!/usr/bin/env bash
# Faz a VPS gerar 3 vídeos por dia sozinha e mandar cada um no seu Telegram, pronto para postar.
#
# Antes: no PC, envie a pasta video-social para o GitHub (git add / commit / push).
# Depois, na VPS:   bash ~/mukiofertas-robo/video-social/instalar-na-vps.sh
# Pode rodar de novo quando quiser (por exemplo, para mudar os horários).
set -euo pipefail

# Horários de Brasília em que cada vídeo fica pronto (um vídeo por horário)
HORARIOS="${HORARIOS:-11:26 17:26 20:26}"

PASTA="$HOME/mukiofertas-robo"
VIDEO="$PASTA/video-social"
TOKEN_CODIGO="$HOME/.token-github-codigo"

echo "==> 1/7 Atualizando o código..."
[ -d "$PASTA/.git" ] || { echo "Não achei $PASTA. Rode primeiro o servidor-whatsapp/robo-na-vps.sh"; exit 1; }
if [ -s "$TOKEN_CODIGO" ]; then
  git -c http.extraHeader="Authorization: Basic $(printf 'x-access-token:%s' "$(cat "$TOKEN_CODIGO")" | base64 -w0)" -C "$PASTA" pull --ff-only -q
else
  git -C "$PASTA" pull --ff-only -q
fi
[ -f "$VIDEO/gerar.mjs" ] || { echo "A pasta video-social não chegou na VPS. No PC: git add video-social && git commit -m 'videos' && git push"; exit 1; }

echo "==> 2/7 Memória extra (swap) para renderizar os vídeos..."
if [ -z "$(swapon --show --noheadings)" ]; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile && sudo mkswap /swapfile >/dev/null && sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "swap de 2 GB criada"
else
  echo "swap já existe: $(swapon --show --noheadings | awk '{print $3}' | head -1)"
fi

echo "==> 3/7 Fontes de emoji e dependências do navegador..."
sudo apt-get update -qq
sudo apt-get install -y -qq fonts-noto-color-emoji >/dev/null

echo "==> 4/7 Instalando o gerador de vídeos..."
cd "$VIDEO"
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
sudo env "PATH=$PATH" npx playwright install-deps chromium
npx playwright install chromium

echo "==> 5/7 Conferindo as chaves..."
touch "$HOME/robo.env"
pedir() { # pedir NOME "explicação"
  local nome="$1" explica="$2" valor=""
  if grep -q "^$1=." "$HOME/robo.env"; then echo "  $1 ok"; return; fi
  echo "  Falta $nome — $explica"
  read -r -p "  Cole $nome e aperte Enter: " valor || true
  valor=$(printf '%s' "${valor:-}" | tr -d '[:space:]')
  [ -z "$valor" ] && { echo "  (pulado)"; return; }
  printf '\n%s=%s\n' "$nome" "$valor" >> "$HOME/robo.env"
}
pedir ELEVENLABS_API_KEY "a mesma do seu .env.local"
pedir ELEVENLABS_VOICE_ID "a mesma do seu .env.local"
pedir VIDEO_TELEGRAM_CHAT_ID "seu id no Telegram: mande /start para o bot do MukiOfertas e depois pergunte seu Id ao @userinfobot"
grep -q '^ELEVENLABS_SPEED=' "$HOME/robo.env" || printf 'ELEVENLABS_SPEED=0.95\n' >> "$HOME/robo.env"
cp "$HOME/robo.env" "$PASTA/.env.robo" && chmod 600 "$HOME/robo.env" "$PASTA/.env.robo"

echo "==> 6/7 Criando o script que gera o vídeo..."
mkdir -p "$HOME/logs"
cat > "$HOME/rodar-video.sh" <<SCRIPT
#!/usr/bin/env bash
# Gera 1 vídeo e manda no Telegram. Uso: ~/rodar-video.sh   (ou ~/rodar-video.sh --sem-voz para testar)
LOG="\$HOME/logs/robo-video.log"
exec 9>/tmp/robo-video.lock
flock -n 9 || { echo "\$(date '+%d/%m %H:%M') pulei: o vídeo anterior ainda está sendo gerado" >> "\$LOG"; exit 0; }
{
  echo "===== \$(date '+%d/%m %H:%M') vídeo ====="
  cd "$VIDEO" || exit 1
  # se o package-lock mudou (git pull da coleta), reinstala
  if [ ! -d node_modules ] || [ "\$(sha1sum package-lock.json 2>/dev/null)" != "\$(cat .lock-instalado 2>/dev/null)" ]; then
    npm ci --no-audit --no-fund && npx playwright install chromium && sha1sum package-lock.json > .lock-instalado
  fi
  export NODE_OPTIONS="--max-old-space-size=512"
  nice -n 10 timeout 45m node gerar.mjs --enviar "\$@" || echo "!! o vídeo terminou com erro (\$?)"
} >> "\$LOG" 2>&1
tail -n 2000 "\$LOG" > "\$LOG.tmp" && mv "\$LOG.tmp" "\$LOG"
SCRIPT
chmod +x "$HOME/rodar-video.sh"
sha1sum "$VIDEO/package-lock.json" > "$VIDEO/.lock-instalado" 2>/dev/null || true

echo "==> 7/7 Agendando..."
# converte os horários de Brasília (UTC-3) para o fuso da VPS
OFF=$(date +%z); SINAL=${OFF:0:1}; OFF_H=$((10#${OFF:1:2}))
[ "$SINAL" = "-" ] && OFF_H=$((-OFF_H))
LINHAS=""
for H in $HORARIOS; do
  HH=$((10#${H%%:*})); MM=$((10#${H##*:}))
  HV=$(( (HH + 3 + OFF_H + 24) % 24 ))
  LINHAS+="$MM $HV * * * $HOME/rodar-video.sh"$'\n'
done
( { crontab -l 2>/dev/null || true; } | { grep -v 'rodar-video.sh' || true; } ; printf '%s' "$LINHAS" ) | crontab -
echo "Agendado (horário da VPS, fuso $(date +%Z)):"
crontab -l | grep rodar-video.sh

echo
echo "Gerando o primeiro vídeo agora para testar (pode levar alguns minutos)..."
"$HOME/rodar-video.sh" || true
tail -n 25 "$HOME/logs/robo-video.log"
echo
echo "Pronto! Vídeos às $HORARIOS (Brasília), cada um chega no seu Telegram com o texto do post."
echo "Comandos úteis:"
echo "  tail -n 40 ~/logs/robo-video.log   # ver o último vídeo"
echo "  ~/rodar-video.sh                   # gerar um vídeo agora"
echo "  HORARIOS=\"10:15 15:15 21:15\" bash $VIDEO/instalar-na-vps.sh   # mudar os horários"

#!/usr/bin/env bash
# Faz a VPS da Oracle RODAR o robô do MukiOfertas sozinha (sem o GitHub Actions).
#   - Coleta + trava de desconto + conferência de preços + Telegram + alertas de preço: a cada 30 minutos
#   - Postagem no WhatsApp: a cada 10 minutos
#
# Antes de rodar, copie o .env.local do seu PC para a VPS (no PowerShell, na pasta do projeto):
#   scp -i C:\caminho\chave.key .env.local ubuntu@IP_DA_VPS:~/robo.env
#
# Depois, na VPS, dentro da pasta servidor-whatsapp:   bash robo-na-vps.sh
# Pode rodar de novo quando quiser: ele só atualiza o que já existe.
set -euo pipefail

REPO="${1:-LUKbrDEV/mukiofertas}"
BRANCH="${2:-main}"
PASTA="$HOME/mukiofertas-robo"
TOKEN_CODIGO="$HOME/.token-github-codigo"

echo "==> 1/6 Conferindo o arquivo de chaves (~/robo.env)..."
if [ ! -s "$HOME/robo.env" ]; then
  echo "Não achei ~/robo.env. No seu PC, rode no PowerShell (na pasta do projeto):"
  echo "  scp -i C:\\caminho\\chave.key .env.local ubuntu@IP_DA_VPS:~/robo.env"
  echo "Depois rode de novo: bash robo-na-vps.sh"
  exit 1
fi
chmod 600 "$HOME/robo.env"

echo "==> 2/6 Instalando Node.js 22 e git (se ainda não tiver)..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
command -v git >/dev/null 2>&1 || sudo apt-get install -y git
echo "Node $(node -v)"

echo "==> 3/6 Baixando o código do GitHub..."
# Repositório privado: precisa de um token com permissão "Contents: Read-only" neste repositório.
# O token fica guardado só para o seu usuário, fora da pasta do projeto.
git_github() {
  if [ -s "$TOKEN_CODIGO" ]; then
    local cabecalho
    cabecalho="Authorization: Basic $(printf 'x-access-token:%s' "$(cat "$TOKEN_CODIGO")" | base64 -w0)"
    git -c http.extraHeader="$cabecalho" "$@"
  else
    GIT_TERMINAL_PROMPT=0 git "$@"
  fi
}
if [ ! -d "$PASTA/.git" ]; then
  if ! git_github clone --depth 1 -b "$BRANCH" "https://github.com/$REPO.git" "$PASTA" 2>/dev/null; then
    echo "O repositório é privado. Crie um token no GitHub:"
    echo "  Settings → Developer settings → Fine-grained tokens → Generate new token"
    echo "  Repository access: só o mukiofertas · Permissions → Contents: Read-only"
    read -r -p "Cole o token e aperte Enter: " TOKEN || true
    TOKEN=$(printf '%s' "${TOKEN:-}" | tr -d '[:space:]')
    [ -z "$TOKEN" ] && { echo "Nenhum token colado. Rode de novo."; exit 1; }
    printf '%s' "$TOKEN" > "$TOKEN_CODIGO"
    chmod 600 "$TOKEN_CODIGO"
    git_github clone --depth 1 -b "$BRANCH" "https://github.com/$REPO.git" "$PASTA"
  fi
else
  git_github -C "$PASTA" pull --ff-only
fi

echo "==> 4/6 Instalando as dependências do robô..."
cp "$HOME/robo.env" "$PASTA/.env.robo"
chmod 600 "$PASTA/.env.robo"
(cd "$PASTA" && npm ci --omit=dev --no-audit --no-fund)

echo "==> 5/6 Criando o script que roda o robô..."
mkdir -p "$HOME/logs"
cat > "$HOME/rodar-robo.sh" <<SCRIPT
#!/usr/bin/env bash
# Uso: rodar-robo.sh coleta | whatsapp | kabum
TAREFA="\${1:-coleta}"
PASTA="$PASTA"
LOG="\$HOME/logs/robo-\$TAREFA.log"
export NODE_OPTIONS="--max-old-space-size=512"   # a VPS tem só 1 GB de RAM

# Se a execução anterior ainda estiver rodando, pula esta (não empilha)
exec 9>"/tmp/robo-\$TAREFA.lock"
flock -n 9 || { echo "\$(date '+%d/%m %H:%M') pulei: a anterior ainda está rodando" >> "\$LOG"; exit 0; }

{
  echo "===== \$(date '+%d/%m %H:%M') \$TAREFA ====="
  cd "\$PASTA" || exit 1
  rodar() { timeout "\$1" node --env-file=.env.robo "\${@:2}" || echo "!! \${2} terminou com erro (\$?)"; }

  case "\$TAREFA" in
    coleta)
      # Atualiza o código com o que você enviou no git push
      ANTES=\$(sha1sum package-lock.json)
      $( [ -s "$TOKEN_CODIGO" ] && echo 'git -c http.extraHeader="Authorization: Basic $(printf "x-access-token:%s" "$(cat '"$TOKEN_CODIGO"')" | base64 -w0)" pull --ff-only -q || echo "!! não consegui atualizar o código"' || echo 'git pull --ff-only -q || echo "!! não consegui atualizar o código"' )
      [ "\$ANTES" != "\$(sha1sum package-lock.json)" ] && npm ci --omit=dev --no-audit --no-fund
      rodar 25m scripts/coletar.mjs
      rodar 5m  scripts/corrigir-descontos.mjs   # trava o "preço antigo" inflado antes de postar
      rodar 10m scripts/fila-mercadolivre.mjs    # ofertas do Mercado Livre para a fila do painel
      rodar 15m scripts/conferir-precos.mjs
      rodar 5m  scripts/postar-telegram.mjs
      rodar 5m  scripts/avisar-alertas.mjs       # alertas de preço (aviso no site + e-mail pelo Resend)
      ;;
    whatsapp)
      rodar 9m scripts/postar-whatsapp.mjs
      ;;
    kabum)
      rodar 25m scripts/coletar.mjs --so=awin --forcar
      rodar 5m  scripts/corrigir-descontos.mjs
      ;;
    *)
      echo "Tarefa desconhecida: \$TAREFA (use coleta, whatsapp ou kabum)"
      ;;
  esac
} >> "\$LOG" 2>&1

# Guarda só as últimas 3000 linhas do registro
tail -n 3000 "\$LOG" > "\$LOG.tmp" && mv "\$LOG.tmp" "\$LOG"
SCRIPT
chmod +x "$HOME/rodar-robo.sh"

echo "==> 6/6 Agendando (e desligando o acionamento antigo do GitHub)..."
# Tira as linhas antigas que só acionavam o GitHub Actions e qualquer agendamento anterior deste robô
( { crontab -l 2>/dev/null || true; } | { grep -v -e 'acionar-' -e 'rodar-robo.sh' || true; } ; \
  echo "11,41 * * * * $HOME/rodar-robo.sh coleta"; \
  echo "*/10 * * * * $HOME/rodar-robo.sh whatsapp" ) | crontab -

echo
echo "Agendamentos ativos:"
crontab -l || true
echo
echo "Testando o WhatsApp agora (leva até 3 minutos)..."
"$HOME/rodar-robo.sh" whatsapp || true
tail -n 15 "$HOME/logs/robo-whatsapp.log"
echo
echo "Pronto! A VPS agora roda o robô sozinha:"
echo "  coleta + preços + Telegram + alertas nos minutos 11 e 41 de cada hora · WhatsApp a cada 10 minutos"
echo
echo "Comandos úteis:"
echo "  tail -n 40 ~/logs/robo-coleta.log      # ver a última coleta"
echo "  tail -n 40 ~/logs/robo-whatsapp.log    # ver o último envio do WhatsApp"
echo "  ~/rodar-robo.sh coleta                 # rodar a coleta agora"
echo "  free -h                                # ver a memória"

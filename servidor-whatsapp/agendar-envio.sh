#!/usr/bin/env bash
# Faz a VPS da Oracle acionar o robô "Postar no WhatsApp" do GitHub a cada 10 minutos.
# (O agendamento do próprio GitHub atrasa ou pula execuções; a VPS fica ligada o tempo todo.)
#
# Rode UMA vez na VPS, dentro da pasta servidor-whatsapp:   bash agendar-envio.sh
# Ele pede o token do GitHub (o mesmo GITHUB_TOKEN_ROBO da Vercel, com "Actions: Read and write").
set -euo pipefail

REPO="${1:-LUKbrDEV/mukiofertas}"
BRANCH="${2:-main}"

read -rsp "Cole o token do GitHub (GITHUB_TOKEN_ROBO) e aperte Enter: " TOKEN
echo
[ -n "$TOKEN" ] || { echo "Token vazio."; exit 1; }

# Guarda o token só para o seu usuário
printf '%s' "$TOKEN" > "$HOME/.token-github-robo"
chmod 600 "$HOME/.token-github-robo"

# Script que aciona o workflow
cat > "$HOME/acionar-whatsapp.sh" <<SCRIPT
#!/usr/bin/env bash
TOKEN=\$(cat "\$HOME/.token-github-robo")
STATUS=\$(curl -s -o /tmp/acionar-whatsapp.txt -w '%{http_code}' -X POST \\
  -H "Authorization: Bearer \$TOKEN" \\
  -H "Accept: application/vnd.github+json" \\
  -H "X-GitHub-Api-Version: 2022-11-28" \\
  "https://api.github.com/repos/$REPO/actions/workflows/whatsapp.yml/dispatches" \\
  -d '{"ref":"$BRANCH"}')
echo "\$(date '+%d/%m %H:%M') -> \$STATUS \$(head -c 200 /tmp/acionar-whatsapp.txt)" >> "\$HOME/acionar-whatsapp.log"
# guarda só as últimas 500 linhas do registro
tail -n 500 "\$HOME/acionar-whatsapp.log" > "\$HOME/acionar-whatsapp.log.tmp" && mv "\$HOME/acionar-whatsapp.log.tmp" "\$HOME/acionar-whatsapp.log"
SCRIPT
chmod +x "$HOME/acionar-whatsapp.sh"

# Agenda a cada 10 minutos (substitui o agendamento antigo, se existir)
( crontab -l 2>/dev/null | grep -v acionar-whatsapp.sh ; echo "*/10 * * * * $HOME/acionar-whatsapp.sh" ) | crontab -

# Testa agora
"$HOME/acionar-whatsapp.sh"
echo
echo "Último registro (204 = deu certo):"
tail -n 1 "$HOME/acionar-whatsapp.log"
echo
echo "Pronto! A VPS vai acionar o robô do WhatsApp a cada 10 minutos."
echo "Para ver o registro depois:  tail -n 20 ~/acionar-whatsapp.log"

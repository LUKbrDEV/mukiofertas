#!/usr/bin/env bash
# Instala o servidor do WhatsApp (Evolution API) na VPS da Oracle (Ubuntu).
# Rode na VPS, dentro da pasta servidor-whatsapp:   bash instalar.sh
set -euo pipefail

echo "==> 0/5 Criando 2 GB de memória extra (swap), porque o servidor tem só 1 GB..."
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  # usa o swap só quando precisar
  echo 'vm.swappiness=20' | sudo tee /etc/sysctl.d/99-swap.conf >/dev/null
  sudo sysctl -p /etc/sysctl.d/99-swap.conf >/dev/null
fi

echo "==> 1/5 Instalando o Docker..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "==> 2/5 Liberando as portas 80 e 443 no firewall do Ubuntu..."
# As imagens Ubuntu da Oracle bloqueiam tudo no iptables, além da Security List do painel
for porta in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$porta" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$porta" -j ACCEPT
  fi
done
sudo apt-get install -y netfilter-persistent iptables-persistent >/dev/null 2>&1 || true
sudo netfilter-persistent save || true

echo "==> 3/5 Criando o arquivo .env com senhas novas..."
if [ ! -f .env ]; then
  IP=$(curl -fsS https://api.ipify.org)
  DOMINIO="${IP//./-}.sslip.io"
  cat > .env <<ENV
DOMINIO=$DOMINIO
EVOLUTION_API_KEY=$(openssl rand -hex 32)
POSTGRES_SENHA=$(openssl rand -hex 16)
ENV
  chmod 600 .env
fi
source .env

echo "==> 4/5 Subindo o servidor (a primeira vez demora alguns minutos)..."
sudo docker compose up -d

echo "==> 5/5 Esperando a API responder..."
for i in $(seq 1 60); do
  if curl -fsS "https://$DOMINIO" >/dev/null 2>&1; then break; fi
  sleep 6
done

echo
echo "================================================================"
echo " Pronto! Anote estes dados (eles vão para o GitHub e o .env.local):"
echo
echo "   EVOLUTION_URL      = https://$DOMINIO"
echo "   EVOLUTION_API_KEY  = $EVOLUTION_API_KEY"
echo
echo " Painel para conectar o WhatsApp (QR Code):"
echo "   https://$DOMINIO/manager"
echo "   (use a EVOLUTION_API_KEY acima para entrar)"
echo "================================================================"

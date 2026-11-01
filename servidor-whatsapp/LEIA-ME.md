# Servidor do WhatsApp do MukiOfertas (Oracle Cloud grátis)

Resumo do passo a passo (o completo está na conversa com o Claude):

1. Oracle: criar a VM Ubuntu (VM.Standard.E2.1.Micro, 1 GB — versão leve, com swap de 2 GB), região São Paulo
2. Oracle: liberar as portas 80 e 443 na Security List (Ingress, 0.0.0.0/0, TCP)
3. No seu PC (PowerShell, na raiz do projeto):
       scp -i C:\caminho\chave.key -r servidor-whatsapp ubuntu@IP_DA_VPS:~
       ssh -i C:\caminho\chave.key ubuntu@IP_DA_VPS
4. Na VPS:
       cd servidor-whatsapp
       bash instalar.sh
5. Abrir https://IP-COM-TRACOS.sslip.io/manager, criar a conexão "mukiofertas" e ler o QR Code no celular

Comandos úteis na VPS (dentro de ~/servidor-whatsapp):
    sudo docker compose ps              # ver se está tudo rodando
    sudo docker compose logs -f --tail 100 evolution-api   # ver o log
    sudo docker compose restart         # reiniciar
    sudo docker compose pull && sudo docker compose up -d   # atualizar
    cat .env                            # ver a URL e a chave de novo
    free -h                             # ver a memória (RAM e swap)

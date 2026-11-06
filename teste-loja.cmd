@echo off
cd /d "%~dp0"
node --env-file=.env.local scripts\publicar-teste-netshoes.mjs --aplicar > "Claude outputs\teste-loja.txt" 2>&1

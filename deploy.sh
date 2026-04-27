#!/usr/bin/env bash
# deploy.sh — build e restart do padel_torneios em produção
# Uso: ./deploy.sh
# Requer: pm2, nginx, sudo (para o cache purge)
set -euo pipefail

APP_DIR="/var/www/html/padel_torneios"
PM2_APP="padel_torneios"
NGINX_CACHE_DIR="/var/cache/nginx/padel_torneios"

echo "==> [1/5] Pull do repositório..."
git -C "$APP_DIR" pull --ff-only

echo "==> [2/5] Instalação de dependências (inclui devDeps necessários para o build)..."
npm --prefix "$APP_DIR" ci

echo "==> [3/5] Build de produção..."
npm --prefix "$APP_DIR" run build

echo "==> [4/5] Purge do cache nginx (/_next/static/ ficou com hashes antigos)..."
# Apaga o cache em disco — nginx reconstrói tudo na próxima request
sudo rm -rf "${NGINX_CACHE_DIR:?}"/*
echo "    Cache nginx limpo."

echo "==> [5/5] Restart da app..."
pm2 restart "$PM2_APP" --update-env

echo ""
echo "Deploy concluído. Verifica em https://torneios.agendapadel.pt"

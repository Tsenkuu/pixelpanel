#!/bin/bash

# PixelPanel Update Script

set -e

echo "===================================================="
echo "    PixelPanel Updater                              "
echo "===================================================="

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

cd /opt/PixelPanel

echo "[1/4] Pulling latest changes..."
git pull

echo "[2/4] Updating backend dependencies..."
cd backend
npm install

echo "[3/4] Updating frontend dependencies and building..."
cd ../frontend
npm install
npm run build

echo "[4/4] Restarting PixelPanel service..."
pm2 restart pixelpanel-backend

echo "Update Complete."
echo "===================================================="

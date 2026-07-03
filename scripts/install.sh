#!/bin/bash

# PixelPanel Installation Script
# Supports: Ubuntu, Debian, Armbian

set -e

echo "===================================================="
echo "    PixelPanel Installation - Lightweight Node.js   "
echo "===================================================="

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "[1/5] Installing Dependencies..."
apt-get update
apt-get install -y curl wget git unzip sqlite3 nginx build-essential python3

echo "[2/5] Installing Node.js..."
if ! command -v node &> /dev/null
then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js is already installed."
fi

echo "[3/5] Installing PM2..."
if ! command -v pm2 &> /dev/null
then
    npm install -g pm2
else
    echo "PM2 is already installed."
fi

echo "[4/5] Setting up PixelPanel..."
cd /opt
if [ -d "PixelPanel" ]; then
    echo "PixelPanel directory already exists in /opt. Pulling latest..."
    cd PixelPanel
    git pull
else
    # In a real scenario, this would clone from a GitHub repo
    # git clone https://github.com/username/PixelPanel.git
    mkdir -p PixelPanel/{backend,frontend,storage,logs,backups,apps,config,scripts}
    cd PixelPanel
fi

echo "Setting permissions..."
chown -R $USER:$USER /opt/PixelPanel
chmod -R 775 /opt/PixelPanel

echo "[5/5] Installation Complete."
echo "Please navigate to /opt/PixelPanel and follow setup instructions."
echo "===================================================="

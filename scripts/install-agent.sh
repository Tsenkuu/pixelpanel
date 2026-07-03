#!/bin/bash

set -e

echo "===================================================="
echo "    PixelPanel Cluster Agent Installation           "
echo "===================================================="

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit 1
fi

TOKEN=""
MASTER_URL=""

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --token=*) TOKEN="${1#*=}"; shift ;;
        --master=*) MASTER_URL="${1#*=}"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
done

if [ -z "$TOKEN" ] || [ -z "$MASTER_URL" ]; then
    echo "Usage: curl ... | sudo bash -s -- --token=YOUR_TOKEN --master=ws://MASTER_IP:3000"
    exit 1
fi

echo "[1/4] Installing Dependencies..."
apt-get update
apt-get install -y curl wget git unzip sqlite3 build-essential python3

echo "[2/4] Setting up Node.js & PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo "[3/4] Fetching Agent Source Code..."
mkdir -p /opt/pixelpanel-agent

# Clone from GitHub
cd /tmp
rm -rf pixelpanel-clone
git clone https://github.com/Tsenkuu/pixelpanel.git pixelpanel-clone
cp -r pixelpanel-clone/pixelpanel-agent/* /opt/pixelpanel-agent/
rm -rf pixelpanel-clone

cd /opt/pixelpanel-agent

echo "Installing NPM packages and Building..."
npm install
npm run build

echo "Setting permissions..."
chown -R $SUDO_USER:$SUDO_USER /opt/pixelpanel-agent
chmod -R 775 /opt/pixelpanel-agent

echo "[4/4] Starting Agent Daemon..."
# Run PM2 as the user who invoked sudo (usually pypboy)
su - $SUDO_USER -c "cd /opt/pixelpanel-agent && pm2 start dist/agent.js --name 'pixelpanel-agent' -- --token '$TOKEN' --master '$MASTER_URL' && pm2 save"

echo "===================================================="
echo " Agent Installation Complete! "
echo " You should now see this node online in your Master Dashboard."
echo "===================================================="

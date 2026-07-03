#!/bin/bash
set -e

echo "====================================================="
echo "        PixelPanel - Automatic Updater               "
echo "====================================================="

# Pastikan script ini dijalankan tanpa sudo (agar PM2 tidak error)
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Tolong JANGAN gunakan 'sudo' untuk menjalankan script ini!"
  echo "Jalankan sebagai user biasa (contoh: ./update.sh)"
  exit 1
fi

echo "🔄 [1/5] Memperbarui kode sumber dari GitHub..."
# Ambil paksa dari github agar tidak ada konflik file lokal
git fetch --all
git reset --hard origin/main

echo "🛠️  [2/5] Memperbarui dependensi Backend..."
cd backend
npm install

echo "🎨 [3/5] Membangun ulang antarmuka Frontend (mohon tunggu)..."
cd ../frontend
npm install
npm run build

echo "🚀 [4/5] Menyalakan ulang sistem PixelPanel..."
cd ..
pm2 restart pixelpanel-master
pm2 save

echo "====================================================="
echo " ✅ Update Selesai! PixelPanel Anda sudah versi terbaru."
echo "====================================================="

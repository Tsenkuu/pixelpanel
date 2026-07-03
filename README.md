<div align="center">
  
# 🌌 PixelPanel
**The Ultimate Lightweight, Self-Hosted Deployment Platform for ARM64 & VPS**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0--beta-success)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![No Docker](https://img.shields.io/badge/architecture-No%20Docker-orange)

PixelPanel is a next-generation deployment platform designed from the ground up to be insanely fast, incredibly lightweight, and effortlessly beautiful. Think of it as a blend between Vercel, Railway, and Coolify, but optimized for Raspberry Pi, ARM64 set-top boxes, and low-end VPS servers.

**Zero Docker. Pure Native Performance.**

</div>

---

## ✨ Features

- **🚀 Extreme Performance**: Built without Docker or Kubernetes. PixelPanel runs natively, using PM2 for process management. The entire system (Master + Agent) idles at **under 80MB of RAM**.
- **🌐 Node Cluster Management**: Manage unlimited remote servers from a single dashboard. Master and Agents communicate via secure WebSockets over TLS.
- **📱 Progressive Web App (PWA)**: Install PixelPanel directly to your home screen. Fully responsive, touch-friendly, with bottom navigation and 60fps micro-animations.
- **🗄️ Native Database Provisioning**: 1-Click native provisioning of MariaDB, PostgreSQL, and Redis directly on your host machines—no containers attached.
- **💻 Web Terminal**: Full-featured PTY Web Terminal (powered by xterm.js) embedded directly in the browser for remote server management.
- **📊 Realtime Monitoring**: Live CPU, RAM, Network, and Temperature metrics streamed at 60fps using Chart.js.
- **🔮 Aurora Glass UI**: A breathtaking, modern UI using glassmorphism, fluid spring physics, and mesh gradients. Includes Dark and Light mode.
- **⚡ Keyboard Shortcuts**: Press `Ctrl+K` to open the Command Palette for instant navigation.

## 🏗️ Architecture

PixelPanel uses a Master-Worker architecture:

1. **Master (PixelPanel Server)**: The central brain. Hosts the SQLite database, the Vue.js frontend, and the API gateway.
2. **Agent (PixelPanel Node)**: A lightweight daemon (<20MB RAM) installed on remote servers. Manages native processes via PM2, monitors hardware, and executes RPC commands sent by the Master.

## 🚀 Quick Start

### 1. Install Master Server
```bash
git clone https://github.com/yourusername/pixelpanel.git
cd pixelpanel

# Install Backend
cd backend
npm install
npm run start

# Install Frontend
cd ../frontend
npm install
npm run build
```

### 2. Add a Remote Node
In the PixelPanel dashboard, navigate to **Cluster > Add Node** and run the provided curl script on your remote server (Ubuntu/Debian/Armbian):
```bash
curl -sSL http://<master-ip>:3000/install-agent.sh | bash -s -- --token=<your-secure-token> --master=ws://<master-ip>:3000
```

## 🛠️ Tech Stack
- **Frontend**: Vue 3, Vite, TailwindCSS (v3), Pinia, xterm.js, Chart.js.
- **Backend**: Node.js, Express, Socket.io, SQLite (better-sqlite3), node-pty, PM2.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!
Feel free to check [issues page](https://github.com/yourusername/pixelpanel/issues).

## 📝 License
This project is [MIT](LICENSE) licensed.

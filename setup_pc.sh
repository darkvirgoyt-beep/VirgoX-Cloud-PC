#!/usr/bin/env bash
# ==============================================================================
# VirgoX Cloud Computer — One-Click Automated Setup & Launch Script
# Developer: Prince · VirgoYT (@darkvirgoyt-beep)
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================================================="
echo "       ⚡ Starting VirgoX Cloud Computer & Multi-Device Workspace ⚡"
echo "                     Developer: Prince · VirgoYT"
echo "=============================================================================="

# 1. Check & Start Docker Container
if ! docker ps -a --format '{{.Names}}' | grep -q "^virgox-desktop$"; then
    echo "[*] Launching virgox-desktop container..."
    docker run -d \
      --name=virgox-desktop \
      --privileged \
      -e PUID=1000 \
      -e PGID=1000 \
      -e TZ=Etc/UTC \
      -e TITLE="VirgoX Cyber Linux Desktop" \
      -e MAX_RES=1920x1080 \
      -p 3000:3000 \
      -p 3001:3001 \
      -v "$HOME":/config/Desktop/VirgoX-Files \
      --shm-size="2gb" \
      --restart unless-stopped \
      lscr.io/linuxserver/webtop:ubuntu-xfce
else
    echo "[*] virgox-desktop container exists. Starting if stopped..."
    docker start virgox-desktop || true
fi

# 2. Install Tools Inside Container
echo "[*] Ensuring tools and Google Chrome are installed inside container..."
docker exec virgox-desktop bash -c '
which google-chrome-stable >/dev/null 2>&1 || (
    apt-get update -y && \
    apt-get install -y wget curl unzip zip jq android-tools-adb android-tools-fastboot android-sdk-libsparse-utils e2fsprogs p7zip-full geany xfce4-taskmanager wmctrl xdotool scrot && \
    wget -q -O /tmp/google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get install -y /tmp/google-chrome.deb && \
    rm -f /tmp/google-chrome.deb
)
'

# 3. Install ROM Utilities inside container
which magiskboot >/dev/null 2>&1 && docker cp $(which magiskboot) virgox-desktop:/usr/local/bin/magiskboot 2>/dev/null || true
which payload-dumper-go >/dev/null 2>&1 && docker cp $(which payload-dumper-go) virgox-desktop:/usr/local/bin/payload-dumper-go 2>/dev/null || true

# 4. Start Web Terminal (ttyd on port 7681)
which ttyd >/dev/null 2>&1 || (
    curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /tmp/ttyd && \
    sudo cp /tmp/ttyd /usr/local/bin/ttyd && sudo chmod +x /usr/local/bin/ttyd
)
ss -tulpn | grep 7681 >/dev/null 2>&1 || setsid -f ttyd -p 7681 -W bash

# 5. Start Web File Manager (filebrowser on port 8080)
which filebrowser >/dev/null 2>&1 || (
    curl -fsSL https://raw.githubusercontent.com/filebrowser/get/master/get.sh | sudo bash
)
ss -tulpn | grep 8080 >/dev/null 2>&1 || setsid -f filebrowser -r "$HOME" -p 8080 -a 0.0.0.0 --noauth

# 6. Start Bridge API Server (Port 8888)
pkill -f "python3.*server.py" || true
nohup python3 "$DIR/server.py" > /home/darkvirgoyt/bridge_server.log 2>&1 &
echo "[*] Bridge API Server started on port 8888."

# 7. Generate Live Public Tunnels
echo "[*] Establishing live public tunnels for multi-device access..."
bash "$DIR/scripts/start_tunnels.sh"

echo "=============================================================================="
echo "[SUCCESS] VirgoX Cloud Computer is online and ready!"
echo "=============================================================================="

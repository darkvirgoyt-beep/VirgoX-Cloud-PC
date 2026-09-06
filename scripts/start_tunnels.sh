#!/usr/bin/env bash
# ==============================================================================
# VirgoX Multi-Device Tunnel Generator
# ==============================================================================
set -e

echo "[*] Generating public HTTPS links for Desktop & Terminal..."

# Desktop Tunnel (port 3000)
pkill -f "a.pinggy.io.*3000" || true
nohup ssh -p 443 -R0:localhost:3000 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 a.pinggy.io > /home/darkvirgoyt/pinggy_desktop.log 2>&1 &

# Terminal Tunnel (port 7681)
pkill -f "a.pinggy.io.*7681" || true
nohup ssh -p 443 -R0:localhost:7681 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 a.pinggy.io > /home/darkvirgoyt/pinggy_terminal.log 2>&1 &

sleep 4

DESKTOP_URL=$(cat /home/darkvirgoyt/pinggy_desktop.log | grep -E "https://.*\.link" | tail -n 1)
TERMINAL_URL=$(cat /home/darkvirgoyt/pinggy_terminal.log | grep -E "https://.*\.link" | tail -n 1)

echo "------------------------------------------------------------------------------"
echo "  🖥️  Phone 2 (DESKTOP GUI):  $DESKTOP_URL"
echo "  💻 Phone 1 (TERMINAL CLI): $TERMINAL_URL"
echo "------------------------------------------------------------------------------"

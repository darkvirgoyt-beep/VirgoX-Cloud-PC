#!/usr/bin/env python3
"""
⚡ VirgoX Cloud Computer — Bridge API Server
Enables remote web control, mouse movements, screen capture, and window management.
Developer: Prince · VirgoYT (@darkvirgoyt-beep)
"""

import json
import os
import socket
import subprocess
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

PORT = 8888
CONTAINER_NAME = "virgox-desktop"
UDP_INPUT_TARGET = ("172.17.0.2", 9999)
_udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

def send_native_input(payload):
    try:
        _udp_sock.sendto(json.dumps(payload).encode("utf-8"), UDP_INPUT_TARGET)
        return True
    except Exception:
        return False

def run_container_cmd(cmd, user="abc"):
    full_cmd = f"docker exec -u {user} -e DISPLAY=:1 {CONTAINER_NAME} {cmd}"
    try:
        res = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=5)
        return res.returncode, res.stdout, res.stderr
    except Exception as e:
        return -1, "", str(e)

def get_memory_data():
    mem_path = "/home/darkvirgoyt/virgox_memory.json"
    if os.path.exists(mem_path):
        try:
            with open(mem_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def handle_ai_command(msg):
    m = msg.strip().lower()
    action_taken = None
    
    # 1. Direct Bash command ($ or run ...)
    if msg.strip().startswith("$") or msg.strip().startswith("run ") or msg.strip().startswith("exec "):
        raw_cmd = msg.strip()
        if raw_cmd.startswith("$"):
            raw_cmd = raw_cmd[1:].strip()
        elif raw_cmd.startswith("run "):
            raw_cmd = raw_cmd[4:].strip()
        elif raw_cmd.startswith("exec "):
            raw_cmd = raw_cmd[5:].strip()
            
        try:
            res = subprocess.run(raw_cmd, shell=True, capture_output=True, text=True, timeout=15)
            out = res.stdout + res.stderr
            action_taken = f"Executed: {raw_cmd}"
            reply = f"**⚡ Terminal Output (`{raw_cmd}`):**\n```bash\n{out.strip() if out.strip() else '[Command completed with no output]'}\n```"
        except Exception as e:
            reply = f"❌ Error executing `{raw_cmd}`: {str(e)}"
        return reply, action_taken

    # 2. App Launch commands
    app_map = {
        "chrome": ("chromium --new-window https://google.com &", "Google Chrome"),
        "browser": ("chromium --new-window https://google.com &", "Google Chrome"),
        "cmd": ("xfce4-terminal --title='Command Prompt' -e /usr/local/bin/cmd &", "Command Prompt"),
        "powershell": ("xfce4-terminal --title='Windows PowerShell' -e /usr/local/bin/powershell &", "Windows PowerShell"),
        "files": ("thunar /config/Desktop/VirgoX-Files &", "Files / This PC"),
        "playstore": ("chromium --new-window --app=https://play.google.com/store &", "Google Play Store"),
        "ms_store": ("chromium --new-window --app=https://apps.microsoft.com &", "Microsoft Store"),
        "github": ("chromium --new-window --app=https://github.com/darkvirgoyt-beep &", "GitHub"),
        "rom_builder": ("xfce4-terminal --title='⚡ VirgoX ROM Builder' -e 'bash /config/Desktop/VirgoX-Files/monitor_build.sh' &", "VirgoX ROM Builder"),
        "youtube": ("chromium --new-window https://youtube.com &", "YouTube")
    }
    
    for k, (cmd, name) in app_map.items():
        if f"open {k}" in m or f"launch {k}" in m or m == k:
            run_container_cmd(cmd)
            action_taken = f"Launched {name}"
            return f"🚀 Launched **{name}** on your Cloud Desktop!", action_taken

    # 3. Desktop Refresh
    if "refresh" in m or "reload desktop" in m:
        run_container_cmd("/usr/local/bin/refresh-desktop", user="abc")
        return "🔄 Cloud Desktop has been refreshed and icon grid updated!", "Desktop refreshed"

    # 4. Status & Open Windows
    if "status" in m or "specs" in m or "info" in m or "check" in m:
        code, out, _ = run_container_cmd("wmctrl -l")
        windows = [line.strip() for line in out.splitlines() if line.strip()]
        win_list = "\n".join([f"- `{w}`" for w in windows]) if windows else "- *No open application windows*"
        mem_info = get_memory_data()
        reply = (
            f"### ⚡ VirgoX Cloud Computer — System Status\n"
            f"- **Container:** `virgox-desktop` (Online)\n"
            f"- **Cloud RAM:** 8 GB | **vCPUs:** 2 (Intel Xeon)\n"
            f"- **Display Resolution:** 1600x720 (Phone 20:9 Mode)\n"
            f"- **Input Driver:** Sub-millisecond Native X11 UDP Driver (Active)\n"
            f"- **Active Windows ({len(windows)}):**\n{win_list}\n\n"
            f"💡 *Tip: Type `open chrome`, `open cmd`, `open powershell`, or `$ <command>` to run anything.*"
        )
        return reply, "Status checked"

    # 5. History / Past Chats
    if "history" in m or "old chat" in m or "past chat" in m or "previous chat" in m:
        mem_data = get_memory_data()
        sessions = mem_data.get("chat_sessions", [])
        lines = ["### 📜 Past Chat History & Sessions:\n"]
        for s in sessions:
            lines.append(f"**Session `{s.get('id', '')[:8]}` ({s.get('time', '')})**: **{s.get('title', '')}**\n- *Summary:* {s.get('summary', '')}\n")
        lines.append("📁 *All full logs are saved in `/home/darkvirgoyt/.gemini/antigravity-cli/brain/`.*")
        return "\n".join(lines), "History loaded"

    # 6. Memory & Phone Specs
    if "memory" in m or "phone" in m or "moto" in m or "fogos" in m or "rom" in m:
        mem_data = get_memory_data()
        devs = mem_data.get("target_devices", [])
        d = devs[0] if devs else {}
        reply = (
            f"### 🧠 VirgoX System Memory & Phone Specs\n"
            f"- **Device:** {d.get('model', 'Motorola Moto G45 5G / G34 5G')}\n"
            f"- **Codename:** `{d.get('codename', 'fogos')}`\n"
            f"- **SoC:** {d.get('chipset', 'Snapdragon 695 5G SM6375')}\n"
            f"- **Display:** {d.get('display', '720x1600 120Hz')}\n"
            f"- **ROM Project:** `{mem_data.get('custom_rom', {}).get('name', 'VirgoX Elite Gaming OS')}`\n"
            f"- **Local Manifest:** `{mem_data.get('custom_rom', {}).get('manifest', '/home/darkvirgoyt/virgox_fogos.xml')}`\n"
            f"- **Fastboot Out:** `/home/darkvirgoyt/virgox_fastboot_out/`"
        )
        return reply, "Memory loaded"

    # 7. Trackpad vs Touch Mode Help
    if "trackpad" in m or "touch" in m or "mouse" in m:
        reply = (
            "### 🖱️ Touchpad vs Direct Touch Mode\n"
            "- **Trackpad Mode (Recommended):** Drag anywhere on screen to glide the cursor without blocking buttons with your finger. Tap anywhere to click at cursor. Two fingers to scroll.\n"
            "- **Direct Touch Mode:** Tap directly on screen elements like a mobile touch screen.\n"
            "👉 Toggle modes instantly using the **`🖱️ Touchpad: ON/OFF`** button or the on-screen mode pill!"
        )
        return reply, "Touchpad info"

    # 8. Help
    if "help" in m:
        reply = (
            "### ⚡ VirgoX AI Copilot Commands:\n"
            "- `open chrome` / `open cmd` / `open powershell` / `open files` / `open youtube`\n"
            "- `$ <any bash command>` — Execute any shell command on your Cloud PC!\n"
            "- `status` — View container uptime, RAM, and active windows\n"
            "- `refresh` — Refresh desktop icons & layout\n"
            "- `history` — Browse all past chat sessions\n"
            "- `memory` — Show Moto G45/G34 specs and ROM details\n"
            "- `trackpad` — Information on switching input modes"
        )
        return reply, "Help loaded"

    # 9. Conversational default
    return (
        f"🤖 **VirgoX AI Copilot**: I received your message: *\"{msg}\"*\n\n"
        f"I can run commands, launch apps, manage your Cloud PC desktop, or look up ROM build files for your Moto G45 5G (`fogos`).\n"
        f"Type `help` to see what I can do, or start with `$ <command>` to run any terminal instruction!"
    ), None

class BridgeHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/status":
            code, out, _ = run_container_cmd("wmctrl -l")
            windows = [line.strip() for line in out.splitlines() if line.strip()]
            data = {
                "status": "online",
                "container": CONTAINER_NAME,
                "uptime": time.time(),
                "active_windows": windows
            }
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode("utf-8"))

        elif path == "/api/screenshot":
            # Capture screenshot
            run_container_cmd("scrot -o /config/Desktop/VirgoX-Files/current_screen.png", user="abc")
            img_path = "/home/darkvirgoyt/current_screen.png"
            if os.path.exists(img_path):
                with open(img_path, "rb") as f:
                    img_data = f.read()
                self.send_response(200)
                self._send_cors()
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(img_data)))
                self.end_headers()
                self.wfile.write(img_data)
            else:
                self.send_response(404)
                self._send_cors()
                self.end_headers()

        elif path == "/api/chats_history":
            mem_data = get_memory_data()
            sessions = mem_data.get("chat_sessions", [])
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "sessions": sessions}).encode("utf-8"))

        elif path == "/api/memory":
            mem_data = get_memory_data()
            self.send_response(200)
            self._send_cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(mem_data).encode("utf-8"))

        else:
            self.send_response(404)
            self._send_cors()
            self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == "/api/mouse_move":
            dx = int(payload.get("dx", 0))
            dy = int(payload.get("dy", 0))
            if not send_native_input({"action": "move", "dx": dx, "dy": dy}):
                run_container_cmd(f"xdotool mousemove_relative -- {dx} {dy}")
            self._respond_ok({"moved": [dx, dy]})

        elif path == "/api/mouse_click":
            btn = int(payload.get("button", 1))
            is_double = bool(payload.get("double", False))
            if not send_native_input({"action": "click", "button": btn, "double": is_double}):
                if is_double:
                    run_container_cmd(f"xdotool click --repeat 2 --delay 100 {btn}")
                else:
                    run_container_cmd(f"xdotool click {btn}")
            self._respond_ok({"clicked": btn})

        elif path == "/api/mouse_drag":
            state = payload.get("state", "up")
            if not send_native_input({"action": "drag", "state": state}):
                action = "mousedown" if state == "down" else "mouseup"
                run_container_cmd(f"xdotool {action} 1")
            self._respond_ok({"drag_state": state})

        elif path == "/api/mouse_scroll":
            direction = payload.get("direction", "down")
            steps = int(payload.get("steps", 1))
            if not send_native_input({"action": "scroll", "direction": direction, "steps": steps}):
                btn = 4 if direction == "up" else 5
                run_container_cmd(f"xdotool click --repeat {steps} {btn}")
            self._respond_ok({"scrolled": direction, "steps": steps})

        elif path == "/api/type":
            text = payload.get("text", "")
            if text:
                escaped = text.replace('"', '\\"').replace("'", "\\'")
                run_container_cmd(f'xdotool type --delay 12 -- "{escaped}"')
            self._respond_ok({"typed": len(text)})

        elif path == "/api/resolution":
            width = payload.get("width")
            height = payload.get("height")
            mode = payload.get("mode", "")
            if width and height:
                run_container_cmd(f"setres {int(width)} {int(height)}")
                res_str = f"{width}x{height}"
            elif mode:
                run_container_cmd(f"setres {mode}")
                res_str = mode
            else:
                run_container_cmd("setres 1600 720")
                res_str = "1600x720"
            self._respond_ok({"resolution": res_str})

        elif path == "/api/launch":
            app = payload.get("app", "")
            if app == "chrome":
                run_container_cmd("chromium --new-window https://google.com &")
            elif app == "files":
                run_container_cmd("thunar /config/Desktop/VirgoX-Files &")
            elif app == "taskmgr":
                run_container_cmd("xfce4-taskmanager &")
            elif app == "adb":
                run_container_cmd("xfce4-terminal -e 'adb devices' &")
            elif app == "ms_store":
                run_container_cmd("chromium --new-window --app=https://apps.microsoft.com &")
            elif app == "playstore":
                run_container_cmd("chromium --new-window --app=https://play.google.com/store &")
            elif app == "github":
                run_container_cmd("chromium --new-window --app=https://github.com/darkvirgoyt-beep &")
            elif app == "cmd":
                run_container_cmd("xfce4-terminal --title='Command Prompt' -e /usr/local/bin/cmd &")
            elif app == "powershell":
                run_container_cmd("xfce4-terminal --title='Windows PowerShell' -e /usr/local/bin/powershell &")
            elif app == "rom_builder":
                run_container_cmd("xfce4-terminal --title='⚡ VirgoX ROM Builder' -e 'bash /config/Desktop/VirgoX-Files/monitor_build.sh' &")
            elif app == "ms_office":
                run_container_cmd("chromium --new-window --app=https://www.office.com &")
            elif app == "flathub":
                run_container_cmd("chromium --new-window --app=https://flathub.org/apps &")
            elif app == "synaptic":
                run_container_cmd("synaptic &")
            self._respond_ok({"launched": app})

        elif path == "/api/focus_window":
            win_id = payload.get("window_id", "")
            if win_id:
                run_container_cmd(f"wmctrl -ia {win_id}")
            self._respond_ok({"focused": win_id})

        elif path == "/api/refresh_desktop":
            run_container_cmd("/usr/local/bin/refresh-desktop", user="abc")
            self._respond_ok({"refreshed": True})

        elif path == "/api/key":
            key = payload.get("key", "")
            if key:
                run_container_cmd(f"xdotool key {key}")
            self._respond_ok({"key_pressed": key})

        elif path == "/api/term_key":
            key = payload.get("key", "")
            key_map = {
                "ctrl-c": "ctrl+c",
                "tab": "Tab",
                "arrow-up": "Up",
                "arrow-down": "Down",
                "enter": "Return",
                "clear": "ctrl+l"
            }
            if key in key_map:
                run_container_cmd(f"xdotool key {key_map[key]}")
            self._respond_ok({"sent_key": key})

        elif path == "/api/ai_chat":
            msg = payload.get("message", "").strip()
            reply, action = handle_ai_command(msg)
            self._respond_ok({"reply": reply, "action": action, "timestamp": time.time()})

        elif path == "/api/exec":
            cmd = payload.get("cmd", "")
            in_container = bool(payload.get("in_container", False))
            if in_container:
                code, out, err = run_container_cmd(cmd)
            else:
                try:
                    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
                    code, out, err = res.returncode, res.stdout, res.stderr
                except Exception as e:
                    code, out, err = -1, "", str(e)
            self._respond_ok({"output": out, "error": err, "code": code})

        elif path == "/api/save_memory":
            note = payload.get("note", "").strip()
            mem_path = "/home/darkvirgoyt/virgox_memory.json"
            if note and os.path.exists(mem_path):
                try:
                    with open(mem_path, "r", encoding="utf-8") as f:
                        mem_data = json.load(f)
                    if "user_notes" not in mem_data:
                        mem_data["user_notes"] = []
                    mem_data["user_notes"].append({
                        "note": note,
                        "time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
                    })
                    with open(mem_path, "w", encoding="utf-8") as f:
                        json.dump(mem_data, f, indent=2)
                except Exception:
                    pass
            self._respond_ok({"saved": True})

        else:
            self.send_response(404)
            self._send_cors()
            self.end_headers()

    def _respond_ok(self, data):
        self.send_response(200)
        self._send_cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

def main():
    server = HTTPServer(("0.0.0.0", PORT), BridgeHandler)
    print(f"[*] VirgoX Bridge API Server listening on port {PORT}...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()

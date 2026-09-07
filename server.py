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

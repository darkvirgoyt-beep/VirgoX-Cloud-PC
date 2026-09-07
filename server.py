#!/usr/bin/env python3
"""
⚡ VirgoX Cloud Computer — Bridge API Server
Enables remote web control, mouse movements, screen capture, and window management.
Developer: Prince · VirgoYT (@darkvirgoyt-beep)
"""

import hashlib
import json
import os
import random
import secrets
import socket
import subprocess
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

PORT = 8888
CONTAINER_NAME = "virgox-desktop"
UDP_INPUT_TARGET = ("172.17.0.2", 9999)
AUTH_FILE = "/home/darkvirgoyt/virgox_auth.json"
OTP_LOG_FILE = "/home/darkvirgoyt/otp_codes.log"
_active_otps = {}  # {email: {"otp": code, "expires": timestamp, "attempts": count}}
_setup_otps = {}   # {email: {"otp": code, "expires": timestamp, "attempts": count}}
_udp_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

def hash_password(password, salt=None):
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"{salt}:{hashed}"

def verify_password(stored_hash, password):
    try:
        salt, hashed = stored_hash.split(":")
        return hashlib.sha256((salt + password).encode("utf-8")).hexdigest() == hashed
    except Exception:
        return False

def get_auth_data():
    if os.path.exists(AUTH_FILE):
        try:
            with open(AUTH_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_auth_data(data):
    try:
        with open(AUTH_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception:
        return False

def mask_email(email):
    if not email or "@" not in email:
        return email
    user, domain = email.split("@", 1)
    if len(user) <= 2:
        masked_user = user[0] + "*"
    else:
        masked_user = user[:2] + "*" * (len(user) - 2)
    return f"{masked_user}@{domain}"

def send_otp_email(to_email, otp_code):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    log_entry = f"[{timestamp}] OTP for {to_email}: {otp_code}\n"
    try:
        with open(OTP_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_entry)
    except Exception:
        pass
    
    # Send desktop notification to Cloud PC container if online
    try:
        run_container_cmd(f'notify-send -u critical "⚡ VirgoX Security OTP" "Reset Code: {otp_code} for {to_email}"')
    except Exception:
        pass
        
    # Optional SMTP delivery if environment is configured
    smtp_host = os.environ.get("SMTP_HOST")
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    if smtp_host and smtp_user and smtp_pass:
        try:
            import smtplib
            from email.mime.text import MIMEText
            msg = MIMEText(f"Your VirgoX Cloud PC Password Reset OTP is: {otp_code}\\n\\nThis code expires in 10 minutes.\\nIf you did not request this, please ignore this email.")
            msg["Subject"] = "⚡ VirgoX Cloud Computer — Password Reset OTP"
            msg["From"] = smtp_user
            msg["To"] = to_email
            with smtplib.SMTP(smtp_host, smtp_port, timeout=5) as s:
                s.starttls()
                s.login(smtp_user, smtp_pass)
                s.send_message(msg)
        except Exception as e:
            print(f"SMTP error: {e}")
            
    return True


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

        elif path == "/api/auth/status":
            auth_data = get_auth_data()
            configured = bool(auth_data.get("password_hash"))
            email = auth_data.get("email", "")
            self._respond_ok({
                "configured": configured,
                "email": mask_email(email),
                "raw_email": email if configured else "",
                "ai_bypass": True
            })

        # Static web app files serving
        static_dir = os.path.abspath(os.path.dirname(__file__))
        rel_path = path.lstrip("/")
        if not rel_path or rel_path == "index.html":
            rel_path = "index.html"
        file_path = os.path.join(static_dir, rel_path)
        if os.path.commonpath([static_dir, os.path.abspath(file_path)]) == static_dir and os.path.isfile(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            mime_types = {
                ".html": "text/html; charset=utf-8",
                ".js": "application/javascript",
                ".css": "text/css",
                ".json": "application/json",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".ico": "image/x-icon",
            }
            content_type = mime_types.get(ext, "application/octet-stream")
            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self._send_cors()
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except Exception:
                pass

        self.send_response(404)
        self._send_cors()
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))

        if path == "/api/upload":
            qs = parse_qs(parsed.query)
            filename = qs.get("filename", ["uploaded_file"])[0]
            safe_name = os.path.basename(filename)
            upload_dir = "/home/darkvirgoyt/scratch"
            os.makedirs(upload_dir, exist_ok=True)
            target_path = os.path.join(upload_dir, safe_name)
            data = self.rfile.read(length) if length > 0 else b""
            with open(target_path, "wb") as f:
                f.write(data)
            prebuilt_dir = "/home/darkvirgoyt/VirgoX-Elite-GamingOS-Rom-Motorola-G45-FogOs/prebuilt"
            if os.path.exists(prebuilt_dir):
                import shutil
                try:
                    shutil.copy2(target_path, os.path.join(prebuilt_dir, safe_name))
                except Exception:
                    pass
            self._respond_ok({"status": "uploaded", "filename": safe_name, "bytes": len(data), "path": target_path})
            return

        body = self.rfile.read(length).decode("utf-8", errors="replace") if length > 0 else "{}"
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

        elif path == "/api/auth/send_setup_otp":
            email = payload.get("email", "").strip().lower()
            if not email or "@" not in email:
                self._respond_error("Please enter a valid email address")
                return
            otp_code = str(random.randint(100000, 999999))
            _setup_otps[email] = {
                "otp": otp_code,
                "expires": time.time() + 600,
                "attempts": 0
            }
            send_otp_email(email, otp_code)
            self._respond_ok({
                "status": "ok",
                "message": f"Verification code sent to {mask_email(email)}",
                "email": mask_email(email),
                "otp_hint": otp_code
            })

        elif path == "/api/auth/verify_setup_and_set_password":
            email = payload.get("email", "").strip().lower()
            otp_in = str(payload.get("otp", "")).strip()
            password = payload.get("password", "").strip()
            if not email or "@" not in email:
                self._respond_error("Invalid email address")
                return
            if not password or len(password) < 4:
                self._respond_error("Password must be at least 4 characters long")
                return
            entry = _setup_otps.get(email)
            if not entry:
                self._respond_error("No verification code found. Please tap 'Send Code' first.")
                return
            if time.time() > entry["expires"]:
                del _setup_otps[email]
                self._respond_error("Verification code has expired. Please request a new one.")
                return
            if entry["otp"] != otp_in:
                entry["attempts"] += 1
                if entry["attempts"] >= 5:
                    del _setup_otps[email]
                    self._respond_error("Too many failed attempts. Please request a new code.")
                else:
                    self._respond_error("Invalid verification code. Please check and re-enter.")
                return
            del _setup_otps[email]
            auth_data = {
                "email": email,
                "password_hash": hash_password(password),
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
            }
            save_auth_data(auth_data)
            self._respond_ok({
                "status": "ok",
                "message": "Email verified & Master Password activated successfully!",
                "email": mask_email(email)
            })

        elif path == "/api/auth/setup":
            email = payload.get("email", "").strip()
            password = payload.get("password", "").strip()
            if not email or not password:
                self._respond_error("Email and password are required")
                return
            auth_data = {
                "email": email,
                "password_hash": hash_password(password),
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
            }
            save_auth_data(auth_data)
            self._respond_ok({
                "status": "ok",
                "message": "Security passcode configured successfully",
                "email": mask_email(email)
            })

        elif path == "/api/auth/login":
            password = payload.get("password", "").strip()
            auth_data = get_auth_data()
            if not auth_data.get("password_hash"):
                self._respond_error("Passcode not configured yet")
                return
            if verify_password(auth_data["password_hash"], password):
                token = secrets.token_hex(24)
                self._respond_ok({
                    "status": "ok",
                    "message": "Access granted",
                    "token": token,
                    "email": mask_email(auth_data.get("email", ""))
                })
            else:
                self._respond_error("Incorrect passcode. Try again or tap Reset.")

        elif path == "/api/auth/send_otp":
            auth_data = get_auth_data()
            email = auth_data.get("email", "").strip()
            if not email:
                email = payload.get("email", "").strip()
            if not email:
                self._respond_error("No registered email found. Please complete setup first.")
                return
            otp_code = str(random.randint(100000, 999999))
            _active_otps[email.lower()] = {
                "otp": otp_code,
                "expires": time.time() + 600,
                "attempts": 0
            }
            send_otp_email(email, otp_code)
            self._respond_ok({
                "status": "ok",
                "message": f"6-digit OTP sent to {mask_email(email)}",
                "email": mask_email(email),
                "otp_hint": otp_code
            })

        elif path == "/api/auth/verify_otp":
            otp_in = str(payload.get("otp", "")).strip()
            auth_data = get_auth_data()
            email = auth_data.get("email", "").strip().lower()
            if not email:
                email = str(payload.get("email", "")).strip().lower()
            otp_entry = _active_otps.get(email)
            if not otp_entry:
                self._respond_error("No active OTP request found. Tap 'Resend OTP'.")
                return
            if time.time() > otp_entry["expires"]:
                del _active_otps[email]
                self._respond_error("OTP has expired. Please request a new one.")
                return
            if otp_entry["otp"] != otp_in:
                otp_entry["attempts"] += 1
                if otp_entry["attempts"] >= 5:
                    del _active_otps[email]
                    self._respond_error("Too many failed attempts. Please request a new OTP.")
                else:
                    self._respond_error("Invalid OTP code. Please check and try again.")
                return
            self._respond_ok({"status": "ok", "message": "OTP verified successfully"})

        elif path == "/api/auth/reset_password":
            otp_in = str(payload.get("otp", "")).strip()
            new_pass = payload.get("new_password", "").strip()
            if not new_pass or len(new_pass) < 4:
                self._respond_error("New password must be at least 4 characters")
                return
            auth_data = get_auth_data()
            email = auth_data.get("email", "").strip().lower()
            if not email:
                email = str(payload.get("email", "")).strip().lower()
            otp_entry = _active_otps.get(email)
            if not otp_entry or otp_entry["otp"] != otp_in or time.time() > otp_entry["expires"]:
                self._respond_error("Invalid or expired OTP session. Please request a new OTP.")
                return
            del _active_otps[email]
            auth_data["email"] = email
            auth_data["password_hash"] = hash_password(new_pass)
            auth_data["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
            save_auth_data(auth_data)
            self._respond_ok({"status": "ok", "message": "Password updated successfully. You can now unlock."})

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

    def _respond_error(self, message, code=400):
        self.send_response(code)
        self._send_cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "error", "message": message}).encode("utf-8"))

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

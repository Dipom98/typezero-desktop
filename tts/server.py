import os
import sys
import subprocess
import importlib.util
import tempfile
import time
import shutil
from flask import Flask, request, send_file, jsonify

app = Flask(__name__)

# Base directory for models (matches Rust ModelManager)
# On macOS: ~/Library/Application Support/typezero/models
if sys.platform == "darwin":
    MODELS_DIR = os.path.expanduser("~/Library/Application Support/typezero/models")
else:
    # Fallback/Default
    MODELS_DIR = os.path.join(os.getcwd(), "models")

def install_deps():
    deps = ["flask", "pyttsx3"] 
    missing = []
    for dep in deps:
        pkg = dep.split("==")[0]
        if importlib.util.find_spec(pkg) is None:
            missing.append(dep)
            
    if missing:
        print(f"[*] Missing dependencies found. Installing {missing}...", flush=True)
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
            print("[*] Installation successful. Rebooting script.", flush=True)
            os.execv(sys.executable, ['python3'] + sys.argv)
        except Exception as e:
            print(f"[!] Auto-install failed: {e}", flush=True)

# Try pyttsx3 import after install_deps
try:
    import pyttsx3
except ImportError:
    install_deps()
    import pyttsx3

@app.route('/speak', methods=['POST'])
def speak():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Missing JSON body"}), 400
            
        text = data.get('text', '')
        voice_id = data.get('voice', '')
        speed = float(data.get('speed', 1.0))
        model_id = data.get('model_id', '')

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Determine engine
        engine_type = "native"
        if model_id:
             if "piper" in model_id.lower():
                 engine_type = "piper"
             elif "xtts" in model_id.lower():
                 engine_type = "xtts"

        print(f"[*] Processing ({engine_type} | {model_id}): {text[:50]}...", flush=True)

        # Generate unique temp file
        temp_dir = tempfile.gettempdir()
        temp_wav = os.path.join(temp_dir, f"tz_tts_{int(time.time())}.wav")

        if engine_type == "native":
            engine = pyttsx3.init()
            
            # macOS specific voice selection
            if voice_id:
                voices = engine.getProperty('voices')
                for v in voices:
                    if voice_id.lower() in v.id.lower() or voice_id.lower() in v.name.lower():
                        engine.setProperty('voice', v.id)
                        break

            # Adjust speed (pyttsx3 uses words per minute, default is ~200)
            rate = engine.getProperty('rate')
            engine.setProperty('rate', int(rate * speed))

            engine.save_to_file(text, temp_wav)
            engine.runAndWait()
            del engine
        elif engine_type == "piper":
            # Piper logic placeholder (to be fully integrated with ONNX runtime if downloaded)
            # For now, if someone selected it but didn't actually download, we should fallback or error
            # Check if .onnx file exists in MODELS_DIR
            return jsonify({"error": "Piper engine not yet fully wired in Python. Please use Native for now."}), 501
        else:
            return jsonify({"error": f"Engine {engine_type} not implemented yet"}), 501

        # Check if file was actually created and has content
        for _ in range(5):
            if os.path.exists(temp_wav) and os.path.getsize(temp_wav) > 0:
                break
            time.sleep(0.1)

        if not os.path.exists(temp_wav) or os.path.getsize(temp_wav) == 0:
            return jsonify({"error": "Failed to generate audio file"}), 500

        return send_file(
            temp_wav, 
            mimetype="audio/wav", 
            as_attachment=True, 
            download_name="speech.wav"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "status": "ready",
        "models_dir": MODELS_DIR,
        "voices": ["system_default"]
    })

if __name__ == '__main__':
    print(f"[*] Starting TypeZero Speech Server...", flush=True)
    print(f"[*] Models Directory: {MODELS_DIR}", flush=True)
    app.run(port=5002, host='127.0.0.1')

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

# Ensure models directory exists to prevent [Errno 2]
os.makedirs(MODELS_DIR, exist_ok=True)

def install_deps():
    deps = ["flask", "pyttsx3", "piper-tts"] 
    missing = []
    for dep in deps:
        pkg = dep.split("==")[0]
        # Some packages have different import names
        import_name = pkg
        if pkg == "piper-tts": import_name = "piper"
        
        if importlib.util.find_spec(import_name) is None:
            missing.append(dep)
            
    if missing:
        print(f"[*] Missing dependencies found. Installing {missing}...", flush=True)
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
            print("[*] Installation successful. Rebooting script.", flush=True)
            os.execv(sys.executable, [sys.executable] + sys.argv)
        except Exception as e:
            print(f"[!] Auto-install failed: {e}", flush=True)

# Try imports after potentially installing
try:
    import flask
    import pyttsx3
except ImportError:
    install_deps()
    import flask
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
            import wave
            try:
                from piper.voice import PiperVoice
            except ImportError:
                return jsonify({"error": "Piper library not available. Please wait for auto-install."}), 500

            # Find the ONNX model file
            # The model_id in settings is something like "piper-en-joy-medium"
            # The Rust ModelManager definition has the filename e.g. "en_US-joy-medium.onnx"
            # But the speak command usually sends the ID or the filename? 
            # Looking at commands/tts.rs: "model_id": settings.selected_tts_model
            # So it's the ID.
            
            # Find the ONNX model file
            onnx_path = None
            
            # Diagnostic Data
            print(f"[*] Resolving Piper Model: ID={model_id}", flush=True)
            print(f"[*] Models Directory: {MODELS_DIR}", flush=True)

            # 1. Direct match with .onnx extension (the ID is usually the filename without extension)
            direct_path = os.path.join(MODELS_DIR, f"{model_id}.onnx")
            if os.path.exists(direct_path):
                onnx_path = direct_path
                print(f"[+] Direct path match: {onnx_path}", flush=True)
            
            # 2. Search directory for partial match or ID match inside path
            if not onnx_path:
                print(f"[*] Direct match failed, scanning {MODELS_DIR}...", flush=True)
                for f in os.listdir(MODELS_DIR):
                    if f.endswith(".onnx") and (model_id.lower() in f.lower() or f.lower().replace(".onnx", "") in model_id.lower()):
                        onnx_path = os.path.join(MODELS_DIR, f)
                        print(f"[+] Found model via scan: {onnx_path}", flush=True)
                        break
            
            if not onnx_path:
                error_msg = f"Piper model {model_id} not found in {MODELS_DIR}. Files present: {os.listdir(MODELS_DIR)}"
                print(f"[!] {error_msg}", flush=True)
                return jsonify({"error": error_msg}), 404

            print(f"[*] Loading Piper model: {onnx_path}", flush=True)
            voice = PiperVoice.load(onnx_path)
            
            with wave.open(temp_wav, "wb") as wav_file:
                voice.synthesize(text, wav_file)
            
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

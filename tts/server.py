import os
import sys
import traceback
from flask import Flask, request, send_file, make_response
from TTS.api import TTS
import torch

app = Flask(__name__)

# Choose device: cuda > mps (macOS) > cpu
device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
if torch.backends.mps.is_available():
    device = "mps"

print(f"[*] Starting TypeZero TTS on {device}...", flush=True)

# Global model instance
tts = None

try:
    model_name = "tts_models/en/vctk/vits"
    # Load model once on startup
    tts = TTS(model_name).to(device)
    print(f"[*] TTS Model {model_name} loaded successfully", flush=True)
except Exception as e:
    print(f"[!] Critical Error during model loading: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)

@app.errorhandler(Exception)
def handle_exception(e):
    """Global error handler to capture and return tracebacks"""
    tb = traceback.format_exc()
    print(f"[!] Server Error:\n{tb}", flush=True)
    # Return as plain text so it shows up clearly in the UI toast
    return f"TTS Server Error:\n{tb}", 500

@app.route("/speak", methods=["POST"])
def speak():
    # Force JSON parsing regardless of content-type
    data = request.get_json(force=True)
    if not data:
        return "Missing JSON body", 400
        
    text = data.get("text", "")
    voice = data.get("voice", "p225")
    speed = data.get("speed", 1.0)

    if not text:
        return "Text is required", 400

    # Ensure speaker selection is valid for multi-speaker models
    speaker = None
    if tts.is_multi_speaker:
        if not voice or voice == "default":
            voice = "p225"
            
        if voice in tts.speakers:
            speaker = voice
        else:
            # Fallback to p225 (famous VCTK voice) or first available
            speaker = "p225" if "p225" in tts.speakers else tts.speakers[0]
            print(f"[*] Speaker '{voice}' not found, falling back to '{speaker}'", flush=True)
    
    # Use /tmp for reliable cross-process file access on macOS
    import tempfile
    output_path = os.path.join(tempfile.gettempdir(), f"typezero_tts_{os.getpid()}.wav")
    
    print(f"[*] Processing: {text[:50]}... [Speaker: {speaker}]", flush=True)

    # Generate audio
    # The 'speaker' argument is string ID for VITS
    tts.tts_to_file(
        text=text, 
        speaker=speaker, 
        file_path=output_path
    )
    
    if not os.path.exists(output_path):
        return "Audio generation failed: output file not found", 500

    # Return the file as an attachment
    response = make_response(send_file(output_path, mimetype="audio/wav"))
    response.headers['Content-Type'] = 'audio/wav'
    return response

@app.route("/voices", methods=["GET"])
def get_voices():
    if tts and tts.is_multi_speaker:
        return {"voices": tts.speakers}
    return {"voices": []}

@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok", "device": device, "model": model_name}

if __name__ == "__main__":
    # Internal server for local use only
    app.run(host="127.0.0.1", port=5002, debug=False)

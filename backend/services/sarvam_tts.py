"""Sarvam AI TTS — generates WAV audio → rhubarb lipsync → returns base64 MP3 + lipsync JSON."""
import os
import base64
import json
import subprocess
import tempfile
import httpx
from pathlib import Path

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

# Rhubarb binary path (relative to this file → ../backend/bin/rhubarb)
_HERE = Path(__file__).parent
RHUBARB_PATH = Path(os.getenv("RHUBARB_PATH", str(_HERE.parent / "bin" / "rhubarb")))
AUDIOS_DIR = _HERE.parent / "audios"


def _sarvam_tts(text: str) -> bytes:
    """Call Sarvam API and return raw WAV bytes."""
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": [text],
        "target_language_code": "en-IN",
        "speaker": "priya",
        "model": "bulbul:v3",
        "pace": 1.0,
        "enable_preprocessing": True
    }
    resp = httpx.post(SARVAM_TTS_URL, json=payload, headers=headers, timeout=120.0)
    resp.raise_for_status()
    data = resp.json()
    # Response: {"audios": ["<base64_wav>"]}
    audio_b64 = data["audios"][0]
    return base64.b64decode(audio_b64)


def _run_rhubarb(wav_path: Path, json_path: Path) -> None:
    """Run rhubarb to generate lipsync JSON from a WAV file."""
    if not RHUBARB_PATH.exists():
        raise FileNotFoundError(f"Rhubarb binary not found at {RHUBARB_PATH}")
    
    result = subprocess.run(
        [str(RHUBARB_PATH), "-f", "json", "-o", str(json_path), str(wav_path), "-r", "phonetic"],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        raise RuntimeError(f"Rhubarb failed: {result.stderr}")


def _wav_to_mp3(wav_path: Path, mp3_path: Path) -> None:
    """Convert WAV to MP3 using ffmpeg."""
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), str(mp3_path)],
        capture_output=True, timeout=30
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {result.stderr.decode()}")


def synthesize(text: str, filename_stem: str) -> dict:
    """
    Full pipeline: text → Sarvam TTS → WAV → rhubarb → lipsync JSON
                                              → ffmpeg → MP3 → base64

    Returns:
        {
            "audio": "<base64 MP3>",
            "lipsync": { mouthCues: [...] },
            "audio_url": "http://localhost:8000/audio/<filename>"
        }
    """
    AUDIOS_DIR.mkdir(exist_ok=True)

    wav_path = AUDIOS_DIR / f"{filename_stem}.wav"
    mp3_path = AUDIOS_DIR / f"{filename_stem}.mp3"
    json_path = AUDIOS_DIR / f"{filename_stem}.json"

    # Step 1: TTS
    wav_bytes = _sarvam_tts(text)
    wav_path.write_bytes(wav_bytes)

    # Step 2: Lipsync
    try:
        _run_rhubarb(wav_path, json_path)
        lipsync = json.loads(json_path.read_text())
    except Exception as e:
        print(f"⚠️ Rhubarb lipsync failed: {e} — using empty lipsync")
        lipsync = {"mouthCues": []}

    # Step 3: WAV → MP3
    try:
        _wav_to_mp3(wav_path, mp3_path)
        audio_b64 = base64.b64encode(mp3_path.read_bytes()).decode()
    except Exception as e:
        print(f"⚠️ ffmpeg conversion failed: {e} — returning WAV as base64")
        audio_b64 = base64.b64encode(wav_bytes).decode()

    return {
        "audio": audio_b64,
        "lipsync": lipsync,
        "audio_url": f"http://localhost:8000/audio/{filename_stem}.mp3"
    }

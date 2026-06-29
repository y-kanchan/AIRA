"""TTS router — ad-hoc text-to-speech endpoint."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import sarvam_tts
import uuid

router = APIRouter(prefix="/tts", tags=["tts"])


class TTSRequest(BaseModel):
    text: str


@router.post("")
async def synthesize_text(body: TTSRequest):
    """Convert arbitrary text to speech. Returns base64 audio + lipsync JSON."""
    if not body.text.strip():
        raise HTTPException(400, "Text cannot be empty")
    try:
        stem = f"tts_{uuid.uuid4().hex[:8]}"
        result = sarvam_tts.synthesize(body.text.strip(), stem)
        return result
    except Exception as e:
        raise HTTPException(500, f"TTS error: {e}")

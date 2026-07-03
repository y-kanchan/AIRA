"""
AI Interview System — FastAPI Backend
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load root .env (one level up)
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import interview, tts, auth, user

# ── Ensure runtime dirs exist ────────────────────────────────────────────────
AUDIOS_DIR = Path(__file__).parent / "audios"
AUDIOS_DIR.mkdir(exist_ok=True)

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Interview System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving
app.mount("/audio", StaticFiles(directory=str(AUDIOS_DIR)), name="audio")

# Routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(interview.router)
app.include_router(tts.router)

@app.on_event("startup")
async def startup_event():
    print("\n" + "="*60)
    print("🚀 AI INTERVIEW SERVER IS FULLY CONNECTED AND READY!")
    print("👉 Go to http://localhost:5174 in your browser to start.")
    
    print("🧹 Cleaning up lingering audio files from previous aborted sessions...")
    for file in AUDIOS_DIR.glob("*.*"):
        if "intro" not in file.name.lower():
            try:
                file.unlink()
            except Exception as e:
                print(f"⚠️ Failed to delete {file.name}: {e}")
                
    print("="*60 + "\n")

@app.get("/ping")
async def ping():
    print("🟢 Frontend connected successfully!")
    return {"status": "connected"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "AI Interview System"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

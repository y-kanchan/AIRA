"""Interview API router — upload, start, answer, report."""
import os
import uuid
import traceback
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime

from services import rag, sarvam_tts
from services.ollama_client import generate_avatar_response, generate_interview_questions
from services.auth_utils import get_current_user
from db import interviews_collection, users_collection
from bson import ObjectId

router = APIRouter(prefix="/interview", tags=["interview"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

MAX_INTERVIEW_QUESTIONS = int(os.getenv("MAX_INTERVIEW_QUESTIONS", 5))


# ── Upload & Ingest ───────────────────────────────────────────────────────────

@router.post("/upload-documents")
async def upload_documents(
    resume: Optional[UploadFile] = File(None),
    jd: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    github_url: Optional[str] = Form(None),
    material_ids: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user),
):
    """
    Accept resume PDF, JD (PDF or text), and GitHub URL, or existing material_ids.
    Extract text, ingest into ChromaDB, return session_id.
    """
    session_id = str(uuid.uuid4()).replace("-", "")[:16]

    try:
        documents_to_process = []

        # 0. Existing Materials
        if material_ids:
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            if user and "materials" in user:
                mat_ids = [m.strip() for m in material_ids.split(",") if m.strip()]
                for mat in user["materials"]:
                    if mat["id"] in mat_ids:
                        dt = mat["type"]
                        # Map type to our text inputs
                        if dt == "resume": documents_to_process.append({"doc_type": "resume_text", "content": mat["content"]})
                        elif dt == "jd": documents_to_process.append({"doc_type": "jd_text", "content": mat["content"]})
                        elif dt == "github": documents_to_process.append({"doc_type": "github_text", "content": mat["content"]})
                        print(f"📥 Queued Existing Material: {mat['name']}")

        # 1. Resume
        if resume and resume.filename:
            resume_path = UPLOADS_DIR / f"{session_id}_resume.pdf"
            resume_path.write_bytes(await resume.read())
            documents_to_process.append({"doc_type": "resume", "content": str(resume_path)})
            print(f"📥 Queued Resume: {resume_path.name}")

        # 2. JD
        if jd and jd.filename:
            jd_path = UPLOADS_DIR / f"{session_id}_jd.pdf"
            jd_path.write_bytes(await jd.read())
            documents_to_process.append({"doc_type": "jd_file", "content": str(jd_path)})
            print(f"📥 Queued JD file: {jd_path.name}")
        elif jd_text:
            documents_to_process.append({"doc_type": "jd_text", "content": jd_text})
            print("📥 Queued JD text.")

        # 3. GitHub (multiple links supported)
        if github_url and github_url.strip():
            urls = [u.strip() for u in github_url.split(",") if u.strip()]
            for url in urls:
                documents_to_process.append({"doc_type": "github", "content": url})
                print(f"📥 Queued GitHub: {url}")

        if not documents_to_process:
            raise HTTPException(400, "No documents provided.")

        print("🚀 Dispatching documents to parallel multi-agent graph...")
        from services.ingest_graph import ingest_graph
        
        # Run the multi-agent graph asynchronously
        final_state = await ingest_graph.ainvoke({
            "session_id": session_id,
            "documents": documents_to_process,
            "processed_docs": [],
            "context_summary": ""
        })

        context = final_state["context_summary"]

        # Persist context and user_id for graph initialization
        _session_contexts[session_id] = {
            "context": context,
            "user_id": user_id
        }

        return {
            "session_id": session_id,
            "message": "Documents processed by agents successfully",
            "agents_dispatched": len(documents_to_process)
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# In-memory session context store
_session_contexts: dict = {}


# ── Helper ────────────────────────────────────────────────────────────────────

def _synthesize_question(text: str, session_id: str, q_idx: int) -> dict:
    """Run TTS + rhubarb for a question. Returns audio + lipsync dicts."""
    try:
        stem = f"{session_id}_q{q_idx}"
        return sarvam_tts.synthesize(text, stem)
    except Exception as e:
        print(f"⚠️ TTS failed: {e}")
        return {"audio": None, "lipsync": {"mouthCues": []}, "audio_url": None}

async def pre_generate_initial_tts(session_id: str, initial_queue: list):
    """Background task to pre-generate TTS for the initial queue."""
    import asyncio
    for idx, q_obj in enumerate(initial_queue):
        print(f"🎙️ [Background] Pre-generating TTS for initial queue question {idx+1}...")
        try:
            stem = f"{session_id}_init_q{idx+1}"
            # Run the synchronous blocking TTS generation in a background thread to prevent event loop freezing
            audio_data = await asyncio.to_thread(sarvam_tts.synthesize, q_obj["question"], stem)
            
            # Atomically update only this specific question in the array if it still exists
            await interviews_collection.update_one(
                {
                    "session_id": session_id,
                    "question_queue.question": q_obj["question"]
                },
                {
                    "$set": {"question_queue.$.audio_data": audio_data}
                }
            )
        except Exception as e:
            print(f"⚠️ [Background] TTS pre-generation failed for Q{idx+1}: {e}")
            
    print("✅ [Background] Finished pre-generating TTS for initial queue.")

def cleanup_session_audios(session_id: str):
    """Delete all generated audio files for the given session to save space."""
    try:
        from services.sarvam_tts import AUDIOS_DIR
        print(f"🧹 Cleaning up audio files for session {session_id}...")
        for file in AUDIOS_DIR.glob(f"{session_id}*.*"):
            try:
                file.unlink()
            except FileNotFoundError:
                pass
        print(f"✅ Audio cleanup complete for {session_id}.")
    except Exception as e:
        print(f"⚠️ Failed to cleanup audios: {e}")

# ── Start Interview ───────────────────────────────────────────────────────────

@router.post("/start/{session_id}")
async def start_interview(session_id: str, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    """Initialize the interview and return the first question immediately."""
    if session_id not in _session_contexts:
        raise HTTPException(404, "Session context not found")
        
    context_raw = _session_contexts[session_id]["context"]
    
    try:
        context_data = json.loads(context_raw)
        context = context_data.get("context", context_raw)
        provided_sources = context_data.get("provided_sources", ["General"])
    except:
        context = context_raw
        provided_sources = ["General"]
    
    # Generate initial 3-5 questions
    print(f"🚀 Generating initial question queue using sources: {provided_sources}...")
    initial_questions = generate_interview_questions(context, [], 1, 4, provided_sources)
    
    if not initial_questions:
        raise HTTPException(500, "Failed to generate initial questions")
        
    first_question = initial_questions.pop(0)
    
    # Save the session to MongoDB instantly
    session_doc = {
        "session_id": session_id,
        "user_id": user_id,
        "context": context,
        "provided_sources": provided_sources,
        "question_queue": initial_questions,
        "answers": [],
        "status": "interviewing",
        "total_asked": 1,
        "current_question": first_question,
        "created_at": datetime.utcnow().isoformat()
    }
    await interviews_collection.insert_one(session_doc)
    
    print(f"🎙️ Generating TTS and lipsync for: {first_question['question']}")
    audio_data = _synthesize_question(first_question["question"], session_id, 0)
    avatar_data = generate_avatar_response(first_question["question"])
    
    # Trigger background task to synthesize audio for the rest of the queue
    background_tasks.add_task(pre_generate_initial_tts, session_id, initial_questions)
    
    return {
        "question": first_question["question"],
        "source_tags": first_question.get("source_tags", []),
        "is_coding_task": first_question.get("is_coding_task", False),
        "q_idx": 0,
        "round": 1,
        "total_questions": MAX_INTERVIEW_QUESTIONS,
        **audio_data,
        **avatar_data
    }


# ── Upload Video ─────────────────────────────────────────────────────────────

@router.post("/upload-video")
async def upload_video(
    session_id: str = Form(...),
    q_idx: int = Form(...),
    video: UploadFile = File(...)
):
    """Save the recorded webcam video for a specific question."""
    try:
        video_path = UPLOADS_DIR / f"{session_id}_q{q_idx}_video.webm"
        video_path.write_bytes(await video.read())
        print(f"📹 Saved video recording to {video_path.name}")
        return {"status": "success", "file": video_path.name}
    except Exception as e:
        print(f"⚠️ Failed to save video: {e}")
        raise HTTPException(500, "Failed to save video")

# ── Submit Answer ─────────────────────────────────────────────────────────────

class AnswerRequest(BaseModel):
    session_id: str
    answer: str
    code: Optional[str] = None


@router.post("/answer")
async def submit_answer(body: AnswerRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    """Submit an answer, instantly pop the next question from the queue, and evaluate in the background."""
    doc = await interviews_collection.find_one({"session_id": body.session_id})
    if not doc:
        raise HTTPException(404, "Interview session not found")
        
    current_question = doc.get("current_question")
    if not current_question:
        raise HTTPException(400, "No active question to answer")
        
    # Create unevaluated answer record
    new_answer = {
        "question": current_question.get("question", ""),
        "source_tags": current_question.get("source_tags", []),
        "is_coding_task": current_question.get("is_coding_task", False),
        "answer": body.answer,
        "code": body.code,
        "score": 0,
        "feedback": ""
    }
    
    queue = doc.get("question_queue", [])
    total_asked = doc.get("total_asked", 0)
    MAX_QUESTIONS = MAX_INTERVIEW_QUESTIONS
    
    # Check completion
    if total_asked >= MAX_QUESTIONS or not queue:
        # Finish the interview
        await interviews_collection.update_one(
            {"session_id": body.session_id},
            {
                "$push": {"answers": new_answer},
                "$set": {"status": "complete", "current_question": None}
            }
        )
        print("✅ Interview complete. Triggering background final report generation...")
        from services.adaptive_graph import run_background_evaluation
        background_tasks.add_task(run_background_evaluation, body.session_id, new_answer, True)
        
        # Cleanup audio files for this session
        background_tasks.add_task(cleanup_session_audios, body.session_id)
        
        return {"complete": True}

    # Instant Pop
    next_question = queue.pop(0)
    total_asked += 1
    
    # Update DB quickly
    await interviews_collection.update_one(
        {"session_id": body.session_id},
        {
            "$push": {"answers": new_answer},
            "$set": {"question_queue": queue, "current_question": next_question, "total_asked": total_asked}
        }
    )
    
    # Background Evaluation & Adaptive Queue Replenishment
    from services.adaptive_graph import run_background_evaluation
    background_tasks.add_task(run_background_evaluation, body.session_id, new_answer, False)
    
    print(f"🎙️ Fast returning next question (TTS Pre-generated): {next_question['question']}")
    q_index = total_asked - 1
    
    # Grab the pre-generated audio dict or synthesize it on the fly if background task hasn't finished
    audio_data = next_question.get("audio_data")
    if not audio_data or not audio_data.get("audio"):
        print(f"⚠️ Pre-generated audio not ready for Q{q_index}, generating synchronously...")
        audio_data = _synthesize_question(next_question["question"], body.session_id, q_index)
        
    avatar_data = generate_avatar_response(next_question["question"])
    
    return {
        "question": next_question["question"],
        "source_tags": next_question.get("source_tags", []),
        "is_coding_task": next_question.get("is_coding_task", False),
        "q_idx": q_index,
        "round": 1,
        "total_questions": MAX_QUESTIONS,
        **audio_data,
        **avatar_data
    }


# ── Report ─────────────────────────────────────────────────────────────────────

@router.get("/report/{session_id}")
async def get_report(session_id: str):
    """Return the final evaluation report for a completed session from MongoDB or Graph state."""
    # Check MongoDB first
    doc = await interviews_collection.find_one({"session_id": session_id})
    if doc:
        return {
            "report": doc.get("report", "{}"),
            "answers": doc.get("answers", []),
            "session_id": session_id
        }

    # Fallback to in-memory state
    state_vals = get_current_state_values(session_id)
    if not state_vals:
        raise HTTPException(404, "Session not found")
    if state_vals.get("status") != "complete":
        raise HTTPException(400, "Interview not yet complete")
    return {
        "report": state_vals.get("report", "{}"),
        "answers": state_vals.get("answers", []),
        "session_id": session_id
    }


# ── Helper ────────────────────────────────────────────────────────────────────

def _synthesize_question(text: str, session_id: str, q_idx: int) -> dict:
    """Run TTS + rhubarb for a question. Returns audio + lipsync dicts."""
    try:
        stem = f"{session_id}_q{q_idx}"
        return sarvam_tts.synthesize(text, stem)
    except Exception as e:
        print(f"⚠️ TTS failed: {e}")
        return {"audio": None, "lipsync": {"mouthCues": []}, "audio_url": None}

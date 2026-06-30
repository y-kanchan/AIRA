"""Interview API router — upload, start, answer, report."""
import os
import uuid
import traceback
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
from langgraph.types import Command

from services import rag, sarvam_tts
from services.interview_graph import (
    interview_graph,
    get_thread_config,
    get_interrupt_info,
    get_current_state_values,
    InterviewState
)
from services.ollama_client import generate_avatar_response
from services.auth_utils import get_current_user
from db import interviews_collection

router = APIRouter(prefix="/interview", tags=["interview"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

MAX_ROUNDS = int(os.getenv("MAX_INTERVIEW_ROUNDS", 2))
QUESTIONS_PER_ROUND = int(os.getenv("QUESTIONS_PER_ROUND", 5))


# ── Upload & Ingest ───────────────────────────────────────────────────────────

@router.post("/upload-documents")
async def upload_documents(
    resume: UploadFile = File(...),
    jd: Optional[UploadFile] = File(None),
    jd_text: Optional[str] = Form(None),
    github_url: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user),
):
    """
    Accept resume PDF, JD (PDF or text), and GitHub URL.
    Extract text, ingest into ChromaDB, return session_id.
    """
    session_id = str(uuid.uuid4()).replace("-", "")[:16]

    try:
        # Save and extract resume
        resume_path = UPLOADS_DIR / f"{session_id}_resume.pdf"
        resume_path.write_bytes(await resume.read())
        resume_text = rag.extract_pdf_text(str(resume_path))

        print(f"📥 Received documents! Resume: {resume_path.name}")

        # JD: prefer file, fallback to plain text
        if jd and jd.filename:
            jd_path = UPLOADS_DIR / f"{session_id}_jd.pdf"
            jd_path.write_bytes(await jd.read())
            jd_content = rag.extract_pdf_text(str(jd_path))
            print(f"📥 Received JD file: {jd_path.name}")
        else:
            jd_content = jd_text or "No job description provided."
            print("📥 Received JD as text.")

        # GitHub
        github_content = ""
        if github_url and github_url.strip():
            urls = [u.strip() for u in github_url.split(",") if u.strip()]
            for url in urls:
                print(f"📥 Fetching GitHub: {url}")
                github_content += rag.fetch_github_content(url) + "\n\n"

        print("🧠 Ingesting documents into ChromaDB (this may take a minute for embeddings)...")
        # Ingest into ChromaDB → get combined context
        context = rag.ingest_documents(
            session_id=session_id,
            resume_text=resume_text,
            jd_text=jd_content,
            github_text=github_content
        )

        # Persist context and user_id for graph initialization
        _session_contexts[session_id] = {
            "context": context,
            "user_id": user_id
        }

        return {
            "session_id": session_id,
            "resume_chars": len(resume_text),
            "jd_chars": len(jd_content),
            "github_chars": len(github_content),
            "message": "Documents ingested successfully"
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# In-memory session context store
_session_contexts: dict = {}


# ── Start Interview ───────────────────────────────────────────────────────────

@router.post("/start/{session_id}")
async def start_interview(session_id: str):
    """
    Initialize the LangGraph interview and return the first question
    with TTS audio + lipsync for the avatar.
    """
    print(f"🚀 Starting interview for session: {session_id}")
    if session_id not in _session_contexts:
        raise HTTPException(404, "Session not found. Upload documents first.")

    session_data = _session_contexts[session_id]
    context = session_data["context"]
    config = get_thread_config(session_id)

    initial_state = InterviewState(
        session_id=session_id,
        context=context,
        questions=[],
        current_q_idx=0,
        current_question="",
        current_answer=None,
        answers=[],
        round=1,
        max_rounds=MAX_ROUNDS,
        questions_per_round=QUESTIONS_PER_ROUND,
        status="questioning",
        report=None,
        last_evaluation=None
    )

    try:
        # Run graph — stops at first interrupt (ask_question)
        interview_graph.invoke(initial_state, config)
    except Exception as e:
        if "GraphInterrupt" not in type(e).__name__ and "interrupt" not in str(e).lower():
            traceback.print_exc()
            raise HTTPException(500, f"Graph error: {e}")

    # Extract the interrupt payload (first question)
    interrupt_info = get_interrupt_info(session_id)
    if not interrupt_info:
        raise HTTPException(500, "Graph did not produce a question")

    question_text = interrupt_info.get("question", "Tell me about yourself.")
    q_idx = interrupt_info.get("q_idx", 0)
    total = interrupt_info.get("total_questions", QUESTIONS_PER_ROUND)
    round_num = interrupt_info.get("round", 1)

    print(f"🎙️ Generating TTS and lipsync for: {question_text}")
    audio_data = _synthesize_question(question_text, session_id, q_idx)
    avatar_meta = generate_avatar_response(question_text)
    print("✅ Question ready! Sending to frontend.")

    return {
        "session_id": session_id,
        "question": question_text,
        "q_idx": q_idx,
        "round": round_num,
        "total_questions": total,
        "max_rounds": MAX_ROUNDS,
        **audio_data,
        **avatar_meta
    }


# ── Submit Answer ─────────────────────────────────────────────────────────────

class AnswerRequest(BaseModel):
    session_id: str
    answer: str


@router.post("/answer")
async def submit_answer(body: AnswerRequest):
    """
    Resume the LangGraph graph with the candidate's answer.
    Returns the next question (with audio) or the final report.
    """
    config = get_thread_config(body.session_id)

    try:
        interview_graph.invoke(Command(resume=body.answer), config)
    except Exception as e:
        if "GraphInterrupt" not in type(e).__name__ and "interrupt" not in str(e).lower():
            traceback.print_exc()
            raise HTTPException(500, f"Graph error: {e}")

    state_vals = get_current_state_values(body.session_id)

    # Check if interview is complete
    if state_vals.get("status") == "complete":
        report = state_vals.get("report", "Interview complete.")
        answers = state_vals.get("answers", [])
        
        # Calculate overall score based on answer evaluations
        total_score = 0
        valid_evals = 0
        for ans in answers:
            if "evaluation" in ans and ans["evaluation"] and "score" in ans["evaluation"]:
                try:
                    total_score += int(ans["evaluation"]["score"])
                    valid_evals += 1
                except (ValueError, TypeError):
                    pass
        
        overall_score = round(total_score / valid_evals, 1) if valid_evals > 0 else 0
        
        # Parse the JSON report to store scores natively in MongoDB
        import json
        report_data = {}
        try:
            report_data = json.loads(report)
        except Exception:
            pass
            
        # If the LLM returned an overall score, prefer it
        if "overall_score" in report_data and isinstance(report_data["overall_score"], (int, float)):
            overall_score = report_data["overall_score"]
        
        # Save to MongoDB
        session_data = _session_contexts.get(body.session_id, {})
        user_id = session_data.get("user_id")
        
        if user_id:
            new_interview = {
                "user_id": user_id,
                "session_id": body.session_id,
                "created_at": datetime.utcnow().isoformat(),
                "report": report,         # Keep string format for frontend compatibility
                "metrics": report_data,   # Store all 15 parameters natively in BSON
                "answers": answers,
                "overall_score": overall_score,
                "total_questions": len(answers)
            }
            await interviews_collection.insert_one(new_interview)
            
        return {
            "complete": True,
            "report": report,
            "answers": answers,
            "total_questions": len(answers)
        }

    # Get next question from interrupt
    interrupt_info = get_interrupt_info(body.session_id)
    if not interrupt_info:
        raise HTTPException(500, "Graph error: no next question produced")

    question_text = interrupt_info.get("question", "")
    q_idx = interrupt_info.get("q_idx", 0)
    round_num = interrupt_info.get("round", 1)
    total = interrupt_info.get("total_questions", QUESTIONS_PER_ROUND)
    last_eval = state_vals.get("last_evaluation", {})

    # TTS + lipsync for next question
    audio_data = _synthesize_question(question_text, body.session_id, q_idx)
    avatar_meta = generate_avatar_response(question_text)

    return {
        "complete": False,
        "question": question_text,
        "q_idx": q_idx,
        "round": round_num,
        "total_questions": total,
        "max_rounds": MAX_ROUNDS,
        "evaluation": {
            "score": last_eval.get("score"),
            "feedback": last_eval.get("feedback", "")
        },
        **audio_data,
        **avatar_meta
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

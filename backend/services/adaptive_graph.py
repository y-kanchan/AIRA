import operator
from typing import Annotated, TypedDict, List
from langgraph.graph import StateGraph, START, END

from services.ollama_client import evaluate_answer, generate_adaptive_questions, generate_interview_report
from db import interviews_collection
from services import sarvam_tts

class AdaptiveState(TypedDict):
    session_id: str
    answer_record: dict
    is_final: bool
    context: str
    evaluation: dict
    new_questions: List[dict]
    report: str

async def evaluate_node(state: AdaptiveState):
    print("🤖 [Background] Evaluating answer...")
    ans = state["answer_record"]
    evaluation = evaluate_answer(ans["question"], ans["answer"], state["context"])
    
    # Update the score in MongoDB immediately
    await interviews_collection.update_one(
        {"session_id": state["session_id"], "answers.question": ans["question"]},
        {"$set": {
            "answers.$.score": evaluation.get("score", 5),
            "answers.$.feedback": evaluation.get("feedback", ""),
            "answers.$.strengths": evaluation.get("strengths", ""),
            "answers.$.improvements": evaluation.get("improvements", "")
        }}
    )
    return {"evaluation": evaluation}

def route_next(state: AdaptiveState):
    return "generate_report" if state["is_final"] else "generate_adaptive"

async def generate_adaptive_node(state: AdaptiveState):
    print("🤖 [Background] Generating adaptive questions...")
    # Fetch all answers to pass to generator
    doc = await interviews_collection.find_one({"session_id": state["session_id"]})
    answers = doc.get("answers", [])
    
    new_q = generate_adaptive_questions(state["evaluation"], state["context"], answers)
    
    # Pre-generate TTS in the background before pushing to queue
    import time
    import asyncio
    for idx, q_obj in enumerate(new_q):
        print(f"🎙️ [Background] Pre-generating TTS for adaptive question {idx+1}...")
        try:
            stem = f"{state['session_id']}_adapt_{int(time.time())}_{idx}"
            # Run the synchronous blocking TTS generation in a background thread
            audio_data = await asyncio.to_thread(sarvam_tts.synthesize, q_obj["question"], stem)
            q_obj["audio_data"] = audio_data
        except Exception as e:
            print(f"⚠️ [Background] TTS pre-generation failed: {e}")
            q_obj["audio_data"] = {"audio": None, "lipsync": {"mouthCues": []}, "audio_url": None}
    
    # Append to MongoDB queue
    await interviews_collection.update_one(
        {"session_id": state["session_id"]},
        {"$push": {"question_queue": {"$each": new_q}}}
    )
    print(f"🤖 [Background] Appended {len(new_q)} adaptive questions with pre-generated TTS to queue.")
    return {"new_questions": new_q}

async def generate_report_node(state: AdaptiveState):
    print("🤖 [Background] Generating final report...")
    doc = await interviews_collection.find_one({"session_id": state["session_id"]})
    answers = doc.get("answers", [])
    
    report = generate_interview_report(answers, state["context"])
    
    # Parse metrics
    import json
    report_data = {}
    try:
        report_data = json.loads(report)
    except Exception:
        pass
    
    overall_score = report_data.get("overall_score", 0)
    
    await interviews_collection.update_one(
        {"session_id": state["session_id"]},
        {"$set": {
            "report": report,
            "metrics": report_data,
            "overall_score": overall_score
        }}
    )
    print("🤖 [Background] Final report saved.")
    return {"report": report}

_workflow = StateGraph(AdaptiveState)
_workflow.add_node("evaluate", evaluate_node)
_workflow.add_node("generate_adaptive", generate_adaptive_node)
_workflow.add_node("generate_report", generate_report_node)

_workflow.add_edge(START, "evaluate")
_workflow.add_conditional_edges("evaluate", route_next, {
    "generate_adaptive": "generate_adaptive",
    "generate_report": "generate_report"
})
_workflow.add_edge("generate_adaptive", END)
_workflow.add_edge("generate_report", END)

adaptive_graph = _workflow.compile()

async def run_background_evaluation(session_id: str, answer_record: dict, is_final: bool):
    doc = await interviews_collection.find_one({"session_id": session_id})
    if not doc: 
        print(f"❌ [Background] Could not find session {session_id}")
        return
    await adaptive_graph.ainvoke({
        "session_id": session_id,
        "answer_record": answer_record,
        "is_final": is_final,
        "context": doc.get("context", "")
    })

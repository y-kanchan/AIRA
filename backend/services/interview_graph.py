"""
LangGraph Interview State Machine.

Flow:
  START → generate_questions → ask_question[INTERRUPT]
       → evaluate_answer → router
          ├─ next_question → ask_question[INTERRUPT]
          ├─ next_round    → generate_questions
          └─ finish        → generate_report → END
"""
import os
from typing import TypedDict, List, Optional

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt


# ── State ─────────────────────────────────────────────────────────────────────

class InterviewState(TypedDict):
    session_id: str
    context: str
    questions: List[str]
    current_q_idx: int
    current_question: str
    current_answer: Optional[str]
    answers: List[dict]
    round: int
    max_rounds: int
    questions_per_round: int
    status: str           # "questioning" | "evaluating" | "complete"
    report: Optional[str]
    last_evaluation: Optional[dict]


# ── Nodes ─────────────────────────────────────────────────────────────────────

def generate_questions_node(state: InterviewState) -> dict:
    from services.ollama_client import generate_interview_questions
    questions = generate_interview_questions(
        context=state["context"],
        previous_answers=state["answers"],
        round_num=state["round"],
        count=state["questions_per_round"]
    )
    return {
        "questions": questions,
        "current_q_idx": 0,
        "current_question": questions[0],
        "status": "questioning"
    }


def ask_question_node(state: InterviewState) -> dict:
    """Pause here and wait for the user's answer via the REST API."""
    answer = interrupt({
        "question": state["current_question"],
        "q_idx": state["current_q_idx"],
        "round": state["round"],
        "total_questions": len(state["questions"])
    })
    return {"current_answer": answer}


def evaluate_answer_node(state: InterviewState) -> dict:
    from services.ollama_client import evaluate_answer
    evaluation = evaluate_answer(
        question=state["current_question"],
        answer=state["current_answer"] or "",
        context=state["context"]
    )
    answer_record = {
        "question": state["current_question"],
        "answer": state["current_answer"] or "",
        "round": state["round"],
        "score": evaluation.get("score", 5),
        "feedback": evaluation.get("feedback", ""),
        "strengths": evaluation.get("strengths", ""),
        "improvements": evaluation.get("improvements", "")
    }
    return {
        "answers": state["answers"] + [answer_record],
        "last_evaluation": evaluation,
        "status": "evaluating"
    }


def advance_question_node(state: InterviewState) -> dict:
    next_idx = state["current_q_idx"] + 1
    return {
        "current_q_idx": next_idx,
        "current_question": state["questions"][next_idx]
    }


def advance_round_node(state: InterviewState) -> dict:
    return {"round": state["round"] + 1}


def generate_report_node(state: InterviewState) -> dict:
    from services.ollama_client import generate_interview_report
    report = generate_interview_report(
        answers=state["answers"],
        context=state["context"]
    )
    return {"status": "complete", "report": report}


# ── Routing ───────────────────────────────────────────────────────────────────

def route_after_evaluation(state: InterviewState) -> str:
    next_idx = state["current_q_idx"] + 1
    if next_idx < len(state["questions"]):
        return "next_question"
    elif state["round"] < state["max_rounds"]:
        return "next_round"
    else:
        return "finish"


# ── Graph ─────────────────────────────────────────────────────────────────────

_memory = MemorySaver()

_workflow = StateGraph(InterviewState)

_workflow.add_node("generate_questions", generate_questions_node)
_workflow.add_node("ask_question", ask_question_node)
_workflow.add_node("evaluate_answer", evaluate_answer_node)
_workflow.add_node("advance_question", advance_question_node)
_workflow.add_node("advance_round", advance_round_node)
_workflow.add_node("generate_report", generate_report_node)

_workflow.add_edge(START, "generate_questions")
_workflow.add_edge("generate_questions", "ask_question")
_workflow.add_edge("ask_question", "evaluate_answer")
_workflow.add_conditional_edges(
    "evaluate_answer",
    route_after_evaluation,
    {
        "next_question": "advance_question",
        "next_round": "advance_round",
        "finish": "generate_report"
    }
)
_workflow.add_edge("advance_question", "ask_question")
_workflow.add_edge("advance_round", "generate_questions")
_workflow.add_edge("generate_report", END)

interview_graph = _workflow.compile(checkpointer=_memory)


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_thread_config(session_id: str) -> dict:
    return {"configurable": {"thread_id": session_id}}


def get_interrupt_info(session_id: str) -> Optional[dict]:
    """Extract the current interrupt payload (the pending question) from graph state."""
    try:
        config = get_thread_config(session_id)
        state = interview_graph.get_state(config)
        for task in state.tasks:
            for intr in task.interrupts:
                return intr.value
    except Exception:
        pass
    return None


def get_current_state_values(session_id: str) -> dict:
    """Return the current state values from the graph checkpointer."""
    try:
        config = get_thread_config(session_id)
        return interview_graph.get_state(config).values
    except Exception:
        return {}

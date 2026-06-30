import operator
from typing import Annotated, TypedDict, List
from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send

from services import rag

# ── State Definitions ──

class ProcessDocInput(TypedDict):
    session_id: str
    doc_type: str
    content: str  # File path, URL, or plain text

class ProcessDocOutput(TypedDict):
    doc_type: str
    extracted_text: str

class IngestState(TypedDict):
    session_id: str
    documents: List[ProcessDocInput]
    processed_docs: Annotated[List[ProcessDocOutput], operator.add]
    context_summary: str


# ── Nodes ──

def process_document(state: ProcessDocInput) -> dict:
    """
    Agent node: Extracts text from a single document.
    Runs in parallel for multiple documents via LangGraph's Send API.
    """
    doc_type = state["doc_type"]
    content = state["content"]
    text = ""
    
    print(f"⚙️ [Agent] Processing {doc_type}...")

    if doc_type == "resume":
        text = rag.extract_pdf_text(content)
    elif doc_type == "jd_file":
        text = rag.extract_pdf_text(content)
    elif doc_type == "jd_text":
        text = content
    elif doc_type == "github":
        text = rag.fetch_github_content(content)
        
    print(f"✅ [Agent] Completed {doc_type} processing. ({len(text)} chars)")
    return {"processed_docs": [{"doc_type": doc_type, "extracted_text": text}]}


def distribute_docs(state: IngestState):
    """
    Router: Maps over the list of documents and dispatches an agent for each.
    """
    sends = []
    for doc in state["documents"]:
        sends.append(
            Send("process_document", {
                "session_id": state["session_id"],
                "doc_type": doc["doc_type"],
                "content": doc["content"]
            })
        )
    return sends


def gather_and_ingest(state: IngestState) -> dict:
    """
    Reduce node: Gathers all extracted text from the parallel agents,
    chunks them, and embeds them into ChromaDB.
    """
    print("🧠 [Agent] Gathering all processed documents for embedding...")
    resume_text = ""
    jd_text = ""
    github_text = ""
    
    for doc in state["processed_docs"]:
        if doc["doc_type"] == "resume":
            resume_text += doc["extracted_text"] + "\n"
        elif doc["doc_type"] in ["jd_file", "jd_text"]:
            jd_text += doc["extracted_text"] + "\n"
        elif doc["doc_type"] == "github":
            github_text += doc["extracted_text"] + "\n"
            
    # Ingest combined context into DB sequentially (avoids sqlite locks)
    context = rag.ingest_documents(
        session_id=state["session_id"],
        resume_text=resume_text,
        jd_text=jd_text,
        github_text=github_text
    )
    return {"context_summary": context}


# ── Graph Compilation ──

_workflow = StateGraph(IngestState)

# Add nodes
_workflow.add_node("process_document", process_document)
_workflow.add_node("gather_and_ingest", gather_and_ingest)

# Connect edges using Send API for map-reduce parallel execution
_workflow.add_conditional_edges(START, distribute_docs, ["process_document"])
_workflow.add_edge("process_document", "gather_and_ingest")
_workflow.add_edge("gather_and_ingest", END)

ingest_graph = _workflow.compile()

"""
RAG service — ingests resume PDF, JD PDF/text, and GitHub repo into ChromaDB.
Uses Ollama embeddings via ChromaDB's built-in Ollama embedding function.
"""
import os
import re
import json
import httpx
import pdfplumber
import chromadb
import asyncio
from chromadb.utils import embedding_functions
from pathlib import Path
from typing import List, Optional

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# ── Cloud-Friendly In-Memory ChromaDB Pattern ─────────────────────────────────

_client = None
_collection = None
_ready = False
_build_lock = asyncio.Lock()

# DefaultEmbeddingFunction uses ONNX all-MiniLM-L6-v2 (~80MB).
# No PyTorch dependency means it easily fits in cloud free tiers!
_embedding_fn = embedding_functions.DefaultEmbeddingFunction()

def _get_client():
    global _client
    if _client is None:
        _client = chromadb.Client()  # in-memory, no disk needed
    return _client

async def ensure_index_ready():
    global _ready, _collection
    if _ready and _collection is not None:
        return _collection
    async with _build_lock:
        if _ready and _collection is not None:
            return _collection
        
        client = _get_client()
        _collection = client.get_or_create_collection(
            name="aira_interviews",
            embedding_function=_embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )
        _ready = True
        return _collection


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i: i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return [c for c in chunks if len(c.strip()) > 50]


def extract_pdf_text(pdf_path: str) -> str:
    """Extract text from a PDF file using pdfplumber."""
    text_parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def fetch_github_content(url: str) -> str:
    """Fetch README + top-level code files from a GitHub repo URL."""
    # Parse owner/repo from URL
    # e.g. https://github.com/owner/repo
    match = re.search(r"github\.com/([^/]+)/([^/\s?#]+)", url)
    if not match:
        return f"[Could not parse GitHub URL: {url}]"

    owner, repo = match.group(1), match.group(2).rstrip(".git")
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    content_parts = [f"GitHub Repository: {owner}/{repo}\n"]

    # Fetch README
    try:
        r = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}/readme",
            headers=headers, timeout=10
        )
        if r.status_code == 200:
            import base64 as b64
            readme_content = b64.b64decode(r.json()["content"]).decode("utf-8", errors="ignore")
            content_parts.append(f"\n--- README ---\n{readme_content[:3000]}")
    except Exception as e:
        content_parts.append(f"\n[README fetch error: {e}]")

    # Fetch repo metadata
    try:
        r = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers, timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            content_parts.append(
                f"\n--- Repo Info ---\n"
                f"Description: {data.get('description', 'N/A')}\n"
                f"Language: {data.get('language', 'N/A')}\n"
                f"Stars: {data.get('stargazers_count', 0)}\n"
                f"Topics: {', '.join(data.get('topics', []))}"
            )
    except Exception as e:
        content_parts.append(f"\n[Repo info error: {e}]")

    # Fetch top-level file list
    try:
        r = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents",
            headers=headers, timeout=10
        )
        if r.status_code == 200:
            files = r.json()
            file_list = [f["name"] for f in files if isinstance(f, dict)]
            content_parts.append(f"\n--- Top-level files ---\n" + "\n".join(file_list))
    except Exception as e:
        content_parts.append(f"\n[File list error: {e}]")

    return "\n".join(content_parts)


async def ingest_documents(
    session_id: str,
    resume_text: str,
    jd_text: str,
    github_text: str
) -> str:
    """Chunk and embed all documents into ChromaDB. Returns combined context summary."""
    collection = await ensure_index_ready()

    # Delete existing docs for this session if re-ingesting
    try:
        existing = await asyncio.to_thread(collection.get, where={"session_id": session_id})
        if existing and existing.get("ids"):
            await asyncio.to_thread(collection.delete, ids=existing["ids"])
    except Exception:
        pass

    all_docs = []
    all_ids = []
    all_metas = []

    # Ingest resume
    for i, chunk in enumerate(_chunk_text(resume_text)):
        all_docs.append(chunk)
        all_ids.append(f"{session_id}_resume_{i}")
        all_metas.append({"session_id": session_id, "source": "resume", "chunk": i})

    # Ingest JD
    for i, chunk in enumerate(_chunk_text(jd_text)):
        all_docs.append(chunk)
        all_ids.append(f"{session_id}_jd_{i}")
        all_metas.append({"session_id": session_id, "source": "jd", "chunk": i})

    # Ingest GitHub content
    if github_text:
        for i, chunk in enumerate(_chunk_text(github_text)):
            all_docs.append(chunk)
            all_ids.append(f"{session_id}_github_{i}")
            all_metas.append({"session_id": session_id, "source": "github", "chunk": i})

    if all_docs:
        # Embedding is CPU-bound (ONNX). Run it OFF the event loop!
        await asyncio.to_thread(
            collection.upsert, ids=all_ids, documents=all_docs, metadatas=all_metas
        )

    # Build concise context summary for LLM prompts
    context_parts = []
    provided_sources = []
    if resume_text.strip():
        context_parts.append(f"=== RESUME ===\n{resume_text[:2000]}")
        provided_sources.append("Resume")
    if jd_text.strip():
        context_parts.append(f"=== JOB DESCRIPTION ===\n{jd_text[:1500]}")
        provided_sources.append("JD")
    if github_text.strip():
        context_parts.append(f"=== GITHUB PROJECT ===\n{github_text[:1000]}")
        provided_sources.append("GitHub")
        
    context = "\n\n".join(context_parts)
    
    import json
    return json.dumps({
        "context": context,
        "provided_sources": provided_sources
    })


async def retrieve_context(query: str, session_id: str, n_results: int = 5) -> str:
    """Query ChromaDB for relevant context chunks."""
    try:
        collection = await ensure_index_ready()
        results = await asyncio.to_thread(
            collection.query, 
            query_texts=[query], 
            n_results=n_results,
            where={"session_id": session_id}
        )
        docs = results.get("documents", [[]])[0]
        return "\n\n".join(docs)
    except Exception as e:
        return f"[Context retrieval error: {e}]"

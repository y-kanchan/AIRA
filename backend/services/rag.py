"""
RAG service — ingests resume PDF, JD PDF/text, and GitHub repo into ChromaDB.
Uses Ollama embeddings via ChromaDB's built-in Ollama embedding function.
"""
import os
import re
import json
import httpx
import pdfplumber
import os
import re
import json
import httpx
import pdfplumber
import asyncio
from pathlib import Path
from typing import List, Optional

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")




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
    """Builds the context summary from documents."""


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




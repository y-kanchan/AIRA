"""LLM client for question generation and evaluation (using Groq for speed)."""
import os
import json
from groq import Groq
from typing import List, Optional

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def _chat(prompt: str, system: str = "", temperature: float = 0.7) -> str:
    """Send a chat request to Groq and return the response text."""
    if not _client:
        raise ValueError("GROQ_API_KEY is not set in environment variables.")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    chat_completion = _client.chat.completions.create(
        messages=messages,
        model="llama-3.3-70b-versatile",
        temperature=temperature,
    )
    return chat_completion.choices[0].message.content.strip()


def generate_interview_questions(
    context: str,
    previous_answers: List[dict],
    round_num: int,
    count: int = 5,
    provided_sources: List[str] = None
) -> List[str]:
    """Generate interview questions based on resume/JD context and prior answers."""
    prior_text = ""
    if previous_answers:
        prior_text = "\n\nPrevious answers (for follow-up context):\n"
        for i, a in enumerate(previous_answers[-5:], 1):
            prior_text += f"Q{i}: {a['question']}\nA: {a['answer']}\n"
            
    if not provided_sources:
        provided_sources = []
        
    # Hardcoded conceptual tags to provide a rich variety of categorizations
    conceptual_tags = ["Fundamental", "Core Subject", "System Design", "Behavioral", "General"]
    for tag in conceptual_tags:
        if tag not in provided_sources:
            provided_sources.append(tag)
        
    sources_str = ", ".join(f"'{s}'" for s in provided_sources)

    system = (
        "You are an expert technical interviewer. Generate targeted interview questions "
        "based on the candidate's provided context. "
        "Questions should be specific, probing technical depth and practical experience. "
        "Questions should be specific, probing technical depth and practical experience. "
        "Return ONLY a JSON array of objects, where each object has 'question', 'source_tags', and 'is_coding_task' (boolean)."
    )

    prompt = f"""Round {round_num} Interview Questions

Candidate context:
{context}
{prior_text}

Generate exactly {count} interview questions.
{"Make these follow-up questions that dig deeper into weak areas from previous answers." if round_num > 1 else "Cover technical skills, projects, and role fit."}

IMPORTANT INSTRUCTIONS FOR TAGS:
You must strictly assign 1-2 source tags for each question from THIS EXACT LIST ONLY: [{sources_str}].
Do NOT invent new tags. Do NOT use tags for documents that are not in this list.

Return ONLY a valid JSON array like: [{{"question": "Q1?", "source_tags": ["{provided_sources[0]}"], "is_coding_task": false}}]"""

    raw = _chat(prompt, system, temperature=0.6)

    # Extract JSON array from response
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start != -1 and end > start:
            questions = json.loads(raw[start:end])
            if isinstance(questions, list) and len(questions) > 0:
                return questions[:count]
    except json.JSONDecodeError:
        pass

    # Fallback
    return [
        {"question": "Tell me about your most challenging technical project.", "source_tags": ["General"], "is_coding_task": False},
        {"question": "How do you approach debugging complex issues?", "source_tags": ["General"], "is_coding_task": False},
        {"question": "Write a function to reverse a string in your preferred language.", "source_tags": ["Fundamental"], "is_coding_task": True},
        {"question": "What is your greatest professional achievement?", "source_tags": ["General"], "is_coding_task": False},
        {"question": "Where do you see yourself growing technically?", "source_tags": ["General"], "is_coding_task": False}
    ]


def generate_adaptive_questions(evaluation: dict, context: str, previous_answers: List[dict]) -> List[dict]:
    """Generate 1-2 new questions based on the candidate's last answer score."""
    score = evaluation.get("score", 5)
    feedback = evaluation.get("feedback", "")
    
    if score >= 8:
        direction = "The last answer was STRONG. Increase difficulty significantly or shift to a more complex related topic."
    elif score >= 5:
        direction = "The last answer was MODERATE. Generate a deeper follow-up question on the exact same topic to probe understanding."
    else:
        direction = "The last answer was WEAK. Simplify the concept or ask a foundational question to check basic knowledge."

    system = "You are an expert technical interviewer adapting to the candidate's skill level. Return ONLY a JSON array of objects."

    allowed_tags = ["Adaptive", "Fundamental", "Core Subject", "Deep Dive", "System Design", "General"]
    sources_str = ", ".join(f"'{s}'" for s in allowed_tags)

    prompt = f"""Generate 1 or 2 adaptive follow-up questions.

Evaluation of last answer:
Score: {score}/10
Feedback: {feedback}

Strategy: {direction}

Candidate Context:
{context[:1000]}

IMPORTANT INSTRUCTIONS FOR TAGS:
You must strictly assign 1-2 source tags for each question from THIS EXACT LIST ONLY: [{sources_str}]. One of the tags MUST be 'Adaptive'.

Return ONLY a valid JSON array like: [{{"question": "Q1?", "source_tags": ["Adaptive", "Fundamental"], "is_coding_task": false}}]"""

    raw = _chat(prompt, system, temperature=0.6)
    try:
        start = raw.find("[")
        end = raw.rfind("]") + 1
        import json
        if start != -1 and end > start:
            return json.loads(raw[start:end])
    except Exception:
        pass
        
    return [{"question": "Could you elaborate more on your previous point?", "source_tags": ["Adaptive"], "is_coding_task": False}]


def evaluate_answer(question: str, answer: str, context: str, code: str = None) -> dict:
    """Evaluate a candidate's answer and return structured feedback."""
    system = (
        "You are an expert technical interviewer evaluating a candidate's answer. "
        "Provide a fair, structured evaluation. "
        "Return ONLY a valid JSON object, no other text."
    )

    code_section = f"Candidate's Code Submission:\n```\n{code}\n```" if code else ""
    prompt = f"""Evaluate this interview answer:

Question: {question}

Candidate's Spoken Answer: {answer}
{code_section}

Context about the candidate (resume/JD/GitHub):
{context[:2000]}

Return a JSON object with exactly these fields:
{{
  "score": <integer 1-10>,
  "feedback": "<one sentence overall assessment>",
  "strengths": "<what was good about this answer>",
  "improvements": "<what could be better>",
  "follow_up_note": "<a note for the next round of questions>"
}}"""

    raw = _chat(prompt, system, temperature=0.3)

    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(raw[start:end])
    except json.JSONDecodeError:
        pass

    return {
        "score": 5,
        "feedback": "Answer received.",
        "strengths": "Responded to the question.",
        "improvements": "Could provide more specific details.",
        "follow_up_note": ""
    }


def generate_interview_report(answers: List[dict], context: str) -> str:
    """Generate a comprehensive interview evaluation report."""
    answers_text = ""
    for i, a in enumerate(answers, 1):
        code_text = f"\nCode Submitted:\n```\n{a.get('code')}\n```" if a.get('code') else ""
        answers_text += (
            f"\nQ{i} (Round {a.get('round',1)}): {a['question']}\n"
            f"Answer: {a['answer']}{code_text}\n"
            f"Score: {a.get('score', 'N/A')}/10\n"
            f"Feedback: {a.get('feedback', '')}\n"
        )

    avg_score = (
        sum(a.get("score", 5) for a in answers) / len(answers)
        if answers else 0
    )

    system = "You are an expert technical interviewer writing a final evaluation report. Return ONLY a valid JSON object."

    prompt = f"""Evaluate this entire interview and return a JSON object with EXACTLY these 15 parameters:
{{
  "overall_score": <1-10>,
  "confidence_score": <1-10>,
  "technical_depth": <1-10>,
  "clarity_and_communication": <1-10>,
  "problem_solving_ability": <1-10>,
  "ai_detection_probability": <0-100 integer representing %>,
  "industry_readiness": <1-10>,
  "cultural_fit": <1-10>,
  "leadership_potential": <1-10>,
  "critical_thinking": <1-10>,
  "domain_knowledge": <1-10>,
  "grammar_and_fluency": <1-10>,
  "handling_ambiguity": <1-10>,
  "key_strengths": ["<strength1>", "<strength2>"],
  "areas_for_improvement": ["<improvement1>", "<improvement2>"]
}}

Candidate Context:
{context[:1500]}

Interview Q&A:
{answers_text}

Return ONLY valid JSON.
"""
    raw = _chat(prompt, system, temperature=0.4)
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > start:
            return raw[start:end]
    except Exception:
        pass
    return "{}"


def generate_avatar_response(text: str) -> dict:
    """Generate avatar animation metadata for a given text."""
    word_count = len(text.split())
    duration = word_count / 2.5  # ~2.5 words/sec speaking pace

    # Build animation timeline
    timeline = [
        {"time": 0, "action": "greeting", "animation": "Talking_0", "expression": "smile"},
    ]
    if duration > 3:
        timeline.append({"time": 2, "action": "explanation", "animation": "Talking_1", "expression": "default"})
    if duration > 6:
        timeline.append({"time": 4.5, "action": "emphasis", "animation": "Talking_2", "expression": "surprised"})
    if duration > 9:
        timeline.append({"time": 7, "action": "closing", "animation": "Talking_0", "expression": "smile"})

    return {
        "facialExpression": "smile",
        "animation": "Talking_0",
        "animationTimeline": timeline
    }

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
    count: int = 5
) -> List[str]:
    """Generate interview questions based on resume/JD context and prior answers."""
    prior_text = ""
    if previous_answers:
        prior_text = "\n\nPrevious answers (for follow-up context):\n"
        for i, a in enumerate(previous_answers[-5:], 1):
            prior_text += f"Q{i}: {a['question']}\nA: {a['answer']}\n"

    system = (
        "You are an expert technical interviewer. Generate targeted interview questions "
        "based on the candidate's resume, job description, and GitHub projects. "
        "Questions should be specific, probing technical depth and practical experience. "
        "Return ONLY a JSON array of question strings, no other text."
    )

    prompt = f"""Round {round_num} Interview Questions

Candidate context:
{context}
{prior_text}

Generate exactly {count} interview questions for round {round_num}.
{"Make these follow-up questions that dig deeper into weak areas from previous answers." if round_num > 1 else "Cover technical skills, projects, and role fit."}

Return ONLY a valid JSON array like: ["Question 1?", "Question 2?", ...]"""

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

    # Fallback: parse line by line
    lines = [l.strip().lstrip("0123456789.-) ").strip() for l in raw.split("\n") if l.strip()]
    questions = [l for l in lines if "?" in l or len(l) > 20]
    return questions[:count] if questions else [
        "Tell me about your most challenging technical project.",
        "How do you approach debugging complex issues?",
        "Describe your experience with the technologies in your resume.",
        "What is your greatest professional achievement?",
        "Where do you see yourself growing technically?"
    ]


def evaluate_answer(question: str, answer: str, context: str) -> dict:
    """Evaluate a candidate's answer and return structured feedback."""
    system = (
        "You are an expert technical interviewer evaluating a candidate's answer. "
        "Provide a fair, structured evaluation. "
        "Return ONLY a valid JSON object, no other text."
    )

    prompt = f"""Evaluate this interview answer:

Question: {question}

Candidate's Answer: {answer}

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
        answers_text += (
            f"\nQ{i} (Round {a.get('round',1)}): {a['question']}\n"
            f"Answer: {a['answer']}\n"
            f"Score: {a.get('score', 'N/A')}/10\n"
            f"Feedback: {a.get('feedback', '')}\n"
        )

    avg_score = (
        sum(a.get("score", 5) for a in answers) / len(answers)
        if answers else 0
    )

    system = "You are an expert technical interviewer writing a final evaluation report."

    prompt = f"""Write a comprehensive interview evaluation report.

Candidate Context:
{context[:1500]}

Interview Q&A:
{answers_text}

Average Score: {avg_score:.1f}/10

Write a professional report with:
1. Overall Assessment (2-3 sentences)
2. Technical Strengths (bullet points)
3. Areas for Improvement (bullet points)
4. Hiring Recommendation (Strong Yes / Yes / Maybe / No)
5. Final Score: {avg_score:.1f}/10"""

    return _chat(prompt, system, temperature=0.4)


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

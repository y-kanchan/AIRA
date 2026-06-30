# 🌟 AI Interview Platform (RAG + 3D Avatar + Groq)

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Groq](https://img.shields.io/badge/Groq-f55036?style=for-the-badge&logo=groq&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-FF4D4D?style=for-the-badge)

An interactive, real-time AI technical interviewer that conducts targeted interviews based on a candidate's Resume, Job Description, and GitHub portfolio. It features a fully animated 3D avatar with real-time lip-syncing for a highly immersive experience.

---

## 🚀 Overview

The **AI Interview Platform** is designed to simulate a professional technical interview. It uses a **Retrieval-Augmented Generation (RAG)** pipeline to deeply understand the candidate's background by ingesting their uploaded Resume and Job Description.

It leverages the blazing-fast **Groq API (Llama-3.3-70B-Versatile)** to generate highly specific, context-aware technical questions, and uses **LangGraph** to maintain a stateful interview loop. The responses are vocalized by a dynamic **3D Avatar** using **Sarvam AI Text-to-Speech** and the **Rhubarb Lip-Sync** engine.

---

## 🏗️ System Architecture & Multi-Agent Workflow

The platform utilizes an advanced **LangGraph Multi-Agent Architecture** divided into two highly optimized phases: **Parallel Ingestion** and the **Zero-Delay Adaptive Queue**.

### 1. Phase 1: Parallel Document Ingestion (Map-Reduce)
When a user uploads multiple documents, the system uses LangGraph's `Send` API to spawn dynamic agents.
*   **Dynamic Agents**: If you provide 1 Resume, 1 JD, and 3 GitHub Repos, the Router spawns **5 independent agents** simultaneously. 
*   **Latency Improvement**: Network-heavy scraping (GitHub) and CPU-heavy chunking (PDFs) happen in parallel. Processing 5 documents takes the same time as processing 1 document.

### 2. Phase 2: Hybrid Adaptive Queue (Zero-Delay)
We eliminated traditional "round-based" delays by moving all LLM processing to the background.
*   **Instant UI Popping**: When you submit an answer, the API instantly pops the next pre-generated question from MongoDB. The transition takes **0.0 seconds**, ensuring a fluid, human-like conversation.
*   **Background Evaluator Agent**: While you are reading the next question, an independent background agent analyzes your previous response, updates your score, and notes strengths/weaknesses.
*   **Background Generator Agent**: Another agent dynamically generates 1-2 new tailored questions (harder if you did well, simpler if you struggled) and appends them to your active queue, ensuring you never run out.
*   **Reporting Agent**: Once the interview completes, a final agent scans the entire transcript to generate a comprehensive 15-parameter evaluation JSON.

```mermaid
graph TD
    subgraph "Phase 1: Multi-Agent Ingestion"
        StartIngest([Upload Documents]) --> Router[Router]
        Router -- "Parallel" --> A1[Agent: Parse Resume]
        Router -- "Parallel" --> A2[Agent: Parse JD]
        Router -- "Parallel" --> A3[Agent: Scrape GitHubs]
        A1 & A2 & A3 --> Reducer[Reducer: Embed to ChromaDB]
    end

    Reducer --> StartInterview([Start Interview])

    subgraph "Phase 2: Background Adaptive Queue"
        StartInterview --> GenQ[Generator Agent: Build Initial Queue]
        GenQ --> UI
        
        UI((User Answers & Instantly Gets Next Question)) --> EvalAns[Background Evaluator Agent: Grade Answer]
        EvalAns --> GenQ2[Background Generator Agent: Create Adaptive Questions]
        GenQ2 -- "Replenishes" --> Queue[(MongoDB: Question Queue)]
        Queue -. "Pops instantly" .-> UI
        
        UI -- "Max questions reached" --> GenReport[Reporting Agent: 15-Parameter Output]
    end
```

---

## 🎯 Core Features

*   **Zero-Delay Interactions**: Next-generation background queueing ensures the user never has to wait for an LLM to generate the next question.
*   **Multi-Agent Ingestion**: Parallel processing of Resumes, JDs, and GitHub repositories using LangGraph.
*   **Context-Aware Interviewing**: Hyper-personalized technical questions derived directly from the candidate's actual resume and GitHub code.
*   **Immersive 3D Avatar**: Real-time rendering of an expressive 3D tutor/interviewer using Three.js and React.
*   **Automated Evaluation**: 15-parameter feedback report (Confidence, AI Detection, Technical Depth, etc.) available on the dashboard.

---

## 💻 Tech Stack

### Frontend
* **React.js** (Vite) - Core UI framework
* **React Three Fiber / Drei** - 3D model rendering and scene management
* **Tailwind CSS** - Styling and layout

### Backend
* **FastAPI** (Python) - High-performance asynchronous API
* **LangGraph** - Complex state machine orchestration for the interview loop
* **ChromaDB** - Local vector database for RAG document retrieval
* **Sentence-Transformers** - Open-source embeddings (`all-MiniLM-L6-v2`)
* **Rhubarb Lip Sync** - Command-line tool to generate mouth cues from audio

### AI Services
* **Groq API (`llama-3.3-70b-versatile`)** - LLM for reasoning and question generation
* **Sarvam AI** - High-quality regional text-to-speech generation

---

## 📦 Prerequisites

Before installing, ensure you have the following installed on your system:
* **Python 3.10+** (Conda recommended)
* **Node.js 18+** & npm
* **FFmpeg** (Required for audio conversion: `sudo apt install ffmpeg`)
* **Rhubarb Lip Sync** binary placed in `backend/bin/rhubarb`

---

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/AI_Tutor.git
cd AI_Tutor
```

### 2. Environment Variables
Copy the example environment file and add your API keys:
```bash
cp example.env .env
```
Open `.env` and fill in:
* `SARVAM_API_KEY`: Get from [Sarvam AI](https://sarvam.ai/)
* `GROQ_API_KEY`: Get from [Groq Console](https://console.groq.com/)

### 3. Backend Setup
Create a virtual environment, install dependencies, and start the FastAPI server:
```bash
cd backend
conda create -n ai-interview python=3.12
conda activate ai-interview
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*Note: The first time you upload a document, the backend will automatically download the ~80MB Sentence-Transformer embedding model.*

### 4. Frontend Setup
Open a new terminal window, install npm packages, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

---

## ▶️ Usage Instructions

1. Open your browser and navigate to `http://localhost:5174` (or the port Vite provides).
2. On the welcome screen, upload your **Resume (PDF)**.
3. Paste the **Job Description** you are applying for in the text box.
4. (Optional) Provide a link to your **GitHub** profile for deeper context.
5. Click **"Start Interview"**.
6. The backend will process your documents and the 3D Avatar will greet you and ask the first technical question!
7. Type your answers into the chat interface to progress through the interview rounds.

---

## 📂 Directory Structure

```text
AI_Tutor/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── routers/                # API route handlers (interview.py)
│   ├── services/               # Core business logic
│   │   ├── rag.py              # ChromaDB and Document parsing logic
│   │   ├── interview_graph.py  # LangGraph state machine definition
│   │   ├── ollama_client.py    # Groq LLM integration client
│   │   └── sarvam_tts.py       # Sarvam AI TTS and FFmpeg/Rhubarb sync
│   ├── bin/                    # Pre-compiled binaries (Rhubarb)
│   └── audios/                 # Temporary storage for generated TTS files
├── frontend/
│   ├── src/
│   │   ├── components/         # React components (Avatar.jsx, UI.jsx)
│   │   ├── hooks/              # Custom React hooks (useChat.jsx)
│   │   └── index.css           # Global Tailwind styles
│   └── public/                 # Static assets and 3D models
├── .env                        # Environment configurations
└── README.md
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](https://github.com/your-username/AI_Tutor/issues).

## 📜 License

This project is licensed under the MIT License.

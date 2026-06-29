import { useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { motion, AnimatePresence } from "framer-motion";

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const ScoreBar = ({ score }) => {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 7 ? "#22c55e" : score >= 4 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}/10</span>
    </div>
  );
};

const PhaseIndicator = ({ phase, round, maxRounds, qIdx, total }) => {
  const phases = ["upload", "uploading", "starting", "interviewing", "complete"];
  const step = phases.indexOf(phase);
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {["Upload", "Interview", "Report"].map((label, i) => {
        const active = (i === 0 && step <= 1) || (i === 1 && step === 3) || (i === 2 && step === 4);
        const done   = (i === 0 && step > 1)  || (i === 1 && step > 3);
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${done   ? "bg-emerald-500 border-emerald-500 text-white" :
                active ? "bg-indigo-600 border-indigo-400 text-white animate-pulse" :
                         "bg-gray-800 border-gray-600 text-gray-400"}`}>
              {done ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium ${active ? "text-white" : done ? "text-emerald-400" : "text-gray-500"}`}>{label}</span>
            {i < 2 && <div className={`w-8 h-px ${done ? "bg-emerald-500" : "bg-gray-600"}`} />}
          </div>
        );
      })}
      {phase === "interviewing" && (
        <span className="ml-4 text-xs text-indigo-300">
          R{round}/{maxRounds} · Q{qIdx + 1}/{total}
        </span>
      )}
    </div>
  );
};

/* ─── Main UI ──────────────────────────────────────────────────────────────── */
export const UI = ({ hidden, showControls = true, showChat = true }) => {
  const {
    loading, cameraZoomed, setCameraZoomed,
    interviewPhase, currentQuestion, answers, report, uploadError,
    uploadDocuments, submitAnswer, resetInterview,
  } = useChat();

  /* file inputs */
  const [resumeFile, setResumeFile]   = useState(null);
  const [jdFile,     setJdFile]       = useState(null);
  const [jdText,     setJdText]       = useState("");
  const [jdMode,     setJdMode]       = useState("file"); // "file" | "text"
  const [githubUrl,  setGithubUrl]    = useState("");

  /* answer input */
  const answerRef = useRef();
  const [isListening, setIsListening] = useState(false);
  const recognition = useRef(null);

  /* speech recognition */
  if (typeof window !== "undefined" && !recognition.current) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      recognition.current = new SR();
      recognition.current.lang = "en-US";
      recognition.current.interimResults = false;
      recognition.current.onresult = (e) => {
        answerRef.current && (answerRef.current.value = e.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.current.onerror = () => setIsListening(false);
      recognition.current.onend   = () => setIsListening(false);
    }
  }

  const toggleMic = () => {
    if (!recognition.current) return;
    if (isListening) { recognition.current.stop(); }
    else             { recognition.current.start(); setIsListening(true); }
  };

  const handleUpload = () => {
    if (!resumeFile) return;
    uploadDocuments({ resumeFile, jdFile, jdText: jdMode === "text" ? jdText : "", githubUrl });
  };

  const handleAnswer = () => {
    const text = answerRef.current?.value?.trim();
    if (!text || loading) return;
    if (answerRef.current) answerRef.current.value = "";
    submitAnswer(text);
  };

  if (hidden) return null;

  return (
    <div className="relative h-full flex flex-col">

      {/* ── Camera zoom button ── */}
      {showControls && (
        <button
          onClick={() => setCameraZoomed(!cameraZoomed)}
          className="absolute top-4 left-4 z-10 bg-gray-900/80 hover:bg-gray-800 text-white p-2.5 rounded-xl transition-all duration-300 border border-gray-700/50"
        >
          {cameraZoomed
            ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" /></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" /></svg>
          }
        </button>
      )}

      {/* ── Main content ── */}
      {showChat && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Phase header */}
          <div className="bg-gray-950/95 border-b border-gray-800 px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-sm font-bold tracking-widest text-indigo-400 uppercase">AI Interview</h1>
              {interviewPhase !== "upload" && (
                <button onClick={resetInterview} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                  ↺ Reset
                </button>
              )}
            </div>
            <PhaseIndicator
              phase={interviewPhase}
              round={currentQuestion?.round ?? 1}
              maxRounds={currentQuestion?.max_rounds ?? 2}
              qIdx={currentQuestion?.q_idx ?? 0}
              total={currentQuestion?.total_questions ?? 5}
            />
          </div>

          {/* Phase panels */}
          <div className="flex-1 overflow-y-auto bg-gray-950">
            <AnimatePresence mode="wait">

              {/* ── UPLOAD PHASE ── */}
              {(interviewPhase === "upload" || interviewPhase === "uploading") && (
                <motion.div key="upload"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="p-5 space-y-4"
                >
                  <div className="text-center mb-2">
                    <p className="text-gray-300 text-sm">Upload your resume & job details to begin the AI interview</p>
                  </div>

                  {uploadError && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-red-300 text-sm">{uploadError}</div>
                  )}

                  {/* Resume */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Resume (PDF) *</label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all
                      ${resumeFile ? "border-indigo-500 bg-indigo-900/20" : "border-gray-700 hover:border-indigo-600 bg-gray-900/50"}`}>
                      <input type="file" accept=".pdf" className="hidden"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className={`text-sm truncate ${resumeFile ? "text-indigo-300" : "text-gray-400"}`}>
                        {resumeFile ? resumeFile.name : "Click to upload resume PDF"}
                      </span>
                    </label>
                  </div>

                  {/* JD */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Job Description</label>
                      <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
                        {["file", "text"].map(m => (
                          <button key={m} onClick={() => setJdMode(m)}
                            className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium
                              ${jdMode === m ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
                            {m === "file" ? "PDF" : "Text"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {jdMode === "file" ? (
                      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all
                        ${jdFile ? "border-purple-500 bg-purple-900/20" : "border-gray-700 hover:border-purple-600 bg-gray-900/50"}`}>
                        <input type="file" accept=".pdf" className="hidden"
                          onChange={(e) => setJdFile(e.target.files?.[0] || null)} />
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className={`text-sm truncate ${jdFile ? "text-purple-300" : "text-gray-400"}`}>
                          {jdFile ? jdFile.name : "Click to upload JD PDF (optional)"}
                        </span>
                      </label>
                    ) : (
                      <textarea
                        rows={4}
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        placeholder="Paste the job description here…"
                        className="w-full bg-gray-900/70 text-white placeholder:text-gray-500 p-3 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none text-sm resize-none"
                      />
                    )}
                  </div>

                  {/* GitHub */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">GitHub Project URL (optional)</label>
                    <div className="flex items-center gap-2 bg-gray-900/70 rounded-xl border border-gray-700 focus-within:border-cyan-500 px-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username/repo"
                        className="flex-1 bg-transparent text-white placeholder:text-gray-500 py-3 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Start button */}
                  <motion.button
                    onClick={handleUpload}
                    disabled={!resumeFile || interviewPhase === "uploading"}
                    whileHover={{ scale: resumeFile ? 1.02 : 1 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300
                      ${resumeFile && interviewPhase !== "uploading"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/40"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed"
                      }`}
                  >
                    {interviewPhase === "uploading" ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Uploading & Analysing…
                      </span>
                    ) : "Start Interview →"}
                  </motion.button>
                </motion.div>
              )}

              {/* ── STARTING PHASE ── */}
              {interviewPhase === "starting" && (
                <motion.div key="starting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-4 p-8"
                >
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-indigo-300 font-medium text-center">Generating your personalised questions…</p>
                  <p className="text-gray-500 text-xs text-center">The AI is reading your resume & JD</p>
                </motion.div>
              )}

              {/* ── INTERVIEW PHASE ── */}
              {interviewPhase === "interviewing" && (
                <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col h-full"
                >
                  {/* Current question display */}
                  <div className="p-4 border-b border-gray-800">
                    <div className="flex items-start gap-3 bg-indigo-950/40 border border-indigo-700/30 rounded-2xl p-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        AI
                      </div>
                      <div>
                        <p className="text-indigo-200 text-xs font-semibold mb-1">
                          Round {currentQuestion?.round} · Question {(currentQuestion?.q_idx ?? 0) + 1} of {currentQuestion?.total_questions}
                        </p>
                        {loading ? (
                          <div className="flex gap-1.5 py-2">
                            {[0,1,2].map(i => (
                              <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 75}ms` }} />
                            ))}
                          </div>
                        ) : (
                          <p className="text-white text-sm leading-relaxed">{currentQuestion?.question}</p>
                        )}
                      </div>
                    </div>

                    {/* Feedback from previous answer */}
                    {currentQuestion?.evaluation?.score && (
                      <div className="mt-2 px-2">
                        <p className="text-xs text-gray-400">Previous answer score:</p>
                        <ScoreBar score={currentQuestion.evaluation.score} />
                        {currentQuestion.evaluation.feedback && (
                          <p className="text-xs text-gray-500 mt-1 italic">{currentQuestion.evaluation.feedback}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Answer history */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {answers.slice().reverse().map((item, i) => (
                      <div key={i} className="bg-gray-900/60 rounded-xl p-3 border border-gray-800">
                        <p className="text-gray-400 text-xs mb-1 font-medium">Q: {item.question}</p>
                        <p className="text-gray-200 text-sm">A: {item.answer}</p>
                      </div>
                    ))}
                  </div>

                  {/* Answer input */}
                  <div className="p-4 bg-gray-950/95 border-t border-gray-800">
                    <div className="flex gap-2 items-end">
                      <textarea
                        ref={answerRef}
                        rows={3}
                        disabled={loading}
                        placeholder="Type your answer here… or use the mic"
                        className="flex-1 bg-gray-900/70 text-white placeholder:text-gray-500 p-3 rounded-xl border border-gray-700/50 focus:border-indigo-500 focus:outline-none text-sm resize-none transition-all"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) handleAnswer();
                        }}
                      />
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={toggleMic}
                          disabled={loading}
                          className={`p-3 rounded-xl transition-all duration-300 border
                            ${isListening ? "bg-red-600/30 border-red-500 text-red-300 animate-pulse" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                        <button
                          onClick={handleAnswer}
                          disabled={loading}
                          className={`p-3 rounded-xl font-bold transition-all duration-300
                            ${loading ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
                        >
                          {loading
                            ? <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                          }
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs mt-1.5 text-right">Ctrl + Enter to submit</p>
                  </div>
                </motion.div>
              )}

              {/* ── COMPLETE PHASE ── */}
              {interviewPhase === "complete" && (
                <motion.div key="complete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="p-5 space-y-5"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎉</div>
                    <h2 className="text-lg font-bold text-white">Interview Complete!</h2>
                    <p className="text-gray-400 text-sm">Here's your personalised evaluation</p>
                  </div>

                  {/* Score cards */}
                  {answers.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Per-Question Scores</h3>
                      {answers.map((a, i) => (
                        <div key={i} className="bg-gray-900/70 rounded-xl p-3 border border-gray-800">
                          <p className="text-gray-300 text-xs font-medium truncate">{a.question}</p>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{a.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Report */}
                  {report && (
                    <div className="bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-700/30 rounded-2xl p-4">
                      <h3 className="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2">
                        <span>📋</span> AI Evaluation Report
                      </h3>
                      <div className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">{report}</div>
                    </div>
                  )}

                  <motion.button
                    onClick={resetInterview}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all"
                  >
                    ↺ Start New Interview
                  </motion.button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
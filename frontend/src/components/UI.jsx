import { useRef, useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";

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

const Timer = ({ active, limit, onExpire }) => {
  const [secondsLeft, setSecondsLeft] = useState(limit);

  // Reset the timer when it is not active (e.g., avatar is speaking or loading)
  useEffect(() => {
    if (!active) {
      setSecondsLeft(limit);
    }
  }, [active, limit]);

  useEffect(() => {
    let interval;
    if (active && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(interval);
            setTimeout(() => onExpire && onExpire(), 0);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [active, secondsLeft, onExpire]);

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");
  
  const isWarning = secondsLeft <= 10;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-inner transition-colors ${isWarning && active ? 'bg-red-900/40 border-red-800' : 'bg-gray-900/80 border-gray-800'}`}>
      <div className={`w-2 h-2 rounded-full ${active ? (isWarning ? 'bg-red-500 animate-bounce' : 'bg-green-500 animate-pulse') : 'bg-gray-600'}`} />
      <span className={`font-mono text-sm font-medium ${active ? (isWarning ? 'text-red-400' : 'text-green-400') : 'text-gray-500'}`}>
        {mins}:{secs}
      </span>
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
    uploadDocuments, submitAnswer, resetInterview, message, sessionId,
  } = useChat();

  const timeLimit = parseInt(localStorage.getItem("aira_time_limit") || "30");
  const isTimerActive = interviewPhase === "interviewing" && !message && !loading;
  
  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => {
    if (!isTimerActive) {
      setTimeExpired(false);
    }
  }, [isTimerActive]);

  /* upload state moved to Dashboard */

  /* answer input */
  const answerRef = useRef();
  const [isListening, setIsListening] = useState(false);
  const [code, setCode] = useState("");
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

  // Upload handler moved to Dashboard

  const handleAnswer = () => {
    const text = answerRef.current?.value?.trim();
    const codeText = code.trim();
    if (!text && !codeText && !loading && !timeExpired) return;

    if (answerRef.current) answerRef.current.value = "";
    
    let submitText = text;
    if (timeExpired && !text && !codeText) {
      submitText = "Candidate ran out of time and did not provide an answer.";
    } else if (!text && codeText) {
      submitText = "Candidate submitted code via editor.";
    } else if (!text) {
      submitText = "Candidate submitted an empty answer.";
    }

    submitAnswer(submitText, codeText || null);
    setCode("");
    setTimeExpired(false);
  };

  const handleTimeExpire = () => {
    setTimeExpired(true);
    if (isListening && recognition.current) {
      recognition.current.stop();
      setIsListening(false);
    }
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
          <div className="bg-transparent px-6 pt-4 pb-2 relative z-20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase">Live Interview</h1>
              </div>
              
              <div className="flex items-center gap-4">
                <Timer 
                  active={isTimerActive} 
                  limit={timeLimit} 
                  onExpire={handleTimeExpire} 
                />
                {interviewPhase !== "upload" && (
                  <button onClick={resetInterview} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-900 border border-gray-700 text-xs font-semibold text-gray-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-900/20 transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Restart
                  </button>
                )}
              </div>
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
          <div className="flex-1 overflow-y-auto bg-transparent">
            <AnimatePresence mode="wait">

              {/* ── UPLOAD PHASE (Handled in Dashboard) ── */}
              {(interviewPhase === "upload" || interviewPhase === "uploading") && (
                <motion.div key="upload"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-6 p-8 relative overflow-hidden"
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                  
                  {interviewPhase === "upload" ? (
                    <div className="text-center relative z-10 max-w-sm">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3 hover:rotate-0 transition-transform">
                        <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Session Inactive</h2>
                      <p className="text-gray-400 text-sm mb-8 leading-relaxed">You need to configure your interview session from the dashboard before we can begin.</p>
                      
                      <button onClick={() => window.location.href='/dashboard'} className="group relative inline-flex items-center justify-center w-full px-8 py-3.5 font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl overflow-hidden transition-all hover:scale-[1.02] shadow-xl shadow-indigo-500/25">
                        <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
                        <span className="relative flex items-center gap-2">Return to Dashboard <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center relative z-10">
                      <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-8 h-8 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Initializing Session</h2>
                      <p className="text-indigo-300/80 font-medium text-sm mb-1">Analyzing your credentials…</p>
                      <p className="text-gray-500 text-xs">Setting up isolated interview environment</p>
                    </div>
                  )}
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
                        <p className="text-indigo-200 text-xs font-semibold mb-1 flex items-center gap-2">
                          <span>Round {currentQuestion?.round} · Question {(currentQuestion?.q_idx ?? 0) + 1} of {currentQuestion?.total_questions}</span>
                          {(currentQuestion?.source_tags || []).map((tag, i) => (
                            <span key={i} className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] uppercase border border-indigo-500/30">
                              {tag}
                            </span>
                          ))}
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

                  {/* Code Editor Space */}
                  <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col">
                    <AnimatePresence>
                      {currentQuestion?.is_coding_task && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="w-full h-[45vh] min-h-[300px] max-h-[400px] bg-gray-900 rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl mt-2"
                        >
                          <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value)}
                            options={{ 
                              minimap: { enabled: false }, 
                              fontSize: 14, 
                              padding: { top: 16 },
                              readOnly: loading || timeExpired 
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Answer input */}
                  <div className="p-4 bg-gray-950/95 border-t border-gray-800">
                    <div className="flex gap-2 items-end">
                      <textarea
                        ref={answerRef}
                        rows={3}
                        disabled={loading || timeExpired}
                        placeholder={timeExpired ? "Time's up! Please click submit to proceed." : "Type your answer here… or use the mic"}
                        className="flex-1 bg-gray-900/70 text-white placeholder:text-gray-500 p-3 rounded-xl border border-gray-700/50 focus:border-indigo-500 focus:outline-none text-sm resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) handleAnswer();
                        }}
                      />
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={toggleMic}
                          disabled={loading || timeExpired}
                          className={`p-3 rounded-xl transition-all duration-300 border
                            ${isListening ? "bg-red-600/30 border-red-500 text-red-300 animate-pulse" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"}
                            disabled:opacity-50 disabled:cursor-not-allowed`}
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
                          {a.code && (
                            <pre className="mt-2 bg-black/50 p-2 rounded-lg border border-gray-800 text-[10px] text-gray-400 overflow-x-auto custom-scrollbar">
                              <code>{a.code}</code>
                            </pre>
                          )}
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
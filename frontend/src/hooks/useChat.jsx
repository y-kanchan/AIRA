import { createContext, useContext, useEffect, useState, useCallback } from "react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages]         = useState([]);
  const [message, setMessage]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);

  // ── Interview state ────────────────────────────────────────────────────────
  const [interviewPhase, setInterviewPhase] = useState("upload");
  // "upload" | "uploading" | "starting" | "interviewing" | "complete"

  const [sessionId, setSessionId]           = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  // { question, q_idx, round, total_questions, max_rounds, audio, lipsync,
  //   facialExpression, animation, animationTimeline, evaluation }

  const [answers, setAnswers]   = useState([]);   // history of {question, answer}
  const [report, setReport]     = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Ping backend on load to show terminal activity
  useEffect(() => {
    fetch(`${backendUrl}/ping`).catch(() => {});
  }, []);

  // ── Avatar message queue ──────────────────────────────────────────────────
  const onMessagePlayed = useCallback(() => {
    setMessages((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    setMessage(messages.length > 0 ? messages[0] : null);
  }, [messages]);

  // Push an avatar message (question spoken by avatar)
  const _pushAvatarMessage = useCallback((data) => {
    const msg = {
      text:              data.question || data.text || "",
      audio:             data.audio    || null,
      lipsync:           data.lipsync  || { mouthCues: [] },
      facialExpression:  data.facialExpression  || "smile",
      animation:         data.animation         || "Talking_0",
      animationTimeline: data.animationTimeline || [
        { time: 0,   action: "greeting",    animation: "Talking_0", expression: "smile" },
        { time: 2,   action: "explanation", animation: "Talking_1", expression: "default" },
        { time: 5,   action: "closing",     animation: "Talking_0", expression: "smile" }
      ]
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ── Phase 1: Upload documents ─────────────────────────────────────────────
  const uploadDocuments = useCallback(async ({ resumeFile, jdFile, jdText, githubUrl }) => {
    setUploadError(null);
    setInterviewPhase("uploading");

    const form = new FormData();
    form.append("resume", resumeFile);
    if (jdFile)    form.append("jd",        jdFile);
    if (jdText)    form.append("jd_text",   jdText);
    if (githubUrl) form.append("github_url", githubUrl);

    try {
      const token = localStorage.getItem("ai_tutor_token");
      const resp = await fetch(`${backendUrl}/interview/upload-documents`, {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: form
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed (${resp.status})`);
      }
      const data = await resp.json();
      setSessionId(data.session_id);
      // Automatically start interview after upload
      await _startInterview(data.session_id);
    } catch (e) {
      setUploadError(e.message);
      setInterviewPhase("upload");
    }
  }, []);

  // ── Phase 2: Start interview ──────────────────────────────────────────────
  const _startInterview = useCallback(async (sid) => {
    setInterviewPhase("starting");
    setLoading(true);
    try {
      const token = localStorage.getItem("ai_tutor_token");
      const resp = await fetch(`${backendUrl}/interview/start/${sid}`, { 
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error(`Start failed (${resp.status})`);
      const data = await resp.json();

      setCurrentQuestion(data);
      setInterviewPhase("interviewing");
      _pushAvatarMessage(data);
    } catch (e) {
      setUploadError(e.message);
      setInterviewPhase("upload");
    } finally {
      setLoading(false);
    }
  }, [_pushAvatarMessage]);

  // ── Phase 3: Submit answer ────────────────────────────────────────────────
  const submitAnswer = useCallback(async (answer, code = null) => {
    if (!sessionId || !currentQuestion) return;
    setLoading(true);

    // Record the answered pair
    setAnswers((prev) => [...prev, { question: currentQuestion.question, answer, code }]);

    try {
      const token = localStorage.getItem("ai_tutor_token");
      const resp = await fetch(`${backendUrl}/interview/answer`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ session_id: sessionId, answer, code })
      });
      if (!resp.ok) throw new Error(`Answer submit failed (${resp.status})`);
      const data = await resp.json();

      if (data.complete) {
        setReport(data.report);
        setInterviewPhase("complete");
        // Final avatar message
        _pushAvatarMessage({
          text: "Thank you for completing the interview! Your report is ready.",
          facialExpression: "smile",
          animation: "Talking_0",
          animationTimeline: [
            { time: 0, action: "closing", animation: "Talking_0", expression: "smile" },
            { time: 2, action: "idle",    animation: "Idle",       expression: "default" }
          ]
        });
      } else {
        setCurrentQuestion(data);
        _pushAvatarMessage(data);
      }
    } catch (e) {
      console.error("Answer submit error:", e);
    } finally {
      setLoading(false);
    }
  }, [sessionId, currentQuestion, _pushAvatarMessage]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetInterview = useCallback(() => {
    setInterviewPhase("upload");
    setSessionId(null);
    setCurrentQuestion(null);
    setAnswers([]);
    setReport(null);
    setUploadError(null);
    setMessages([]);
    setMessage(null);
  }, []);

  return (
    <ChatContext.Provider value={{
      // Avatar
      message,
      onMessagePlayed,
      loading,
      cameraZoomed,
      setCameraZoomed,
      // Interview
      interviewPhase,
      sessionId,
      currentQuestion,
      answers,
      report,
      uploadError,
      uploadDocuments,
      submitAnswer,
      resetInterview,
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};

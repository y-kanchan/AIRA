import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BrainCircuit, Activity, CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react";
import Sidebar from "../components/Sidebar";

export default function Report() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "https://aira-u9qv.onrender.com"}/interview/report/${sessionId}`);
        if (!res.ok) throw new Error("Failed to load report");
        const json = await res.json();
        
        let reportData = {};
        try {
          reportData = JSON.parse(json.report);
        } catch(e) {
          console.error("Report is not valid JSON", e);
        }

        setData({
          answers: json.answers,
          params: reportData
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#070707] text-white font-sans">
        <Sidebar activeTab="history" />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#070707] text-white font-sans">
        <Sidebar activeTab="history" />
        <main className="flex-1 flex flex-col items-center justify-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate("/dashboard", { state: { activeTab: "history" }})} className="text-indigo-400 hover:underline">Return to History</button>
        </main>
      </div>
    );
  }

  const { params, answers } = data;

  const scoreItems = [
    { label: "Overall Score", value: params.overall_score },
    { label: "Confidence", value: params.confidence_score },
    { label: "Technical Depth", value: params.technical_depth },
    { label: "Communication", value: params.clarity_and_communication },
    { label: "Problem Solving", value: params.problem_solving_ability },
    { label: "Industry Ready", value: params.industry_readiness },
    { label: "Cultural Fit", value: params.cultural_fit },
    { label: "Leadership", value: params.leadership_potential },
    { label: "Critical Thinking", value: params.critical_thinking },
    { label: "Domain Knowledge", value: params.domain_knowledge },
    { label: "Grammar & Fluency", value: params.grammar_and_fluency },
    { label: "Handling Ambiguity", value: params.handling_ambiguity },
  ];

  return (
    <div className="flex min-h-screen bg-[#070707] text-white font-sans">
      <Sidebar activeTab="history" />

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto space-y-8">
          <button onClick={() => navigate("/dashboard", { state: { activeTab: "history" }})} className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>

          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gray-800 border-2 border-[#111] flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Interview Report</h1>
              <p className="text-sm text-gray-400">Detailed AI Analysis & Breakdown</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Metrics */}
            <div className="lg:col-span-1 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 hover:border-gray-600 hover:shadow-xl hover:shadow-white/5 transition-all duration-500">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" /> Assessment Metrics</h2>
                <div className="grid grid-cols-2 gap-4">
                  {scoreItems.map((item, i) => (
                    <div key={i} className="bg-[#111] rounded-2xl p-4 border border-gray-800 flex flex-col justify-between hover:border-gray-600 transition-all duration-300">
                      <p className="text-xs text-gray-500 font-semibold mb-2">{item.label}</p>
                      <div className="flex items-end gap-1">
                        <span className={`text-xl font-bold ${item.value >= 8 ? 'text-emerald-400' : item.value >= 6 ? 'text-indigo-400' : 'text-red-400'}`}>
                          {item.value || 0}
                        </span>
                        <span className="text-xs text-gray-600 mb-1">/10</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider mb-1">AI Detection Probability</p>
                    <p className="text-[10px] text-gray-400">Likelihood of rehearsed or generated answers</p>
                  </div>
                  <span className="text-2xl font-bold text-purple-400">{params.ai_detection_probability || 0}%</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 hover:border-gray-600 hover:shadow-xl hover:shadow-white/5 transition-all duration-500">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-5 h-5" /> Key Strengths</h3>
                <ul className="space-y-3">
                  {(params.key_strengths || []).map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-3 bg-[#111] p-3 rounded-xl border border-gray-800">
                      <span className="text-emerald-500 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>

                <h3 className="font-bold mb-4 mt-8 flex items-center gap-2 text-red-400"><AlertTriangle className="w-5 h-5" /> Areas for Improvement</h3>
                <ul className="space-y-3">
                  {(params.areas_for_improvement || []).map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-3 bg-[#111] p-3 rounded-xl border border-gray-800">
                      <span className="text-red-500 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Right Column: Q&A */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 hover:border-gray-600 hover:shadow-xl hover:shadow-white/5 transition-all duration-500">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-400" /> Full Interview Transcript</h2>
                
                <div className="space-y-6">
                  {answers.map((item, i) => (
                    <div key={i} className="bg-[#111] rounded-3xl border border-gray-800 p-6 hover:border-gray-600 transition-all duration-300">
                      <div className="flex gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm border border-gray-700">
                          Q{i+1}
                        </div>
                        <p className="text-sm text-gray-200 mt-2 font-medium leading-relaxed">{item.question}</p>
                      </div>
                      
                      <div className="flex gap-3 mb-3 pl-14">
                        {(item.source_tags && item.source_tags.length > 0) && (
                          <div className="flex gap-2">
                            {item.source_tags.map((tag, idx) => (
                              <span key={idx} className="bg-indigo-900/30 text-indigo-300 px-2.5 py-1 rounded-md text-[10px] uppercase font-semibold tracking-wider">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3 mb-5 pl-14">
                        <p className="text-sm text-gray-400 italic leading-relaxed">"{item.answer}"</p>
                      </div>

                      <div className="pl-14 pt-5 border-t border-gray-800/80">
                        <div className="flex items-center gap-4 mb-3">
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                            item.score >= 8 ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' :
                            item.score >= 6 ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'
                          }`}>Score: {item.score}/10</span>
                        </div>
                        <p className="text-xs text-indigo-300 leading-relaxed"><span className="font-bold text-indigo-400">Feedback:</span> {item.feedback}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

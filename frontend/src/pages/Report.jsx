import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BrainCircuit, Activity, CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react";

export default function Report() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`http://localhost:8000/interview/report/${sessionId}`);
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => navigate("/dashboard")} className="text-indigo-400 hover:underline">Return to Dashboard</button>
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
    <div className="min-h-screen bg-gray-950 text-white p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-400" /> Assessment Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                {scoreItems.map((item, i) => (
                  <div key={i} className="bg-gray-950 rounded-xl p-3 border border-gray-800 flex flex-col justify-between">
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

              <div className="mt-6 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-300 font-semibold uppercase tracking-wider mb-1">AI Detection Probability</p>
                  <p className="text-xs text-gray-400">Likelihood of rehearsed or generated answers</p>
                </div>
                <span className="text-2xl font-bold text-purple-400">{params.ai_detection_probability || 0}%</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-5 h-5" /> Key Strengths</h3>
              <ul className="space-y-2">
                {(params.key_strengths || []).map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>

              <h3 className="font-bold mb-4 mt-8 flex items-center gap-2 text-red-400"><AlertTriangle className="w-5 h-5" /> Areas for Improvement</h3>
              <ul className="space-y-2">
                {(params.areas_for_improvement || []).map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Right Column: Q&A */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-400" /> Full Interview Transcript</h2>
              
              <div className="space-y-6">
                {answers.map((item, i) => (
                  <div key={i} className="bg-gray-950 rounded-2xl border border-gray-800 p-5">
                    <div className="flex gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400 font-bold text-xs border border-indigo-500/30">
                        Q{i+1}
                      </div>
                      <p className="text-sm text-gray-200 mt-1 font-medium">{item.question}</p>
                    </div>
                    
                    <div className="flex gap-3 mb-2 pl-11">
                      {(item.source_tags && item.source_tags.length > 0) && (
                        <div className="flex gap-2">
                          {item.source_tags.map((tag, idx) => (
                            <span key={idx} className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] uppercase border border-indigo-500/30">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3 mb-4 pl-11">
                      <p className="text-sm text-gray-400 italic">"{item.answer}"</p>
                    </div>

                    <div className="pl-11 pt-4 border-t border-gray-800/50">
                      <div className="flex items-center gap-4 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          item.score >= 8 ? 'bg-emerald-500/10 text-emerald-400' :
                          item.score >= 6 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-500/10 text-red-400'
                        }`}>Score: {item.score}/10</span>
                      </div>
                      <p className="text-xs text-indigo-300 leading-relaxed"><span className="font-semibold">Feedback:</span> {item.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}

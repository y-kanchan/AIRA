import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Bot, Briefcase, Activity, Calendar, History, LogOut, Code, Database, Trash2 } from "lucide-react";
import { useChat } from "../hooks/useChat";

export default function Dashboard() {
  const navigate = useNavigate();
  const { uploadDocuments, interviewPhase, uploadError } = useChat();

  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [jdMode, setJdMode] = useState("file");
  const [githubUrls, setGithubUrls] = useState([]);
  const [newGithubUrl, setNewGithubUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [timeLimit, setTimeLimit] = useState(30);
  const [savingSettings, setSavingSettings] = useState(false);
  
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]); // kept for backward compat / extra github links
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  const [resumeMode, setResumeMode] = useState("upload"); // upload | library
  const [selectedResumeId, setSelectedResumeId] = useState("");
  
  const [selectedJdId, setSelectedJdId] = useState("");

  const [githubMode, setGithubMode] = useState("url"); // url | library
  const [selectedGithubId, setSelectedGithubId] = useState("");

  const addGithubUrl = () => {
    if (newGithubUrl.trim() && !githubUrls.includes(newGithubUrl.trim())) {
      setGithubUrls([...githubUrls, newGithubUrl.trim()]);
      setNewGithubUrl("");
    }
  };

  const removeGithubUrl = (url) => {
    setGithubUrls(githubUrls.filter(u => u !== url));
  };

  // Authentication & History Fetch
  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("ai_tutor_token");
      if (!token) {
        navigate("/login");
        return;
      }
      
      try {
        const res = await fetch("http://localhost:8000/user/history", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          localStorage.removeItem("ai_tutor_token");
          navigate("/login");
          return;
        }
        
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history);
        }
        
        // Fetch Settings
        const settingsRes = await fetch("http://localhost:8000/user/settings", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setTimeLimit(sData.time_limit || 30);
          localStorage.setItem("aira_time_limit", sData.time_limit || 30);
        }

        // Fetch Materials
        const matsRes = await fetch("http://localhost:8000/user/materials", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (matsRes.ok) {
          const mData = await matsRes.json();
          setMaterials(mData.materials);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    fetchHistory();
  }, [navigate]);

  const saveTimeLimit = async (newLimit) => {
    setTimeLimit(newLimit);
    localStorage.setItem("aira_time_limit", newLimit);
    const token = localStorage.getItem("ai_tutor_token");
    if (!token) return;
    setSavingSettings(true);
    try {
      await fetch("http://localhost:8000/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ time_limit: newLimit })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const uploadToLibrary = async (type, name, file, content, quiet = false) => {
    const token = localStorage.getItem("ai_tutor_token");
    if (!token) return null;
    setUploadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append("material_type", type);
      formData.append("name", name);
      if (file) formData.append("file", file);
      if (content) formData.append("content", content);
      
      const res = await fetch("http://localhost:8000/user/materials/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials((prev) => [...prev, data.material]);
        setSelectedMaterials((prev) => [...prev, data.material.id]);
        // Reset inputs so they don't get uploaded twice
        if (type === 'resume') setResumeFile(null);
        if (type === 'jd') { setJdFile(null); setJdText(""); }
        if (type === 'github') setNewGithubUrl("");
        
        return data.material.id;
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = `Failed to upload to library: ${errData.detail || res.status}`;
        if (!quiet) alert(errMsg);
        return { error: errMsg };
      }
    } catch (e) {
      console.error(e);
      if (!quiet) alert("Error uploading to library.");
      return { error: e.message };
    } finally {
      setUploadingMaterial(false);
    }
  };

  const deleteMaterial = async (id) => {
    const token = localStorage.getItem("ai_tutor_token");
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/user/materials/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMaterials(materials.filter(m => m.id !== id));
        setSelectedMaterials(selectedMaterials.filter(m => m !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMaterialSelection = (id) => {
    if (selectedMaterials.includes(id)) {
      setSelectedMaterials(selectedMaterials.filter(m => m !== id));
    } else {
      setSelectedMaterials([...selectedMaterials, id]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ai_tutor_token");
    navigate("/");
  };

  const handleStart = async () => {
    const hasSelectedResume = materials.find(m => selectedMaterials.includes(m.id) && m.type === "resume") || selectedResumeId;
    if (!resumeFile && !hasSelectedResume) return;
    
    // Auto-save new files to the materials library
    let newMaterialIds = [];
    
    // Add dropdown selections
    if (resumeMode === 'library' && selectedResumeId) newMaterialIds.push(selectedResumeId);
    if (jdMode === 'library' && selectedJdId) newMaterialIds.push(selectedJdId);
    if (githubMode === 'library' && selectedGithubId) newMaterialIds.push(selectedGithubId);
    
    if (resumeMode === 'upload' && resumeFile) {
      const res = await uploadToLibrary("resume", resumeFile.name, resumeFile, null, true);
      if (res && res.error) {
        alert("Resume Error: " + res.error);
        return;
      }
      if (res) newMaterialIds.push(res);
    }
    
    if (jdMode !== 'library' && (jdFile || jdText)) {
      const res = await uploadToLibrary("jd", jdFile ? jdFile.name : "Pasted JD", jdFile, jdMode === "text" ? jdText : null, true);
      if (res && res.error) {
        alert("JD Error: " + res.error);
        return;
      }
      if (res) newMaterialIds.push(res);
    }
    
    if (githubMode === 'url' && githubUrls.length > 0) {
      const res = await uploadToLibrary("github", githubUrls[0].replace("https://github.com/", ""), null, githubUrls.join(","), true);
      if (res && res.error) {
        alert("GitHub Error: " + res.error);
        return;
      }
      if (res) newMaterialIds.push(res);
    }

    if (!window.airaGlobalAudio) {
      window.airaGlobalAudio = new Audio();
      window.airaGlobalAudio.play().catch(() => {});
    }

    const finalIds = [...new Set([...selectedMaterials, ...newMaterialIds])].join(",");

    // Trigger upload in global state. Since we auto-saved, we ONLY pass material_ids
    // and set the raw files to null so they aren't uploaded again.
    uploadDocuments({ 
      resumeFile: null, 
      jdFile: null, 
      jdText: "", 
      githubUrl: "",
      material_ids: finalIds
    });
    
    // Immediately redirect to the interview room
    navigate("/interview");
  };

  const mockHistory = [
    { date: "Oct 24, 2025", role: "Senior Frontend Developer", score: 8.5, status: "Excellent" },
    { date: "Sep 12, 2025", role: "React Engineer", score: 7.2, status: "Good" },
    { date: "Aug 05, 2025", role: "Fullstack Developer", score: 6.0, status: "Needs Improvement" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 pb-20">
      {/* Header */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AIRA</h1>
            <p className="text-xs text-gray-400">Candidate Dashboard</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload & Start Interview */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm"
          >
            <h2 className="text-2xl font-bold mb-2">Start New Interview</h2>
            <p className="text-gray-400 text-sm mb-8">Upload your documents below. The AI will analyze them and generate targeted technical questions.</p>

            {uploadError && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-red-300 text-sm mb-6">{uploadError}</div>
            )}

            <div className="space-y-6">
              {/* Resume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Resume (PDF) *
                  </label>
                  <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                    <button onClick={() => setResumeMode("upload")} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${resumeMode === "upload" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>Upload New</button>
                    <button onClick={() => setResumeMode("library")} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${resumeMode === "library" ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>From Library</button>
                  </div>
                </div>

                {resumeMode === "upload" ? (
                  <>
                    <label className={`flex items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                      ${resumeFile ? "border-indigo-500 bg-indigo-900/10" : "border-gray-700 hover:border-indigo-600 bg-gray-900/50"}`}>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                      <div className="text-center">
                        <FileText className={`w-8 h-8 mx-auto mb-2 ${resumeFile ? "text-indigo-400" : "text-gray-600"}`} />
                        <span className={`text-sm font-medium ${resumeFile ? "text-indigo-300" : "text-gray-400"}`}>
                          {resumeFile ? resumeFile.name : "Click to browse or drag PDF here"}
                        </span>
                      </div>
                    </label>
                  </>
                ) : (
                  <select 
                    value={selectedResumeId} 
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full bg-gray-900/50 text-white p-4 rounded-xl border border-gray-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Select a saved Resume --</option>
                    {materials.filter(m => m.type === 'resume').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* JD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Job Description
                  </label>
                  <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                    <button onClick={() => setJdMode("file")} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${jdMode === "file" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>PDF</button>
                    <button onClick={() => setJdMode("text")} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${jdMode === "text" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>Text</button>
                    <button onClick={() => setJdMode("library")} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${jdMode === "library" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>Library</button>
                  </div>
                </div>
                {jdMode === "file" && (
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${jdFile ? "border-purple-500 bg-purple-900/10" : "border-gray-700 hover:border-purple-600 bg-gray-900/50"}`}>
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => setJdFile(e.target.files?.[0] || null)} />
                    <Briefcase className={`w-5 h-5 flex-shrink-0 ${jdFile ? "text-purple-400" : "text-gray-500"}`} />
                    <span className={`text-sm truncate ${jdFile ? "text-purple-300" : "text-gray-400"}`}>{jdFile ? jdFile.name : "Upload JD PDF (optional)"}</span>
                  </label>
                )}
                {jdMode === "text" && (
                  <textarea rows={4} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the job description here…" className="w-full bg-gray-900/50 text-white placeholder:text-gray-500 p-4 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none text-sm resize-none" />
                )}
                {jdMode === "library" && (
                  <select 
                    value={selectedJdId} 
                    onChange={(e) => setSelectedJdId(e.target.value)}
                    className="w-full bg-gray-900/50 text-white p-4 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">-- Select a saved JD --</option>
                    {materials.filter(m => m.type === 'jd').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* GitHub Links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                    <Code className="w-4 h-4" /> GitHub Repos (Optional)
                  </label>
                  <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
                    <button onClick={() => setGithubMode("url")} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${githubMode === "url" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>Enter URL</button>
                    <button onClick={() => setGithubMode("library")} className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${githubMode === "library" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>Library</button>
                  </div>
                </div>

                {githubMode === "url" ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newGithubUrl}
                        onChange={(e) => setNewGithubUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGithubUrl())}
                        placeholder="https://github.com/username/repo"
                        className="flex-1 bg-gray-900/50 text-white placeholder:text-gray-500 p-4 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <button 
                        type="button" 
                        onClick={addGithubUrl}
                        className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl border border-gray-700 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </>
                ) : (
                  <select 
                    value={selectedGithubId} 
                    onChange={(e) => setSelectedGithubId(e.target.value)}
                    className="w-full bg-gray-900/50 text-white p-4 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select a saved GitHub link --</option>
                    {materials.filter(m => m.type === 'github').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
                {githubUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {githubUrls.map((url, i) => (
                      <span key={i} className="inline-flex items-center gap-2 bg-blue-900/20 text-blue-300 text-xs px-3 py-1.5 rounded-lg border border-blue-800/50">
                        <span className="truncate max-w-[200px]">{url.replace("https://github.com/", "")}</span>
                        <button type="button" onClick={() => removeGithubUrl(url)} className="text-blue-400 hover:text-blue-200">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {githubUrls.length > 0 && (
                  <button 
                    onClick={() => uploadToLibrary("github", githubUrls[0].replace("https://github.com/", ""), null, githubUrls.join(","))} 
                    disabled={uploadingMaterial} 
                    className="text-xs bg-blue-900/50 text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors w-full text-left"
                  >
                    {uploadingMaterial ? "Uploading..." : "+ Save to Materials Library"}
                  </button>
                )}
              </div>

            <div className="mt-8 pt-6 border-t border-gray-800">
              <button 
                onClick={handleStart} 
                disabled={!(resumeFile && resumeMode === 'upload') && !(selectedResumeId && resumeMode === 'library') && !materials.find(m => selectedMaterials.includes(m.id) && m.type === "resume")}
                className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all duration-300 flex items-center justify-center gap-2 mt-4
                  ${((resumeFile && resumeMode === 'upload') || (selectedResumeId && resumeMode === 'library') || materials.find(m => selectedMaterials.includes(m.id) && m.type === "resume"))
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/20 hover:-translate-y-0.5" 
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"}`}
              >
                Start Technical Interview <Activity className="w-5 h-5" />
              </button>
            </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Profile & Settings & Materials */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold text-white border-4 border-gray-800">
                JD
              </div>
              <div>
                <h3 className="text-lg font-bold">Jane Doe</h3>
                <p className="text-sm text-gray-400">Software Engineer</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
                <p className="text-xs text-gray-500 font-semibold mb-1">Interviews</p>
                <p className="text-2xl font-bold text-indigo-400">{history.length}</p>
              </div>
              <div className="bg-gray-950 rounded-xl p-3 border border-gray-800">
                <p className="text-xs text-gray-500 font-semibold mb-1">Avg Score</p>
                <p className="text-2xl font-bold text-purple-400">
                  {history.length > 0 ? (history.reduce((acc, curr) => acc + curr.score, 0) / history.length).toFixed(1) : "0.0"}
                </p>
              </div>
            </div>
          </motion.div>

            {/* Materials Library Section */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Materials Library
                </h3>
                <button onClick={() => navigate("/materials")} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                  Manage
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {materials.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={selectedMaterials.includes(m.id)} 
                        onChange={() => toggleMaterialSelection(m.id)}
                        className="rounded border-gray-700 bg-gray-900 accent-indigo-500"
                      />
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{m.type}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteMaterial(m.id)} className="text-gray-600 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

          {/* Settings / Time Limit */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
            <h3 className="font-bold flex items-center gap-2 mb-4">⚙️ Interview Settings</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-300 font-medium">Time Limit per Question</label>
                  <span className="text-indigo-400 font-bold font-mono">{timeLimit}s</span>
                </div>
                <input 
                  type="range" 
                  min="15" 
                  max="120" 
                  step="5"
                  value={timeLimit} 
                  onChange={(e) => saveTimeLimit(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>15s</span>
                  <span>{savingSettings ? "Saving..." : "Saved"}</span>
                  <span>120s</span>
                </div>
              </div>
            </div>
          </motion.div>


          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-gray-400" /> Recent History</h3>
              <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
            </div>
            
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4f46e5 transparent' }}>
              {loadingHistory ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No interviews completed yet.</p>
              ) : (
                history.map((item, i) => (
                  <div key={i} onClick={() => item.session_id && navigate(`/report/${item.session_id}`)} className="bg-gray-950 p-4 rounded-xl border border-gray-800 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">{item.role}</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        item.score >= 8 ? 'bg-emerald-500/10 text-emerald-400' :
                        item.score >= 7 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {item.score}/10
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" /> {new Date(item.date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

      </main>
    </div>
  );
}

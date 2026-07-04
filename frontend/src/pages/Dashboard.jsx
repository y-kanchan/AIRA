import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Bot, Briefcase, Activity, Calendar, History, LogOut, Code, Database, Trash2 } from "lucide-react";
import { useChat } from "../hooks/useChat";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "new_interview");
  
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state?.activeTab]);

  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]); // kept for backward compat / extra github links
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

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
        const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/user/history", {
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
        const settingsRes = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/user/settings", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setTimeLimit(sData.time_limit || 30);
          localStorage.setItem("aira_time_limit", sData.time_limit || 30);
        }

        // Fetch Materials
        const matsRes = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/user/materials", {
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
      await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/user/settings", {
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
      
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/user/materials/upload", {
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
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    const token = localStorage.getItem("ai_tutor_token");
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/user/materials/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMaterials(materials.filter(m => m.id !== id));
        setSelectedMaterials(selectedMaterials.filter(m => m !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Delete failed: ${res.status} ${err.detail || ''}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Delete error: ${e.message}`);
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
    if (isStarting) return;
    setIsStarting(true);
    
    const hasSelectedResume = materials.find(m => selectedMaterials.includes(m.id) && m.type === "resume") || selectedResumeId;
    if (!resumeFile && !hasSelectedResume) {
      setIsStarting(false);
      return;
    }
    
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
        setIsStarting(false);
        return;
      }
      if (res) newMaterialIds.push(res);
    }
    
    if (jdMode !== 'library' && (jdFile || jdText)) {
      const res = await uploadToLibrary("jd", jdFile ? jdFile.name : "Pasted JD", jdFile, jdMode === "text" ? jdText : null, true);
      if (res && res.error) {
        alert("JD Error: " + res.error);
        setIsStarting(false);
        return;
      }
      if (res) newMaterialIds.push(res);
    }
    
    if (githubMode === 'url' && githubUrls.length > 0) {
      const res = await uploadToLibrary("github", githubUrls[0].replace("https://github.com/", ""), null, githubUrls.join(","), true);
      if (res && res.error) {
        alert("GitHub Error: " + res.error);
        setIsStarting(false);
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

  return (
    <div className="flex min-h-screen bg-[#070707] text-white font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto w-full">
        <div className="max-w-3xl mx-auto">
          {activeTab === 'new_interview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-3 tracking-tight">Configure Interview</h1>
                <p className="text-gray-400 text-sm">Provide your details and we will tailor the AI interviewer to test the exact skills required.</p>
              </div>

              {uploadError && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-red-300 text-sm">{uploadError}</div>
              )}

              {/* Form sections */}
              <div className="space-y-6">
                {/* 1. UPLOAD RESUME */}
                <div className="border border-gray-800 rounded-2xl p-6 bg-transparent hover:border-gray-600 hover:bg-[#0c0c0c] transition-all duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2 uppercase">
                      <FileText className="w-4 h-4" /> 1. Upload Resume (Required)
                    </h3>
                    <div className="flex bg-[#111] border border-gray-800 rounded-lg p-1">
                      <button onClick={() => setResumeMode("upload")} className={`text-xs px-3 py-1.5 rounded-md transition-all ${resumeMode === "upload" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>Upload</button>
                      <button onClick={() => setResumeMode("library")} className={`text-xs px-3 py-1.5 rounded-md transition-all ${resumeMode === "library" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>Library</button>
                    </div>
                  </div>

                  {resumeMode === "upload" ? (
                    <label className={`flex flex-col items-center justify-center p-10 rounded-xl border border-dashed ${resumeFile ? "border-teal-500 bg-teal-900/10" : "border-gray-800 bg-[#0c0c0c] hover:border-gray-500 hover:bg-[#111]"} cursor-pointer transition-all duration-300 group`}>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                      <div className="w-10 h-10 bg-gray-800/50 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 group-hover:bg-gray-700/50">
                        <FileText className={`w-5 h-5 ${resumeFile ? "text-teal-400" : "text-gray-400 group-hover:text-white"}`} />
                      </div>
                      <span className={`text-sm font-medium mb-1 ${resumeFile ? "text-teal-300" : "text-white"}`}>
                        {resumeFile ? resumeFile.name : "Click to browse or drag PDF here"}
                      </span>
                      <span className="text-xs text-gray-500">Maximum file size 5MB</span>
                    </label>
                  ) : (
                    <select 
                      value={selectedResumeId} 
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="w-full bg-[#0c0c0c] text-white p-4 rounded-xl border border-gray-800 focus:border-gray-600 focus:outline-none"
                    >
                      <option value="">-- Select a saved Resume --</option>
                      {materials.filter(m => m.type === 'resume').map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. TARGET JOB DESCRIPTION */}
                <div className="border border-gray-800 rounded-2xl p-6 bg-transparent hover:border-gray-600 hover:bg-[#0c0c0c] transition-all duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2 uppercase">
                      <Briefcase className="w-4 h-4" /> 2. Target Job Description
                    </h3>
                    <div className="flex bg-[#111] border border-gray-800 rounded-lg p-1">
                      <button onClick={() => setJdMode("file")} className={`text-xs px-3 py-1.5 rounded-md transition-all ${jdMode === "file" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>PDF</button>
                      <button onClick={() => setJdMode("text")} className={`text-xs px-3 py-1.5 rounded-md transition-all ${jdMode === "text" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>Text</button>
                      <button onClick={() => setJdMode("library")} className={`text-xs px-3 py-1.5 rounded-md transition-all ${jdMode === "library" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>Library</button>
                    </div>
                  </div>

                  {jdMode === "file" && (
                    <label className={`flex items-center gap-4 p-5 rounded-xl border border-dashed ${jdFile ? "border-emerald-500 bg-emerald-900/10" : "border-gray-800 bg-[#0c0c0c] hover:border-gray-500 hover:bg-[#111]"} cursor-pointer transition-all duration-300 group`}>
                      <input type="file" accept=".pdf" className="hidden" onChange={(e) => setJdFile(e.target.files?.[0] || null)} />
                      <div className="w-10 h-10 bg-gray-800/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-gray-700/50">
                        <Briefcase className={`w-5 h-5 ${jdFile ? "text-emerald-400" : "text-gray-400 group-hover:text-white"}`} />
                      </div>
                      <span className={`text-sm font-medium ${jdFile ? "text-emerald-300" : "text-gray-400"}`}>{jdFile ? jdFile.name : "Upload JD PDF (optional)"}</span>
                    </label>
                  )}
                  {jdMode === "text" && (
                    <textarea rows={4} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the job description here…" className="w-full bg-[#0c0c0c] text-white placeholder:text-gray-600 p-5 rounded-xl border border-gray-800 focus:border-gray-600 focus:outline-none text-sm resize-none" />
                  )}
                  {jdMode === "library" && (
                    <select 
                      value={selectedJdId} 
                      onChange={(e) => setSelectedJdId(e.target.value)}
                      className="w-full bg-[#0c0c0c] text-white p-4 rounded-xl border border-gray-800 focus:border-gray-600 focus:outline-none"
                    >
                      <option value="">-- Select a saved JD --</option>
                      {materials.filter(m => m.type === 'jd').map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 3. GITHUB CONTEXT */}
                <div className="border border-gray-800 rounded-2xl p-6 bg-transparent hover:border-gray-600 hover:bg-[#0c0c0c] transition-all duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-gray-400 tracking-wider flex items-center gap-2 uppercase">
                      <Code className="w-4 h-4" /> 3. Github Context
                    </h3>
                    <div className="flex bg-[#111] border border-gray-800 rounded-lg p-1">
                      <button onClick={() => setGithubMode("url")} className={`text-xs px-3 py-1.5 rounded-md transition-all ${githubMode === "url" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>Link</button>
                      <button onClick={() => setGithubMode("library")} className={`text-xs px-3 py-1.5 rounded-md transition-all ${githubMode === "library" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>Library</button>
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
                          className="flex-1 bg-[#0c0c0c] text-white placeholder:text-gray-600 p-4 rounded-xl border border-gray-800 focus:border-gray-600 focus:outline-none text-sm"
                        />
                          <button 
                            type="button" 
                            onClick={addGithubUrl}
                            className="px-6 bg-gray-800 hover:bg-gray-600 text-white font-medium rounded-xl border border-gray-700 hover:border-gray-500 transition-all duration-300"
                          >
                            Add
                          </button>
                      </div>
                      
                      {githubUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {githubUrls.map((url, i) => (
                            <span key={i} className="inline-flex items-center gap-2 bg-gray-900 text-gray-300 text-xs px-3 py-1.5 rounded-lg border border-gray-800">
                              <span className="truncate max-w-[200px]">{url.replace("https://github.com/", "")}</span>
                              <button type="button" onClick={() => removeGithubUrl(url)} className="text-gray-500 hover:text-white">
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <select 
                      value={selectedGithubId} 
                      onChange={(e) => setSelectedGithubId(e.target.value)}
                      className="w-full bg-[#0c0c0c] text-white p-4 rounded-xl border border-gray-800 focus:border-gray-600 focus:outline-none"
                    >
                      <option value="">-- Select a saved GitHub link --</option>
                      {materials.filter(m => m.type === 'github').map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="pt-6">
                  <button 
                    onClick={handleStart} 
                    disabled={isStarting || (!(resumeFile && resumeMode === 'upload') && !(selectedResumeId && resumeMode === 'library') && !materials.find(m => selectedMaterials.includes(m.id) && m.type === "resume"))}
                    className={`w-full py-4 rounded-xl font-semibold text-base transition-all duration-500 flex items-center justify-center gap-2
                      ${((resumeFile && resumeMode === 'upload') || (selectedResumeId && resumeMode === 'library') || materials.find(m => selectedMaterials.includes(m.id) && m.type === "resume")) && !isStarting
                        ? "bg-white text-black hover:bg-gray-200 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                        : "bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed"}`}
                  >
                    {isStarting ? "Starting..." : "Start Interview"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-3 tracking-tight">Overview</h1>
                <p className="text-gray-400 text-sm">Manage your profile, settings, and materials.</p>
              </div>

              {/* Profile Card */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 hover:border-gray-600 hover:shadow-xl hover:shadow-white/5 transition-all duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-xl font-bold text-white border-4 border-[#111]">
                    JD
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Jane Doe</h3>
                    <p className="text-sm text-gray-400">Software Engineer</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Interviews</p>
                    <p className="text-2xl font-bold text-white">{history.length}</p>
                  </div>
                  <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Avg Score</p>
                    <p className="text-2xl font-bold text-white">
                      {history.length > 0 ? (history.reduce((acc, curr) => acc + curr.score, 0) / history.length).toFixed(1) : "0.0"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings Card */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 hover:border-gray-600 hover:shadow-xl hover:shadow-white/5 transition-all duration-500">
                <h3 className="font-bold flex items-center gap-2 mb-4">⚙️ Interview Settings</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm text-gray-300 font-medium">Time Limit per Question</label>
                      <span className="text-white font-bold font-mono">{timeLimit}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="120" 
                      step="5"
                      value={timeLimit} 
                      onChange={(e) => saveTimeLimit(parseInt(e.target.value))}
                      className="w-full accent-white"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>15s</span>
                      <span>{savingSettings ? "Saving..." : "Saved"}</span>
                      <span>120s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Materials Card */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6 hover:border-gray-600 hover:shadow-xl hover:shadow-white/5 transition-all duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4" /> Materials Library
                  </h3>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-[#111] border border-gray-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={selectedMaterials.includes(m.id)} 
                          onChange={() => toggleMaterialSelection(m.id)}
                          className="rounded border-gray-700 bg-gray-900 accent-white"
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
                  {materials.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No materials saved.</p>}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-3 tracking-tight">History</h1>
                <p className="text-gray-400 text-sm">Review your past interviews and scores.</p>
              </div>

              <div className="space-y-3">
                {loadingHistory ? (
                  <p className="text-sm text-gray-500 text-center py-4">Loading history...</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No interviews completed yet.</p>
                ) : (
                  history.map((item, i) => (
                    <div key={i} onClick={() => item.session_id && navigate(`/report/${item.session_id}`)} className="bg-[#0a0a0a] p-5 rounded-2xl border border-gray-800 hover:border-gray-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-white/5 transition-all duration-300 cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-semibold text-white group-hover:text-gray-300 transition-colors">{item.role}</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          item.score >= 8 ? 'bg-emerald-900/30 text-emerald-400' :
                          item.score >= 7 ? 'bg-teal-900/30 text-teal-400' : 'bg-red-900/30 text-red-400'
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
          )}
        </div>
      </main>
    </div>
  );
}

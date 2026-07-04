import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Bot, Briefcase, LogOut, Code, Database, Trash2, UploadCloud, ArrowLeft, Activity, History } from "lucide-react";
import Sidebar from "../components/Sidebar";

export default function MaterialsLibrary() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [uploadType, setUploadType] = useState("resume");
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    const token = localStorage.getItem("ai_tutor_token");
    if (!token) return navigate("/login");
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/user/materials", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this material?")) return;
    const token = localStorage.getItem("ai_tutor_token");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/user/materials/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMaterials(materials.filter(m => m.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Delete failed: ${res.status} ${err.detail || ''}`);
      }
    } catch (e) {
      console.error(e);
      alert(`Delete error: ${e.message}`);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!name) return alert("Please enter a name for the material.");
    if (uploadType !== 'github' && !file && !content) return alert("Please provide a file or text content.");
    if (uploadType === 'github' && !content) return alert("Please provide a GitHub URL.");

    setUploading(true);
    const token = localStorage.getItem("ai_tutor_token");
    const formData = new FormData();
    formData.append("material_type", uploadType);
    formData.append("name", name);
    if (file) formData.append("file", file);
    if (content) formData.append("content", content);

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/user/materials/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials([...materials, data.material]);
        setName("");
        setFile(null);
        setContent("");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Upload failed: ${err.detail || res.status}`);
      }
    } catch (err) {
      alert("Error uploading material.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070707] text-white font-sans">
      <Sidebar activeTab="materials" />

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-3 tracking-tight">Materials Library</h1>
            <p className="text-gray-400 text-sm">Manage your stored Resumes, JDs, and GitHub links</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Upload Form */}
            <div className="lg:col-span-1 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0a0a0a] border border-gray-800 rounded-3xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-indigo-400" /> Add New
                </h2>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Material Type</label>
                    <select 
                      value={uploadType} 
                      onChange={(e) => { setUploadType(e.target.value); setFile(null); setContent(""); }}
                      className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-600 text-white"
                    >
                      <option value="resume">Resume (PDF)</option>
                      <option value="jd">Job Description</option>
                      <option value="github">GitHub Link</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Display Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g., My Resume 2025"
                      className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-600 text-white"
                    />
                  </div>

                  {uploadType === "resume" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Resume PDF</label>
                      <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-gray-700" />
                    </div>
                  )}

                  {uploadType === "jd" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">JD PDF (Optional)</label>
                        <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-gray-700" />
                      </div>
                      <div className="flex items-center gap-2"><div className="h-px bg-gray-800 flex-1"></div><span className="text-[10px] text-gray-600 font-bold uppercase">OR</span><div className="h-px bg-gray-800 flex-1"></div></div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">JD Text</label>
                        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-600 resize-none text-white" placeholder="Paste JD here..."></textarea>
                      </div>
                    </div>
                  )}

                  {uploadType === "github" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Repository URL</label>
                      <input 
                        type="url" 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        placeholder="https://github.com/..."
                        className="w-full bg-[#111] border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-gray-600 text-white"
                      />
                    </div>
                  )}

                  <button type="submit" disabled={uploading} className="w-full py-3 bg-white hover:bg-gray-200 text-black rounded-xl font-bold transition-all duration-300 hover:scale-[1.02]">
                    {uploading ? "Saving..." : "Save Material"}
                  </button>
                </form>
              </motion.div>
            </div>

            {/* Right Column: Library List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold mb-4">Your Saved Materials</h2>
              {loading ? (
                <p className="text-gray-500">Loading library...</p>
              ) : materials.length === 0 ? (
                <div className="text-center py-20 bg-[#0a0a0a] rounded-3xl border border-gray-800 border-dashed">
                  <Database className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Your library is empty.</p>
                  <p className="text-xs text-gray-600 mt-1">Upload resumes and JDs to reuse them across interviews.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materials.map(m => (
                    <div key={m.id} className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-5 flex flex-col justify-between hover:border-gray-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-white/5 transition-all duration-300 group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === 'resume' ? 'bg-[#111] border border-gray-800 text-indigo-400' : m.type === 'jd' ? 'bg-[#111] border border-gray-800 text-purple-400' : 'bg-[#111] border border-gray-800 text-blue-400'}`}>
                            {m.type === 'resume' && <FileText className="w-5 h-5" />}
                            {m.type === 'jd' && <Briefcase className="w-5 h-5" />}
                            {m.type === 'github' && <Code className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-200 truncate max-w-[150px]" title={m.name}>{m.name}</h3>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">{m.type}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(m.id)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Added on {new Date(m.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

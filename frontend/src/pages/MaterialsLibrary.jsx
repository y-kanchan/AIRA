import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Bot, Briefcase, LogOut, Code, Database, Trash2, UploadCloud, ArrowLeft } from "lucide-react";

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
      const res = await fetch("http://localhost:8000/user/materials", {
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
    const token = localStorage.getItem("ai_tutor_token");
    try {
      const res = await fetch(`http://localhost:8000/user/materials/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMaterials(materials.filter(m => m.id !== id));
      }
    } catch (e) {
      console.error(e);
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
      const res = await fetch("http://localhost:8000/user/materials/upload", {
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
    <div className="min-h-screen bg-gray-950 text-white p-6 pb-20">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Materials Library</h1>
            <p className="text-xs text-gray-400">Manage your stored Resumes, JDs, and GitHub links</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload Form */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" /> Add New Material
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Material Type</label>
                <select 
                  value={uploadType} 
                  onChange={(e) => { setUploadType(e.target.value); setFile(null); setContent(""); }}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="resume">Resume (PDF)</option>
                  <option value="jd">Job Description (PDF or Text)</option>
                  <option value="github">GitHub Link</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Display Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., My Frontend Resume 2025"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {uploadType === "resume" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">Resume PDF File</label>
                  <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-900/30 file:text-indigo-400 hover:file:bg-indigo-900/50" />
                </div>
              )}

              {uploadType === "jd" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">JD PDF File (Optional)</label>
                    <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-900/30 file:text-purple-400 hover:file:bg-purple-900/50" />
                  </div>
                  <div className="flex items-center gap-2"><div className="h-px bg-gray-800 flex-1"></div><span className="text-xs text-gray-600 font-bold uppercase">OR</span><div className="h-px bg-gray-800 flex-1"></div></div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">JD Text Content</label>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-purple-500 resize-none" placeholder="Paste JD here..."></textarea>
                  </div>
                </div>
              )}

              {uploadType === "github" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase">GitHub Repository URL</label>
                  <input 
                    type="url" 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                    placeholder="https://github.com/username/repo"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <button type="submit" disabled={uploading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors">
                {uploading ? "Uploading..." : "Save Material"}
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
            <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-gray-800 border-dashed">
              <Database className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Your library is empty.</p>
              <p className="text-xs text-gray-600 mt-1">Upload resumes and JDs to reuse them across interviews.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map(m => (
                <div key={m.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/50 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.type === 'resume' ? 'bg-indigo-900/30 text-indigo-400' : m.type === 'jd' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>
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
      </main>
    </div>
  );
}

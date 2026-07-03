import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import airaLogo from "../styles/aira.png";

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  const handleBackgroundClick = () => {
    setIsExiting(true);
    setTimeout(() => navigate("/"), 400);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || "https://aira-u9qv.onrender.com") + "/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      localStorage.setItem("ai_tutor_token", data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={handleBackgroundClick}
      className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-500 cursor-pointer ${isExiting ? 'opacity-0 scale-95' : 'opacity-100'}`}
    >
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.4 }}
        className="group relative w-full max-w-md z-10 cursor-default"
      >
        {/* Glow effect behind the card */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1c3b45] via-teal-600/50 to-[#1c3b45] rounded-3xl opacity-0 blur-lg group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500" />

        {/* The glassmorphic card */}
        <div className="relative w-full bg-transparent backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-500 group-hover:border-[#1c3b45]/60 group-hover:bg-[#1c3b45]/40 group-hover:shadow-[0_0_50px_rgba(28,59,69,0.4)]">
          <div className="flex flex-col items-center mb-8 mt-2">
            <div className="w-full flex justify-center mb-6">
              <img src={airaLogo} alt="AIRA Logo" className="h-20 w-auto object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-white">Create an account</h2>
            <p className="text-gray-400 text-sm mt-1">Start practicing technical interviews</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-sm p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  required
                  className="w-full bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:bg-white/[0.06] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-300"
                  placeholder="your name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:bg-white/[0.06] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-300"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 text-white placeholder-gray-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:bg-white/[0.06] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-300"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-gray-950 py-3.5 rounded-full font-bold transition-all mt-6 disabled:opacity-50 shadow-lg shadow-white/10 hover:scale-[1.01]"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-gray-950/30 border-t-gray-950 rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-8">
            Already have an account? <Link to="/login" className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 font-bold hover:opacity-80 transition-opacity">Log in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

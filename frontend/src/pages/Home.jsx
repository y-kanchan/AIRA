import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Code, FileText, BrainCircuit } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Solveit AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Link to="/signup" className="text-sm font-bold bg-white text-gray-950 px-5 py-2.5 rounded-full hover:bg-gray-200 transition-colors">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-indigo-300 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Powered by Groq Llama-3.3-70B
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-tight"
        >
          Ace your next technical interview with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI precision.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-gray-400 mb-10 max-w-2xl"
        >
          Upload your resume and the job description. Our 3D AI interviewer will dynamically generate highly targeted technical questions and evaluate your answers in real-time.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link to="/signup" className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/25 transition-all hover:-translate-y-0.5">
            Start Practicing Now
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/login" className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all">
            View Dashboard
          </Link>
        </motion.div>

        {/* Feature grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full text-left"
        >
          {[
            { icon: FileText, title: "Context-Aware RAG", desc: "Your resume and JD are ingested instantly to generate hyper-personalized questions." },
            { icon: BrainCircuit, title: "Stateful Evaluation", desc: "The AI remembers your answers and probes deeper into your technical depth." },
            { icon: Code, title: "GitHub Integration", desc: "Provide your GitHub URL and the AI will ask questions based on your actual projects." },
          ].map((feat, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl backdrop-blur-sm hover:border-indigo-500/50 transition-colors">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
                <feat.icon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}

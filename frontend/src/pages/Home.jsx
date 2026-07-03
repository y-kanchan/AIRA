import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Code, FileText, BrainCircuit } from "lucide-react";
import airaLogo from "../styles/aira.png";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float, Environment, ContactShadows, Sparkles } from "@react-three/drei";
import { useRef, useState } from "react";
import * as THREE from "three";

function AIObr() {
  const groupRef = useRef();
  const materialRef = useRef();
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (groupRef.current) {
      // Base idle rotation
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.rotation.x = t * 0.1;
      
      // React to pointer
      const targetX = (state.pointer.x * Math.PI) / 3;
      const targetY = (state.pointer.y * Math.PI) / 3;
      
      groupRef.current.rotation.y += THREE.MathUtils.lerp(0, targetX, 0.1);
      groupRef.current.rotation.x += THREE.MathUtils.lerp(0, -targetY, 0.1);
      
      // Smoothly scale up when hovered
      const targetScale = hovered ? 1.25 : 1;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }

    // Spin the outer quantum rings at different speeds and axes
    if(ring1.current) ring1.current.rotation.x = t * 0.5;
    if(ring2.current) ring2.current.rotation.y = t * -0.4;
    if(ring3.current) ring3.current.rotation.z = t * 0.3;
    
    if (materialRef.current) {
      // Intensely speed up and increase distortion ripples when hovered!
      materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, hovered ? 8 : 2.5, 0.05);
      materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, hovered ? 0.8 : 0.45, 0.05);
    }
  });

  return (
    <Float speed={hovered ? 4 : 2} rotationIntensity={hovered ? 1.5 : 1} floatIntensity={hovered ? 3 : 2}>
      
      {/* Full Screen Floating Neon Dust/Sparkles - offset by -2.5 to counter the group's rightward shift */}
      <Sparkles 
        position={[-2.5, 0, 0]}
        count={400} 
        scale={[30, 20, 20]} 
        size={hovered ? 12 : 6} 
        speed={hovered ? 2 : 0.5} 
        color={hovered ? "#e879f9" : "#818cf8"} 
        opacity={0.6} 
      />

      <group 
        ref={groupRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >

        {/* Outer Gyroscopic Rings */}
        <mesh ref={ring1}>
          <torusGeometry args={[3.2, 0.015, 16, 100]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2} />
        </mesh>
        <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[3.0, 0.015, 16, 100]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={2} />
        </mesh>
        <mesh ref={ring3} rotation={[0, Math.PI / 3, 0]}>
          <torusGeometry args={[2.8, 0.015, 16, 100]} />
          <meshStandardMaterial color="#d946ef" emissive="#d946ef" emissiveIntensity={2} />
        </mesh>

        {/* Quantum Cage (Wireframe) */}
        <mesh>
          <icosahedronGeometry args={[2.2, 3]} />
          <meshStandardMaterial 
            color={hovered ? "#d946ef" : "#a855f7"} 
            wireframe={true} 
            emissive={hovered ? "#d946ef" : "#a855f7"} 
            emissiveIntensity={hovered ? 1.5 : 0.5}
            transparent
            opacity={hovered ? 0.3 : 0.1}
          />
        </mesh>
        
        {/* Inner Liquid AI Core */}
        <mesh>
          <sphereGeometry args={[1.5, 128, 128]} />
          <MeshDistortMaterial 
            ref={materialRef}
            color={hovered ? "#c026d3" : "#4f46e5"}
            emissive={hovered ? "#8b5cf6" : "#4338ca"}
            emissiveIntensity={hovered ? 2.5 : 1.5}
            attach="material"
            distort={0.45}
            speed={2.5}
            roughness={0.1}
            metalness={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
          />
        </mesh>
      </group>
    </Float>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen text-white overflow-hidden relative">

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto pointer-events-auto">
        <div className="flex items-center">
          <img src={airaLogo} alt="AIRA Logo" className="h-16 w-auto object-contain" />
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
      <main className="relative z-10 max-w-5xl mx-auto px-8 flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 88px)' }}>

        {/* Centered: Text Content */}
        <div className="flex flex-col items-center text-center pointer-events-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-handwriting text-4xl sm:text-5xl md:text-6xl font-bold tracking-wide mb-4"
            style={{ lineHeight: '1.2', letterSpacing: '0.03em' }}
          >
            Ace your next technical interview with
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              AIRA precision.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-handwriting text-sm sm:text-base text-gray-400 mb-8 max-w-lg leading-relaxed"
            style={{ letterSpacing: '0.015em' }}
          >
            Upload your resume and the job description. AIRA will dynamically generate highly targeted technical questions and evaluate your answers in real-time.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/signup" className="flex items-center gap-2 bg-white text-gray-950 px-7 py-3 rounded-full font-bold text-base hover:bg-gray-200 shadow-lg shadow-white/10 transition-all hover:-translate-y-0.5">
              Start Practicing Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-7 py-3 rounded-full font-bold text-base hover:bg-white/10 transition-all">
              View Dashboard
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Feature grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-24 pointer-events-auto">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left"
        >
          {[
            { icon: FileText, title: "Context-Aware RAG", desc: "Your resume and JD are ingested instantly to generate hyper-personalized questions." },
            { icon: BrainCircuit, title: "Stateful Evaluation", desc: "AIRA remembers your answers and probes deeper into your technical depth." },
            { icon: Code, title: "GitHub Integration", desc: "Provide your GitHub URL and AIRA will ask questions based on your actual projects." },
          ].map((feat, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl backdrop-blur-sm hover:border-indigo-500/50 transition-colors cursor-default">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
                <feat.icon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Code, FileText, BrainCircuit } from "lucide-react";
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
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* FULL PAGE 3D BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-auto opacity-70 lg:opacity-100">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          {/* Shift the orb slightly to the right and back so it beautifully flanks the text */}
          <group position={[2.5, 0, -2]}>
            <AIObr />
            <ContactShadows position={[0, -4, 0]} opacity={0.4} scale={25} blur={3} far={5} />
          </group>
          
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">AIRA</span>
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
      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-12 pb-32 flex flex-col lg:flex-row items-center justify-between gap-12 pointer-events-none">
        
        {/* Left: Text Content */}
        <div className="flex-1 flex flex-col items-start text-left mt-8 lg:mt-0 pointer-events-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-2xl leading-tight"
          >
            Ace your next technical interview with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AIRA precision.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-gray-400 mb-10 max-w-xl"
          >
            Upload your resume and the job description. AIRA will dynamically generate highly targeted technical questions and evaluate your answers in real-time.
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
        </div>

        {/* Right: Empty Spacer to allow clicking the 3D background */}
        <div className="flex-1 hidden lg:block h-[500px] pointer-events-auto" />
      </main>

      {/* Feature grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-32 pointer-events-auto">
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

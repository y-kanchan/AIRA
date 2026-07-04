import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "../components/Experience";
import { UI } from "../components/UI";
import "../styles/layout.css";

export default function InterviewRoom() {
  return (
    <div className="w-screen h-screen bg-gray-950 overflow-hidden relative">
      
      {/* 
        Left Section - Avatar 
        To prevent clipping on the right without moving the avatar's visual center, 
        we make the canvas much wider (166.666vw) and offset it left by -66.666vw. 
        This keeps the center exactly at 1/3 of the screen (16.666vw), 
        but gives the Canvas physical rendering space all the way to 100vw on the right!
      */}
      <div 
        className="absolute top-0 left-0 w-full h-[50vh] lg:h-full z-10 avatar-canvas-container"
      >
        <Loader />
        <Leva hidden />
        <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }}>
          <Experience />
        </Canvas>
        
        {/* Re-align the camera zoom control button so it's not hidden off-screen */}
        <div className="absolute top-4 left-4 lg:left-[calc(66.666vw+1rem)] z-20 pointer-events-auto">
          <UI showControls={true} showChat={false} />
        </div>
      </div>
      
      {/* Right Section - Chat Interface (2/3) */}
      <div className="absolute top-0 right-0 w-full lg:w-2/3 h-[50vh] lg:h-full z-20 pointer-events-none">
        {/* pointer-events-none on wrapper so clicks pass through to Avatar, pointer-events-auto on UI */}
        <div className="w-full h-full pointer-events-auto">
          <UI showControls={false} showChat={true} />
        </div>
      </div>

      {/* Mobile Chat Interface */}
      <div className="fixed bottom-0 left-0 right-0 h-[50vh] lg:hidden bg-transparent z-50 pointer-events-auto">
        <UI showControls={false} showChat={true} />
      </div>
    </div>
  );
}

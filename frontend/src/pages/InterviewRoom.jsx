import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "../components/Experience";
import { UI } from "../components/UI";
import "../styles/layout.css";

export default function InterviewRoom() {
  return (
    <div className="w-screen h-screen flex flex-col lg:flex-row bg-gray-950 overflow-hidden">
      
      {/* 
        Left Section - Avatar 
        To prevent clipping on the right without moving the avatar's visual center, 
        we make the canvas wider (66.666vw) and offset it left by -16.666vw. 
        This keeps the center exactly at 1/3 of the screen (16.666vw), 
        but gives the Canvas 50vw of physical rendering space on the right, overlapping the chat.
      */}
      <div className="w-full lg:w-[66.666vw] lg:ml-[-16.666vw] lg:mr-[-16.666vw] h-[50vh] lg:h-full relative avatar-section z-10 flex-shrink-0">
        <Loader />
        <Leva hidden />
        <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }}>
          <Experience />
        </Canvas>
        
        {/* Re-align the camera zoom control button so it's not hidden off-screen */}
        <div className="absolute top-4 left-4 lg:left-[calc(16.666vw+1rem)] z-20">
          <UI showControls={true} showChat={false} />
        </div>
      </div>
      
      {/* Right Section - Chat Interface (2/3) */}
      <div className="w-full lg:w-2/3 h-[50vh] lg:h-full chat-section z-20 flex-shrink-0">
        <UI showControls={false} showChat={true} />
      </div>

      {/* Mobile Chat Interface */}
      <div className="fixed bottom-0 left-0 right-0 h-[50vh] lg:hidden bg-gray-900/95 z-50">
        <UI showControls={false} showChat={true} />
      </div>
    </div>
  );
}

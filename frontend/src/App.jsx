import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import InterviewRoom from "./pages/InterviewRoom";
import Report from "./pages/Report";
import MaterialsLibrary from "./pages/MaterialsLibrary";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/materials" element={<MaterialsLibrary />} />
      <Route path="/interview" element={<InterviewRoom />} />
      <Route path="/report/:sessionId" element={<Report />} />
    </Routes>
  );
}

export default App;

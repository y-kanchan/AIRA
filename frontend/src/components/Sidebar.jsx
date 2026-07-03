import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Activity, History, Database, LogOut } from "lucide-react";
import airaLogo from "../styles/aira.png";
import airaLogo2 from "../styles/aira2.png";

export default function Sidebar({ activeTab, onTabChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const handleNavigation = (tab) => {
    if (tab === 'materials') {
      if (location.pathname !== '/materials') {
        navigate('/materials');
      }
    } else {
      // It's a dashboard tab
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard', { state: { activeTab: tab } });
      } else {
        if (onTabChange) onTabChange(tab);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ai_tutor_token");
    navigate("/");
  };

  const NavItem = ({ icon: Icon, label, tab, customIcon }) => {
    const isActive = activeTab === tab;
    return (
      <button 
        onClick={() => handleNavigation(tab)} 
        className={`group flex items-center whitespace-nowrap overflow-hidden transition-all duration-300 ${
          isHovered ? 'px-4 py-3 rounded-full justify-start' : 'p-3 mx-auto rounded-xl justify-center w-[46px]'
        } ${isActive ? 'border border-gray-600 bg-transparent text-white' : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'}`}
      >
        {customIcon ? customIcon : <Icon className="w-[18px] h-[18px] shrink-0" />}
        <span className={`transition-all duration-300 font-medium text-sm ${isHovered ? 'opacity-100 ml-3' : 'opacity-0 w-0 ml-0'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`border-r border-gray-800 py-6 flex flex-col hidden md:flex shrink-0 transition-all duration-300 ease-in-out bg-[#070707] z-50 ${isHovered ? 'w-64 px-6' : 'w-20 px-2'}`}
    >
      {/* Logo */}
      <div className={`flex items-center mb-8 cursor-pointer transition-all duration-300 h-16 w-full ${isHovered ? 'justify-start px-2' : 'justify-center'}`} onClick={() => handleNavigation('new_interview')}>
        <img 
          src={isHovered ? airaLogo : airaLogo2} 
          alt="AIRA Logo" 
          className={`h-full object-contain transition-all duration-300 ${isHovered ? 'w-40 object-left' : 'w-12 object-center scale-110'}`} 
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1 mt-4">
        <NavItem icon={Activity} label="Overview" tab="overview" />
        <NavItem 
          label="New Interview" 
          tab="new_interview" 
          customIcon={<div className="w-[18px] h-[18px] rounded-full border border-current flex items-center justify-center transition-transform group-hover:scale-110 shrink-0"><span className="text-[10px] leading-none mb-[1px]">+</span></div>}
        />
        <NavItem icon={History} label="History" tab="history" />

        <div className="my-4 border-t border-gray-800"></div>

        <NavItem icon={Database} label="Materials Library" tab="materials" />
      </nav>

      {/* Logout */}
      <button 
        onClick={handleLogout} 
        className={`flex items-center whitespace-nowrap overflow-hidden text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-300 mt-auto ${
          isHovered ? 'px-4 py-3 rounded-full justify-start' : 'p-3 mx-auto rounded-xl justify-center w-[46px]'
        }`}
      >
        <LogOut className="w-[18px] h-[18px] shrink-0" />
        <span className={`transition-all duration-300 text-sm font-medium ${isHovered ? 'opacity-100 ml-3' : 'opacity-0 w-0 ml-0'}`}>Sign Out</span>
      </button>
    </aside>
  );
}

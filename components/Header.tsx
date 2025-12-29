
import React from 'react';
import { Zap, Images, Edit, Type, Video, Camera, History, Disc } from 'lucide-react';
import { AppMode } from '../types';

interface HeaderProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, setMode }) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] w-auto max-w-[95%]">
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-1.5 rounded-full shadow-xl flex items-center gap-2">
        
        {/* Logo Mark */}
        <div className="hidden sm:flex items-center gap-2 px-3 pl-2">
           <div className="bg-gradient-to-br from-lime-400 to-lime-600 p-1.5 rounded-full text-black shadow-lg shadow-lime-900/20">
             <Zap size={14} fill="currentColor" />
           </div>
           <span className="font-bold text-sm tracking-tight text-zinc-100">NanoGen</span>
        </div>
        
        <div className="w-px h-6 bg-zinc-800 hidden sm:block mx-1"></div>

        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[80vw] sm:max-w-none">
          <NavButton 
            active={currentMode === AppMode.BATCH} 
            onClick={() => setMode(AppMode.BATCH)} 
            icon={<Images size={16} />} 
            label="Batch" 
          />
          <NavButton 
            active={currentMode === AppMode.ANGLES} 
            onClick={() => setMode(AppMode.ANGLES)} 
            icon={<Camera size={16} />} 
            label="Angles" 
          />
          <NavButton 
            active={currentMode === AppMode.TYPOGRAPHY} 
            onClick={() => setMode(AppMode.TYPOGRAPHY)} 
            icon={<Type size={16} />} 
            label="Type" 
          />
          <NavButton 
            active={currentMode === AppMode.ALBUM} 
            onClick={() => setMode(AppMode.ALBUM)} 
            icon={<Disc size={16} />} 
            label="Album" 
          />
          <NavButton 
            active={currentMode === AppMode.EDIT} 
            onClick={() => setMode(AppMode.EDIT)} 
            icon={<Edit size={16} />} 
            label="Edit" 
          />
          <NavButton 
            active={currentMode === AppMode.VIDEO} 
            onClick={() => setMode(AppMode.VIDEO)} 
            icon={<Video size={16} />} 
            label="Motion" 
          />
          <div className="w-px h-4 bg-zinc-800 mx-1"></div>
          <NavButton 
            active={currentMode === AppMode.HISTORY} 
            onClick={() => setMode(AppMode.HISTORY)} 
            icon={<History size={16} />} 
            label="History" 
          />
        </nav>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap
      ${active 
        ? 'bg-zinc-100 text-zinc-900 shadow-sm' 
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);
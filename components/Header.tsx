
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Book, PenTool, Zap, Brain, Rocket, ChevronDown } from 'lucide-react';
import { ModelLevel } from '../types';

interface HeaderProps {
  activeTab: 'analyzer' | 'dictionary' | 'writing';
  onNavigate: (tab: 'analyzer' | 'dictionary' | 'writing') => void;
  modelLevel: ModelLevel;
  onModelChange: (level: ModelLevel) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate, modelLevel, onModelChange }) => {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleModelSelect = (level: ModelLevel) => {
    onModelChange(level);
    setIsModelMenuOpen(false);
  };
  
  const getModelIcon = (level: ModelLevel) => {
    switch (level) {
      case 'mini': return <Zap className="w-4 h-4" />;
      case 'quick': return <Brain className="w-4 h-4" />;
      case 'deep': return <Rocket className="w-4 h-4" />;
    }
  };

  const getModelLabel = (level: ModelLevel) => {
    switch (level) {
      case 'mini': return '迷你 (Flash)';
      case 'quick': return '快速 (Thinking)';
      case 'deep': return '深度 (Deep)';
    }
  };

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => onNavigate('analyzer')}
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-lg flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800 hidden md:block">GrammaViz</span>
          <span className="font-bold text-xl tracking-tight text-slate-800 md:hidden">GV</span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-6">
          <nav className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => onNavigate('analyzer')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'analyzer' 
                  ? 'bg-white text-pink-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 hidden sm:block" />
              句法
            </button>
            <button
              onClick={() => onNavigate('dictionary')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'dictionary' 
                  ? 'bg-white text-pink-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Book className="w-4 h-4 hidden sm:block" />
              词典
            </button>
            <button
              onClick={() => onNavigate('writing')}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'writing' 
                  ? 'bg-white text-pink-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <PenTool className="w-4 h-4 hidden sm:block" />
              写作
            </button>
          </nav>

          {/* Model Selector */}
          <div className="relative hidden md:block" ref={modelMenuRef}>
             <button 
                 onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                 className={`flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors outline-none focus:ring-2 focus:ring-pink-100 ${isModelMenuOpen ? 'bg-slate-100 border-pink-200 ring-2 ring-pink-50' : ''}`}
             >
                 <span className="mr-2 text-slate-400 text-xs uppercase font-bold tracking-wider">模式</span>
                 <div className={`flex items-center gap-1.5 text-sm font-medium ${modelLevel === 'mini' ? 'text-amber-600' : modelLevel === 'quick' ? 'text-blue-600' : 'text-purple-600'}`}>
                    {getModelIcon(modelLevel)}
                    <span>{getModelLabel(modelLevel)}</span>
                 </div>
                 <ChevronDown className={`w-3 h-3 ml-2 text-slate-400 transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
             </button>
             
             {/* Dropdown */}
             {isModelMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 p-1 z-20">
                    <button onClick={() => handleModelSelect('mini')} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${modelLevel === 'mini' ? 'bg-amber-50 text-amber-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <div className="p-1.5 rounded-md bg-amber-100 text-amber-600">
                        <Zap className="w-4 h-4" />
                        </div>
                        <div>
                        <div className="font-bold text-sm">迷你思考</div>
                        <div className="text-[10px] opacity-70">Gemini 2.5 Flash (快)</div>
                        </div>
                    </button>
                    <button onClick={() => handleModelSelect('quick')} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${modelLevel === 'quick' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <div className="p-1.5 rounded-md bg-blue-100 text-blue-600">
                        <Brain className="w-4 h-4" />
                        </div>
                        <div>
                        <div className="font-bold text-sm">快速思考</div>
                        <div className="text-[10px] opacity-70">Pro + Budget 500</div>
                        </div>
                    </button>
                    <button onClick={() => handleModelSelect('deep')} className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${modelLevel === 'deep' ? 'bg-purple-50 text-purple-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                        <div className="p-1.5 rounded-md bg-purple-100 text-purple-600">
                        <Rocket className="w-4 h-4" />
                        </div>
                        <div>
                        <div className="font-bold text-sm">深度思考</div>
                        <div className="text-[10px] opacity-70">Pro + Budget 2000</div>
                        </div>
                    </button>
                </div>
             )}
          </div>
        </div>
        
        {/* Mobile Model Toggle (Simplified) */}
        <div className="md:hidden flex items-center">
            <button 
                onClick={() => {
                    const next = modelLevel === 'mini' ? 'quick' : modelLevel === 'quick' ? 'deep' : 'mini';
                    onModelChange(next);
                }}
                className="p-2 bg-slate-100 rounded-lg text-slate-600"
            >
                {getModelIcon(modelLevel)}
            </button>
        </div>

      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { Send, Shuffle } from 'lucide-react';

interface InputAreaProps {
  onAnalyze: (sentence: string) => void;
  isLoading: boolean;
}

const PRESETS = [
  "Regular exercise can improve confidence.",
  "The quick brown fox jumps over the lazy dog.",
  "To learn a new language requires patience.",
  "Rich countries can provide people with many job opportunities.",
  "Reading books expands your mind."
];

export const InputArea: React.FC<InputAreaProps> = ({ onAnalyze, isLoading }) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAnalyze(text);
    }
  };

  const handlePreset = () => {
    const random = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    setText(random);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入英语句子..."
            disabled={isLoading}
            className="w-full pl-6 pr-32 py-4 text-lg rounded-xl bg-slate-50 border border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 transition-all outline-none text-slate-800 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <div className="absolute right-2 flex items-center gap-2">
             <button
                type="button"
                onClick={handlePreset}
                disabled={isLoading}
                title="随机示例"
                className="p-2 text-slate-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all disabled:opacity-50"
              >
                <Shuffle className="w-5 h-5" />
             </button>
            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-pink-600"
            >
              <span>分析</span>
              {!isLoading && <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </form>
      
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider self-center mr-2">试一试:</span>
        {PRESETS.slice(0, 3).map((preset, idx) => (
            <button 
                key={idx}
                onClick={() => { setText(preset); onAnalyze(preset); }}
                className="text-xs bg-slate-100 hover:bg-white border border-transparent hover:border-pink-200 text-slate-600 hover:text-pink-600 px-3 py-1.5 rounded-full transition-all cursor-pointer truncate max-w-[200px]"
            >
                {preset}
            </button>
        ))}
      </div>
    </div>
  );
};
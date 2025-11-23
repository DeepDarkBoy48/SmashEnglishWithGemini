
import React, { useState, useRef } from 'react';
import { Search, Volume2, Book, Loader2, AlertCircle, ChevronRight, BarChart3, Sparkles, Link2 } from 'lucide-react';
import { DictionaryResult, ModelLevel } from '../types';
import { lookupWord, generateSpeech } from '../services/geminiService';

interface DictionaryPageProps {
  initialResult: DictionaryResult | null;
  onResultChange: (result: DictionaryResult | null) => void;
  modelLevel: ModelLevel;
}

export const DictionaryPage: React.FC<DictionaryPageProps> = ({ initialResult, onResultChange, modelLevel }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await lookupWord(query, modelLevel);
      onResultChange(data);
    } catch (err: any) {
      setError(err.message || "查询失败，请稍后再试。");
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (text: string) => {
      if (isAudioPlaying) return;
      setIsAudioPlaying(true);

      try {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const buffer = await generateSpeech(text);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsAudioPlaying(false);
        source.start(0);
      } catch (e) {
          console.error(e);
          setIsAudioPlaying(false);
      }
  };

  const result = initialResult;

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in pb-12">
       <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-serif">
            AI 智能词典
          </h1>
          <p className="text-slate-600">
            深度解析单词含义、词性搭配及地道例句
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-xl mx-auto mb-12">
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="输入单词或词组 (例如: take up, resilience)"
                    className="w-full pl-5 pr-14 py-4 text-lg rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/50 focus:border-pink-400 focus:ring-4 focus:ring-pink-50 transition-all outline-none"
                    disabled={isLoading}
                />
                <button 
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="absolute right-2 top-2 bottom-2 px-4 bg-pink-600 text-white rounded-xl hover:bg-pink-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
            </form>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 max-w-xl mx-auto mb-8">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
            </div>
        )}

        {!result && !isLoading && !error && (
            <div className="text-center py-12 opacity-40 flex flex-col items-center">
              <Book className="w-16 h-16 mb-4 text-slate-300" />
              <p>输入单词开始查询</p>
            </div>
        )}

        {/* Result Display */}
        {result && !isLoading && (
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-5xl font-bold text-slate-900 font-serif tracking-tight leading-none mb-3">{result.word}</h2>
                        <div className="text-xl text-slate-500 font-sans flex items-center gap-2 font-medium">
                            <span>{result.phonetic}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => playAudio(result.word)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm ${isAudioPlaying ? 'bg-pink-100 text-pink-600 ring-4 ring-pink-50' : 'bg-white border border-slate-200 text-slate-700 hover:text-pink-600 hover:border-pink-300 hover:shadow-md'}`}
                        title="播放发音"
                    >
                        {isAudioPlaying ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-7 h-7" />}
                    </button>
                </div>

                {/* Entries */}
                <div className="p-6 md:p-10 space-y-12">
                    {result.entries.map((entry, idx) => (
                        <div key={idx} className="group">
                            
                            {/* Entry Header Row (New Layout) */}
                            <div className="flex items-center gap-3 mb-6">
                                <span className="bg-slate-900 text-white text-sm font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-md shadow-slate-200">
                                    {entry.partOfSpeech}
                                </span>
                                
                                {entry.cocaFrequency && (
                                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        {entry.cocaFrequency}
                                    </span>
                                )}
                                
                                <div className="h-px bg-slate-100 flex-grow ml-2"></div>
                            </div>

                            {/* Definitions List */}
                            <div className="space-y-8 pl-1 md:pl-2">
                                {entry.definitions.map((def, dIdx) => (
                                    <div key={dIdx} className="relative grid grid-cols-[auto_1fr] gap-4">
                                        {/* Index Number */}
                                        <div className="flex justify-center pt-1">
                                            <span className="text-slate-300 font-bold text-lg font-serif select-none">{dIdx + 1}.</span>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {/* Meaning & Explanation */}
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800 mb-1 leading-snug">{def.meaning}</h3>
                                                <p className="text-slate-500 text-sm leading-relaxed">
                                                    {def.explanation}
                                                </p>
                                            </div>

                                            {/* Example Box */}
                                            <div className="mt-2 bg-slate-50 rounded-xl p-5 border border-slate-100 group-hover/def hover:border-pink-100 hover:bg-pink-50/30 transition-colors">
                                                <p className="font-serif text-lg text-slate-800 mb-2 leading-relaxed">
                                                    {def.example}
                                                </p>
                                                <p className="text-sm text-slate-500 flex items-start gap-2">
                                                    <Sparkles className="w-3.5 h-3.5 mt-0.5 text-pink-400 shrink-0" />
                                                    {def.exampleTranslation}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Collocations Section */}
                {result.collocations && result.collocations.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/30 p-6 md:p-10">
                        <div className="flex items-center gap-3 mb-6">
                             <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center ring-4 ring-violet-50">
                                <Link2 className="w-5 h-5" />
                             </div>
                             <div>
                                <h3 className="text-xl font-bold text-slate-900">常用搭配 & 习惯用语</h3>
                                <p className="text-sm text-slate-500">掌握地道表达与固定用法</p>
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {result.collocations.map((col, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/20 transition-all group">
                                    <div className="flex flex-col gap-1 mb-3">
                                        <span className="font-bold text-lg text-slate-800 group-hover:text-violet-700 transition-colors">{col.phrase}</span>
                                        <span className="text-sm font-medium text-slate-500">{col.meaning}</span>
                                    </div>
                                    
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 group-hover:bg-violet-50/30 group-hover:border-violet-100 transition-colors">
                                        <p className="font-serif text-slate-700 text-sm mb-1.5 leading-relaxed">
                                            "{col.example}"
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {col.exampleTranslation}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

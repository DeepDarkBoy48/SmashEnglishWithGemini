
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, AnalysisChunk, Correction } from '../types';
import { Volume2, Copy, BookOpen, Loader2, Sparkles, AlertTriangle, CheckCircle2, GitMerge, Clock } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface ResultDisplayProps {
  result: AnalysisResult;
  compact?: boolean;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, compact = false }) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  // Cache audio buffer for the current sentence
  const audioCacheRef = useRef<AudioBuffer | null>(null);
  // Keep track of the current generation promise to avoid race conditions or double-fetching
  const audioPromiseRef = useRef<Promise<AudioBuffer> | null>(null);
  
  const currentSentenceRef = useRef<string>(result.englishSentence);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext lazily
  const getAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
       audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  // Auto-prefetch audio when result changes
  useEffect(() => {
    // Clean up previous state
    audioCacheRef.current = null;
    audioPromiseRef.current = null;
    currentSentenceRef.current = result.englishSentence;

    const prefetchAudio = async () => {
        try {
            const promise = generateSpeech(result.englishSentence);
            audioPromiseRef.current = promise;
            
            const buffer = await promise;
            
            // Ensure the result hasn't changed while we were fetching
            if (currentSentenceRef.current === result.englishSentence) {
                audioCacheRef.current = buffer;
            }
        } catch (err) {
            console.error("Audio pre-fetch failed:", err);
        }
    };

    prefetchAudio();

  }, [result.englishSentence]);

  const playAudio = async () => {
    if (isAudioPlaying) return;
    
    const context = getAudioContext();
    if (context.state === 'suspended') {
        await context.resume();
    }

    try {
      let audioBuffer = audioCacheRef.current;

      if (!audioBuffer) {
        setIsAudioLoading(true);
        
        // If pre-fetch is in progress, wait for it
        if (audioPromiseRef.current) {
            try {
                audioBuffer = await audioPromiseRef.current;
            } catch (e) {
                // If pre-fetch failed, try again explicitly
                 audioBuffer = await generateSpeech(result.englishSentence);
            }
        } else {
            // Fallback if no pre-fetch happened
            audioBuffer = await generateSpeech(result.englishSentence);
        }
        
        // Update cache
        audioCacheRef.current = audioBuffer;
        setIsAudioLoading(false);
      }

      if (audioBuffer) {
        setIsAudioPlaying(true);
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.onended = () => setIsAudioPlaying(false);
        source.start(0);
      }

    } catch (err) {
      console.error("TTS Playback Error:", err);
      setIsAudioLoading(false);
      setIsAudioPlaying(false);
      // Clear promise so user can retry
      audioPromiseRef.current = null; 
      alert("无法播放音频，请稍后再试。");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.englishSentence);
  };

  return (
    <div className={`space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ${compact ? 'pb-4' : ''}`}>
      
      {/* Grammar Correction Card (Conditional) */}
      {result.correction && !compact && (
          <CorrectionCard correction={result.correction} />
      )}

      {/* Visualization Card */}
      <div className={`bg-white shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden relative ${compact ? 'rounded-2xl' : 'rounded-[2rem]'}`}>
        
        {/* Header / Controls */}
        <div className={`bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col gap-4 ${compact ? 'px-5 py-4' : 'px-8 py-6'}`}>
             <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-xs font-bold text-pink-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        语法分析结果
                    </h2>
                    <div className={`text-slate-700 font-medium tracking-wide leading-relaxed ${compact ? 'text-sm' : 'text-lg'}`}>
                        {result.chineseTranslation}
                    </div>
                    
                    {/* Sentence Tags: Pattern & Tense */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {result.sentencePattern && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] md:text-xs font-bold shadow-sm">
                                <GitMerge className="w-3 h-3" />
                                <span>{result.sentencePattern}</span>
                            </div>
                        )}
                        {result.mainTense && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-100 text-teal-700 text-[10px] md:text-xs font-bold shadow-sm">
                                <Clock className="w-3 h-3" />
                                <span>{result.mainTense}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center">
                    <button 
                        onClick={playAudio} 
                        disabled={isAudioLoading}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition-all text-xs ${isAudioPlaying ? 'bg-pink-100 text-pink-600 ring-2 ring-pink-200' : 'bg-slate-100 text-slate-600 hover:bg-pink-50 hover:text-pink-600'}`}
                    >
                        {isAudioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className={`w-3 h-3 ${isAudioPlaying ? 'animate-pulse' : ''}`} />}
                        <span>{isAudioLoading ? '加载...' : '朗读'}</span>
                    </button>
                    {!compact && (
                        <button onClick={copyToClipboard} className="p-2.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all" title="复制">
                            <Copy className="w-4 h-4" />
                        </button>
                    )}
                </div>
             </div>
        </div>

        {/* Main Visualizer (Chunks) */}
        <div className={`flex flex-col justify-center items-center bg-white ${compact ? 'p-6 overflow-x-auto' : 'p-8 md:p-16'}`}>
            <div className={`flex flex-wrap items-start justify-center leading-none ${compact ? 'gap-x-4 gap-y-8' : 'gap-x-8 gap-y-14'}`}>
                {result.chunks.map((chunk, index) => (
                    <ChunkColumn key={index} chunk={chunk} compact={compact} />
                ))}
            </div>
        </div>
      </div>

      {/* Detailed Breakdown Table (Lexical Units) */}
      <div className={`bg-white border border-slate-100 shadow-lg shadow-slate-200/30 ${compact ? 'rounded-2xl p-4' : 'rounded-[2rem] p-8'}`}>
         <div className={`flex items-center gap-3 border-b border-slate-100 ${compact ? 'mb-4 pb-2' : 'mb-8 pb-4'}`}>
            <div className={`rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
                <BookOpen className={`${compact ? 'w-4 h-4' : 'w-6 h-6'}`} />
            </div>
            <div>
                <h3 className={`font-bold text-slate-800 ${compact ? 'text-sm' : 'text-xl'}`}>逐词/意群详解</h3>
                {!compact && <p className="text-slate-400 text-sm">深入理解重点词组与固定搭配</p>}
            </div>
         </div>
         
         <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {result.detailedTokens.map((token, idx) => (
                <div key={idx} className="group flex flex-col bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-pink-200 hover:bg-white hover:shadow-xl hover:shadow-pink-100/20 transition-all duration-300 overflow-hidden">
                    {/* Card Header */}
                    <div className={`border-b border-slate-100/50 group-hover:border-pink-50 ${compact ? 'p-3' : 'p-5'}`}>
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <span className={`font-serif text-slate-800 font-medium tracking-tight leading-tight break-words ${compact ? 'text-lg' : 'text-2xl'}`}>{token.text}</span>
                            <span className="flex-shrink-0 px-2 py-1 rounded-md bg-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider group-hover:bg-pink-100 group-hover:text-pink-600 transition-colors">
                                {token.partOfSpeech}
                            </span>
                        </div>
                        <div className={`text-pink-600 font-medium mt-1 ${compact ? 'text-sm' : 'text-base'}`}>
                            {token.meaning}
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className={`bg-white flex-grow flex flex-col gap-2 ${compact ? 'p-3' : 'p-5'}`}>
                        {!compact && (
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                                <span className="text-xs font-bold text-slate-500 uppercase">句法成分</span>
                            </div>
                        )}
                        <div className="text-xs text-slate-800 font-medium bg-slate-50 inline-block self-start px-2 py-1 rounded-lg border border-slate-100">
                            {token.role}
                        </div>
                        
                        <div className={`${compact ? 'mt-1' : 'mt-2'}`}>
                             {!compact && (
                                 <div className="flex items-center gap-2 mb-1.5">
                                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                     <span className="text-xs font-bold text-slate-500 uppercase">解析</span>
                                </div>
                             )}
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {token.explanation}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const ChunkColumn: React.FC<{ chunk: AnalysisChunk; compact: boolean }> = ({ chunk, compact }) => {
  return (
    <div className="flex flex-col items-center text-center group">
      {/* Top: English Text */}
      <div className={`${compact ? 'text-xl md:text-2xl pb-2 mb-2' : 'text-4xl md:text-5xl px-2 pb-4 mb-4'} font-serif text-slate-800 border-b-[3px] border-pink-100 group-hover:border-pink-300 transition-colors font-medium tracking-tight`}>
        {chunk.text}
      </div>
      
      {/* Bottom: Grammar Annotation */}
      <div className="flex flex-col gap-1.5">
        <span className={`${compact ? 'text-xs px-2 py-0.5' : 'text-base px-3 py-1'} font-bold text-pink-600 bg-pink-50 rounded-lg`}>
            {chunk.grammarDescription}
        </span>
        <span className={`${compact ? 'text-[10px]' : 'text-sm'} text-slate-400 font-medium`}>
            {chunk.role}
        </span>
      </div>
    </div>
  );
};

const CorrectionCard: React.FC<{ correction: Correction }> = ({ correction }) => {
  return (
    <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 md:p-6 mb-8 relative overflow-hidden">
       {/* Decorative sidebar */}
       <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
       
       <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
          {/* Icon Area */}
          <div className="shrink-0">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center ring-4 ring-amber-50">
                  <AlertTriangle className="w-5 h-5" />
              </div>
          </div>

          {/* Content Area */}
          <div className="flex-grow space-y-4">
              <div>
                  <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                    语法自动修正
                    <span className="text-xs font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        {correction.errorType}
                    </span>
                  </h3>
                  <p className="text-amber-800/80 text-sm mt-1 leading-relaxed">{correction.reason}</p>
              </div>

              {/* Diff Display */}
              <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                   <div className="font-serif text-xl leading-relaxed text-slate-800">
                      {correction.changes.map((change, idx) => {
                          if (change.type === 'remove') {
                              return (
                                  <span key={idx} className="line-through decoration-red-400/50 text-red-500 bg-red-50 px-1 py-0.5 rounded mx-0.5 text-[0.9em]" title="删除">
                                      {change.text}
                                  </span>
                              );
                          }
                          if (change.type === 'add') {
                              return (
                                  <span key={idx} className="text-green-700 font-semibold bg-green-100 px-1.5 py-0.5 rounded mx-0.5 border border-green-200/50" title="添加">
                                      {change.text}
                                  </span>
                              );
                          }
                          // Keep
                          return <span key={idx} className="text-slate-700">{change.text}</span>;
                      })}
                   </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs font-medium text-amber-700/70">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>下方可视化与详解基于修正后的句子生成</span>
              </div>
          </div>
       </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Header } from './components/Header';
import { InputArea } from './components/InputArea';
import { ResultDisplay } from './components/ResultDisplay';
import { DictionaryPage } from './components/DictionaryPage';
import { WritingPage } from './components/WritingPage';
import { Footer } from './components/Footer';
import { AiAssistant } from './components/AiAssistant';
import { analyzeSentence } from './services/geminiService';
import { AnalysisResult, DictionaryResult, WritingResult, ModelLevel } from './types';
import { Sparkles, BookOpen, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'dictionary' | 'writing'>('analyzer');
  const [modelLevel, setModelLevel] = useState<ModelLevel>('mini');
  
  // Analyzer State
  const [isAnalyzerLoading, setIsAnalyzerLoading] = useState(false);
  const [analyzerResult, setAnalyzerResult] = useState<AnalysisResult | null>(null);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);

  // Dictionary State
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);

  // Writing State
  const [writingResult, setWritingResult] = useState<WritingResult | null>(null);

  const handleAnalyze = async (sentence: string) => {
    if (!sentence.trim()) return;

    setIsAnalyzerLoading(true);
    setAnalyzerError(null);
    setAnalyzerResult(null);

    try {
      const data = await analyzeSentence(sentence, modelLevel);
      setAnalyzerResult(data);
    } catch (err: any) {
      console.error(err);
      setAnalyzerError(err.message || "分析失败，请稍后再试。");
    } finally {
      setIsAnalyzerLoading(false);
    }
  };

  // Determine AI Assistant Context
  let assistantContextContent: string | null = null;
  let contextType: 'sentence' | 'word' | 'writing' = 'sentence';

  if (activeTab === 'analyzer') {
      assistantContextContent = analyzerResult?.englishSentence || null;
      contextType = 'sentence';
  } else if (activeTab === 'dictionary') {
      assistantContextContent = dictionaryResult?.word || null;
      contextType = 'word';
  } else {
      // Reconstruct the full text from segments for context
      assistantContextContent = writingResult?.segments.map(s => s.text).join('') || null;
      contextType = 'writing';
  }

  // Dynamic container width based on active tab
  const getContainerMaxWidth = () => {
    if (activeTab === 'writing') {
      return 'max-w-[98%] 2xl:max-w-[2400px]'; // Extra wide for split-view writing
    }
    return 'max-w-5xl'; // Standard readable width for Analyzer and Dictionary
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      <Header 
        activeTab={activeTab} 
        onNavigate={setActiveTab} 
        modelLevel={modelLevel}
        onModelChange={setModelLevel}
      />

      <main className={`flex-grow container mx-auto px-4 py-8 ${getContainerMaxWidth()} flex flex-col gap-8 relative transition-all duration-300 ease-in-out`}>
        
        {activeTab === 'analyzer' && (
          <>
            {/* Hero Section */}
            <div className="text-center space-y-4 mb-4">
              <div className="inline-flex items-center justify-center p-2 bg-pink-50 rounded-full text-pink-600 mb-2">
                <Sparkles className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">AI 驱动的英语语法分析</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 font-serif">
                英语句子成分可视化
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                输入任何英语句子，立刻解析其主谓宾定状补结构。
                <br className="hidden md:block"/>适合英语学习者、教师及语言爱好者。
              </p>
            </div>

            {/* Input Section */}
            <div className="w-full max-w-2xl mx-auto">
              <InputArea onAnalyze={handleAnalyze} isLoading={isAnalyzerLoading} />
            </div>

            {/* Results Section */}
            <div className="w-full">
               {isAnalyzerLoading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
                  <p className="text-slate-500 animate-pulse">正在分析句子结构...</p>
                </div>
              )}

              {analyzerError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700 max-w-2xl mx-auto">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium">分析出错</h3>
                    <p className="text-sm mt-1 opacity-90">{analyzerError}</p>
                  </div>
                </div>
              )}

              {analyzerResult && !isAnalyzerLoading && (
                <div className="animate-fade-in">
                  <ResultDisplay result={analyzerResult} />
                </div>
              )}

              {!analyzerResult && !isAnalyzerLoading && !analyzerError && (
                <div className="text-center py-12 opacity-40 flex flex-col items-center">
                  <BookOpen className="w-16 h-16 mb-4 text-slate-300" />
                  <p>暂无分析结果，请在上方输入句子。</p>
                </div>
              )}
            </div>
          </>
        )}
        
        {activeTab === 'dictionary' && (
          <DictionaryPage 
             initialResult={dictionaryResult} 
             onResultChange={setDictionaryResult} 
             modelLevel={modelLevel}
          />
        )}

        {activeTab === 'writing' && (
            <WritingPage
                initialResult={writingResult}
                onResultChange={setWritingResult}
                modelLevel={modelLevel}
            />
        )}
      </main>

      <Footer />
      
      {/* Floating AI Assistant */}
      <AiAssistant 
        currentContext={assistantContextContent} 
        contextType={contextType}
      />
    </div>
  );
};

export default App;

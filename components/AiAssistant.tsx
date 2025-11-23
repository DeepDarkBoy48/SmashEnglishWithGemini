
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import { Message } from '../types';
import { getChatResponse } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AiAssistantProps {
  currentContext: string | null;
  contextType: 'sentence' | 'word' | 'writing';
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ currentContext, contextType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是你的 AI 英语助手。有什么可以帮你的吗？' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isThinking]);

  // Reset chat when context changes
  useEffect(() => {
    if (currentContext) {
        let typeLabel = '';
        if (contextType === 'sentence') typeLabel = '句子';
        else if (contextType === 'word') typeLabel = '单词';
        else typeLabel = '文章';
        
        setMessages([{ role: 'assistant', content: `已加载当前${typeLabel}内容。你可以针对它向我提问。` }]);
    }
  }, [currentContext, contextType]);

  const handleSend = async (content: string) => {
    if (!content.trim() || isThinking) return;

    const userMsg: Message = { role: 'user', content: content };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsThinking(true);

    try {
        const responseText = await getChatResponse(messages, currentContext, content, contextType);
        setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
        setMessages(prev => [...prev, { role: 'assistant', content: "抱歉，连接出了点问题，请稍后再试。" }]);
    } finally {
        setIsThinking(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const containerClasses = isOpen 
    ? 'fixed z-50 inset-0 md:inset-auto md:bottom-6 md:left-6 flex flex-col items-start font-sans' // Mobile full screen, Desktop bottom-left
    : 'fixed z-50 bottom-6 left-6 flex flex-col items-start font-sans';

  const renderSuggestions = () => {
      if (contextType === 'sentence') {
          return (
            <>
                <button onClick={() => handleSend("解释一下这个句子的语法结构")} className="suggestion-chip">✨ 解释语法结构</button>
                <button onClick={() => handleSend("这句话里的重点单词有哪些？")} className="suggestion-chip">📖 重点单词</button>
            </>
          );
      } else if (contextType === 'word') {
          return (
            <>
                <button onClick={() => handleSend("帮我造几个不同的例句")} className="suggestion-chip">📝 生成更多例句</button>
                <button onClick={() => handleSend("这个词有什么同义词？")} className="suggestion-chip">🔄 同义词辨析</button>
            </>
          );
      } else {
          return (
            <>
               <button onClick={() => handleSend("这篇文章的语气是否足够正式？")} className="suggestion-chip">👔 检查语气</button>
               <button onClick={() => handleSend("有哪些表达可以更地道一些？")} className="suggestion-chip">🌟 优化地道表达</button>
            </>
          );
      }
  }

  return (
    <div className={containerClasses}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .suggestion-chip { flex-shrink: 0; bg-white; border; border-slate-200; text-slate-600; hover:bg-slate-100; px-3; py-1.5; rounded-full; text-xs; font-medium; transition-colors; shadow-sm; }
        .suggestion-chip { @apply flex-shrink-0 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm; }
      `}</style>

      {isOpen && (
        <div className="w-full h-full md:w-[400px] md:h-[75vh] md:max-h-[800px] md:mb-4 bg-white md:rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600 to-rose-500 p-4 flex justify-between items-center text-white shadow-md z-10 shrink-0 safe-top">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight">AI 助手 ({contextType === 'sentence' ? '语法' : contextType === 'word' ? '词汇' : '写作'})</h3>
                        <p className="text-[10px] text-pink-100 opacity-90">Powered by Gemini 2.5</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 bg-slate-50 space-y-6 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] md:max-w-[98%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
                            msg.role === 'user' ? 'bg-pink-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm markdown-body'
                        }`}>
                            {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex justify-start">
                         <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                            <span className="text-sm text-slate-400">正在思考...</span>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {!isThinking && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                <div className="px-4 py-2 bg-slate-50 flex gap-2 overflow-x-auto no-scrollbar shrink-0 border-t border-slate-50">
                    {renderSuggestions()}
                </div>
            )}

            {/* Input */}
            <form onSubmit={onSubmit} className="p-3 bg-white border-t border-slate-100 shrink-0 safe-bottom">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="输入你的问题..."
                        className="w-full pl-5 pr-12 py-3 rounded-full bg-slate-100 text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:bg-white transition-all text-sm"
                    />
                    <button type="submit" disabled={!inputValue.trim() || isThinking} className="absolute right-1.5 p-2 bg-pink-600 hover:bg-pink-700 rounded-full text-white disabled:opacity-50 transition-all">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`group p-4 rounded-full shadow-xl transition-all duration-300 flex items-center gap-2 relative overflow-hidden ${isOpen ? 'hidden md:flex bg-slate-800 text-white rotate-90 scale-90' : 'flex bg-gradient-to-tr from-pink-600 to-rose-500 text-white hover:scale-105 hover:-translate-y-1'}`}
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X className="w-6 h-6" /> : <><Sparkles className="w-6 h-6 animate-pulse" /><span className="font-bold text-base pr-1 hidden md:inline">问问 AI</span></>}
      </button>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { DocumentPage, BilingualSentence } from '../types';
import { translatePageContent } from '../services/geminiService';

interface ReaderProps {
  page: DocumentPage;
  onPageUpdate: (pageNumber: number, sentences: BilingualSentence[]) => void;
}

const Reader: React.FC<ReaderProps> = ({ page, onPageUpdate }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTranslation = async () => {
    if (page.sentences && page.sentences.length > 0) return;
    setIsTranslating(true);
    setError(null);
    try {
      const sentences = await translatePageContent(page.content);
      onPageUpdate(page.pageNumber, sentences);
    } catch (err: any) {
      setError(err.message || "Translation failed.");
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    fetchTranslation();
  }, [page.pageNumber, page.content]);

  if (isTranslating) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-10 bg-white/50 animate-in fade-in duration-700">
        <div className="relative">
          <div className="w-20 h-20 border-2 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 w-20 h-20 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="font-heading text-2xl font-bold text-slate-800 tracking-tight">AI 智慧排版中</p>
          <p className="text-[10px] text-slate-400 mt-3 uppercase tracking-[0.4em] font-black">Aligning Bilingual Mirror</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6 p-6 md:p-10 overflow-hidden bg-[#f8f9fa]">
      
      {/* Original View */}
      <div className="flex-1 h-1/2 lg:h-full overflow-hidden flex flex-col bg-white rounded-[40px] border border-slate-100 shadow-sm group transition-all">
        <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Original Text</span>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
          {page.image ? (
            <div className="relative mx-auto shadow-2xl bg-white p-2" style={{ maxWidth: '100%' }}>
              <img src={page.image} alt="Original" className="w-full h-auto select-none rounded-sm" />
            </div>
          ) : (
            <div className="bg-white max-w-prose mx-auto font-reading text-xl leading-relaxed text-slate-800">
              {page.content}
            </div>
          )}
        </div>
      </div>

      {/* Translation View */}
      <div className="flex-1 h-1/2 lg:h-full overflow-hidden flex flex-col bg-white rounded-[40px] shadow-2xl shadow-blue-900/5 border border-slate-100 relative">
        <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center bg-blue-50/10">
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">Bilingual Translation</span>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-10 py-12 md:px-16 md:py-16 custom-scrollbar">
          <div className="max-w-prose mx-auto">
            {error ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-rose-50 text-rose-600 px-6 py-4 rounded-3xl mb-8 font-bold text-sm border border-rose-100">{error}</div>
                <button 
                  onClick={fetchTranslation} 
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                >
                  RETRY TRANSLATION
                </button>
              </div>
            ) : page.sentences ? (
              <div className="space-y-12">
                {page.sentences.map((s, idx) => (
                  <div 
                    key={idx} 
                    className={`group transition-all duration-500 rounded-3xl p-6 md:p-8 -mx-6 md:-mx-8 border-l-[3px] ${
                      hoverIndex === idx 
                        ? 'border-blue-500 bg-blue-50/40 translate-x-2' 
                        : 'border-transparent'
                    }`}
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    <p className="text-slate-400 font-reading text-sm md:text-base mb-5 italic opacity-60 group-hover:opacity-100 transition-opacity leading-relaxed">
                      {s.src}
                    </p>
                    <p className="font-translation text-lg md:text-xl text-slate-800 leading-relaxed font-medium tracking-wide text-justify indent-[2em]">
                      {s.tgt}
                    </p>
                  </div>
                ))}
                <div className="h-24"></div>
              </div>
            ) : (
              <div className="space-y-10 animate-pulse mt-10">
                {[1,2,3,4].map(i => (
                  <div key={i} className="space-y-4">
                    <div className="h-2.5 bg-slate-50 rounded-full w-2/3"></div>
                    <div className="h-6 bg-slate-100 rounded-full w-full"></div>
                    <div className="h-6 bg-slate-100 rounded-full w-4/5"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 right-8 px-5 py-2.5 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-full text-[9px] text-slate-400 font-black tracking-[0.2em] shadow-sm">
          P.{page.pageNumber} / LINGUISTREAD PREM
        </div>
      </div>
    </div>
  );
};

export default Reader;


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, FileData, BilingualSentence, DocumentPage, FileHistoryItem } from './types';
import { parseFile } from './services/fileParser';
import Reader from './components/Reader';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentFile: null,
    currentPageIndex: 0,
    isLoading: false,
    isTranslating: false,
    error: null,
    history: [],
    view: 'upload'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('linguist_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setState(prev => ({ ...prev, history: parsed }));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('linguist_history', JSON.stringify(state.history));
  }, [state.history]);

  const updateHistory = useCallback((file: FileData, pageIdx: number) => {
    setState(prev => {
      const newHistory = [...prev.history];
      const fileId = file.name;
      const existingIdx = newHistory.findIndex(h => h.id === fileId || h.name === fileId);
      
      const historyItem: FileHistoryItem = {
        id: fileId,
        name: file.name,
        type: file.type,
        uploadTime: existingIdx >= 0 ? newHistory[existingIdx].uploadTime : Date.now(),
        lastReadTime: Date.now(),
        lastPage: pageIdx + 1,
        totalPages: file.pages.length
      };

      if (existingIdx >= 0) {
        newHistory.splice(existingIdx, 1);
      }
      newHistory.unshift(historyItem);

      return { ...prev, history: newHistory.slice(0, 15) };
    });
  }, []);

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`确定要删除记录“${id}”吗？`)) return;
    
    setState(prev => {
      const filteredHistory = prev.history.filter(h => h.id !== id && h.name !== id);
      localStorage.removeItem(`trans_cache_${id}`);
      return { ...prev, history: filteredHistory };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | File) => {
    let file: File;
    if (event instanceof File) {
      file = event;
    } else {
      const selected = event.target.files?.[0];
      if (!selected) return;
      file = selected;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      let parsedFile = await parseFile(file);
      const cacheKey = `trans_cache_${parsedFile.name}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      parsedFile.pages = parsedFile.pages.map((page, idx) => ({
        ...page,
        sentences: cached[idx] || page.sentences
      }));

      const historyMatch = state.history.find(h => h.id === parsedFile.name || h.name === parsedFile.name);
      const initialPage = historyMatch ? Math.min(historyMatch.lastPage - 1, parsedFile.pages.length - 1) : 0;

      setState(prev => ({
        ...prev,
        currentFile: parsedFile,
        currentPageIndex: initialPage,
        isLoading: false,
        view: 'reader'
      }));
      
      updateHistory(parsedFile, initialPage);
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  const handlePageUpdate = useCallback((pageNumber: number, sentences: BilingualSentence[]) => {
    setState(prev => {
      if (!prev.currentFile) return prev;
      const pageIdx = prev.currentFile.pages.findIndex(p => p.pageNumber === pageNumber);
      if (pageIdx === -1) return prev;
      
      const cacheKey = `trans_cache_${prev.currentFile.name}`;
      const existingCache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      existingCache[pageIdx] = sentences;
      localStorage.setItem(cacheKey, JSON.stringify(existingCache));

      const newPages = [...prev.currentFile.pages];
      newPages[pageIdx] = { ...newPages[pageIdx], sentences };
      return { ...prev, currentFile: { ...prev.currentFile, pages: newPages } };
    });
  }, []);

  const goToPage = (idx: number) => {
    if (!state.currentFile) return;
    const newIdx = Math.max(0, Math.min(state.currentFile.pages.length - 1, idx));
    setState(prev => ({ ...prev, currentPageIndex: newIdx }));
    updateHistory(state.currentFile, newIdx);
  };

  const closeReader = () => {
    setState(prev => ({ ...prev, view: 'upload', currentFile: null }));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#fcfcfd] text-slate-900 overflow-hidden font-sans">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx,.doc,.txt" className="hidden" />

      {/* Adaptive Header */}
      <header className="h-16 md:h-20 bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-4 md:px-8 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div 
            className="bg-blue-600 p-2 md:p-2.5 rounded-xl shadow-lg shadow-blue-100 cursor-pointer active:scale-95 transition-transform"
            onClick={closeReader}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">LinguistRead</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Smart Adaptive Reader</p>
          </div>
        </div>

        {state.view === 'reader' && state.currentFile && (
          <div className="flex items-center space-x-2 md:space-x-6">
            <div className="hidden lg:flex flex-col items-end mr-2">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[300px]">{state.currentFile.name}</span>
              <span className="text-[9px] text-blue-500 font-black tracking-widest uppercase">{state.currentFile.type} MODE</span>
            </div>
            <div className="flex items-center bg-slate-900 text-white rounded-2xl px-3 py-2 md:px-5 md:py-2.5 space-x-4 shadow-xl">
              <button onClick={() => goToPage(state.currentPageIndex - 1)} disabled={state.currentPageIndex === 0} className="hover:text-blue-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-xs font-bold tabular-nums tracking-widest">{state.currentPageIndex + 1} / {state.currentFile.pages.length}</span>
              <button onClick={() => goToPage(state.currentPageIndex + 1)} disabled={state.currentPageIndex === state.currentFile.pages.length - 1} className="hover:text-blue-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <button onClick={closeReader} className="bg-white border border-slate-100 p-2.5 rounded-xl text-slate-400 hover:text-rose-500 transition-all shadow-sm hover:shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden relative">
        {state.view === 'upload' ? (
          <div className="h-full flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-[1.5] xl:flex-[2] flex flex-col items-center justify-center bg-white px-6 md:px-12 overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-4xl py-10">
                <div className="mb-14 text-center">
                  <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black text-slate-900 leading-[1.1] mb-8 premium-title">
                    文献深度阅读，<br/><span className="text-blue-600">智慧完美体验。</span>
                  </h2>
                  <p className="text-sm md:text-lg text-slate-400 font-medium max-w-xl mx-auto font-translation tracking-wide">
                    支持 PDF 与文本格式。AI 自动解析段落，为您提供极致的双语对照体验。
                  </p>
                </div>

                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-[60px] blur-2xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
                  <div className="relative aspect-[21/9] w-full border-2 border-dashed border-slate-200 rounded-[48px] flex flex-col items-center justify-center bg-slate-50/30 group-hover:border-blue-400 group-hover:bg-white transition-all duration-500 shadow-sm group-hover:shadow-2xl group-hover:shadow-blue-500/5">
                    <div className="bg-white p-6 md:p-8 rounded-full shadow-lg group-hover:scale-110 transition-all duration-500 mb-6">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">拖拽或点击上传</h3>
                    <p className="mt-2 text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Select PDF, DOCX or TXT</p>
                    
                    {state.isLoading && (
                      <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center rounded-[48px]">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="mt-6 font-black text-blue-600 tracking-[0.3em] uppercase text-xs">Parsing Document...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-[320px] max-w-full lg:max-w-[420px] bg-slate-50 border-l border-slate-100 flex flex-col overflow-hidden">
              <div className="p-8 md:p-10 pb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">最近阅读</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Reading History</p>
              </div>

              <div className="flex-1 overflow-y-auto px-6 md:px-8 space-y-5 pb-12 custom-scrollbar">
                {state.history.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-[32px] mx-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No History Yet</p>
                  </div>
                ) : (
                  state.history.map((item) => (
                    <div 
                      key={item.id || item.name}
                      className="group bg-white p-6 rounded-[32px] border border-slate-100 hover:border-blue-200 transition-all relative shadow-sm hover:shadow-xl hover:shadow-blue-500/5 flex-none"
                    >
                      <button 
                        type="button"
                        onClick={(e) => handleDeleteHistory(e, item.id || item.name)}
                        className="absolute top-4 right-4 p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                        title="删除记录"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>

                      <div className="flex flex-col pr-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-50 rounded text-slate-400">{item.type}</span>
                          <span className="text-[9px] text-slate-300 font-bold">{new Date(item.lastReadTime).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-6">
                          {item.name}
                        </h4>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-blue-600 tracking-tighter">{item.lastPage} / {item.totalPages} 页</span>
                            <span className="text-[8px] text-slate-300 font-bold uppercase">Progress</span>
                          </div>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                          >
                            继续阅读
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-8 right-8 h-[2px] bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/40" style={{ width: `${(item.lastPage / item.totalPages) * 100}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          state.currentFile && (
            <div className="h-full">
              <Reader 
                page={state.currentFile.pages[state.currentPageIndex]} 
                onPageUpdate={handlePageUpdate} 
              />
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { useSachHiep } from '../state/SachHiepContext';
import { motion, AnimatePresence } from 'motion/react';
import { SachHiepTTSPlayer } from './SachHiepTTSPlayer';
import { SachHiepFixModal } from './SachHiepFixModal';

export const SachHiepEditor: React.FC = () => {
  const { 
    story, 
    activeChapterId, 
    selectChapter,
    updateChapterContent, 
    updateChapterTitle,
    saveProgress,
    isGenerating,
    isSyncingBible,
    generationStatus,
    generationThought,
    generationProgress,
    generationPreview,
    updateStorySettings,
    generateRewrite,
    generateIllustrations
  } = useSachHiep();

  const [isEditMode, setIsEditMode] = useState(true);
  const [showAiEdit, setShowAiEdit] = useState(false);
  const [showThought, setShowThought] = useState(false);
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [showIllModal, setShowIllModal] = useState(false);
  const [illCount, setIllCount] = useState(3);
  const [showTtsPlayer, setShowTtsPlayer] = useState(false);
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  const [fixDefaultInstruction, setFixDefaultInstruction] = useState('');

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) {
        setIsMobileExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);

    const handleOpenFixWithInstruction = (e: any) => {
      if (e.detail && e.detail.instruction) {
        setFixDefaultInstruction(e.detail.instruction);
        setIsFixModalOpen(true);
      }
    };
    window.addEventListener('open-fix-modal-with-instruction', handleOpenFixWithInstruction as EventListener);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('open-fix-modal-with-instruction', handleOpenFixWithInstruction as EventListener);
    };
  }, []);
  
  const activeChapter = story?.chapters.find(c => c.id === activeChapterId);

  if (!activeChapter) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-950">
            <p>Chọn một chương từ thanh bên để bắt đầu viết.</p>
        </div>
    );
  }

  const toggleNsfw = () => {
    if (story) {
        updateStorySettings({ nsfw: !story.nsfw });
    }
  };

  const handleFixChapter = async (instruction: string) => {
      if (!activeChapter || !activeChapter.content) return;
      await generateRewrite(instruction);
  };

  const renderContentWithIllustrations = () => {
    if (!activeChapter) return null;
    let content = activeChapter.content || '';
    
    // Đảm bảo thay thế các chuỗi \n được sinh ra thành ký tự xuống dòng thật
    content = content.replace(/\\n/g, '\n');

    const illustrations = activeChapter.illustrations || [];
    
    if (illustrations.length === 0) return content + '\u200b';

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    const renderedIllIds = new Set<string>();

    lines.forEach((line, index) => {
      elements.push(<span key={`line-${index}`}>{line}</span>);
      elements.push(<br key={`br-${index}`} />);
      
      const lineIllustrations = illustrations.filter(ill => ill.position === index + 1);
      lineIllustrations.forEach(ill => {
        renderedIllIds.add(ill.id);
        elements.push(
          <div key={ill.id} className="my-4 flex flex-col items-center">
            <img src={ill.imageUrl} alt={ill.prompt} className="max-w-full h-auto rounded-lg shadow-lg" referrerPolicy="no-referrer" />
            <span className="text-xs text-gray-500 mt-2 italic">{ill.prompt}</span>
          </div>
        );
      });
    });

    // Render any illustrations that were out of bounds
    const unrenderedIllustrations = illustrations.filter(ill => !renderedIllIds.has(ill.id));
    unrenderedIllustrations.forEach(ill => {
      elements.push(
        <div key={ill.id} className="my-4 flex flex-col items-center">
          <img src={ill.imageUrl} alt={ill.prompt} className="max-w-full h-auto rounded-lg shadow-lg" referrerPolicy="no-referrer" />
          <span className="text-xs text-gray-500 mt-2 italic">{ill.prompt}</span>
        </div>
      );
    });

    return elements;
  };

  return (
    <div className="flex-1 overflow-y-auto relative bg-gray-950 scroll-smooth">
      
      {/* --- FLOATING TOOLBAR --- */}
      <div className="sticky top-4 right-4 z-40 flex justify-end px-4 md:px-8 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg p-1.5 shadow-xl transition-all relative">
              
              {/* Mode Toggle */}
              <button 
                  type="button"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-all border cursor-pointer ${
                      isEditMode 
                      ? 'bg-primary-900/20 text-primary-400 border-primary-900/50 shadow-inner' 
                      : 'text-gray-400 hover:text-gray-50 hover:bg-gray-800 border-transparent'
                  }`}
              >
                  {isEditMode ? (
                      <span>Sửa thủ công</span>
                  ) : (
                      <span>Chế độ Đọc</span>
                  )}
              </button>

              {/* TTS Listen Button */}
              <button
                  type="button"
                  onClick={() => setShowTtsPlayer(!showTtsPlayer)}
                  title="Nghe đọc chương chuyện bằng giọng nói Google"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-all border cursor-pointer ${
                      showTtsPlayer
                          ? 'bg-primary-900/40 text-primary-300 border-primary-500/60 shadow-inner'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800 border-gray-700'
                  }`}
              >
                  <svg className="w-3.5 h-3.5 fill-current text-primary-400" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                  <span>Nghe</span>
              </button>

              {/* AI Fix Chapter Button */}
              <button
                  type="button"
                  onClick={() => { setFixDefaultInstruction(''); setIsFixModalOpen(true); }}
                  disabled={isGenerating || !activeChapter.content}
                  title="Nhập yêu cầu để AI quét lại và sửa lỗi, thay đổi tình tiết trong chương"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded transition-all border cursor-pointer ${
                      isGenerating || !activeChapter.content
                          ? 'bg-gray-800/30 text-gray-600 border-transparent cursor-not-allowed'
                          : 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 hover:text-emerald-300 border-emerald-900/50'
                  }`}
              >
                  <span>✨ Sửa AI</span>
              </button>

              <div className="w-px h-4 bg-gray-700 mx-0.5"></div>

              {/* Sync Indicator */}
              {isSyncingBible && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold animate-pulse" title="Đang đồng bộ Story Bible ngầm">
                      <svg className="animate-spin h-3 w-3 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Đang đồng bộ</span>
                  </div>
              )}

              {/* NSFW Toggle shortcut */}
              <button 
                  type="button"
                  onClick={toggleNsfw}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black rounded transition-all border cursor-pointer ${
                      story?.nsfw 
                      ? 'bg-pink-900/40 text-pink-400 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                      : 'bg-gray-800/50 text-gray-600 border-transparent hover:text-gray-400'
                  }`}
                  title={story?.nsfw ? "Dâm Tu Thần Bút đang KÍCH HOẠT" : "Kích hoạt Dâm Tu Thần Bút"}
              >
                  69+
              </button>
          </div>
      </div>

      <div className="max-w-3xl mx-auto py-10 px-4 md:py-16 md:px-8 min-h-screen">
        {/* Title Input */}
        {isEditMode ? (
            <input 
                type="text" 
                value={activeChapter.title} 
                onChange={(e) => {
                    updateChapterTitle(activeChapter.id, e.target.value);
                }} 
                className="w-full bg-transparent text-3xl md:text-4xl font-serif font-bold text-gray-100 mb-8 focus:outline-none border-b border-transparent focus:border-gray-800 transition-colors mt-4 md:mt-0"
                placeholder="Tiêu đề chương"
            />
        ) : (
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-50 mb-8 mt-4 md:mt-0 pb-1 border-b border-transparent">
                {activeChapter.title}
            </h1>
        )}
        
        {/* Content Area */}
        <div className="grid relative text-base md:text-lg leading-relaxed font-serif pb-32">
            
            <div 
                className={`col-start-1 row-start-1 whitespace-pre-wrap p-0 border-none m-0 w-full overflow-hidden break-words
                ${isEditMode 
                    ? 'invisible pointer-events-none' // Ghost mode
                    : 'visible text-gray-300'         // Read mode
                }`}
            >
                {renderContentWithIllustrations()}
            </div>

            <textarea
                value={(activeChapter.content || '').replace(/\\n/g, '\n')}
                onChange={(e) => updateChapterContent(activeChapter.id, e.target.value)}
                placeholder="Bắt đầu viết kiệt tác của bạn..."
                className={`col-start-1 row-start-1 w-full h-full bg-transparent text-gray-300 focus:outline-none resize-none overflow-hidden placeholder-gray-700 transition-opacity p-0 border-none m-0 break-words
                ${isGenerating ? 'opacity-80' : 'opacity-100'}
                ${!isEditMode ? 'hidden' : 'block'} 
                `}
                spellCheck={false}
                readOnly={isGenerating || !isEditMode} 
            />
            
            {isGenerating && (
                <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none z-10" />
            )}
        </div>
        
        {/* Show illustrations below the editor in edit mode */}
        {isEditMode && activeChapter?.illustrations && activeChapter.illustrations.length > 0 && (
            <div className="mt-8 border-t border-gray-800 pt-6">
                <h3 className="text-lg font-medium text-gray-300 mb-4">Ảnh minh họa trong chương:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeChapter.illustrations.map(ill => (
                        <div key={ill.id} className="flex flex-col items-center bg-gray-900/50 p-2 rounded-lg border border-gray-800">
                            <img src={ill.imageUrl} alt={ill.prompt} className="max-w-full h-auto rounded shadow-sm" referrerPolicy="no-referrer" />
                            <span className="text-xs text-gray-500 mt-2 italic text-center">{ill.prompt}</span>
                            <span className="text-xs text-primary-500 mt-1">Vị trí: Dòng {ill.position}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {isGenerating && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur border border-primary-500/30 text-primary-400 px-4 py-2 rounded-2xl shadow-2xl flex flex-col items-center gap-2 z-50 animate-bounce-slight max-w-[90vw] min-w-[200px]">
            {generationPreview && (
              <div className="w-full mb-2 flex justify-center">
                <img src={generationPreview} alt="Preview" className="max-h-48 rounded-lg shadow-md object-contain" />
              </div>
            )}
            <div className="flex items-center justify-between w-full gap-3">
              <span className="text-sm font-medium tracking-wide whitespace-nowrap">{generationStatus || 'AI đang viết...'}</span>
              {generationThought && (
                <button 
                  type="button"
                  onClick={() => setShowThought(!showThought)}
                  className="p-1 hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
                  title="Xem suy nghĩ của AI"
                >
                  <svg className={`w-4 h-4 transition-transform ${showThought ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
            {generationProgress > 0 && (
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div className="bg-primary-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${generationProgress * 100}%` }}></div>
              </div>
            )}
            {showThought && generationThought && (
              <div className="w-full max-h-32 overflow-y-auto text-[10px] text-gray-400 font-mono bg-black/40 p-2 rounded border border-gray-800 break-words mt-2">
                {generationThought}
              </div>
            )}
          </div>
        )}
      </div>
      {showTtsPlayer && activeChapter && (
          <SachHiepTTSPlayer
              story={story}
              activeChapterId={activeChapterId}
              onSelectChapter={selectChapter}
              onClose={() => setShowTtsPlayer(false)}
          />
      )}
      <SachHiepFixModal 
          isOpen={isFixModalOpen}
          onClose={() => setIsFixModalOpen(false)}
          onConfirmFix={handleFixChapter}
          isGenerating={isGenerating}
          defaultInstruction={fixDefaultInstruction}
      />
    </div>
  );
};

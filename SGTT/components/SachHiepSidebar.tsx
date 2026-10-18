import React, { useState } from 'react';
import { useSachHiep } from '../state/SachHiepContext';
import { CharacterList } from './CharacterList';
import { SachHiepScenePlannerModal } from './SachHiepScenePlannerModal';
import { Sparkles } from 'lucide-react';

interface Props {
    onOpenSettings: () => void;
    isOpen: boolean;    
    onClose: () => void; 
}

export const SachHiepSidebar: React.FC<Props> = ({ onOpenSettings, isOpen, onClose }) => {
  const { 
    story, 
    activeChapterId, 
    selectChapter, 
    addChapter, 
    characters, 
    closeStory,
    setUserInstruction,
    generateContinue,
    isGenerating,
    isSyncingBible,
    generationStatus,
    updateChapterSceneScript,
    updateWorldLore,
    updateStorySettings
  } = useSachHiep();
  
  const [tab, setTab] = useState<'chapters' | 'knowledge' | 'world' | 'debug'>('chapters');
  const [loreInput, setLoreInput] = useState('');
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);

  if (!story) return null;

  const activeChapter = story.chapters.find(c => c.id === activeChapterId);

  const handleTabChange = (newTab: 'chapters' | 'knowledge' | 'world' | 'debug') => {
    setTab(newTab);
  };

  const handleApplyAndGenerate = async (compiled: string, rawSceneScript: string) => {
      setUserInstruction(compiled);
      if (activeChapterId) {
          await updateChapterSceneScript(activeChapterId, rawSceneScript);
      }
      await generateContinue(compiled);
  };

  const addLoreItem = () => {
      if (!loreInput.trim()) return;
      const currentLore = story.worldLore || [];
      updateWorldLore([...currentLore, loreInput.trim()]);
      setLoreInput('');
  };

  const removeLoreItem = (index: number) => {
      const currentLore = story.worldLore || [];
      const newLore = [...currentLore];
      newLore.splice(index, 1);
      updateWorldLore(newLore);
  };

  const updateLoreItem = (index: number, value: string) => {
      const currentLore = story.worldLore || [];
      const newLore = [...currentLore];
      newLore[index] = value;
      updateWorldLore(newLore);
  };

  const updateBibleField = (field: 'world' | 'rules' | 'arc', value: string) => {
      const currentBible = story.storyBible || {
          chars: [],
          world: story.setting || '',
          rules: '',
          arc: story.synopsis || '',
          chapter_cores: []
      };
      const updatedBible = {
          ...currentBible,
          [field]: value
      };
      const settingsUpdate: any = { storyBible: updatedBible };
      if (field === 'world') {
          settingsUpdate.setting = value;
      }
      updateStorySettings(settingsUpdate);
  };

  return (
    <div className={`
        fixed inset-y-0 left-0 z-50 w-80 h-full
        bg-gray-900 border-r border-gray-800 flex flex-col glass-panel shadow-2xl
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
         <div className="flex flex-col overflow-hidden mr-2">
            <h1 className="text-base font-bold text-gray-100 truncate" title={story.title}>
               {story.title}
            </h1>
         </div>
         
         <div className="flex gap-1 shrink-0">
             <button 
                type="button"
                onClick={closeStory} 
                className="p-2 text-gray-500 hover:text-gray-50 bg-gray-800 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                title="Thoát ra thư viện"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
             </button>
             
             <button 
                type="button"
                onClick={onOpenSettings} 
                className="p-2 text-gray-500 hover:text-primary-400 bg-gray-800 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                title="Cài đặt truyện"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
             </button>

             <button 
                type="button"
                onClick={onClose} 
                className="md:hidden p-2 text-red-500 hover:text-red-400 bg-gray-800 hover:bg-gray-700 rounded transition-colors cursor-pointer"
                title="Đóng Menu"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
             </button>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 shrink-0 overflow-x-auto custom-scrollbar">
        <button type="button" onClick={() => handleTabChange('chapters')} className={`flex-1 py-3 px-2 text-[10px] font-bold uppercase transition-colors whitespace-nowrap cursor-pointer ${tab === 'chapters' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}>Chương</button>
        <button type="button" onClick={() => handleTabChange('world')} className={`flex-1 py-3 px-2 text-[10px] font-bold uppercase transition-colors whitespace-nowrap cursor-pointer ${tab === 'world' ? 'text-yellow-400 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}>Thế giới</button>
        <button type="button" onClick={() => handleTabChange('knowledge')} className={`flex-1 py-3 px-2 text-[10px] font-bold uppercase transition-colors whitespace-nowrap cursor-pointer ${tab === 'knowledge' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}>Nhân vật</button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900/50">
        {tab === 'chapters' && (
          <div className="p-2 space-y-1">
            {story.chapters.map(chapter => (
              <button type="button" key={chapter.id} onClick={() => { selectChapter(chapter.id); if (window.innerWidth < 768) onClose(); }} className={`w-full text-left px-4 py-3 rounded-md transition-all cursor-pointer ${activeChapterId === chapter.id ? 'bg-gray-800 text-gray-50 shadow-lg border-l-2 border-primary-500' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}>
                <div className="font-medium truncate">{chapter.title}</div>
                <div className="text-xs text-gray-600 mt-1 truncate">{(chapter.content || "").replace(/\\n/g, ' ').slice(0, 40) || "Chương trống..."}...</div>
              </button>
            ))}
            <button type="button" onClick={addChapter} className="w-full text-center py-2 mt-2 border border-dashed border-gray-700 rounded text-gray-500 hover:border-gray-500 hover:text-gray-300 transition-colors text-sm uppercase font-bold cursor-pointer">+ Thêm chương mới</button>
          </div>
        )}

        {tab === 'world' && (
            <div className="p-4 space-y-4">
                <div className="space-y-4">
                    <div className="bg-gray-800/50 border border-gray-700 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-primary-400 uppercase">Thế giới (Story Bible)</h3>
                            <span className="text-[9px] text-gray-500 italic">Tự động lưu khi sửa</span>
                        </div>
                        <textarea
                            value={story.storyBible?.world ?? story.setting ?? ''}
                            onChange={e => updateBibleField('world', e.target.value)}
                            rows={5}
                            placeholder="Mô tả bối cảnh thế giới..."
                            className="w-full bg-gray-950/70 border border-gray-700/80 focus:border-primary-500 rounded p-2 text-xs text-gray-200 leading-relaxed outline-none resize-y custom-scrollbar"
                        />
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-red-400 uppercase">Quy tắc / Cấm kỵ</h3>
                            <span className="text-[9px] text-gray-500 italic">Tự động lưu khi sửa</span>
                        </div>
                        <textarea
                            value={story.storyBible?.rules ?? ''}
                            onChange={e => updateBibleField('rules', e.target.value)}
                            rows={4}
                            placeholder="Các quy tắc thế giới, hệ thống tu luyện hoặc điều cấm kỵ..."
                            className="w-full bg-gray-950/70 border border-gray-700/80 focus:border-red-500 rounded p-2 text-xs text-gray-200 leading-relaxed outline-none resize-y custom-scrollbar"
                        />
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-yellow-400 uppercase">Trạng thái Arc hiện tại</h3>
                            <span className="text-[9px] text-gray-500 italic">Tự động lưu khi sửa</span>
                        </div>
                        <textarea
                            value={story.storyBible?.arc ?? story.synopsis ?? ''}
                            onChange={e => updateBibleField('arc', e.target.value)}
                            rows={4}
                            placeholder="Mục tiêu hoặc diễn biến chính của Arc hiện tại..."
                            className="w-full bg-gray-950/70 border border-gray-700/80 focus:border-yellow-500 rounded p-2 text-xs text-gray-200 leading-relaxed outline-none resize-y custom-scrollbar"
                        />
                    </div>
                </div>
                
                <div className="pt-4 border-t border-gray-800">
                    <div className="mb-4 bg-yellow-900/10 border border-yellow-900/30 p-3 rounded-lg">
                        <h3 className="text-xs font-bold text-yellow-500 uppercase mb-1">Ghi chú thêm (Lore)</h3>
                        <p className="text-[10px] text-gray-400">Các quy tắc, sự kiện hoặc thông tin quan trọng bổ sung (có thể chỉnh sửa trực tiếp).</p>
                    </div>
                    
                    <div className="mb-4">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                            Thêm thông tin Lore
                        </label>
                        <div className="flex gap-1 mb-2">
                            <input 
                                type="text" 
                                value={loreInput}
                                onChange={e => setLoreInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') addLoreItem();
                                }}
                                className="flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-100 focus:border-yellow-500 outline-none placeholder-gray-700"
                                placeholder="VD: Ma thuật cần sinh lực để thi triển..."
                            />
                            <button 
                                type="button"
                                onClick={addLoreItem}
                                className="px-2 bg-gray-800 text-gray-400 hover:text-gray-50 rounded border border-gray-700 text-xs font-bold uppercase cursor-pointer"
                            >
                                Thêm
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            {(story.worldLore || []).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start gap-1.5 group bg-gray-800/50 rounded p-1.5 border border-gray-800 hover:border-gray-700">
                                    <textarea
                                        value={item}
                                        onChange={e => updateLoreItem(idx, e.target.value)}
                                        rows={2}
                                        className="flex-1 bg-transparent text-xs text-gray-200 leading-tight focus:bg-gray-950 focus:p-1 rounded outline-none resize-y"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => removeLoreItem(idx)}
                                        className="text-gray-500 hover:text-red-400 px-1.5 py-0.5 text-[10px] font-bold uppercase shrink-0 cursor-pointer"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            ))}
                            {(story.worldLore || []).length === 0 && (
                                <div className="text-center text-gray-600 text-xs italic py-4">Chưa có thông tin ghi chú thêm.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {tab === 'knowledge' && (
            <div className="space-y-2">
                <CharacterList characters={characters} />
            </div>
        )}
      </div>

      {/* Footer (Director Mode) - Always visible on both mobile and desktop */}
      <div className="flex flex-col p-4 border-t border-gray-800 bg-gray-900/50 shrink-0">
            <button
                type="button"
                onClick={() => {
                  setIsSceneModalOpen(true);
                  if (window.innerWidth < 768) onClose();
                }}
                disabled={isGenerating || isSyncingBible}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-xs font-bold text-white shadow-xl transition-all uppercase cursor-pointer
                ${(isGenerating || isSyncingBible) ? 'bg-gray-800 cursor-not-allowed text-gray-500' : 'bg-gradient-to-r from-primary-600 via-emerald-600 to-blue-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}
            >
                <Sparkles size={16} />
                {isGenerating ? (generationStatus || 'Đang suy luận...') : isSyncingBible ? 'Đang đồng bộ...' : '📋 Bảng Kịch Bản Cảnh & Viết Luôn'}
            </button>
      </div>

      <SachHiepScenePlannerModal 
          isOpen={isSceneModalOpen}
          onClose={() => setIsSceneModalOpen(false)}
          onApplyAndGenerate={handleApplyAndGenerate}
          initialScript={activeChapter?.sceneScript}
      />
    </div>
  );
};

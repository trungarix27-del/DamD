import React, { useState } from 'react';
import { useSachHiep } from '../state/SachHiepContext';
import { SachHiepSidebar } from './SachHiepSidebar';
import { SachHiepEditor } from './SachHiepEditor';
import { SachHiepSettingsModal } from './SachHiepSettingsModal';
import { SachHiepScenePlannerModal } from './SachHiepScenePlannerModal';
import { Sparkles } from 'lucide-react';

export const SachHiepWorkspace: React.FC = () => {
    const { 
        story, 
        activeChapterId,
        generateContinue, 
        isGenerating, 
        generationStatus, 
        setUserInstruction,
        updateChapterSceneScript
    } = useSachHiep();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSachHiepSidebarOpen, setIsSachHiepSidebarOpen] = useState(false);
    const [isMobileSceneModalOpen, setIsMobileSceneModalOpen] = useState(false);

    const activeChapter = story?.chapters.find(c => c.id === activeChapterId);

    const handleApplyAndGenerate = async (compiled: string, rawSceneScript: string) => {
        setUserInstruction(compiled);
        if (activeChapterId) {
            await updateChapterSceneScript(activeChapterId, rawSceneScript);
        }
        await generateContinue(compiled);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-gray-950 text-slate-200 selection:bg-primary-500/30 selection:text-gray-50">
            {/* Mobile Overlay Backdrop */}
            {isSachHiepSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity animate-fadeIn"
                    onClick={() => setIsSachHiepSidebarOpen(false)}
                />
            )}

            <SachHiepSidebar 
                onOpenSettings={() => setIsSettingsOpen(true)} 
                isOpen={isSachHiepSidebarOpen}
                onClose={() => setIsSachHiepSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col relative z-0 w-full">
                {/* Mobile Top Controls */}
                <div className="md:hidden fixed top-4 left-4 z-30 flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={() => setIsSachHiepSidebarOpen(true)}
                        className="p-2 bg-gray-900/60 backdrop-blur border border-gray-700 rounded-lg text-gray-400 hover:text-gray-50 hover:border-primary-500 transition-all shadow-lg text-xs font-bold uppercase cursor-pointer"
                    >
                        MENU
                    </button>
                </div>

                <SachHiepEditor />
                
                {/* Floating Action Button - MOBILE ONLY (md:hidden) */}
                <div className="md:hidden fixed bottom-4 left-4 right-4 z-30 pointer-events-auto">
                    <button
                        type="button"
                        onClick={() => setIsMobileSceneModalOpen(true)}
                        disabled={isGenerating}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-xs font-bold text-white shadow-2xl transition-all uppercase cursor-pointer
                        ${isGenerating ? 'bg-gray-800 cursor-not-allowed opacity-80' : 'bg-gradient-to-r from-primary-600 via-emerald-600 to-blue-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}
                    >
                        <Sparkles size={16} />
                        {isGenerating ? (generationStatus || 'Đang viết...') : '📋 Bảng Kịch Bản Cảnh & Viết Luôn'}
                    </button>
                </div>
            </main>
            <SachHiepSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <SachHiepScenePlannerModal 
                isOpen={isMobileSceneModalOpen}
                onClose={() => setIsMobileSceneModalOpen(false)}
                onApplyAndGenerate={handleApplyAndGenerate}
                initialScript={activeChapter?.sceneScript}
            />
        </div>
    );
};

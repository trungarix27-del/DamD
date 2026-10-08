import React, { useState, useEffect } from 'react';
import { SACH_HIEP_COT_PROMPT } from '../narrative/prompting/sachHiepPromptAssembler';
import { NSFW_INSTRUCTION } from '../narrative/prompting/sachHiepContentSafetyRules';
import { Save, RotateCcw, Check, Sparkles, Flame, FileText } from 'lucide-react';

export const SystemPromptScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cot' | 'nsfw'>('cot');
    
    const [cotText, setCotText] = useState('');
    const [nsfwText, setNsfwText] = useState('');
    const [savedMessage, setSavedMessage] = useState(false);

    useEffect(() => {
        const customCot = localStorage.getItem('sachhiep_custom_system_prompt');
        setCotText(customCot !== null ? customCot : SACH_HIEP_COT_PROMPT);

        const customNsfw = localStorage.getItem('sachhiep_custom_nsfw_prompt');
        setNsfwText(customNsfw !== null ? customNsfw : NSFW_INSTRUCTION);
    }, []);

    const handleSave = () => {
        if (activeTab === 'cot') {
            localStorage.setItem('sachhiep_custom_system_prompt', cotText);
        } else {
            localStorage.setItem('sachhiep_custom_nsfw_prompt', nsfwText);
        }
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
    };

    const handleReset = () => {
        if (activeTab === 'cot') {
            if (window.confirm('Bạn có chắc chắn muốn khôi phục System Prompt COT về mặc định không?')) {
                localStorage.removeItem('sachhiep_custom_system_prompt');
                setCotText(SACH_HIEP_COT_PROMPT);
                setSavedMessage(true);
                setTimeout(() => setSavedMessage(false), 3000);
            }
        } else {
            if (window.confirm('Bạn có chắc chắn muốn khôi phục Quy định 18+ về mặc định không?')) {
                localStorage.removeItem('sachhiep_custom_nsfw_prompt');
                setNsfwText(NSFW_INSTRUCTION);
                setSavedMessage(true);
                setTimeout(() => setSavedMessage(false), 3000);
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-950 text-slate-100 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto pb-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
                    <div>
                        <div className="flex items-center gap-2 text-primary-400 mb-1">
                            <Sparkles size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Hệ thống AI</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-50">System Prompt & Quy Định</h1>
                        <p className="text-xs text-gray-400 mt-1">
                            Quản lý quy trình suy nghĩ COT của hệ thống và các quy định nội dung trưởng thành (NSFW 18+).
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition-colors border border-gray-700"
                        >
                            <RotateCcw size={14} />
                            <span>Mặc định</span>
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-primary-900/30"
                        >
                            <Save size={14} />
                            <span>Lưu thay đổi</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                    <button
                        onClick={() => setActiveTab('cot')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'cot'
                                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/40 shadow-inner'
                                : 'text-gray-400 hover:text-white hover:bg-gray-900'
                        }`}
                    >
                        <FileText size={15} />
                        <span>System Prompt COT (9 Giai đoạn)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('nsfw')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'nsfw'
                                ? 'bg-pink-900/30 text-pink-400 border border-pink-500/40 shadow-inner'
                                : 'text-gray-400 hover:text-white hover:bg-gray-900'
                        }`}
                    >
                        <Flame size={15} />
                        <span>Quy định & Prompt 18+ (NSFW)</span>
                    </button>
                </div>

                {savedMessage && (
                    <div className="mb-4 p-3 bg-emerald-900/40 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs flex items-center gap-2 animate-fadeIn">
                        <Check size={16} />
                        <span>Đã lưu thành công! Các lượt sinh truyện tiếp theo sẽ áp dụng nội dung prompt mới này.</span>
                    </div>
                )}

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-wide">
                            {activeTab === 'cot' ? 'Nội dung System Prompt COT' : 'Nội dung Quy định & Từ vựng 18+ (NSFW)'}
                        </label>
                        <span className="text-[10px] text-gray-500 font-mono">
                            {activeTab === 'cot' ? `${cotText.length} ký tự` : `${nsfwText.length} ký tự`}
                        </span>
                    </div>
                    {activeTab === 'cot' ? (
                        <textarea
                            value={cotText}
                            onChange={(e) => setCotText(e.target.value)}
                            className="w-full h-[60vh] bg-black/50 border border-gray-700 rounded-lg p-4 font-mono text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 resize-y leading-relaxed custom-scrollbar"
                            placeholder="Nhập nội dung System Prompt COT..."
                        />
                    ) : (
                        <textarea
                            value={nsfwText}
                            onChange={(e) => setNsfwText(e.target.value)}
                            className="w-full h-[60vh] bg-black/50 border border-pink-900/40 rounded-lg p-4 font-mono text-xs text-pink-100 placeholder-gray-600 focus:outline-none focus:border-pink-500 resize-y leading-relaxed custom-scrollbar"
                            placeholder="Nhập nội dung Quy định & Hướng dẫn 18+ (NSFW)..."
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

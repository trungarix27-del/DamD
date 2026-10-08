import React, { useState, useEffect } from 'react';
import { Sparkles, Mic, Save, ShieldAlert, Check, Play, Square, Volume2, Cpu, AlertCircle } from 'lucide-react';
import { SachHiepProviderFactory } from '../infra/providers/SachHiepProviderFactory';
import { SachHiepDeepSeekProvider } from '../infra/providers/SachHiepDeepSeekProvider';
import { AIConfig, ProviderType, VoiceConfig, getStoredVoiceConfig, saveStoredVoiceConfig } from '../infra/providers/AIConfig';

export const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');
    const [config, setConfig] = useState<AIConfig>(SachHiepProviderFactory.getInstance().getConfig());
    const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(getStoredVoiceConfig());
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    const [newDeepseekApiKey, setNewDeepseekApiKey] = useState('');
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);

    useEffect(() => {
        if ('speechSynthesis' in window) {
            const updateVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                const viVoices = availableVoices.filter(v => 
                    v.lang.toLowerCase().includes('vi') || 
                    v.name.toLowerCase().includes('vietnam') || 
                    v.name.toLowerCase().includes('tiếng việt')
                );
                const target = viVoices.length > 0 ? viVoices : availableVoices;
                setVoices(target);
                if (!voiceConfig.selectedVoiceUri && target.length > 0) {
                    setVoiceConfig(prev => ({ ...prev, selectedVoiceUri: target[0].voiceURI }));
                }
            };
            updateVoices();
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }

        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleTestDeepSeek = async () => {
        if (!config.deepseekApiKeys || config.deepseekApiKeys.length === 0) {
            setTestStatus('error');
            setTestMessage('Chưa cấu hình DeepSeek API Key. Vui lòng nhập và thêm API Key (sk-...) bên dưới trước khi test.');
            return;
        }
        setTestStatus('testing');
        setTestMessage('Đang kết nối tới DeepSeek API...');
        try {
            SachHiepProviderFactory.getInstance().updateConfig({
                ...config,
                activeProvider: ProviderType.DEEPSEEK
            });
            const provider = new SachHiepDeepSeekProvider(config);
            const startTime = Date.now();
            const res = await provider.generateContent('Xin chào, hãy trả lời ngắn gọn đúng 1 câu: Kết nối DeepSeek thành công!');
            const duration = Date.now() - startTime;
            if (res && res.trim().length > 0) {
                setTestStatus('success');
                setTestMessage(`Kết nối thành công! Phản hồi (${duration}ms): "${res.trim().substring(0, 100)}"`);
            } else {
                setTestStatus('error');
                setTestMessage('DeepSeek trả về nội dung rỗng. Vui lòng kiểm tra lại cấu hình hoặc thử lại.');
            }
        } catch (e: any) {
            setTestStatus('error');
            setTestMessage(`Lỗi kết nối DeepSeek: ${e?.message || e}`);
        }
    };

    const handleTestVoice = () => {
        if (!('speechSynthesis' in window)) {
            alert('Trình duyệt không hỗ trợ Text-to-Speech.');
            return;
        }
        if (isPlayingTestVoice) {
            window.speechSynthesis.cancel();
            setIsPlayingTestVoice(false);
            return;
        }

        window.speechSynthesis.cancel();
        const testText = "Chào bạn! Đây là giọng đọc thử nghiệm của chương truyện. Tốc độ và ngữ điệu này sẽ được lưu để đọc truyện cho bạn.";
        const utterance = new SpeechSynthesisUtterance(testText);
        const selected = voices.find(v => v.voiceURI === voiceConfig.selectedVoiceUri);
        if (selected) utterance.voice = selected;
        utterance.rate = voiceConfig.rate;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsPlayingTestVoice(true);
        utterance.onend = () => setIsPlayingTestVoice(false);
        utterance.onerror = () => setIsPlayingTestVoice(false);

        window.speechSynthesis.speak(utterance);
    };

    const handleRateChange = (newRate: number) => {
        const updated = { ...voiceConfig, rate: newRate };
        setVoiceConfig(updated);
        saveStoredVoiceConfig(updated);
    };

    const handleVoiceChange = (newVoiceUri: string) => {
        const updated = { ...voiceConfig, selectedVoiceUri: newVoiceUri };
        setVoiceConfig(updated);
        saveStoredVoiceConfig(updated);
    };

    const handleAutoNextChange = (newAutoNext: boolean) => {
        const updated = { ...voiceConfig, autoNext: newAutoNext };
        setVoiceConfig(updated);
        saveStoredVoiceConfig(updated);
    };

    const handleSave = () => {
        setIsSaving(true);
        const updatedConfig = {
            ...config,
            activeProvider: ProviderType.DEEPSEEK
        };
        SachHiepProviderFactory.getInstance().updateConfig(updatedConfig);
        saveStoredVoiceConfig(voiceConfig);

        setTimeout(() => {
            setIsSaving(false);
            setSavedNotice(true);
            setTimeout(() => setSavedNotice(false), 2000);
        }, 400);
    };

    const addDeepseekApiKey = () => {
        if (newDeepseekApiKey.trim()) {
            const updated = {
                ...config,
                deepseekApiKeys: [...(config.deepseekApiKeys || []), newDeepseekApiKey.trim()]
            };
            setConfig(updated);
            SachHiepProviderFactory.getInstance().updateConfig(updated);
            setNewDeepseekApiKey('');
        }
    };

    const removeDeepseekApiKey = (index: number) => {
        const updated = {
            ...config,
            deepseekApiKeys: (config.deepseekApiKeys || []).filter((_, i) => i !== index)
        };
        setConfig(updated);
        SachHiepProviderFactory.getInstance().updateConfig(updated);
    };

    return (
        <div className="min-h-full bg-gray-950 text-gray-50 p-4 md:p-6 lg:p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                {/* Header Tab Bar */}
                <div className="flex items-center justify-between mb-4 md:mb-6 flex-wrap gap-3">
                    <div className="flex bg-gray-900 rounded-lg shadow-sm p-1 border border-gray-800 w-full max-w-md">
                        <button 
                            type="button"
                            onClick={() => setActiveTab('text')}
                            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                activeTab === 'text' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            <Sparkles size={15} />
                            <span>Viết truyện (DeepSeek)</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('voice')}
                            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                activeTab === 'voice' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            <Volume2 size={15} />
                            <span>Voice / Giọng đọc</span>
                        </button>
                    </div>

                    <button 
                        type="button"
                        onClick={handleSave}
                        className={`px-4 py-2 ${isSaving ? 'bg-gray-600' : savedNotice ? 'bg-emerald-600' : 'bg-primary-600 hover:bg-primary-500'} text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors cursor-pointer shadow-md`}
                    >
                        {savedNotice ? <Check size={16} /> : <Save size={16} />}
                        {isSaving ? 'Đang lưu...' : savedNotice ? 'Đã lưu!' : 'Lưu cài đặt'}
                    </button>
                </div>

                <div className="space-y-4 md:space-y-6">
                    {/* DEEPSEEK SETTINGS TAB */}
                    {activeTab === 'text' && (
                        <div className="space-y-6">
                            {/* DeepSeek AI Configuration Card */}
                            <div className="bg-gray-900 border border-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.2)] rounded-xl p-4 md:p-6 transition-all">
                                <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center shrink-0 border border-blue-800/50">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base md:text-lg font-bold text-gray-100 flex items-center gap-2">
                                                DeepSeek AI
                                                <span className="text-[10px] bg-blue-900/40 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-mono uppercase">Mô hình độc quyền</span>
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Dùng DeepSeek V3 / R1 để sáng tác và phát triển cốt truyện</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={handleTestDeepSeek}
                                            disabled={testStatus === 'testing'}
                                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                        >
                                            {testStatus === 'testing' ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Đang test...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} />
                                                    Test kết nối DeepSeek
                                                </>
                                            )}
                                        </button>

                                        <div className="px-3 py-1 bg-blue-900/40 text-blue-400 border border-blue-800/60 text-xs font-semibold rounded-md flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div> Active
                                        </div>
                                    </div>
                                </div>

                                {/* Connection test result banner */}
                                {testStatus !== 'idle' && (
                                    <div className={`p-3 rounded-lg text-xs mb-4 border animate-fadeIn leading-relaxed ${
                                        testStatus === 'success' 
                                            ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                                            : testStatus === 'error'
                                            ? 'bg-red-950/40 border-red-800/60 text-red-300'
                                            : 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                                    }`}>
                                        {testMessage}
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {/* Model Selection */}
                                    <section className="space-y-3">
                                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                            <Cpu size={16} />
                                            Cấu hình Model DeepSeek
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 uppercase mb-1">Chọn Model</label>
                                                <select 
                                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                                                    value={config.deepseekModel || 'deepseek-chat'}
                                                    onChange={e => setConfig({...config, deepseekModel: e.target.value})}
                                                >
                                                    <option value="deepseek-chat">DeepSeek V3 (deepseek-chat - Mặc định)</option>
                                                    <option value="deepseek-reasoner">DeepSeek R1 (deepseek-reasoner - Suy luận sâu)</option>
                                                    <option value="custom">Tùy chỉnh (User tự gõ)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 uppercase mb-1">Base URL (Mặc định: https://api.deepseek.com)</label>
                                                <input 
                                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm font-mono" 
                                                    value={config.deepseekBaseUrl || 'https://api.deepseek.com'} 
                                                    onChange={e => setConfig({...config, deepseekBaseUrl: e.target.value})}
                                                    placeholder="https://api.deepseek.com"
                                                />
                                                <p className="text-[11px] text-gray-500 mt-1">Gọi API trực tiếp từ client (phù hợp đóng gói APK). Bạn cũng có thể điền Base URL hoặc Reverse Proxy riêng nếu muốn.</p>
                                            </div>
                                            {config.deepseekModel === 'custom' && (
                                                <div className="md:col-span-2 animate-slideDown">
                                                    <label className="block text-xs text-gray-500 uppercase mb-1">Tên Model DeepSeek Tùy chỉnh</label>
                                                    <input 
                                                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" 
                                                        value={config.deepseekCustomModel || ''} 
                                                        onChange={e => setConfig({...config, deepseekCustomModel: e.target.value})}
                                                        placeholder="VD: deepseek-chat hoặc deepseek-reasoner"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    {/* DeepSeek API Key Management */}
                                    <section className="space-y-3">
                                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                            <ShieldAlert size={16} />
                                            Quản lý DeepSeek API Keys
                                        </h3>
                                        <p className="text-xs text-gray-400 italic">Nhập API Key trả phí từ platform.deepseek.com (bắt đầu bằng sk-...). Hỗ trợ nhập nhiều key để tự động xoay vòng.</p>
                                        
                                        <div className="flex gap-2">
                                            <input 
                                                type="password"
                                                className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm font-mono" 
                                                value={newDeepseekApiKey}
                                                onChange={e => setNewDeepseekApiKey(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addDeepseekApiKey();
                                                    }
                                                }}
                                                placeholder="Nhập DeepSeek API Key (sk-...)..."
                                            />
                                            <button 
                                                type="button"
                                                onClick={addDeepseekApiKey}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors cursor-pointer"
                                            >
                                                Thêm
                                            </button>
                                        </div>

                                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                            {config.deepseekApiKeys?.map((key, index) => (
                                                <div key={index} className="flex items-center justify-between bg-gray-950 p-2 rounded-lg border border-gray-800 group">
                                                    <code className="text-xs text-gray-300 font-mono">
                                                        {key.length > 12 ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : '••••••••'}
                                                    </code>
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeDeepseekApiKey(index)}
                                                        className="text-red-400 hover:text-red-300 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            ))}
                                            {(!config.deepseekApiKeys || config.deepseekApiKeys.length === 0) && (
                                                <div className="text-center py-4 text-gray-600 text-sm border border-dashed border-gray-800 rounded-lg">
                                                    Chưa có DeepSeek API key nào được thêm
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VOICE / SPEECH SETTINGS TAB */}
                    {activeTab === 'voice' && (
                        <div className="space-y-6">
                            {/* Voice Configuration Card */}
                            <div className="bg-gray-900 border border-emerald-500/40 rounded-xl p-4 md:p-6 shadow-sm space-y-6">
                                <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-900/40 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/50">
                                            <Volume2 size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base md:text-lg font-bold text-gray-200">Cấu hình Giọng đọc (TTS)</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Tùy chỉnh giọng đọc, tốc độ và chế độ phát chương truyện</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleTestVoice}
                                        className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                            isPlayingTestVoice 
                                                ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                        }`}
                                    >
                                        {isPlayingTestVoice ? (
                                            <>
                                                <Square size={14} className="fill-current" />
                                                Dừng thử giọng
                                            </>
                                        ) : (
                                            <>
                                                <Play size={14} className="fill-current" />
                                                Thử giọng đọc
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Voice and Speed Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                            Chọn Giọng đọc (Tiếng Việt)
                                        </label>
                                        <select
                                            value={voiceConfig.selectedVoiceUri}
                                            onChange={(e) => handleVoiceChange(e.target.value)}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500 text-sm"
                                        >
                                            {voices.map((v, index) => (
                                                <option key={`${v.voiceURI}-${index}`} value={v.voiceURI}>
                                                    {v.name} ({v.lang})
                                                </option>
                                            ))}
                                            {voices.length === 0 && (
                                                <option value="">Giọng đọc mặc định của trình duyệt</option>
                                            )}
                                        </select>
                                        <p className="text-[11px] text-gray-500 mt-1">Danh sách giọng đọc được lấy trực tiếp từ hệ thống của máy hoặc Google Text-to-Speech.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center justify-between">
                                            <span>Tốc độ đọc: {voiceConfig.rate}x</span>
                                            <span className="text-[10px] text-emerald-400 font-normal">Tự động lưu</span>
                                        </label>
                                        <select
                                            value={voiceConfig.rate}
                                            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500 text-sm"
                                        >
                                            <option value={0.75}>0.75x (Chậm rãi, truyền cảm)</option>
                                            <option value={1.0}>1.0x (Tốc độ chuẩn - Mặc định)</option>
                                            <option value={1.25}>1.25x (Hơi nhanh)</option>
                                            <option value={1.5}>1.5x (Nhanh)</option>
                                            <option value={2.0}>2.0x (Siêu tốc)</option>
                                        </select>
                                        <p className="text-[11px] text-gray-500 mt-1">Tốc độ này sẽ tự động lưu lại và áp dụng ngay cho tất cả các chương khi bạn bấm nút Nghe.</p>
                                    </div>
                                </div>

                                {/* Auto-next chapter toggle */}
                                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800/80 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-200">Tự động chuyển chương</span>
                                        <span className="text-[11px] text-gray-500">Tự động phát tiếp chương sau khi đọc xong chương hiện tại mà không cần thao tác lại</span>
                                    </div>
                                    <input 
                                        type="checkbox"
                                        checked={voiceConfig.autoNext}
                                        onChange={(e) => handleAutoNextChange(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-gray-900 border-gray-700 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

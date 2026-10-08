import React, { useState, useEffect, useRef } from 'react';
import { Story } from '../types';
import { Play, Pause, Square, Minimize2, Maximize2, X, Volume2 } from 'lucide-react';
import { getStoredVoiceConfig, VoiceConfig } from '../infra/providers/AIConfig';

interface SachHiepTTSPlayerProps {
    story: Story | null;
    activeChapterId: string | null;
    onSelectChapter: (id: string) => void;
    onClose: () => void;
}

export const SachHiepTTSPlayer: React.FC<SachHiepTTSPlayerProps> = ({ story, activeChapterId, onSelectChapter, onClose }) => {
    const activeChapter = story?.chapters.find(c => c.id === activeChapterId);
    const [title, setTitle] = useState(activeChapter?.title || '');
    const [content, setContent] = useState(activeChapter?.content || '');

    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [progress, setProgress] = useState<number>(0); // 0 to 100
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
    const [totalChunks, setTotalChunks] = useState<number>(0);
    const [statusText, setStatusText] = useState<string>('Sẵn sàng đọc');

    // Lấy cấu hình voice & tốc độ đã lưu từ mục Cài đặt (Voice)
    const voiceConfigRef = useRef<VoiceConfig>(getStoredVoiceConfig());

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const textChunksRef = useRef<string[]>([]);
    const currentChunkIndexRef = useRef<number>(0);

    useEffect(() => {
        if (activeChapter) {
            setTitle(activeChapter.title);
            setContent(activeChapter.content || '');
            // Cập nhật lại config mới nhất từ Settings
            voiceConfigRef.current = getStoredVoiceConfig();
        }
    }, [activeChapterId, story]);

    // Media Session API cho phép điều khiển và duy trì âm thanh trên thanh thông báo / màn hình khóa
    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title || 'Chương truyện',
                artist: story?.title || 'Sắc Hiệp AI',
                album: 'Đọc truyện Sắc Hiệp'
            });

            navigator.mediaSession.setActionHandler('play', () => handleResume());
            navigator.mediaSession.setActionHandler('pause', () => handlePause());
            navigator.mediaSession.setActionHandler('stop', () => handleStop());
        }
    }, [title, story, isPlaying, isPaused]);

    useEffect(() => {
        if (!('speechSynthesis' in window)) {
            setStatusText('Trình duyệt không hỗ trợ Text-to-Speech.');
            return;
        }

        const updateVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices();
            const viVoices = availableVoices.filter(v => 
                v.lang.toLowerCase().includes('vi') || 
                v.name.toLowerCase().includes('vietnam') || 
                v.name.toLowerCase().includes('tiếng việt')
            );
            const target = viVoices.length > 0 ? viVoices : availableVoices;
            setVoices(target);
        };

        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;

        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const prepareText = (rawTitle: string, rawContent: string): string[] => {
        const fullText = `Chương: ${rawTitle}. \n\n ${rawContent}`;
        const cleaned = fullText
            .replace(/#+/g, '')
            .replace(/\*\*+/g, '')
            .replace(/\*+/g, '')
            .replace(/`+/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '')
            .replace(/\\n/g, '\n');

        const paragraphs = cleaned.split(/\n+/).filter(p => p.trim().length > 0);
        return paragraphs;
    };

    const handlePlay = () => {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const chunks = prepareText(title, content);
        textChunksRef.current = chunks;
        setTotalChunks(chunks.length);

        if (chunks.length === 0) {
            setStatusText('Không có nội dung để đọc.');
            return;
        }

        currentChunkIndexRef.current = 0;
        setCurrentChunkIndex(0);
        playChunk(0);
    };

    const playChunk = (index: number) => {
        if (index >= textChunksRef.current.length) {
            setProgress(100);

            const cfg = voiceConfigRef.current;
            if (cfg.autoNext && story && activeChapterId) {
                const sortedChapters = [...story.chapters].sort((a, b) => a.order - b.order);
                const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);
                if (currentIndex !== -1 && currentIndex + 1 < sortedChapters.length) {
                    const nextChap = sortedChapters[currentIndex + 1];
                    setStatusText(`Đang chuyển sang: ${nextChap.title}`);
                    setTimeout(() => {
                        onSelectChapter(nextChap.id);
                    }, 400);
                    return;
                }
            }

            setIsPlaying(false);
            setIsPaused(false);
            setStatusText('Đã đọc xong chương.');
            return;
        }

        currentChunkIndexRef.current = index;
        setCurrentChunkIndex(index);
        const percent = Math.round((index / textChunksRef.current.length) * 100);
        setProgress(percent);

        const textToSpeak = textChunksRef.current[index];
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Áp dụng giọng đọc và tốc độ đã lưu từ cài đặt
        const cfg = voiceConfigRef.current;
        const selectedVoice = voices.find(v => v.voiceURI === cfg.selectedVoiceUri) || voices[0];
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        utterance.rate = cfg.rate || 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            setIsPlaying(true);
            setIsPaused(false);
            setStatusText(`Đang đọc (${index + 1}/${textChunksRef.current.length})...`);
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
        };

        utterance.onend = () => {
            playChunk(index + 1);
        };

        utterance.onerror = (event: any) => {
            if (event.error === 'canceled' || event.error === 'interrupted') {
                return;
            }
            console.warn('TTS notice:', event);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const jumpToChunk = (targetIndex: number) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        const chunks = textChunksRef.current.length > 0 ? textChunksRef.current : prepareText(title, content);
        textChunksRef.current = chunks;
        setTotalChunks(chunks.length);

        const clampedIndex = Math.max(0, Math.min(targetIndex, chunks.length - 1));
        currentChunkIndexRef.current = clampedIndex;
        setCurrentChunkIndex(clampedIndex);
        playChunk(clampedIndex);
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setProgress(val);
        const len = textChunksRef.current.length || 1;
        const targetIndex = Math.floor((val / 100) * len);
        jumpToChunk(targetIndex);
    };

    const handlePause = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsPaused(true);
            setIsPlaying(false);
            setStatusText('Đã tạm dừng');
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
        }
    };

    const handleResume = () => {
        if ('speechSynthesis' in window) {
            setIsPaused(false);
            setIsPlaying(true);
            setStatusText('Đang tiếp tục đọc...');
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
            playChunk(currentChunkIndexRef.current);
        }
    };

    const handleStop = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            setIsPaused(false);
            setProgress(0);
            setCurrentChunkIndex(0);
            setStatusText('Đã dừng');
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'none';
            }
        }
    };

    // Chế độ thu nhỏ (Floating Pill)
    if (isMinimized) {
        return (
            <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 bg-gray-900/95 backdrop-blur-md border border-primary-500/60 rounded-full py-2.5 px-4 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center gap-3 text-slate-200 animate-fadeIn">
                <div className="w-3 h-3 rounded-full bg-primary-500 animate-pulse shrink-0"></div>
                <div className="flex flex-col max-w-[150px] md:max-w-[200px]">
                    <span className="text-[11px] font-bold text-gray-100 truncate">{title}</span>
                    <span className="text-[9px] text-primary-400 font-mono truncate">{progress}% • {statusText}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {!isPlaying && !isPaused && (
                        <button
                            type="button"
                            onClick={handlePlay}
                            className="p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-full transition-colors cursor-pointer"
                            title="Phát"
                        >
                            <Play size={14} className="fill-current" />
                        </button>
                    )}
                    {isPlaying && (
                        <button
                            type="button"
                            onClick={handlePause}
                            className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-full transition-colors cursor-pointer"
                            title="Tạm dừng"
                        >
                            <Pause size={14} className="fill-current" />
                        </button>
                    )}
                    {isPaused && (
                        <button
                            type="button"
                            onClick={handleResume}
                            className="p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-full transition-colors cursor-pointer"
                            title="Tiếp tục"
                        >
                            <Play size={14} className="fill-current" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsMinimized(false)}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors cursor-pointer"
                        title="Mở rộng"
                    >
                        <Maximize2 size={14} />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            handleStop();
                            onClose();
                        }}
                        className="p-1.5 bg-gray-800 hover:bg-red-900/60 text-gray-400 hover:text-red-300 rounded-full transition-colors cursor-pointer"
                        title="Đóng"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    // Giao diện tinh gọn: CHỈ HIỆN TIẾN ĐỘ CHƯƠNG VÀ ĐIỀU KHIỂN
    return (
        <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 bg-gray-900/95 backdrop-blur-md border border-primary-500/40 rounded-2xl p-4 shadow-2xl w-80 md:w-96 text-slate-200 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
                <div className="flex items-center gap-2">
                    <Volume2 size={18} className="text-primary-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-400">Tiến Độ Nghe Chương</span>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        type="button"
                        onClick={() => setIsMinimized(true)}
                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Thu nhỏ"
                    >
                        <Minimize2 size={14} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            handleStop();
                            onClose();
                        }}
                        className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Đóng"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Chapter Title & Status */}
            <div className="mb-3">
                <div className="text-sm font-bold text-gray-100 truncate" title={title}>{title}</div>
                <div className="text-xs text-primary-400 font-mono mt-0.5 flex items-center justify-between">
                    <span>{statusText}</span>
                    {totalChunks > 0 && (
                        <span className="text-gray-400 text-[11px]">Đoạn {Math.min(currentChunkIndex + 1, totalChunks)} / {totalChunks}</span>
                    )}
                </div>
            </div>

            {/* Tiến độ chương & Thanh tua */}
            <div className="mb-4 bg-gray-950/60 p-3 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center text-xs font-semibold text-gray-300 mb-1.5">
                    <span>Tiến độ chương:</span>
                    <span className="font-mono text-primary-400 text-sm font-bold">{progress}%</span>
                </div>
                
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={progress} 
                    onChange={handleSeekChange}
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />

                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>Đầu chương (0%)</span>
                    <span>Cuối chương (100%)</span>
                </div>
            </div>

            {/* Nút điều khiển phát */}
            <div className="flex items-center justify-center gap-2 pt-1">
                {!isPlaying && !isPaused && (
                    <button
                        type="button"
                        onClick={handlePlay}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors shadow-lg shadow-primary-900/30 cursor-pointer"
                    >
                        <Play size={15} className="fill-current" />
                        <span>Bắt đầu nghe</span>
                    </button>
                )}

                {isPlaying && (
                    <button
                        type="button"
                        onClick={handlePause}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                        <Pause size={15} className="fill-current" />
                        <span>Tạm dừng</span>
                    </button>
                )}

                {isPaused && (
                    <button
                        type="button"
                        onClick={handleResume}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                        <Play size={15} className="fill-current" />
                        <span>Tiếp tục nghe</span>
                    </button>
                )}

                {(isPlaying || isPaused) && (
                    <button
                        type="button"
                        onClick={handleStop}
                        className="flex items-center justify-center gap-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 font-bold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                        <Square size={14} className="fill-current" />
                        <span>Dừng</span>
                    </button>
                )}
            </div>
        </div>
    );
};


import React, { useState } from 'react';
import { useSachHiep } from '../state/SachHiepContext';
import { SACH_HIEP_PRONOUN_STYLES, compileSachHiepPronounStyle } from '../sachHiepConstants';
import { ArrowLeft, Lightbulb, Globe, PenTool, Users, ShieldAlert, Settings2, Sparkles, CheckCircle2, Circle, XCircle, Loader2, Terminal, ListTodo, Activity, Save, Plus, Trash2 } from 'lucide-react';
import { Story } from '../types';

export const CreateSachHiepWizard: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const { generateStoryDraft, confirmStory, isGenerating, generationStatus, generationProgress, generationSteps, generationLogs } = useSachHiep();
  const [draftStory, setDraftStory] = useState<Story | null>(null);
  
  const [title, setTitle] = useState("Biên Niên Sử Mới");
  const [storyType, setStoryType] = useState<'original' | 'fanfic'>('original');
  const [sourceUrl, setSourceUrl] = useState("");
  const [fandomName, setFandomName] = useState("");
  const [genre, setGenre] = useState("Tiên Hiệp");
  const [writingStyle, setWritingStyle] = useState(""); 
  const [pov, setPov] = useState("Ngôi thứ 3 (Toàn tri)");
  
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceFileContent, setSourceFileContent] = useState<string>("");
  
  const defaultStyle = SACH_HIEP_PRONOUN_STYLES[1];
  const [pronounStyleId, setPronounStyleId] = useState(defaultStyle.id);
  const [customPronounPrompt, setCustomPronounPrompt] = useState("");
  
  const [synopsis, setSynopsis] = useState("");
  const [setting, setSetting] = useState("");
  const [initialCharacters, setInitialCharacters] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [nsfw, setNsfw] = useState(true);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setSourceFile(file);
          const text = await file.text();
          setSourceFileContent(text);
      } else {
          setSourceFile(null);
          setSourceFileContent("");
      }
  };

  const getFinalPronounPrompt = () => {
      if (pronounStyleId === 'custom') return customPronounPrompt;
      const style = SACH_HIEP_PRONOUN_STYLES.find(s => s.id === pronounStyleId);
      return style ? compileSachHiepPronounStyle(style.label, style.config) : "";
  };

  const handleCreate = async () => {
      const draft = await generateStoryDraft(
          title, 
          genre, 
          synopsis, 
          setting,
          writingStyle,
          pov, 
          getFinalPronounPrompt(), 
          negativePrompt, 
          nsfw,
          fandomName,
          sourceUrl,
          storyType,
          sourceFileContent,
          initialCharacters
      );
      if (draft) {
          setDraftStory(draft);
      }
  };

  const handleConfirm = async () => {
      if (draftStory) {
          const syncedStory: Story = {
              ...draftStory,
              storyBible: {
                  ...(draftStory.storyBible || { chars: [], world: draftStory.setting || '', rules: '', arc: draftStory.synopsis || '', chapter_cores: [] }),
                  chars: draftStory.characters.map(c => ({
                      name: c.name,
                      role: c.role || 'Nhân vật',
                      core: c.description || c.core_personality || '',
                      character_type: c.character_type || 'npc'
                  }))
              }
          };
          await confirmStory(syncedStory);
      }
  };

  const updateDraftBible = (key: keyof Story['storyBible'], value: string) => {
      if (!draftStory || !draftStory.storyBible) return;
      setDraftStory({
          ...draftStory,
          storyBible: {
              ...draftStory.storyBible,
              [key]: value
          }
      });
  };

  if (draftStory) {
      return (
          <div className="min-h-full bg-gray-950 text-gray-50 font-sans relative">
              <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setDraftStory(null)} className="p-2 hover:bg-gray-800 rounded-full transition-colors" disabled={isGenerating}>
                          <ArrowLeft size={24} className="text-gray-400" />
                      </button>
                      <h1 className="text-xl font-medium text-gray-200">Kiểm tra Đại Cương</h1>
                  </div>
              </div>
              <div className="p-4 md:p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                      <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                          <h2 className="text-lg font-bold text-gray-200 mb-4">Thế giới (World)</h2>
                          <textarea 
                              value={draftStory.storyBible?.world || ''} 
                              onChange={(e) => updateDraftBible('world', e.target.value)} 
                              className="w-full h-48 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none resize-none focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] transition-all text-sm" 
                          />
                      </div>
                      <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                          <h2 className="text-lg font-bold text-gray-200 mb-4">Quy tắc (Rules)</h2>
                          <textarea 
                              value={draftStory.storyBible?.rules || ''} 
                              onChange={(e) => updateDraftBible('rules', e.target.value)} 
                              className="w-full h-48 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none resize-none focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] transition-all text-sm" 
                          />
                      </div>
                      <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                          <h2 className="text-lg font-bold text-gray-200 mb-4">Trạng thái Arc (Arc Status)</h2>
                          <textarea 
                              value={draftStory.storyBible?.arc || ''} 
                              onChange={(e) => updateDraftBible('arc', e.target.value)} 
                              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none resize-none focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] transition-all text-sm" 
                          />
                      </div>
                      <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                          <div className="flex items-center justify-between mb-4">
                              <h2 className="text-lg font-bold text-gray-200">Danh sách Nhân vật</h2>
                              <button
                                  onClick={() => {
                                      const newChar = {
                                          id: `char_draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                          name: "Nhân vật mới",
                                          role: "Nữ chính / Quan hệ...",
                                          character_type: 'female_young_lead' as const,
                                          description: "Tính cách, đặc điểm và mối quan hệ...",
                                          core_personality: "Tính cách, đặc điểm và mối quan hệ...",
                                          personality: "Tính cách, đặc điểm và mối quan hệ...",
                                          traits: [],
                                          appearance: { general: "Chưa rõ", face: "", body: "", hair: "", clothing: "" }
                                      };
                                      setDraftStory({
                                          ...draftStory,
                                          characters: [...draftStory.characters, newChar]
                                      });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-[#5b639a] border border-gray-700 rounded-lg text-xs font-bold transition-colors"
                              >
                                  <Plus size={14} />
                                  Thêm nhân vật
                              </button>
                          </div>
                          <div className="space-y-4">
                              {draftStory.characters.map((char, idx) => (
                                  <div key={char.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                      <div className="flex flex-col md:flex-row gap-2 mb-2">
                                          <input 
                                              type="text" 
                                              value={char.name} 
                                              placeholder="Tên nhân vật"
                                              onChange={(e) => {
                                                  const newChars = [...draftStory.characters];
                                                  newChars[idx] = { ...newChars[idx], name: e.target.value };
                                                  setDraftStory({ ...draftStory, characters: newChars });
                                              }}
                                              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-[#5b639a] outline-none font-bold" 
                                          />
                                          <input 
                                              type="text" 
                                              value={char.role} 
                                              placeholder="Vai trò / Mối quan hệ"
                                              onChange={(e) => {
                                                  const newChars = [...draftStory.characters];
                                                  newChars[idx] = { ...newChars[idx], role: e.target.value };
                                                  setDraftStory({ ...draftStory, characters: newChars });
                                              }}
                                              className="md:w-1/3 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-[#a5b4fc] focus:border-[#5b639a] outline-none" 
                                          />
                                          <button
                                              onClick={() => {
                                                  const newChars = draftStory.characters.filter((_, i) => i !== idx);
                                                  setDraftStory({ ...draftStory, characters: newChars });
                                              }}
                                              className="px-2.5 py-2 bg-gray-900 hover:bg-red-900/30 text-gray-500 hover:text-red-400 border border-gray-700 rounded-lg transition-colors flex items-center justify-center"
                                              title="Xóa nhân vật"
                                          >
                                              <Trash2 size={15} />
                                          </button>
                                      </div>
                                      <textarea 
                                          value={char.description} 
                                          placeholder="Tính cách, ngoại hình, bối cảnh và mối quan hệ..."
                                          onChange={(e) => {
                                              const newChars = [...draftStory.characters];
                                              newChars[idx] = {
                                                  ...newChars[idx],
                                                  description: e.target.value,
                                                  core_personality: e.target.value,
                                                  personality: e.target.value
                                              };
                                              setDraftStory({ ...draftStory, characters: newChars });
                                          }}
                                          className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-[#5b639a] outline-none resize-none" 
                                      />
                                  </div>
                              ))}
                              {draftStory.characters.length === 0 && (
                                  <div className="text-center py-6 text-gray-500 text-sm italic border border-dashed border-gray-700 rounded-xl">
                                      Chưa có nhân vật nào. Hãy nhấn "+ Thêm nhân vật" để bổ sung.
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
              <div className="sticky bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-3 md:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-40">
                  <div className="max-w-4xl mx-auto flex justify-end">
                      <button 
                          onClick={handleConfirm} 
                          disabled={isGenerating} 
                          className={`flex items-center justify-center w-full md:w-auto gap-2 px-4 md:px-8 py-2.5 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-bold text-gray-50 transition-all ${
                              isGenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#5b639a] hover:bg-[#4a5182] shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                          }`}
                      >
                          <Save size={18} className="md:w-5 md:h-5" />
                          {isGenerating ? 'Đang lưu...' : 'Xác nhận và Viết truyện'}
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const templates = [
    {
        label: "Cấu trúc 3 Hồi",
        content: "1. KHỞI ĐẦU (Giới thiệu):\n- Nhân vật chính là ai? Điểm mạnh/yếu?\n- Thế giới bình thường của họ ra sao?\n- Biến cố gì phá vỡ sự bình yên đó?\n\n2. TRUNG ĐOẠN (Xung đột):\n- Mục tiêu của nhân vật là gì?\n- Ai là kẻ phản diện/đối thủ chính?\n- Những thử thách lớn họ phải vượt qua?\n\n3. KẾT THÚC (Giải quyết):\n- Trận chiến cuối cùng (Cao trào) diễn ra thế nào?\n- Kết quả: Thành công hay thất bại? Nhân vật thay đổi ra sao?"
    },
    {
        label: "Hành trình Anh hùng",
        content: "1. Thế giới bình thường: \n2. Tiếng gọi phiêu lưu: \n3. Từ chối (hoặc do dự): \n4. Gặp gỡ Người hướng dẫn (Sư phụ/Hệ thống): \n5. Bước qua ngưỡng cửa (Vào thế giới mới): \n6. Đồng minh & Kẻ thù: \n7. Hang sâu thẳm (Thất bại/Tuyăt vọng): \n8. Tái sinh & Chiến thắng cuối cùng: "
    },
    {
        label: "Isekai / Hệ Thống",
        content: "[THIẾT LẬP CƠ BẢN]\n- Nguyên nhân xuyên không: (Tai nạn/Được triệu hồi/Nhập xác...)\n- Bàn tay vàng (Cheat/Hệ thống): (Mô tả kỹ năng đặc biệt...)\n\n[DIỄN BIẾN]\n- Mục tiêu ban đầu: (Sống sót/Trả thù/Hưởng thụ...)\n- Các thế lực đối đầu: (Ma vương/Gia tộc đối địch/Triều đình...)\n- Dàn Harem/Đồng đội chính: \n\n[ĐIỂM NHẤN CỐT TRUYỆN]\n- Sự kiện cao trào dự kiến: "
    }
  ];

  const applyTemplate = (content: string) => {
      if (synopsis.length > 10 && !window.confirm("Dàn ý hiện tại sẽ bị thay thế. Bạn có chắc chắn không?")) {
          return;
      }
      setSynopsis(content);
  };

  return (
    <div className="min-h-full bg-gray-950 text-gray-50 font-sans relative">
        {/* LOADING OVERLAY - DETAILED PROGRESS PAGE */}
        {isGenerating && (
            <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col animate-fadeIn overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 bg-gray-900">
                    <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                        <Activity className="text-[#5b639a]" />
                        Đang khởi tạo thế giới...
                    </h2>
                </div>

                <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
                    {/* Top Section: Progress Circle & Current Status */}
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-stretch">
                        {/* Circle Progress */}
                        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-sm flex items-center justify-center min-w-[200px]">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1f2937" strokeWidth="8" />
                                    <circle 
                                        cx="50" cy="50" r="45" fill="none" stroke="#5b639a" strokeWidth="8" 
                                        strokeDasharray={`${2 * Math.PI * 45}`} 
                                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - generationProgress / 100)}`}
                                        className="transition-all duration-500 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-3xl font-bold text-[#5b639a]">{generationProgress}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Current Status */}
                        <div className="flex-1 bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-sm flex flex-col justify-center space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-blue-900/20 rounded-xl border border-blue-900/50">
                                <Loader2 className="text-blue-400 animate-spin" size={20} />
                                <span className="text-sm font-medium text-blue-200">{generationStatus || 'Đang xử lý...'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Steps Status */}
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800 bg-gray-950/50 flex items-center gap-2">
                            <ListTodo size={18} className="text-gray-400" />
                            <h3 className="font-semibold text-gray-300">Trạng thái các bước</h3>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {generationSteps.map((step, idx) => (
                                    <div key={step.id} className={`flex items-center gap-3 p-3 rounded-xl border ${step.status === 'processing' ? 'bg-blue-900/20 border-blue-900/50' : 'bg-gray-950 border-gray-800'}`}>
                                        {step.status === 'completed' && <CheckCircle2 className="text-emerald-500" size={20} />}
                                        {step.status === 'processing' && <Loader2 className="text-blue-400 animate-spin" size={20} />}
                                        {step.status === 'pending' && <Circle className="text-gray-600" size={20} />}
                                        {step.status === 'failed' && <XCircle className="text-red-500" size={20} />}
                                        <span className={`text-sm font-medium ${step.status === 'processing' ? 'text-blue-200' : step.status === 'completed' ? 'text-gray-200' : 'text-gray-400'}`}>
                                            {idx + 1}. {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-sm overflow-hidden flex flex-col h-64">
                        <div className="px-6 py-4 border-b border-gray-800 bg-gray-950/50 flex items-center gap-2">
                            <Terminal size={18} className="text-gray-400" />
                            <h3 className="font-semibold text-gray-300">Nhật ký hệ thống</h3>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto bg-gray-950 font-mono text-xs text-gray-400 space-y-2 custom-scrollbar" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
                            {generationLogs.map((log, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <span className="text-gray-500 shrink-0">{log.substring(0, 10)}</span>
                                    <span className="text-gray-300">{log.substring(11)}</span>
                                </div>
                            ))}
                            {generationLogs.length === 0 && (
                                <div className="text-gray-500 italic">Đang chờ dữ liệu...</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
            <div className="flex items-center gap-4">
                <button onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-full transition-colors" disabled={isGenerating}>
                    <ArrowLeft size={24} className="text-gray-400" />
                </button>
                <h1 className="text-xl font-medium text-gray-200">Khởi Tạo Thế Giới</h1>
            </div>
        </div>

        {/* Content */}
        <div className={`p-4 md:p-8 ${isGenerating ? 'blur-sm pointer-events-none' : ''}`}>
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* 69+ Mode */}
                <div className="bg-gray-900 rounded-2xl p-4 shadow-sm border border-pink-900/50 flex items-center justify-between transition-colors hover:border-pink-500/50">
                    <label className="flex items-center gap-3 cursor-pointer w-full">
                        <input 
                            type="checkbox" 
                            checked={nsfw} 
                            onChange={(e) => setNsfw(e.target.checked)} 
                            className="w-5 h-5 rounded border-pink-500 text-pink-600 focus:ring-pink-500 bg-gray-900" 
                        />
                        <span className="text-base font-bold text-pink-400">Kích hoạt Dâm Tu Thần Bút (69+)</span>
                    </label>
                </div>

                {/* Section 1: Story Inspiration (Synopsis) */}
                <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="text-[#5b639a]" size={20} />
                        <h2 className="text-lg font-bold text-gray-200">Cảm hứng cốt truyện</h2>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Nhập ý tưởng cốt lõi, tình tiết chính hoặc chỉ là một ý tưởng đơn giản. AI sẽ dựa vào đó để xây dựng toàn bộ dàn ý.</p>
                    
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                        {templates.map((tpl, idx) => (
                            <button 
                                key={idx}
                                onClick={() => applyTemplate(tpl.content)}
                                className="whitespace-nowrap px-3 py-1.5 bg-gray-950 hover:bg-gray-800 text-xs text-gray-400 rounded-md border border-gray-700 transition-colors"
                            >
                                + {tpl.label}
                            </button>
                        ))}
                    </div>

                    <textarea 
                        value={synopsis} 
                        onChange={(e) => setSynopsis(e.target.value)} 
                        className="w-full h-48 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none resize-none focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] transition-all text-sm leading-relaxed" 
                        placeholder="Một thiếu niên nghèo khó nhận được học bổng, từ đó bước vào ngôi trường danh giá cùng những nữ sinh ưu tú..." 
                    />
                </div>

                {/* Section 2: Basic Info */}
                <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings2 className="text-[#5b639a]" size={20} />
                        <h2 className="text-lg font-bold text-gray-200">Thông tin cơ bản</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Loại truyện</label>
                            <div className="flex bg-gray-800 rounded-lg p-1">
                                <button 
                                    onClick={() => setStoryType('original')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${storyType === 'original' ? 'bg-gray-900 text-[#5b639a] shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    Sáng tác (Original)
                                </button>
                                <button 
                                    onClick={() => setStoryType('fanfic')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${storyType === 'fanfic' ? 'bg-gray-900 text-[#5b639a] shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                    Đồng nhân (Fanfic)
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Tiêu đề</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] outline-none transition-all" 
                                placeholder="Tên tiểu thuyết..." 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Thể loại</label>
                            <input 
                                type="text" 
                                value={genre} 
                                onChange={(e) => setGenre(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] outline-none transition-all" 
                                placeholder={storyType === 'fanfic' ? "VD: Đồng nhân, Hệ thống..." : "Tiên hiệp, Cyberpunk..."} 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Góc nhìn</label>
                            <select 
                                value={pov} 
                                onChange={(e) => setPov(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] outline-none transition-all"
                            >
                                <option value="Ngôi thứ 3 (Toàn tri)">Ngôi thứ 3 (Toàn tri)</option>
                                <option value="Ngôi thứ 3 (Giới hạn)">Ngôi thứ 3 (Giới hạn)</option>
                                <option value="Ngôi thứ 1 (Tôi/Ta)">Ngôi thứ 1 (Tôi / Ta)</option>
                            </select>
                        </div>
                    </div>

                    {storyType === 'fanfic' && (
                        <div className="mt-6 p-5 bg-gray-800 border border-gray-700 rounded-xl">
                            <h4 className="text-sm font-bold text-gray-200 mb-4">Nguồn Dữ Liệu Đồng Nhân</h4>
                            
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-400 mb-2">A. Tải lên tác phẩm gốc (.txt)</label>
                                <input 
                                    type="file" 
                                    accept=".txt"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-[#5b639a] file:border file:border-gray-700 hover:file:bg-gray-800 cursor-pointer"
                                />
                                {sourceFile && (
                                    <p className="mt-2 text-xs text-green-500">
                                        Đã chọn: {sourceFile.name} ({(sourceFile.size / 1024).toFixed(1)} KB)
                                    </p>
                                )}
                            </div>

                            <div className="relative flex py-3 items-center">
                                <div className="flex-grow border-t border-gray-600"></div>
                                <span className="flex-shrink-0 mx-4 text-xs text-gray-500">Hoặc</span>
                                <div className="flex-grow border-t border-gray-600"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-2">B. Tên Fandom / Tác Phẩm</label>
                                    <input 
                                        type="text" 
                                        value={fandomName} 
                                        onChange={(e) => setFandomName(e.target.value)} 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-[#5b639a] outline-none" 
                                        placeholder="VD: Harry Potter..." 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-2">Link Wiki (Tùy chọn)</label>
                                    <input 
                                        type="text" 
                                        value={sourceUrl} 
                                        onChange={(e) => setSourceUrl(e.target.value)} 
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-[#5b639a] outline-none" 
                                        placeholder="https://..." 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 3: Background Setting */}
                <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="text-[#5b639a]" size={20} />
                        <h2 className="text-lg font-bold text-gray-200">Bối cảnh thiết lập</h2>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Mô tả thế giới, các quy tắc ma thuật, hoặc bối cảnh xã hội.</p>
                    
                    <textarea 
                        value={setting} 
                        onChange={(e) => setSetting(e.target.value)} 
                        className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none resize-none focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] transition-all text-sm" 
                        placeholder="Thế giới hiện đại đan xen phép thuật, nơi các học viện pháp sư ẩn mình giữa các thành phố lớn..." 
                    />
                </div>

                {/* Section 3.5: Characters & Relationships (List Style like Background Setting) */}
                <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Users className="text-[#5b639a]" size={20} />
                            <h2 className="text-lg font-bold text-gray-200">Nhân vật & Mối quan hệ</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const sampleLine = "- Tên nhân vật (Vai trò / Quan hệ với main): Tính cách, ngoại hình, hoàn cảnh...";
                                setInitialCharacters(prev => prev.trim() ? `${prev.trim()}\n${sampleLine}` : sampleLine);
                            }}
                            className="px-3 py-1 bg-gray-950 hover:bg-gray-800 text-xs text-gray-400 hover:text-gray-200 rounded-md border border-gray-700 transition-colors"
                        >
                            + Thêm dòng nhân vật mẫu
                        </button>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Viết danh sách các nhân vật xuất hiện cùng vai trò, tính cách và mối quan hệ của họ.</p>
                    
                    <textarea 
                        value={initialCharacters} 
                        onChange={(e) => setInitialCharacters(e.target.value)} 
                        className="w-full h-40 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none resize-y focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] transition-all text-sm leading-relaxed" 
                        placeholder={`- Lý Tiêu Dao (Nam chính): Đệ tử ngoại môn, bề ngoài bình thường nhưng sở hữu huyết mạch cổ xưa.\n- Lâm Nguyệt Như (Sư tôn của nam chính): Lạnh lùng, cao ngạo, tu vi Kim Đan kỳ, bề ngoài nghiêm khắc nhưng rất bao bọc đệ tử.\n- Tô Mị (Sư tỷ đồng môn): Quyến rũ, tinh ranh, thường xuyên trêu chọc nam chính...`} 
                    />
                </div>

                {/* Section 4: Writing Style & Pronouns */}
                <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                        <PenTool className="text-[#5b639a]" size={20} />
                        <h2 className="text-lg font-bold text-gray-200">Văn phong & Xưng hô</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Văn phong (Writing Style)</label>
                            <input 
                                type="text" 
                                value={writingStyle} 
                                onChange={(e) => setWritingStyle(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] outline-none transition-all" 
                                placeholder="VD: Hài hước, Trầm buồn, Sắc bén..." 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Hệ thống Xưng hô</label>
                            <select 
                                value={pronounStyleId} 
                                onChange={(e) => setPronounStyleId(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] outline-none transition-all"
                            >
                                {SACH_HIEP_PRONOUN_STYLES.map(style => (
                                    <option key={style.id} value={style.id}>{style.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 5: Advanced (Negative & Sắc hiệp) */}
                <div className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldAlert className="text-[#5b639a]" size={20} />
                        <h2 className="text-lg font-bold text-gray-200">Nâng cao</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Điều cấm kỵ (Negative Prompt)</label>
                            <textarea 
                                value={negativePrompt} 
                                onChange={(e) => setNegativePrompt(e.target.value)} 
                                className="w-full h-20 bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-100 outline-none resize-none focus:border-[#5b639a] focus:ring-1 focus:ring-[#5b639a] transition-all text-sm" 
                                placeholder="Cấm bê đê, cấm cháy go,..." 
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* Bottom Action Bar - Fixed at the end of content, not sticky */}
        <div className="bg-gray-900 border-t border-gray-800 p-6 md:p-8 shadow-inner mt-8">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-500 italic">
                    * AI sẽ dựa trên các thông tin trên để xây dựng đại cương chi tiết.
                </div>
                <button 
                    onClick={handleCreate} 
                    disabled={!title || !genre || isGenerating || (storyType === 'fanfic' && !fandomName && !sourceUrl && !sourceFile)} 
                    className={`flex items-center justify-center w-full md:w-auto gap-2 px-8 py-3.5 rounded-xl text-base font-bold text-gray-50 transition-all ${
                        !title || !genre || isGenerating || (storyType === 'fanfic' && !fandomName && !sourceUrl && !sourceFile)
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                        : 'bg-gradient-to-r from-[#5b639a] to-[#4a5182] hover:from-[#4a5182] hover:to-[#3a4172] shadow-[0_0_20px_rgba(91,99,154,0.3)] hover:shadow-[0_0_30px_rgba(91,99,154,0.5)] hover:-translate-y-1 active:translate-y-0'
                    }`}
                >
                    <Sparkles size={20} />
                    {isGenerating ? 'Đang khởi tạo...' : 'Sinh thành Đại cương'}
                </button>
            </div>
        </div>
    </div>
  );
}

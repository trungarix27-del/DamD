import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, Sparkles } from 'lucide-react';
import { useSachHiep } from '../state/SachHiepContext';

interface SceneItem {
  id: string;
  plot: string;
  type: 'Chính' | 'Phụ' | '18' | 'Chốt';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyAndGenerate: (compiledInstruction: string, rawSceneScript: string) => void;
  initialScript?: string;
}

export const SachHiepScenePlannerModal: React.FC<Props> = ({ isOpen, onClose, onApplyAndGenerate, initialScript }) => {
  const { story, activeChapterId } = useSachHiep();
  const activeChapter = story?.chapters.find(c => c.id === activeChapterId);
  const chapterIndex = story ? story.chapters.findIndex(c => c.id === activeChapterId) + 1 : 1;

  const [scenes, setScenes] = useState<SceneItem[]>([
    { id: '1', plot: '', type: 'Chính' }
  ]);

  useEffect(() => {
    if (isOpen) {
      if (initialScript) {
        try {
          const parsed = JSON.parse(initialScript);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setScenes(parsed);
            return;
          }
        } catch {
          // If not JSON, default to single scene with initialScript text
        }
        setScenes([{ id: '1', plot: initialScript, type: 'Chính' }]);
      } else {
        setScenes([{ id: '1', plot: '', type: 'Chính' }]);
      }
    }
  }, [isOpen, initialScript]);

  if (!isOpen) return null;

  const addScene = (index: number) => {
    const newScenes = [...scenes];
    newScenes.splice(index + 1, 0, {
      id: crypto.randomUUID(),
      plot: '',
      type: 'Chính'
    });
    setScenes(newScenes);
  };

  const removeScene = (id: string) => {
    if (scenes.length === 1) {
      setScenes([{ id: crypto.randomUUID(), plot: '', type: 'Chính' }]);
      return;
    }
    setScenes(scenes.filter(s => s.id !== id));
  };

  const updateScene = (id: string, updates: Partial<SceneItem>) => {
    setScenes(scenes.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleOk = () => {
    const compiled = scenes.map((s, idx) => {
      let typeDesc = '';
      if (s.type === 'Chính') typeDesc = 'Yêu cầu viết kỹ cảnh này, mô tả chi tiết và dùng nhiều từ trong chương.';
      else if (s.type === 'Phụ') typeDesc = 'Chỉ cần mô tả thêm vài từ cho cảnh này, không cần dài dòng.';
      else if (s.type === '18') typeDesc = 'Tả chi tiết và sống động, ưu tiên nhiều từ trong chương nhất cho cảnh này (NSFW/18+).';
      else if (s.type === 'Chốt') typeDesc = 'CẢNH KẾT THÚC CHƯƠNG. Khi viết xong tình tiết này, PHẢI KẾT THÚC CHƯƠNG NGAY LẬP TỨC. TUYỆT ĐỐI CẤM tự ý chế thêm suy nghĩ miên man, bí ẩn mới hoặc tình tiết phát sinh nào khác sau đó.';

      return `- Cảnh số ${idx + 1} [Loại: ${s.type}]: ${s.plot.trim() || '(Chưa có tình tiết)'}\n  (Chỉ đạo: ${typeDesc})`;
    }).join('\n\n');

    const finalInstruction = `[KỊCH BẢN CHI TIẾT ĐIỀU HƯỚNG CHƯƠNG]:\n${compiled}`;
    const rawSceneScriptJson = JSON.stringify(scenes);
    onApplyAndGenerate(finalInstruction, rawSceneScriptJson);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
          <div className="flex items-center gap-2.5">
            <Sparkles className="text-primary-400 shrink-0" size={20} />
            <div>
              <h2 className="text-base font-bold text-gray-100">Bảng Kịch Bản Cảnh</h2>
              {activeChapter && (
                <p className="text-xs text-primary-400 font-semibold mt-0.5">
                  Chương {chapterIndex}: {activeChapter.title}
                </p>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-100 bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body / Scenes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <p className="text-xs text-gray-400 italic">
            Mỗi chương lưu giữ một bảng kịch bản riêng. Bạn có thể sửa trực tiếp kịch bản của chương này và bấm "Chốt & Viết luôn" để AI viết lại/cập nhật chương.
          </p>

          {scenes.map((scene, index) => (
            <div key={scene.id} className="bg-gray-950 border border-gray-800 rounded-xl p-4 relative group space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-400 uppercase tracking-wide">
                  Cảnh số {index + 1}
                </span>
                {scenes.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeScene(scene.id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded transition-colors cursor-pointer"
                    title="Xóa cảnh này"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Tình tiết */}
              <div>
                <label className="block text-[11px] text-gray-400 font-medium mb-1">Tình tiết / Nội dung cảnh</label>
                <textarea 
                  value={scene.plot}
                  onChange={(e) => updateScene(scene.id, { plot: e.target.value })}
                  placeholder="VD: Nhân vật chính bước vào phòng, phát hiện bí mật..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 resize-none h-20 custom-scrollbar"
                />
              </div>

              {/* Loại cảnh (4 nút chọn) */}
              <div>
                <label className="block text-[11px] text-gray-400 font-medium mb-1.5">Loại cảnh</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Chính', 'Phụ', '18', 'Chốt'] as const).map((t) => {
                    const isSelected = scene.type === t;
                    let activeStyle = 'bg-primary-600 text-white border-primary-500 shadow-sm';
                    if (t === 'Phụ') activeStyle = 'bg-gray-700 text-white border-gray-600';
                    if (t === '18') activeStyle = 'bg-pink-600 text-white border-pink-500 shadow-pink-900/30 shadow-md';
                    if (t === 'Chốt') activeStyle = 'bg-amber-600 text-white border-amber-500';

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateScene(scene.id, { type: t })}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                          isSelected 
                            ? activeStyle 
                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
                        }`}
                      >
                        {t === 'Chính' && '⭐ Chính'}
                        {t === 'Phụ' && '📌 Phụ'}
                        {t === '18' && '🔥 18+'}
                        {t === 'Chốt' && '🏁 Chốt'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add scene below button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => addScene(index)}
                  className="text-[10px] font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1 bg-primary-950/40 border border-primary-900/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  + Thêm cảnh tiếp theo
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-end gap-3 bg-gray-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleOk}
            className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check size={16} />
            <span>Chốt & Viết Luôn 🚀</span>
          </button>
        </div>

      </div>
    </div>
  );
};

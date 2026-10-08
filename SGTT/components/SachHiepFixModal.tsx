import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFix: (instruction: string) => void;
  isGenerating: boolean;
  defaultInstruction?: string;
}

export const SachHiepFixModal: React.FC<Props> = ({ isOpen, onClose, onConfirmFix, isGenerating, defaultInstruction }) => {
  const [instruction, setInstruction] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInstruction(defaultInstruction || '');
    }
  }, [isOpen, defaultInstruction]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!instruction.trim()) return;
    onConfirmFix(instruction.trim());
    setInstruction('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary-400" size={20} />
            <h2 className="text-base font-bold text-gray-100">AI Sửa Lỗi & Tinh Chỉnh Chương</h2>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-100 bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            Nhập những tình tiết cần sửa, lỗi chính tả, yêu cầu thay đổi diễn biến hoặc tăng giảm cảm xúc. AI sẽ quét lại toàn bộ chương và viết lại theo đúng ý bạn.
          </p>

          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="VD: Sửa lại đoạn đối thoại giữa nhân vật A và B bớt gượng gạo, tăng thêm đoạn hành động kịch tính ở giữa chương..."
            rows={5}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 resize-none custom-scrollbar leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !isGenerating) {
                handleConfirm();
              }
            }}
          />
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
            onClick={handleConfirm}
            disabled={isGenerating || !instruction.trim()}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer
            ${isGenerating || !instruction.trim() ? 'bg-gray-800 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-500 hover:to-emerald-500 hover:shadow-primary-500/25'}`}
          >
            <Check size={16} />
            <span>Chốt & Sửa Chương 🚀</span>
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Character } from '../types';
import { useSachHiep } from '../state/SachHiepContext';
import { Plus, Trash2, Edit3, Save, X } from 'lucide-react';

interface Props {
  characters: Character[];
}

export const CharacterList: React.FC<Props> = ({ characters }) => {
  const { addCharacter, updateCharacter, deleteCharacter } = useSachHiep();
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'psych' | 'stats'>('info');

  // Add Character Modal / Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newType, setNewType] = useState<'male_lead' | 'female_young_lead' | 'female_mature_lead' | 'npc'>('female_young_lead');
  const [newDesc, setNewDesc] = useState('');
  const [newAppearance, setNewAppearance] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Edit Existing Character State inside Detail Modal
  const [isEditingChar, setIsEditingChar] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editType, setEditType] = useState<'male_lead' | 'female_young_lead' | 'female_mature_lead' | 'npc'>('npc');
  const [editDesc, setEditDesc] = useState('');
  const [editAppearance, setEditAppearance] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Safe checks for new schema vs old schema characters
  const getSafeAppearance = (char: Character) => {
      if (typeof char.appearance === 'string') return { general: char.appearance, face: '', body: '', hair: '', clothing: '' };
      return char.appearance || { general: "Chưa có thông tin", face: '', body: '', hair: '', clothing: '' };
  };

  const handleOpenCharModal = (char: Character) => {
      setSelectedChar(char);
      setIsEditingChar(false);
      setEditName(char.name || '');
      setEditRole(char.role || '');
      setEditType(char.character_type || 'npc');
      setEditDesc(char.description || char.core_personality || '');
      setEditAppearance(getSafeAppearance(char).general || '');
      setEditStatus(char.status || '');
  };

  const handleCreateCharacter = async () => {
      if (!newName.trim()) return;
      const charObj: Character = {
          id: `char_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: newName.trim(),
          role: newRole.trim() || 'Nhân vật',
          character_type: newType,
          description: newDesc.trim() || 'Chưa có mô tả',
          core_personality: newDesc.trim() || 'Chưa có mô tả',
          personality: newDesc.trim() || 'Chưa có mô tả',
          traits: [],
          status: newStatus.trim() || undefined,
          appearance: {
              general: newAppearance.trim() || 'Chưa rõ',
              face: '',
              body: '',
              hair: '',
              clothing: ''
          }
      };
      await addCharacter(charObj);
      setNewName('');
      setNewRole('');
      setNewType('female_young_lead');
      setNewDesc('');
      setNewAppearance('');
      setNewStatus('');
      setIsAdding(false);
  };

  const handleSaveEditChar = async () => {
      if (!selectedChar || !editName.trim()) return;
      const currentApp = getSafeAppearance(selectedChar);
      const updates: Partial<Character> = {
          name: editName.trim(),
          role: editRole.trim() || 'Nhân vật',
          character_type: editType,
          description: editDesc.trim(),
          core_personality: editDesc.trim(),
          personality: editDesc.trim(),
          status: editStatus.trim() || undefined,
          appearance: {
              ...currentApp,
              general: editAppearance.trim() || 'Chưa rõ'
          }
      };
      await updateCharacter(selectedChar.id, updates);
      setSelectedChar({ ...selectedChar, ...updates });
      setIsEditingChar(false);
  };

  const handleDeleteChar = async (id: string) => {
      await deleteCharacter(id);
      setSelectedChar(null);
  };

  return (
    <>
      <div className="space-y-3 p-4 pb-20">
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-full py-2 px-3 border border-dashed border-purple-500/50 hover:border-purple-400 bg-purple-900/10 hover:bg-purple-900/20 rounded-lg text-purple-300 hover:text-purple-200 transition-all text-xs uppercase font-bold flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          <span>Thêm nhân vật mới</span>
        </button>

        {isAdding && (
          <div className="bg-gray-850 border border-purple-500/40 rounded-lg p-3 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
              <span className="text-xs font-bold text-purple-400 uppercase">Tạo nhân vật mới</span>
              <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-300">
                <X size={14} />
              </button>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Tên nhân vật *</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="VD: Lâm Nguyệt Như"
                className="w-full bg-gray-950 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-100 focus:border-purple-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase mb-1">Vai trò / Quan hệ</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  placeholder="VD: Sư tôn / Nữ chính"
                  className="w-full bg-gray-950 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-100 focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 uppercase mb-1">Phân nhóm</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-100 focus:border-purple-500 outline-none"
                >
                  <option value="male_lead">Nam chính</option>
                  <option value="female_young_lead">Nữ chính (Trẻ)</option>
                  <option value="female_mature_lead">Nữ chính (Trưởng thành)</option>
                  <option value="npc">Nhân vật phụ / Khác</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Tính cách, Bối cảnh & Mối quan hệ</label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={3}
                placeholder="Mô tả tính cách, quá khứ và mối quan hệ với nam chính..."
                className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-xs text-gray-100 focus:border-purple-500 outline-none resize-y"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Ngoại hình (Tùy chọn)</label>
              <input
                type="text"
                value={newAppearance}
                onChange={e => setNewAppearance(e.target.value)}
                placeholder="VD: Dáng người cao ráo, mặc bạch y, mắt phượng..."
                className="w-full bg-gray-950 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-100 focus:border-purple-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-xs font-medium"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateCharacter}
                disabled={!newName.trim()}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded text-xs font-bold"
              >
                Lưu nhân vật
              </button>
            </div>
          </div>
        )}

        {characters.length === 0 && !isAdding && (
          <div className="text-gray-500 italic text-xs p-4 text-center border border-dashed border-gray-800 rounded-lg">
            Chưa có nhân vật nào. Hãy nhấn "+ Thêm nhân vật mới" ở trên để bổ sung nhân vật vào truyện.
          </div>
        )}

        {characters.map(char => (
          <div 
            key={char.id} 
            onClick={() => handleOpenCharModal(char)}
            className="group relative bg-gray-850 border border-gray-700 rounded-lg p-3 hover:border-primary-500 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary-900/10 hover:-translate-y-0.5"
            title="Nhấn để xem / chỉnh sửa chi tiết nhân vật"
          >
            {/* FIXED HEADER: Name takes priority, Role is constrained */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-bold text-sm text-gray-200 group-hover:text-primary-400 transition-colors line-clamp-2 leading-tight">
                  {char.name}
              </h4>
              <span 
                className="shrink-0 max-w-[45%] truncate text-[10px] px-1.5 py-0.5 rounded-full bg-gray-900 text-gray-400 border border-gray-800 group-hover:border-primary-500/50 group-hover:text-primary-400 transition-colors mt-0.5"
                title={char.role}
              >
                {char.role}
              </span>
            </div>
            
            <p className="text-xs text-gray-400 line-clamp-2 mb-3 h-8 leading-relaxed">
                {char.description || char.core_personality}
            </p>
            
            {char.status && (
                <div className="mb-2 text-[10px] text-yellow-500 bg-yellow-900/10 px-2 py-1 rounded border border-yellow-900/30 truncate">
                    Trạng thái: {char.status}
                </div>
            )}
            
            <div className="flex flex-wrap gap-1 mb-1 overflow-hidden h-5">
              {(char.traits || []).slice(0, 3).map((trait, i) => (
                <span key={i} className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-800 whitespace-nowrap">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CHARACTER DETAIL & EDIT MODAL */}
      {selectedChar && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedChar(null)}
        >
            <div 
                className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-start bg-gray-850/50">
                    <div className="pr-24 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-xl md:text-2xl font-serif font-bold text-gray-50 leading-tight">{selectedChar.name}</h3>
                        </div>
                        <span className="inline-block text-xs font-bold px-2 py-1 rounded bg-primary-900/30 text-primary-400 border border-primary-900/50 uppercase tracking-wider mt-1">
                            {selectedChar.role}
                        </span>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                        <button
                            onClick={() => setIsEditingChar(!isEditingChar)}
                            className="p-2 text-gray-400 hover:text-primary-400 hover:bg-gray-800 rounded transition-colors text-xs font-bold flex items-center gap-1"
                            title="Sửa nhân vật"
                        >
                            <Edit3 size={14} />
                            <span>{isEditingChar ? 'Hủy sửa' : 'Sửa'}</span>
                        </button>
                        <button
                            onClick={() => handleDeleteChar(selectedChar.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                            title="Xóa nhân vật"
                        >
                            <Trash2 size={14} />
                        </button>
                        <button 
                            onClick={() => setSelectedChar(null)}
                            className="p-2 text-gray-500 hover:text-gray-50 hover:bg-gray-800 rounded transition-colors text-xs font-bold uppercase"
                        >
                            ĐÓNG
                        </button>
                    </div>
                </div>

                {isEditingChar ? (
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tên nhân vật</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-primary-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vai trò / Quan hệ</label>
                                <input
                                    type="text"
                                    value={editRole}
                                    onChange={e => setEditRole(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Phân nhóm</label>
                                <select
                                    value={editType}
                                    onChange={e => setEditType(e.target.value as any)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-primary-500 outline-none"
                                >
                                    <option value="male_lead">Nam chính</option>
                                    <option value="female_young_lead">Nữ chính (Trẻ)</option>
                                    <option value="female_mature_lead">Nữ chính (Trưởng thành)</option>
                                    <option value="npc">Nhân vật phụ / Khác</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tính cách, Bối cảnh & Mối quan hệ</label>
                            <textarea
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-gray-100 focus:border-primary-500 outline-none resize-y"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ngoại hình</label>
                            <textarea
                                value={editAppearance}
                                onChange={e => setEditAppearance(e.target.value)}
                                rows={2}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-gray-100 focus:border-primary-500 outline-none resize-y"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Trạng thái hiện tại</label>
                            <input
                                type="text"
                                value={editStatus}
                                onChange={e => setEditStatus(e.target.value)}
                                placeholder="VD: Bình thường, đang trọng thương..."
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-primary-500 outline-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setIsEditingChar(false)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveEditChar}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                            >
                                <Save size={14} />
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-800 bg-gray-800/30">
                            <button onClick={() => setDetailTab('info')} className={`flex-1 py-3 text-xs font-bold uppercase ${detailTab === 'info' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-50'}`}>Hồ Sơ</button>
                            <button onClick={() => setDetailTab('psych')} className={`flex-1 py-3 text-xs font-bold uppercase ${detailTab === 'psych' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-50'}`}>Tâm Lý</button>
                            <button onClick={() => setDetailTab('stats')} className={`flex-1 py-3 text-xs font-bold uppercase ${detailTab === 'stats' ? 'text-yellow-400 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-50'}`}>Trạng thái</button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                            
                            {detailTab === 'info' && (
                                <div className="space-y-4 animate-fadeIn">
                                     {/* Description */}
                                     <div className="text-sm text-gray-300 leading-7 whitespace-pre-wrap">
                                        {selectedChar.description}
                                    </div>

                                    {/* Appearance Box */}
                                    <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800 space-y-3">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-800 pb-1">
                                            Ngoại hình
                                        </label>
                                        {(() => {
                                            const app = getSafeAppearance(selectedChar);
                                            return (
                                                <>
                                                    <p className="text-sm text-gray-300 italic">{app.general}</p>
                                                    {app.face && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-16 shrink-0">Khuôn mặt:</span> <span className="text-gray-300">{app.face}</span></div>}
                                                    {app.hair && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-16 shrink-0">Tóc:</span> <span className="text-gray-300">{app.hair}</span></div>}
                                                    {app.body && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-16 shrink-0">Dáng:</span> <span className="text-gray-300">{app.body}</span></div>}
                                                    {app.clothing && <div className="flex gap-2 text-xs"><span className="text-gray-500 w-16 shrink-0">Phục trang:</span> <span className="text-gray-300">{app.clothing}</span></div>}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    
                                    {selectedChar.voiceSample && (
                                        <div className="bg-gray-800/30 p-3 rounded border border-gray-700 italic text-gray-400 text-xs">
                                            <span className="text-gray-500 not-italic font-bold mr-2">Voice:</span> 
                                            "{selectedChar.voiceSample}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {detailTab === 'psych' && (
                                <div className="animate-fadeIn space-y-4">
                                    <div className="bg-purple-900/10 p-4 rounded-lg border border-purple-500/20 mb-4">
                                        <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Tính cách cốt lõi</h4>
                                        <p className="text-sm text-gray-300">{selectedChar.core_personality || "Chưa xác định"}</p>
                                    </div>
                                    
                                    <div className="text-center text-gray-600 text-[10px] italic py-4">
                                        Các chỉ số Big Five được AI sử dụng ngầm để mô phỏng hành vi.
                                    </div>
                                </div>
                            )}

                            {detailTab === 'stats' && (
                                 <div className="animate-fadeIn space-y-4">
                                     {/* Short Status from Extractor */}
                                     <div className="bg-yellow-900/10 p-4 rounded-lg border border-yellow-900/30 mb-4">
                                        <h4 className="text-xs font-bold text-yellow-500 uppercase mb-2">Trạng thái hiện tại</h4>
                                        <p className="text-sm text-gray-300">{selectedChar.status || "Bình thường"}</p>
                                     </div>
                                     
                                     <div className="text-center text-gray-600 text-[10px] italic py-4">
                                        Ma trận cảm xúc được AI sử dụng ngầm để điều hướng hội thoại.
                                     </div>
                                 </div>
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 border-t border-gray-800 bg-gray-850/30">
                            <div className="flex flex-wrap gap-2 justify-center">
                                {(selectedChar.traits || []).map((t, i) => (
                                    <span key={i} className="text-[10px] px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-400">
                                        #{t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}
    </>
  );
};
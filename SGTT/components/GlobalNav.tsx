import React from 'react';
import { Settings, Heart, Terminal } from 'lucide-react';

interface GlobalNavProps {
    currentView: 'sachhiep_library' | 'system_prompt' | 'settings' | 'create_sachhiep';
    onNavigate: (view: 'sachhiep_library' | 'system_prompt' | 'settings') => void;
}

export const GlobalNav: React.FC<GlobalNavProps> = ({ currentView, onNavigate }) => {
    const navItems = [
        { id: 'sachhiep_library', label: 'Sắc Hiệp', icon: Heart },
        { id: 'system_prompt', label: 'Prompt', icon: Terminal },
        { id: 'settings', label: 'Cài đặt', icon: Settings },
    ] as const;

    return (
        <>
            {/* Desktop Sidebar (Narrow) */}
            <div className="hidden md:flex flex-col w-20 bg-gray-900 border-r border-gray-800 h-full shrink-0 items-center py-6">
                <div className="mb-8 flex flex-col items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-2">
                        <span className="text-gray-50 font-bold text-xl">D</span>
                    </div>
                </div>
                <nav className="flex-1 w-full px-2 space-y-4 overflow-y-auto custom-scrollbar flex flex-col items-center">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id || 
                            (item.id === 'sachhiep_library' && currentView === 'create_sachhiep');
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id as any)}
                                className={`w-full flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all ${
                                    isActive 
                                        ? 'bg-primary-500/10 text-primary-400 shadow-[0_0_15px_rgba(14,165,233,0.1)]' 
                                        : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                                }`}
                                title={item.label}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 pb-safe">
                <nav className="flex justify-around p-1">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id || 
                            (item.id === 'sachhiep_library' && currentView === 'create_sachhiep');
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id as any)}
                                className={`flex flex-col items-center gap-0.5 p-1 min-w-[48px] rounded-lg transition-all ${
                                    isActive 
                                        ? 'text-primary-400' 
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <div className={`p-1 rounded-full ${isActive ? 'bg-primary-500/10' : ''}`}>
                                    <Icon size={18} />
                                </div>
                                <span className="text-[9px] font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </>
    );
};

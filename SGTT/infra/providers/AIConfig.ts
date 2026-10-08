export enum ProviderType {
    DEEPSEEK = 'deepseek',
    LOCAL_LLM = 'local'
}

export enum ProviderFallbackMode {
    PRIMARY_ONLY = 'primary'
}

export interface AIConfig {
    activeProvider: ProviderType;
    fallbackMode: ProviderFallbackMode;
    localBaseUrl: string;
    localModel: string;
    geminiModel?: string;
    geminiImageModel?: string;
    geminiCustomModel?: string;
    geminiApiKeys?: string[];
    deepseekModel: string;
    deepseekCustomModel?: string;
    deepseekApiKeys: string[];
    deepseekBaseUrl?: string;
    sdWebuiUrl?: string;
}

// Load default configuration from env
export const defaultAIConfig: AIConfig = {
    activeProvider: ProviderType.DEEPSEEK,
    fallbackMode: ProviderFallbackMode.PRIMARY_ONLY,
    localBaseUrl: (import.meta as any).env?.VITE_LOCAL_LLM_BASE_URL || 'https://troubleshooting-start-opera-unto.trycloudflare.com',
    localModel: (import.meta as any).env?.VITE_LOCAL_LLM_MODEL || 'rwkv7-g1d-13.3b-Q8_0.gguf',
    deepseekModel: 'deepseek-chat',
    deepseekCustomModel: '',
    deepseekApiKeys: [],
    deepseekBaseUrl: 'https://api.deepseek.com'
};

export interface VoiceConfig {
    selectedVoiceUri: string;
    rate: number;
    autoNext: boolean;
}

export const defaultVoiceConfig: VoiceConfig = {
    selectedVoiceUri: '',
    rate: 1.0,
    autoNext: true,
};

export const getStoredVoiceConfig = (): VoiceConfig => {
    try {
        const stored = localStorage.getItem('sachhiep_tts_config');
        if (stored) {
            return { ...defaultVoiceConfig, ...JSON.parse(stored) };
        }
    } catch {}
    return { ...defaultVoiceConfig };
};

export const saveStoredVoiceConfig = (cfg: Partial<VoiceConfig>): VoiceConfig => {
    try {
        const current = getStoredVoiceConfig();
        const updated = { ...current, ...cfg };
        localStorage.setItem('sachhiep_tts_config', JSON.stringify(updated));
        return updated;
    } catch {}
    return defaultVoiceConfig;
};

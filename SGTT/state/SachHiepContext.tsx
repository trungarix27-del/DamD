
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { sachHiepPromptBuilderService } from '../narrative/prompting/sachHiepPromptAssembler';
import { Story, Chapter, Character, VectorData, BackupData, EntityRegistry, StoryContinuePlan } from '../types';
import { sachHiepStorageService as storageService } from '../infra/sachHiepStorage';
// import { geminiService } from '../infra/aiService'; // Replaced by ProviderFactory
import { chunkingService } from '../narrative/memory/chunking';
import { narrativeMemoryService, getMagnitude } from '../narrative/memory/narrativeMemoryService';
import { SachHiepProviderFactory as ProviderFactory } from '../infra/providers/SachHiepProviderFactory';

import { getModelLimit } from '../constants/modelLimits';

export const STOP_EXTRA_PLOT_LINE = "- ngưng câu chuyện tại đây, không sáng tạo thêm các tình tiết";

interface SachHiepContextType {
  story: Story | null;
  storiesList: Story[];
  isStoriesLoaded: boolean;
  activeChapterId: string | null;
  characters: Character[];
  isGenerating: boolean;
  isSyncingBible: boolean;
  generationStatus: string; // New field for status text
  generationThought: string; // New field for thought process
  generationProgress: number;
  generationPreview: string | null;
  generationSteps: { id: string; label: string; status: 'pending' | 'processing' | 'completed' | 'failed' }[];
  generationLogs: string[];
  tokenStats: { previous: number; current: number };
  userInstruction: string;
  stopExtraPlot: boolean;
  setStopExtraPlot: (val: boolean) => void;
  toggleStopExtraPlot: () => void;
  lastRawResponse: string;
  lastIllustrationPrompt: string;
  lastIllustrationRawResponse: string;
  storyContinuePlan: StoryContinuePlan | null;
  setUserInstruction: (text: string) => void;
  setStoryContinuePlan: (plan: StoryContinuePlan | null) => void;
  loadStories: () => Promise<void>;
  generateStoryDraft: (
    title: string, 
    genre: string, 
    synopsis: string, 
    setting: string,
    writingStyle: string,
    pov: string,
    pronounStyle: string,
    negativePrompt: string,
    nsfw: boolean,
    fandomName?: string,
    sourceUrl?: string,
    storyType?: 'original' | 'fanfic',
    sourceFileContent?: string,
    initialCharacters?: string
  ) => Promise<Story | null>;
  confirmStory: (story: Story) => Promise<void>;
  createStory: (
    title: string, 
    genre: string, 
    synopsis: string, 
    setting: string,
    writingStyle: string,
    pov: string,
    pronounStyle: string,
    negativePrompt: string,
    nsfw: boolean,
    fandomName?: string,
    sourceUrl?: string,
    storyType?: 'original' | 'fanfic',
    sourceFileContent?: string,
    initialCharacters?: string
  ) => Promise<void>;
  openStory: (id: string) => Promise<void>;
  closeStory: () => void;
  deleteStory: (id: string) => Promise<void>;
  updateStorySettings: (settings: Partial<Story>) => Promise<void>;
  selectChapter: (id: string) => void;
  addChapter: () => Promise<void>;
  updateChapterContent: (id: string, content: string) => void;
  updateChapterTitle: (id: string, title: string) => void;
  updateChapterSceneScript: (id: string, sceneScript: string) => Promise<void>;
  clearChapterContent: (id: string) => Promise<void>;
  checkChapterLimit: () => { exceeds: boolean; current: number; limit: number; model: string } | null;
  showChapterLimitModal: boolean;
  setShowChapterLimitModal: (show: boolean) => void;
  chapterLimitInfo: { current: number; limit: number; model: string } | null;
  generateContinue: (instructionOverride?: string, bypassLimitCheck?: boolean) => Promise<void>;
  generateRewrite: (instruction: string) => Promise<void>;
  addCharacter: (char: Character) => Promise<void>;
  updateCharacter: (id: string, updates: Partial<Character>) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  updateWorldLore: (lore: string[]) => Promise<void>;
  saveProgress: () => Promise<void>;
  exportStory: (id?: string) => Promise<void>;
  exportStoryEpub: (id?: string) => Promise<void>;
  importStory: (file: File) => Promise<void>;
  getDebugPrompt: () => string;
  markCommentsAsRead: () => Promise<void>;
  generateIllustrations: (numScenes: number) => Promise<void>;
}

const SachHiepContext = (window as any).SachHiepContext || ((window as any).SachHiepContext = createContext<SachHiepContextType | null>(null));

const identifyCharactersInText = (text: string, characters: Character[]): string[] => {
    const foundIds: string[] = [];
    const lowerText = text.toLowerCase();
    characters.forEach(c => {
        if (lowerText.includes(c.name.toLowerCase())) foundIds.push(c.id);
    });
    return foundIds;
};

export const SachHiepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("SachHiepProvider mounting");
  const [story, setStory] = useState<Story | null>(null);
  const [storiesList, setStoriesList] = useState<Story[]>([]);
  const [isStoriesLoaded, setIsStoriesLoaded] = useState(false); 
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncingBible, setIsSyncingBible] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>(''); // Init status
  const [generationThought, setGenerationThought] = useState<string>(''); // Init thought
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationPreview, setGenerationPreview] = useState<string | null>(null);
  const [generationSteps, setGenerationSteps] = useState<{ id: string; label: string; status: 'pending' | 'processing' | 'completed' | 'failed' }[]>([]);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [vectors, setVectors] = useState<VectorData[]>([]); 
  const [tokenStats, setTokenStats] = useState({ previous: 0, current: 0 });
  const [userInstruction, setUserInstruction] = useState('');
  const [stopExtraPlot, setStopExtraPlot] = useState(false);
  const [lastRawResponse, setLastRawResponse] = useState<string>('');

  const toggleStopExtraPlot = useCallback(() => {
    setStopExtraPlot(prev => {
      const next = !prev;
      setUserInstruction(curr => {
        if (next) {
          if (curr.includes(STOP_EXTRA_PLOT_LINE)) return curr;
          return curr.trim() ? `${curr.trim()}\n${STOP_EXTRA_PLOT_LINE}` : STOP_EXTRA_PLOT_LINE;
        } else {
          return curr
            .replace(`\n${STOP_EXTRA_PLOT_LINE}`, '')
            .replace(STOP_EXTRA_PLOT_LINE, '')
            .trim();
        }
      });
      return next;
    });
  }, []);
  const [lastIllustrationPrompt, setLastIllustrationPrompt] = useState<string>('');
  const [lastIllustrationRawResponse, setLastIllustrationRawResponse] = useState<string>('');
  const [storyContinuePlan, setStoryContinuePlan] = useState<StoryContinuePlan | null>(null);
  const [showChapterLimitModal, setShowChapterLimitModal] = useState(false);
  const [chapterLimitInfo, setChapterLimitInfo] = useState<{ current: number; limit: number; model: string } | null>(null);
  
  const storyRef = useRef<Story | null>(null);
  useEffect(() => { storyRef.current = story; }, [story]);

  useEffect(() => { loadStories(); }, []);

  const loadStories = async () => {
    try {
        const list = await storageService.getAllStories();
        list.sort((a, b) => (b.chapters[0]?.lastUpdated || b.createdAt) - (a.chapters[0]?.lastUpdated || a.createdAt));
        setStoriesList(list);
    } catch (e) { console.error(e); } finally { setIsStoriesLoaded(true); }
  };

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setGenerationLogs(prev => [...prev, `[${time}] ${msg}`]);
  }, []);

  const updateStep = useCallback((id: string, status: 'pending' | 'processing' | 'completed' | 'failed') => {
    setGenerationSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }, []);

  const generateStoryDraft = async (
    title: string, 
    genre: string, 
    synopsis: string, 
    setting: string, 
    writingStyle: string, 
    pov: string, 
    pronounStyle: string, 
    negativePrompt: string, 
    nsfw: boolean,
    fandomName?: string,
    sourceUrl?: string,
    storyType: 'original' | 'fanfic' = 'original',
    sourceFileContent?: string,
    initialCharacters?: string
  ): Promise<Story | null> => {
    setIsGenerating(true); 
    setGenerationProgress(0);
    setGenerationLogs([]);
    
    const steps = [
        { id: 'init', label: 'Khởi tạo dữ liệu cơ sở', status: 'processing' as const },
        { id: 'extract', label: 'Xây dựng Story Bible', status: 'pending' as const },
        { id: 'finish', label: 'Hoàn tất thiết lập', status: 'pending' as const }
    ];
    setGenerationSteps(steps);

    addLog('Bắt đầu tiến trình khởi tạo thế giới...');
    setGenerationStatus('Đang khởi tạo thế giới...');
    setGenerationProgress(5);
    const storyId = crypto.randomUUID();
    const newStory: Story = {
      id: storyId, title, genre, synopsis, setting, writingStyle, pov, pronounStyle, negativePrompt, nsfw,
      worldLore: [],
      characters: [], createdAt: Date.now(),
      chapters: [{ id: crypto.randomUUID(), title: 'Chương 1: Khởi đầu', content: '', summary: '', order: 1, lastUpdated: Date.now() }],
      sourceUrl,
      storyType
    };
    
    addLog('Đã tạo cấu trúc truyện cơ bản.');
    updateStep('init', 'completed');
    updateStep('extract', 'processing');
    setGenerationProgress(10);
    
    const provider = ProviderFactory.getInstance();

    try {
        addLog('Bắt đầu xây dựng Story Bible...');
        setGenerationStatus('Đang phân tích bối cảnh và tạo Story Bible...');
        setGenerationProgress(30);
        
        const formData = { title, genre, synopsis, setting, initialCharacters };
        let storyBible;
        try {
            storyBible = await provider.generateStoryBible(formData, sourceFileContent);
        } catch (bibleError) {
            console.error("Failed to generate Story Bible in draft, using fallback", bibleError);
            addLog("Cảnh báo: Không thể tạo Story Bible chi tiết. Đang sử dụng cấu trúc mặc định.");
            storyBible = {
                chars: [],
                world: setting || "Thế giới Sắc Hiệp",
                rules: "Tuân thủ quy tắc thế giới.",
                arc: synopsis || "Khởi đầu hành trình.",
                chapter_cores: []
            };
        }
        
        newStory.storyBible = storyBible;
        
        // Convert StoryBible characters to full Character objects for the UI
        newStory.characters = (storyBible.chars || []).map((c: any, idx: number) => ({
            id: `char_${storyId}_init_${idx}`,
            name: c.name || "Nhân vật ẩn danh",
            role: c.role || "Chưa rõ",
            description: c.core || "Không có mô tả",
            traits: [],
            appearance: { general: "Chưa rõ", face: "", body: "", hair: "", clothing: "" },
            personality: c.core || "",
            core_personality: c.core || ""
        }));

        addLog(`Đã tạo Story Bible với ${newStory.characters.length} nhân vật.`);
        updateStep('extract', 'completed');
        setGenerationProgress(80);
    } catch (e) {
        console.warn(e); 
        addLog(`Lỗi tạo Story Bible: ${e}`);
        updateStep('extract', 'failed');
        setIsGenerating(false);
        return null;
    }

    updateStep('finish', 'processing');
    setGenerationProgress(90);
    
    updateStep('finish', 'completed');
    setGenerationProgress(100);
    setGenerationStatus('Hoàn tất phân tích!');
    addLog('Phân tích thành công. Vui lòng kiểm tra lại thông tin!');
    
    setTimeout(() => {
        setIsGenerating(false);
        setGenerationStatus('');
        setGenerationProgress(0);
        setGenerationSteps([]);
        setGenerationLogs([]);
    }, 1500);

    return newStory;
  };

  const confirmStory = async (draftStory: Story) => {
    setIsGenerating(true);
    setGenerationStatus('Đang lưu trữ dữ liệu...');
    await storageService.saveStory(draftStory);
    setStory(draftStory);
    setActiveChapterId(draftStory.chapters[0].id);
    await loadStories();
    setIsGenerating(false);
    setGenerationStatus('');
  };

  const createStory = async (
    title: string, 
    genre: string, 
    synopsis: string, 
    setting: string, 
    writingStyle: string, 
    pov: string, 
    pronounStyle: string, 
    negativePrompt: string, 
    nsfw: boolean,
    fandomName?: string,
    sourceUrl?: string,
    storyType: 'original' | 'fanfic' = 'original',
    sourceFileContent?: string,
    initialCharacters?: string
  ) => {
    setIsGenerating(true); 
    setGenerationProgress(0);
    setGenerationLogs([]);
    
    const steps = [
        { id: 'init', label: 'Khởi tạo dữ liệu cơ sở', status: 'processing' as const },
        { id: 'extract', label: 'Xây dựng Story Bible', status: 'pending' as const },
        { id: 'finish', label: 'Hoàn tất thiết lập', status: 'pending' as const }
    ];
    setGenerationSteps(steps);

    addLog('Bắt đầu tiến trình khởi tạo thế giới...');
    setGenerationStatus('Đang khởi tạo thế giới...');
    setGenerationProgress(5);
    const storyId = crypto.randomUUID();
    const newStory: Story = {
      id: storyId, title, genre, synopsis, setting, writingStyle, pov, pronounStyle, negativePrompt, nsfw,
      worldLore: [],
      characters: [], createdAt: Date.now(),
      chapters: [{ id: crypto.randomUUID(), title: 'Chương 1: Khởi đầu', content: '', summary: '', order: 1, lastUpdated: Date.now() }],
      sourceUrl,
      storyType
    };
    
    // Preliminary save
    await storageService.saveStory(newStory);
    addLog('Đã tạo cấu trúc truyện cơ bản.');
    updateStep('init', 'completed');
    updateStep('extract', 'processing');
    setGenerationProgress(10);
    
    const provider = ProviderFactory.getInstance();

    try {
        addLog('Bắt đầu xây dựng Story Bible...');
        setGenerationStatus('Đang phân tích bối cảnh và tạo Story Bible...');
        setGenerationProgress(30);
        
        const formData = { title, genre, synopsis, setting, initialCharacters };
        let storyBible;
        try {
            storyBible = await provider.generateStoryBible(formData, sourceFileContent);
        } catch (bibleError) {
            console.error("Failed to generate Story Bible in create, using fallback", bibleError);
            addLog("Cảnh báo: Không thể tạo Story Bible chi tiết. Đang sử dụng cấu trúc mặc định.");
            storyBible = {
                chars: [],
                world: setting || "Thế giới Sắc Hiệp",
                rules: "Tuân thủ quy tắc thế giới.",
                arc: synopsis || "Khởi đầu hành trình.",
                chapter_cores: []
            };
        }
        
        newStory.storyBible = storyBible;
        
        // Convert StoryBible characters to full Character objects for the UI
        newStory.characters = (storyBible.chars || []).map((c: any, idx: number) => ({
            id: `char_${storyId}_init_${idx}`,
            name: c.name || "Nhân vật ẩn danh",
            role: c.role || "Chưa rõ",
            description: c.core || "Không có mô tả",
            traits: [],
            appearance: { general: "Chưa rõ", face: "", body: "", hair: "", clothing: "" },
            personality: c.core || "",
            core_personality: c.core || ""
        }));

        addLog(`Đã tạo Story Bible với ${newStory.characters.length} nhân vật.`);
        updateStep('extract', 'completed');
        setGenerationProgress(80);
    } catch (e) {
        console.warn(e); 
        addLog(`Lỗi tạo Story Bible: ${e}`);
        updateStep('extract', 'failed');
    }

    updateStep('finish', 'processing');
    setGenerationProgress(90);
    addLog('Đang lưu trữ toàn bộ dữ liệu vào bộ nhớ cục bộ...');

    await storageService.saveStory(newStory);
    setStory(newStory);
    setActiveChapterId(newStory.chapters[0].id);
    
    await loadStories();
    
    updateStep('finish', 'completed');
    setGenerationProgress(100);
    setGenerationStatus('Hoàn tất!');
    addLog('Khởi tạo thành công. Sẵn sàng viết truyện!');
    
    setTimeout(() => {
        setIsGenerating(false);
        setGenerationStatus('');
        setGenerationProgress(0);
        setGenerationSteps([]);
        setGenerationLogs([]);
    }, 1500);
  };

  const openStory = async (id: string) => {
    setIsGenerating(true);
    setGenerationStatus('Đang tải truyện...');
    setStoryContinuePlan(null);
    const found = await storageService.getStory(id);
    if (found) {
        if (!found.worldLore) found.worldLore = [];
        setStory(found);
        setStoryContinuePlan(found.storyContinuePlan || null);
        const storyVectors = await storageService.getVectorsByStory(id);
        setVectors(storyVectors);
        if (found.chapters.length > 0) {
            const lastChapter = found.chapters.reduce((prev, current) => (prev.order > current.order) ? prev : current);
            setActiveChapterId(lastChapter.id);
        }
    }
    setIsGenerating(false);
    setGenerationStatus('');
  };

  const syncStoryBibleForChapter = async (currentStory: Story, chapterId: string) => {
      const chapter = currentStory.chapters.find(c => c.id === chapterId);
      if (!chapter || chapter.content.length <= 100) return;

      setIsSyncingBible(true);
      try {
          const bibleUpdate = await ProviderFactory.getInstance().updateStoryBible(chapter.content);
          
          if (!bibleUpdate || typeof bibleUpdate !== 'object') {
              console.warn("Invalid bibleUpdate received, skipping sync");
              return;
          }

          let updated = false;
          // Use storyRef.current if available to get the most recent state (e.g. if user added a new chapter while this was running)
          // Otherwise fallback to currentStory (e.g. if user closed the story)
          const latestStory = (storyRef.current && storyRef.current.id === currentStory.id) ? storyRef.current : currentStory;
          
          const storyBible = JSON.parse(JSON.stringify(latestStory.storyBible || { chars: [], world: "", rules: "", arc: "", chapter_cores: [] }));
          const newCharacters: Character[] = [];

          if (bibleUpdate.chapter_core) {
              const newCore = { ch: chapter.order, core: bibleUpdate.chapter_core };
              const existingCoreIdx = (storyBible.chapter_cores || []).findIndex((c: any) => c.ch === chapter.order);
              if (existingCoreIdx >= 0) {
                  storyBible.chapter_cores[existingCoreIdx] = newCore;
              } else {
                  if (!storyBible.chapter_cores) storyBible.chapter_cores = [];
                  storyBible.chapter_cores.push(newCore);
              }
              updated = true;
          }
          
          if (bibleUpdate.new_chars && Array.isArray(bibleUpdate.new_chars) && bibleUpdate.new_chars.length > 0) {
              const existingNames = new Set((storyBible.chars || []).map((c: any) => c.name?.toLowerCase()));
              const existingUICharNames = new Set(latestStory.characters.map(c => c.name?.toLowerCase()));

              for (const c of bibleUpdate.new_chars) {
                  if (c.name && !existingNames.has(c.name.toLowerCase()) && !existingUICharNames.has(c.name.toLowerCase())) {
                      if (!storyBible.chars) storyBible.chars = [];
                      storyBible.chars.push(c);
                      newCharacters.push({
                          id: `char_${latestStory.id}_${Date.now()}_${Math.random()}`,
                          name: c.name,
                          role: c.role || "Chưa rõ",
                          description: c.core || "",
                          traits: [],
                          appearance: { general: "Chưa rõ", face: "", body: "", hair: "", clothing: "" },
                          personality: c.core || "",
                          core_personality: c.core || ""
                      });
                      updated = true;
                  }
              }
          }
          
          if (bibleUpdate.arc_update) {
              storyBible.arc = bibleUpdate.arc_update;
              updated = true;
          }
          
          if (updated) {
              const updatedStory = {
                  ...latestStory,
                  storyBible: storyBible,
                  characters: [...latestStory.characters, ...newCharacters]
              };
              await storageService.saveStory(updatedStory);
              
              // Only update state if the story is still open
              if (storyRef.current && storyRef.current.id === updatedStory.id) {
                  setStory(updatedStory);
              }
          }
      } catch (e) {
          console.error("syncStoryBibleForChapter error (silent skip)", e);
      } finally {
          setIsSyncingBible(false);
      }
  };

  const closeStory = () => { 
      if (storyRef.current && activeChapterId) {
          syncStoryBibleForChapter(storyRef.current, activeChapterId);
      }
      setStory(null); 
      setActiveChapterId(null); 
      setVectors([]); 
      setStoryContinuePlan(null);
      loadStories(); 
  };

  const deleteStory = async (id: string) => {
    await storageService.deleteStory(id);
    await storageService.deleteVectorsByStory(id); 
    if (story?.id === id) closeStory(); else await loadStories();
  };

  const updateStorySettings = async (settings: Partial<Story>) => {
    if (!storyRef.current) return;
    const updatedStory = { ...storyRef.current, ...settings };
    setStory(updatedStory);
    storyRef.current = updatedStory;
    await storageService.saveStory(updatedStory);
  };
  
  const updateWorldLore = async (lore: string[]) => {
      if (!storyRef.current) return;
      const updatedStory = { ...storyRef.current, worldLore: lore };
      setStory(updatedStory);
      storyRef.current = updatedStory;
      await storageService.saveStory(updatedStory);
  };
  
  const selectChapter = (id: string) => {
      if (storyRef.current && activeChapterId && activeChapterId !== id) {
          syncStoryBibleForChapter(storyRef.current, activeChapterId);
      }
      setActiveChapterId(id);
  };

  const addChapter = async () => {
    if (!story) return;
    
    if (activeChapterId) {
        syncStoryBibleForChapter(story, activeChapterId);
    }

    const nextOrder = story.chapters.length + 1;
    const newChapter: Chapter = { id: crypto.randomUUID(), title: `Chương ${nextOrder}`, content: '', summary: '', order: nextOrder, lastUpdated: Date.now() };
    const updatedStory = { ...story, chapters: [...story.chapters, newChapter] };
    setStory(updatedStory);
    await storageService.saveStory(updatedStory);
    setActiveChapterId(newChapter.id);
  };

  const updateChapterContent = useCallback((id: string, content: string) => {
    if (!id) return;
    setStory(prev => {
      if (!prev) return null;
      const chapterExists = prev.chapters.some(c => c.id === id);
      if (!chapterExists) return prev;
      const updated = { ...prev, chapters: prev.chapters.map(c => c.id === id ? { ...c, content, lastUpdated: Date.now() } : c) };
      storyRef.current = updated;
      return updated;
    });
  }, []);

  const updateChapterTitle = useCallback((id: string, title: string) => {
    if (!id) return;
    setStory(prev => {
      if (!prev) return null;
      const updated = { ...prev, chapters: prev.chapters.map(c => c.id === id ? { ...c, title, lastUpdated: Date.now() } : c) };
      storyRef.current = updated;
      storageService.saveStory(updated);
      return updated;
    });
  }, []);

  const updateChapterSceneScript = async (id: string, sceneScript: string) => {
    if (!id || !storyRef.current) return;
    const updatedStory = {
      ...storyRef.current,
      chapters: storyRef.current.chapters.map(c => c.id === id ? { ...c, sceneScript, lastUpdated: Date.now() } : c)
    };
    setStory(updatedStory);
    storyRef.current = updatedStory;
    await storageService.saveStory(updatedStory);
  };

  const clearChapterContent = async (id: string) => {
    if (!id || !storyRef.current) return;
    const targetChapter = storyRef.current.chapters.find(c => c.id === id);
    if (!targetChapter) return;

    const storyBible = storyRef.current.storyBible ? JSON.parse(JSON.stringify(storyRef.current.storyBible)) : null;
    if (storyBible && Array.isArray(storyBible.chapter_cores)) {
      storyBible.chapter_cores = storyBible.chapter_cores.filter((c: any) => c.ch !== targetChapter.order);
    }

    const updatedStory = {
      ...storyRef.current,
      storyBible: storyBible || storyRef.current.storyBible,
      storyContinuePlan: undefined,
      chapters: storyRef.current.chapters.map(c => c.id === id ? { ...c, content: '', summary: '', lastUpdated: Date.now() } : c)
    };
    setStory(updatedStory);
    storyRef.current = updatedStory;
    setStoryContinuePlan(null);
    await storageService.saveStory(updatedStory);
  };

  const saveProgress = async () => { if (story) await storageService.saveStory(story); };

  const checkChapterLimit = () => {
    if (!storyRef.current || !activeChapterId) return null;
    const currentChapter = storyRef.current.chapters.find(c => c.id === activeChapterId);
    if (!currentChapter) return null;

    const wordCount = (currentChapter.content || "").length;
    const modelName = ProviderFactory.getInstance().getActiveModelName();
    
    const { chapterLimit } = getModelLimit(modelName);
    
    const info = { current: wordCount, limit: chapterLimit, model: modelName };
    setChapterLimitInfo(info);

    if (wordCount > chapterLimit) {
      return { exceeds: true, ...info };
    }
    return { exceeds: false, ...info };
  };

  const generateContinue = async (instructionOverride?: string, bypassLimitCheck: boolean = false) => {
    console.log("generateContinue called", { bypassLimitCheck, activeChapterId, storyRef: !!storyRef.current });
    if (!storyRef.current || !activeChapterId) return;

    // Check chapter limit before generating
    if (!bypassLimitCheck) {
        const limitResult = checkChapterLimit();
        console.log("limitResult", limitResult);
        if (limitResult?.exceeds) {
            console.log("Exceeds limit, showing modal");
            setShowChapterLimitModal(true);
            return;
        }
    }

    console.log("Proceeding to generate...");
    let finalInstruction = instructionOverride !== undefined ? instructionOverride : userInstruction;
    if (stopExtraPlot && !finalInstruction.includes(STOP_EXTRA_PLOT_LINE)) {
        finalInstruction = finalInstruction.trim()
            ? `${finalInstruction.trim()}\n${STOP_EXTRA_PLOT_LINE}`
            : STOP_EXTRA_PLOT_LINE;
    }
    const currentStory = storyRef.current;
    const sortedChapters = [...currentStory.chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);
    if (currentIndex === -1) return;
    const currentChapter = sortedChapters.findIndex(c => c.id === activeChapterId) !== -1 ? sortedChapters.find(c => c.id === activeChapterId)! : sortedChapters[0];
    
    setIsGenerating(true);
    setGenerationStatus('AI đang viết...');
    setGenerationThought('');
    setLastRawResponse('');
    setStoryContinuePlan(null);
    setTokenStats(prev => ({ previous: prev.current, current: 0 }));
    setUserInstruction(stopExtraPlot ? STOP_EXTRA_PLOT_LINE : '');

    try {
      const startIdx = Math.max(0, currentIndex - 2);
      const immediateChapters = sortedChapters.slice(startIdx, currentIndex + 1);
      
      const modelName = ProviderFactory.getInstance().getActiveModelName();
      const { promptLimit } = getModelLimit(modelName);

      let immediateContext = immediateChapters.map(c => {
          let truncatedContent = c.content || "";
          if (truncatedContent.length > promptLimit) {
              truncatedContent = "..." + truncatedContent.substring(truncatedContent.length - promptLimit);
          }
          return `### ${c.title}\n${truncatedContent}`;
      }).join('\n\n');
      
      const storyBible = currentStory.storyBible || { chars: [], world: "", rules: "", arc: "", chapter_cores: [] };
      const oldCores = (storyBible.chapter_cores || []).map(c => `[Chương ${c.ch}]: ${c.core}`).join('\n');
      
      // Multi-signal detection
      const recentText = immediateContext.toLowerCase();
      const isFirstChapterEmpty = currentIndex === 0 && (!currentChapter.content || currentChapter.content.trim() === "");

      let relevantChars = (storyBible.chars || []).filter(c => {
        if (!c.name) return false;
        
        // Signal 1: Chapter 1 and empty context -> inject all
        if (isFirstChapterEmpty) return true;

        const lowerName = c.name.toLowerCase();
        // Signal 2: Tên trực tiếp
        if (recentText.includes(lowerName)) return true;
        
        // Signal 3: Alias / pronoun hints từ character_type
        const pronounHints: Record<string, string[]> = {
          'male_lead': ['hắn', 'chàng', 'y ', 'anh ta'],
          'female_young_lead': ['nàng', 'cô ấy', 'tiểu thư', 'cô bé'],
          'female_mature_lead': ['nàng', 'bà', 'sư mẫu', 'phu nhân'],
        };
        const hints = pronounHints[c.character_type || ''] || [];
        if (hints.some(h => recentText.includes(h))) return true;
        
        // Signal 4: Luôn inject male_lead
        if (c.character_type === 'male_lead') return true;
        
        // Signal 5: Inject characters with status
        const fullChar = currentStory.characters.find(fc => fc.name === c.name);
        if (fullChar && fullChar.status && fullChar.status.length > 0) return true;
        
        return false;
      });

      // Richer charSnippet + Bible Rules & Arc & Lore
      let charSnippet = relevantChars.map(c => {
        const fullChar = currentStory.characters.find(fc => fc.name === c.name);
        const lines = [`【${c.name}】(${c.role})`];
        if (c.core) lines.push(`  - Cốt lõi: ${c.core}`);
        
        if (fullChar) {
          if (fullChar.status) lines.push(`  - Trạng thái: ${fullChar.status}`);
          if (fullChar.emotionState) {
            const topEmotions = Object.entries(fullChar.emotionState)
              .filter(([_, v]) => typeof v === 'number')
              .sort(([,a],[,b]) => (b as number) - (a as number))
              .slice(0, 2)
              .map(([k, v]) => `${k}:${(v as number).toFixed(1)}`)
              .join(', ');
            if (topEmotions) lines.push(`  - Cảm xúc: ${topEmotions}`);
          }
          if (fullChar.voiceSample) lines.push(`  - Giọng điệu mẫu: "${fullChar.voiceSample}"`);
        }
        return lines.join('\n');
      }).join('\n\n');

      const extraBibleParts: string[] = [];
      if (storyBible.rules) extraBibleParts.push(`【Quy tắc / Cấm kỵ】: ${storyBible.rules}`);
      if (storyBible.arc) extraBibleParts.push(`【Trạng thái Arc hiện tại】: ${storyBible.arc}`);
      if (currentStory.worldLore && currentStory.worldLore.length > 0) {
        extraBibleParts.push(`【Ghi chú Thế giới (Lore)】:\n- ${currentStory.worldLore.join('\n- ')}`);
      }
      if (extraBibleParts.length > 0) {
        charSnippet = `${charSnippet ? charSnippet + '\n\n' : ''}${extraBibleParts.join('\n\n')}`;
      }

      const stream = ProviderFactory.getInstance().generateSachHiepStoryStream(
        immediateContext,
        oldCores,
        charSnippet,
        storyBible,
        currentStory.genre,
        currentStory.writingStyle || "",
        currentStory.pov,
        currentStory.pronounStyle,
        currentStory.negativePrompt,
        currentStory.nsfw ?? true,
        finalInstruction,
        currentChapter.title
      );

      let accumulatedNewText = "";
      let accumulatedThought = "";
      let lastUpdateTime = 0;
      let finalPlan: StoryContinuePlan | null = null;
      const separator = (currentChapter.content.length > 0 && !/\s$/.test(currentChapter.content)) ? ' ' : '';
      
      for await (const chunk of stream) {
        if (chunk.thought) {
            accumulatedThought += chunk.thought;
            setGenerationThought(accumulatedThought);
            // Update status simply
            setGenerationStatus('AI đang suy nghĩ...');
        }
        if (chunk.text) {
            accumulatedNewText += chunk.text;
            // When text starts, clear the "thinking" status and show "writing"
            setGenerationStatus('AI đang viết truyện...');
        }
        if (chunk.raw !== undefined) {
            setLastRawResponse(chunk.raw);
        }
        if (chunk.storyContinuePlan) finalPlan = chunk.storyContinuePlan;
        if (chunk.usageMetadata?.totalTokenCount) setTokenStats(prev => ({ ...prev, current: chunk.usageMetadata.totalTokenCount || 0 }));
        
        const now = Date.now();
        // Reduced throttle to 50ms for smoother streaming
        if (now - lastUpdateTime > 50 && chunk.text) { 
            setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: currentChapter.content + separator + accumulatedNewText } : c) }) : null);
            lastUpdateTime = now;
        }
      }
      
      if (finalPlan) {
          setStoryContinuePlan(finalPlan);
          
          // Create comments from the plan with safety checks
          const timestamp = Date.now();
          const newComments: import('../types').StoryComment[] = [
              {
                  id: `comment_love_${timestamp}`,
                  persona: 'LoveOrGoodRoute',
                  content: finalPlan.LoveOrGoodRoute?.CharacterComment || "AI gợi ý hướng đi chính diện.",
                  timestamp,
                  read: false
              },
              {
                  id: `comment_ntr_${timestamp}`,
                  persona: 'NtrOrBadRoute',
                  content: finalPlan.NtrOrBadRoute?.CharacterComment || "AI gợi ý hướng đi tà đạo/NTR.",
                  timestamp,
                  read: false
              },
              {
                  id: `comment_surprise_${timestamp}`,
                  persona: 'SupriseOrNeutralRoute',
                  content: finalPlan.SupriseOrNeutralRoute?.CharacterComment || "AI gợi ý hướng đi bất ngờ.",
                  timestamp,
                  read: false
              }
          ];
          
          currentStory.comments = [...(currentStory.comments || []), ...newComments];
      }
      
      const finalContent = currentChapter.content + separator + accumulatedNewText;
      
      const updatedStory: Story = {
          ...currentStory,
          chapters: currentStory.chapters.map(c => c.id === activeChapterId ? { ...c, content: finalContent } : c),
          storyContinuePlan: finalPlan || currentStory.storyContinuePlan,
          comments: currentStory.comments
      };
      
      setStory(updatedStory);
      await storageService.saveStory(updatedStory);
      storyRef.current = updatedStory;

    } catch (e) { console.error(e); } finally { 
        setIsGenerating(false); 
        setGenerationStatus('');
    }
  };

  const generateRewrite = async (instruction: string) => {
    if (!storyRef.current || !activeChapterId) return;
    const currentStory = storyRef.current;
    const currentChapter = currentStory.chapters.find(c => c.id === activeChapterId);
    if (!currentChapter) return;

    setIsGenerating(true);
    setGenerationStatus('AI đang sửa văn bản...');
    setLastRawResponse('');

    try {
        const stream = ProviderFactory.getInstance().rewriteContentStream(
            currentChapter.content || "",
            instruction,
            {
                worldBible: currentStory.setting,
                synopsis: currentStory.synopsis,
                characters: currentStory.characters,
                worldLore: currentStory.worldLore || [],
                genre: currentStory.genre,
                writingStyle: currentStory.writingStyle || "",
                pov: currentStory.pov,
                pronounStyle: currentStory.pronounStyle,
                negativePrompt: currentStory.negativePrompt,
                nsfw: currentStory.nsfw ?? true,
                sourceUrl: currentStory.sourceUrl,
                entityRegistry: currentStory.entityRegistry // Pass registry
            }
        );

        let accumulatedNewText = "";
        let lastUpdateTime = 0;
        
        // Clear content to show rewrite process
        setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: "" } : c) }) : null);

        for await (const chunk of stream) {
            if (chunk.raw !== undefined) {
                setLastRawResponse(chunk.raw);
            }
            if (chunk.text) {
                accumulatedNewText += chunk.text;
                 const now = Date.now();
                if (now - lastUpdateTime > 100) {
                     setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: accumulatedNewText } : c) }) : null);
                     lastUpdateTime = now;
                }
            }
        }
        
        // Final update
        setStory(prev => prev ? ({ ...prev, chapters: prev.chapters.map(c => c.id === activeChapterId ? { ...c, content: accumulatedNewText } : c) }) : null);

        // Save
        const updatedStory = { ...currentStory, chapters: currentStory.chapters.map(c => c.id === activeChapterId ? { ...c, content: accumulatedNewText } : c) };
        
        await storageService.saveStory(updatedStory);
        storyRef.current = updatedStory;

    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
        setGenerationStatus('');
    }
  }

  const addCharacter = async (char: Character) => {
    if (!storyRef.current) return;
    const currentStory = storyRef.current;
    const currentBible = currentStory.storyBible || { chars: [], world: currentStory.setting || "", rules: "", arc: currentStory.synopsis || "", chapter_cores: [] };
    const newBibleChar = {
      name: char.name,
      role: char.role,
      core: char.description || char.core_personality || "",
      character_type: char.character_type || 'npc'
    };
    const updatedStory: Story = {
      ...currentStory,
      characters: [...currentStory.characters, char],
      storyBible: {
        ...currentBible,
        chars: [...(currentBible.chars || []), newBibleChar]
      }
    };
    setStory(updatedStory);
    storyRef.current = updatedStory;
    await storageService.saveStory(updatedStory);
  };

  const updateCharacter = async (id: string, updates: Partial<Character>) => {
    if (!storyRef.current) return;
    const currentStory = storyRef.current;
    const targetChar = currentStory.characters.find(c => c.id === id);
    if (!targetChar) return;

    const updatedChars = currentStory.characters.map(c => c.id === id ? { ...c, ...updates } : c);
    const currentBible = currentStory.storyBible || { chars: [], world: currentStory.setting || "", rules: "", arc: currentStory.synopsis || "", chapter_cores: [] };

    let matchedInBible = false;
    const updatedBibleChars = (currentBible.chars || []).map(bc => {
      if (bc.name === targetChar.name) {
        matchedInBible = true;
        return {
          ...bc,
          name: updates.name !== undefined ? updates.name : bc.name,
          role: updates.role !== undefined ? updates.role : bc.role,
          core: updates.description !== undefined ? updates.description : (updates.core_personality !== undefined ? updates.core_personality : bc.core),
          character_type: updates.character_type !== undefined ? updates.character_type : bc.character_type
        };
      }
      return bc;
    });

    if (!matchedInBible) {
      const merged = { ...targetChar, ...updates };
      updatedBibleChars.push({
        name: merged.name,
        role: merged.role,
        core: merged.description || merged.core_personality || "",
        character_type: merged.character_type || 'npc'
      });
    }

    const updatedStory: Story = {
      ...currentStory,
      characters: updatedChars,
      storyBible: {
        ...currentBible,
        chars: updatedBibleChars
      }
    };
    setStory(updatedStory);
    storyRef.current = updatedStory;
    await storageService.saveStory(updatedStory);
  };

  const deleteCharacter = async (id: string) => {
    if (!storyRef.current) return;
    const currentStory = storyRef.current;
    const targetChar = currentStory.characters.find(c => c.id === id);
    const updatedChars = currentStory.characters.filter(c => c.id !== id);
    const currentBible = currentStory.storyBible || { chars: [], world: currentStory.setting || "", rules: "", arc: currentStory.synopsis || "", chapter_cores: [] };
    const updatedBibleChars = targetChar
      ? (currentBible.chars || []).filter(bc => bc.name !== targetChar.name)
      : (currentBible.chars || []);

    const updatedStory: Story = {
      ...currentStory,
      characters: updatedChars,
      storyBible: {
        ...currentBible,
        chars: updatedBibleChars
      }
    };
    setStory(updatedStory);
    storyRef.current = updatedStory;
    await storageService.saveStory(updatedStory);
  };
  
  const generateIllustrations = async (numScenes: number) => {
    if (!storyRef.current || !activeChapterId) return;
    const currentStory = storyRef.current;
    const currentChapter = currentStory.chapters.find(c => c.id === activeChapterId);
    if (!currentChapter || !currentChapter.content) return;

    setIsGenerating(true);
    setGenerationStatus('Đang tạo prompt minh họa...');
    
    try {
      const provider = ProviderFactory.getInstance();
      const { scenes: prompts, prompt: illustrationPrompt } = await provider.generateIllustrationPrompts(currentChapter.content, numScenes, currentStory.characters);
      
      setLastIllustrationPrompt(illustrationPrompt);
      setLastIllustrationRawResponse(JSON.stringify(prompts, null, 2));

      let newIllustrations = [...(currentChapter.illustrations || [])];
      
      for (let i = 0; i < prompts.length; i++) {
        const scene = prompts[i];
        setGenerationStatus(`Đang vẽ ảnh ${i + 1}/${prompts.length}...`);
        setGenerationProgress(0);
        setGenerationPreview(null);
        
        try {
          const imageUrl = await provider.generateImage(
            scene.prompt, 
            "1:1", 
            undefined, 
            (progress, preview) => {
              setGenerationProgress(progress);
              if (preview) setGenerationPreview(preview);
            }
          );
          
          if (imageUrl) {
            newIllustrations.push({
              id: `ill_${Date.now()}_${i}`,
              prompt: scene.prompt,
              imageUrl: imageUrl,
              position: scene.insertion_line_number
            });
          }
        } catch (imgError: any) {
          console.error("Image generation failed for scene", i, imgError);
          setGenerationStatus(`Lỗi vẽ ảnh ${i + 1}: ${imgError.message || 'Không rõ lỗi'}`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Show error for 3s
        }
      }

      setGenerationProgress(0);
      setGenerationPreview(null);

      const updatedStory = {
        ...currentStory,
        chapters: currentStory.chapters.map(c => 
          c.id === activeChapterId ? { ...c, illustrations: newIllustrations } : c
        )
      };
      
      setStory(updatedStory);
      await storageService.saveStory(updatedStory);
      storyRef.current = updatedStory;

    } catch (e: any) {
      console.error(e);
      setGenerationStatus(`Lỗi: ${e.message || 'Có lỗi xảy ra'}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const exportStoryEpub = async (id?: string) => {
    const targetStory = id ? storiesList.find(s => s.id === id) : story;
    if (!targetStory) return;
    try {
      const { exportToEpub } = await import('../infra/epubExporter');
      await exportToEpub(targetStory);
    } catch (e) {
      console.error("Export EPUB failed", e);
    }
  };

  const exportStory = async (id?: string) => {
    const targetStory = id ? storiesList.find(s => s.id === id) : story;
    if (!targetStory) return;
    try {
        // FIX: Fetch fresh vectors directly from IndexedDB instead of relying on state (which is empty in Library view)
        const relatedVectors = await storageService.getVectorsByStory(targetStory.id);
        
        const backupData: BackupData = { 
            version: 1, 
            story: targetStory, 
            vectors: relatedVectors, 
            exportedAt: Date.now() 
        };
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${targetStory.title.replace(/[^a-zA-Z0-9]/g, '_')}_v1.0.2.json`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const importStory = async (file: File) => {
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      let importedStory = 'version' in jsonData ? jsonData.story : jsonData;
      let importedVectors = 'version' in jsonData ? jsonData.vectors : [];
      importedVectors = importedVectors.map((v: any) => ({ ...v, storyId: v.storyId || importedStory.id, createdAt: v.createdAt || Date.now() }));
      const existing = await storageService.getStory(importedStory.id);
      if (existing && !window.confirm("Truyện này đã tồn tại. Bạn có muốn ghi đè?")) return;
      if (existing) await storageService.deleteVectorsByStory(importedStory.id);
      await storageService.saveStory(importedStory);
      if (importedVectors.length > 0) await storageService.saveVectors(importedVectors);
      await loadStories();
    } catch (e) { console.error(e); }
  };

  const getDebugPrompt = (): string => {
    if (!storyRef.current || !activeChapterId) return "Không có dữ liệu truyện hoặc chương đang mở.";
    const currentStory = storyRef.current;
    const sortedChapters = [...currentStory.chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);
    if (currentIndex === -1) return "Không tìm thấy chương.";
    
    const currentChapter = sortedChapters[currentIndex];
    const startIdx = Math.max(0, currentIndex - 2);
    const immediateChapters = sortedChapters.slice(startIdx, currentIndex + 1);
    
    const modelName = ProviderFactory.getInstance().getActiveModelName();
    const { promptLimit } = getModelLimit(modelName);

    let immediateContext = immediateChapters.map(c => {
        let truncatedContent = c.content || "";
        if (truncatedContent.length > promptLimit) {
            truncatedContent = "..." + truncatedContent.substring(truncatedContent.length - promptLimit);
        }
        return `### ${c.title}\n${truncatedContent}`;
    }).join('\n\n');
    
    const storyBible = currentStory.storyBible || { chars: [], world: "", rules: "", arc: "", chapter_cores: [] };
    const oldCores = storyBible.chapter_cores.map(c => `[Chương ${c.ch}]: ${c.core}`).join('\n');
    
    const recentText = immediateContext.toLowerCase();
    const isFirstChapterEmpty = currentIndex === 0 && (!currentChapter.content || currentChapter.content.trim() === "");

    const relevantChars = (storyBible.chars || []).filter(c => {
      if (!c.name) return false;
      
      // Signal 1: Chapter 1 and empty context -> inject all
      if (isFirstChapterEmpty) return true;

      const lowerName = c.name.toLowerCase();
      // Signal 2: Tên trực tiếp
      if (recentText.includes(lowerName)) return true;
      
      // Signal 3: Alias / pronoun hints từ character_type
      const pronounHints: Record<string, string[]> = {
        'male_lead': ['hắn', 'chàng', 'y ', 'anh ta'],
        'female_young_lead': ['nàng', 'cô ấy', 'tiểu thư', 'cô bé'],
        'female_mature_lead': ['nàng', 'bà', 'sư mẫu', 'phu nhân'],
      };
      const hints = pronounHints[c.character_type || ''] || [];
      if (hints.some(h => recentText.includes(h))) return true;
      
      // Signal 4: Luôn inject male_lead
      if (c.character_type === 'male_lead') return true;
      
      // Signal 5: Inject characters with status
      const fullChar = currentStory.characters.find(fc => fc.name === c.name);
      if (fullChar && fullChar.status && fullChar.status.length > 0) return true;
      
      return false;
    });

    const charSnippet = relevantChars.map(c => {
      const fullChar = currentStory.characters.find(fc => fc.name === c.name);
      const lines = [`【${c.name}】(${c.role})`];
      if (c.core) lines.push(`  - Cốt lõi: ${c.core}`);
      
      if (fullChar) {
        if (fullChar.status) lines.push(`  - Trạng thái: ${fullChar.status}`);
        if (fullChar.emotionState) {
          const topEmotions = Object.entries(fullChar.emotionState)
            .filter(([_, v]) => typeof v === 'number')
            .sort(([,a],[,b]) => (b as number) - (a as number))
            .slice(0, 2)
            .map(([k, v]) => `${k}:${(v as number).toFixed(1)}`)
            .join(', ');
          if (topEmotions) lines.push(`  - Cảm xúc: ${topEmotions}`);
        }
        if (fullChar.voiceSample) lines.push(`  - Giọng điệu mẫu: "${fullChar.voiceSample}"`);
      }
      return lines.join('\n');
    }).join('\n\n');

    const systemInstruction = sachHiepPromptBuilderService.buildSystemInstruction(
        currentStory.genre, 
        storyBible.world, 
        currentStory.pov, 
        currentStory.pronounStyle, 
        currentStory.writingStyle || "", 
        currentStory.negativePrompt, 
        currentStory.nsfw ?? true,
        currentStory.sourceUrl,
        currentStory.entityRegistry
    );

    let effectiveInstruction = userInstruction;
    if (stopExtraPlot && !effectiveInstruction.includes(STOP_EXTRA_PLOT_LINE)) {
        effectiveInstruction = effectiveInstruction.trim()
            ? `${effectiveInstruction.trim()}\n${STOP_EXTRA_PLOT_LINE}`
            : STOP_EXTRA_PLOT_LINE;
    }

    const userPrompt = sachHiepPromptBuilderService.buildContinuePrompt(
        immediateContext,
        oldCores,
        storyBible.world,
        charSnippet,
        currentStory.synopsis,
        currentStory.characters,
        currentStory.worldLore || [],
        effectiveInstruction,
        currentStory.pronounStyle,
        currentChapter.title
    );

    return `=== SYSTEM INSTRUCTION ===\n${systemInstruction}\n\n=== USER PROMPT ===\n${userPrompt}`;
  };

  const markCommentsAsRead = async () => {
    if (!story) return;
    
    const updatedComments = (story.comments || []).map(c => ({ ...c, read: true }));
    const updatedStory = { ...story, comments: updatedComments };
    
    setStory(updatedStory);
    await storageService.saveStory(updatedStory);
    storyRef.current = updatedStory;
  };

  return (
    <SachHiepContext.Provider value={{
      story, storiesList, isStoriesLoaded, activeChapterId, characters: story?.characters || [],
      isGenerating, isSyncingBible, generationStatus, generationThought, generationProgress, generationPreview, generationSteps, generationLogs, tokenStats, userInstruction, stopExtraPlot, setStopExtraPlot, toggleStopExtraPlot, lastRawResponse, lastIllustrationPrompt, lastIllustrationRawResponse, storyContinuePlan, setUserInstruction, setStoryContinuePlan, loadStories, generateStoryDraft, confirmStory, createStory,
      openStory, closeStory, deleteStory, updateStorySettings, selectChapter, addChapter,
      updateChapterContent, updateChapterTitle, updateChapterSceneScript, clearChapterContent, checkChapterLimit, showChapterLimitModal, setShowChapterLimitModal, chapterLimitInfo, generateContinue, generateRewrite, addCharacter, updateCharacter, deleteCharacter,
      updateWorldLore, saveProgress,
      exportStory, exportStoryEpub, importStory, getDebugPrompt, markCommentsAsRead, generateIllustrations
    }}>
      {children}
    </SachHiepContext.Provider>
  );
};

export const useSachHiep = () => {
  const context = useContext(SachHiepContext);
  console.log("useSachHiep call", { hasContext: !!context });
  return context;
};

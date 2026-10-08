import partialParse from "partial-json-parser";
import { Character, EntityRegistry, StoryContinuePlan, CanonExtractionResult } from "../../types";
import { sachHiepPromptBuilderService } from "../../narrative/prompting/sachHiepPromptAssembler";
import { AIProvider } from "./AIProviderInterface";
import { AIConfig, defaultAIConfig } from "./AIConfig";
import { autoAssignLoraToCharacters } from "../../utils/loraAutoAssign";

const THINKING_PATTERN = /<think>([\s\S]*?)<\/think>/g;

const cleanAndParseJSON = (text: string): any => {
  if (!text) return {};
  let cleanText = text.replace(THINKING_PATTERN, "").trim();
  if (cleanText.includes("```")) {
    cleanText = cleanText
      .replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1")
      .trim();
  }

  const firstBracket = cleanText.indexOf("[");
  const firstBrace = cleanText.indexOf("{");

  try {
    if (
      firstBracket !== -1 &&
      (firstBrace === -1 || firstBracket < firstBrace)
    ) {
      const lastBracket = cleanText.lastIndexOf("]");
      if (lastBracket !== -1)
        cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1) {
      const lastBrace = cleanText.lastIndexOf("}");
      if (lastBrace !== -1)
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    try {
      return partialParse(cleanText);
    } catch (pE) {
      return firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace) ? [] : {};
    }
  }
};

const stripMarkdownCodeBlock = (raw: string): string => {
  let s = raw.trim();
  if (s.startsWith("```json")) {
    s = s.slice(7).trimStart();
  } else if (s.startsWith("```")) {
    s = s.slice(3).trimStart();
  }
  if (s.endsWith("```")) {
    s = s.slice(0, -3).trimEnd();
  }
  const firstBrace = s.indexOf("{");
  if (firstBrace > 0) {
    s = s.substring(firstBrace);
  }
  return s;
};

export class SachHiepDeepSeekProvider implements AIProvider {
  private config: AIConfig;

  constructor(config?: AIConfig) {
    this.config = config || defaultAIConfig;
  }

  private getModel(): string {
    if (this.config.deepseekModel === "custom" && this.config.deepseekCustomModel) {
      return this.config.deepseekCustomModel.trim();
    }
    return this.config.deepseekModel || "deepseek-chat";
  }

  private isReasonerModel(model: string): boolean {
    return model.toLowerCase().includes("reasoner") || model.toLowerCase().includes("r1");
  }

  private getApiKey(): string {
    if (this.config.deepseekApiKeys && this.config.deepseekApiKeys.length > 0) {
      const keys = this.config.deepseekApiKeys.filter((k) => k.trim().length > 0);
      if (keys.length > 0) {
        const randomIndex = Math.floor(Math.random() * keys.length);
        return keys[randomIndex].trim();
      }
    }
    return "";
  }

  private getEndpoint(): string {
    const rawBase = (this.config.deepseekBaseUrl || "https://api.deepseek.com").trim();
    const base = rawBase.replace(/\/+$/, "");
    if (base.endsWith("/chat/completions")) {
      return base;
    }
    return `${base}/chat/completions`;
  }

  private async callDeepSeek(
    messages: { role: string; content: string }[],
    options: { jsonMode?: boolean; temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("Chưa cấu hình DeepSeek API Key trong phần Cài đặt.");
    }

    const model = this.getModel();
    const isReasoner = this.isReasonerModel(model);

    const body: any = {
      model,
      messages,
      stream: false,
      max_tokens: options.maxTokens || 8192,
    };

    if (!isReasoner) {
      body.temperature = options.temperature ?? 0.8;
      if (options.jsonMode) {
        body.response_format = { type: "json_object" };
      }
    }

    try {
      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        if (response.status === 401) {
          throw new Error("Lỗi xác thực DeepSeek API (401): Khóa API (API Key) không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra và cập nhật lại API Key trong phần Cài đặt AI.");
        }
        if (response.status === 404) {
          throw new Error(`Lỗi 404: Endpoint "${this.getEndpoint()}" không tìm thấy. Vui lòng kiểm tra lại cấu hình Base URL trong Cài đặt.`);
        }
        throw new Error(`DeepSeek API Error (${response.status}): ${errText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error(`Máy chủ trả về trang HTML thay vì JSON từ DeepSeek (Endpoint: "${this.getEndpoint()}"). Vui lòng kiểm tra lại cấu hình Base URL hoặc API Key trong Cài đặt.`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        if (data.error?.message) {
          throw new Error(`DeepSeek API Error: ${data.error.message}`);
        }
        return "";
      }
      return content;
    } catch (e: any) {
      if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError' || e?.message?.includes('NetworkError')) {
        throw new Error(`Lỗi kết nối mạng: Không thể kết nối tới DeepSeek API ("${this.getEndpoint()}"). Vui lòng kiểm tra kết nối mạng hoặc cấu hình Base URL trong Cài đặt.`);
      }
      throw e;
    }
  }

  async generateContent(prompt: string, _useAux: boolean = false): Promise<string> {
    return await this.callDeepSeek([{ role: "user", content: prompt }], { temperature: 0.7 });
  }

  private convertContentsToMessages(contents: any[], config?: any): { role: string; content: string }[] {
    const messages: { role: string; content: string }[] = [];
    if (config?.systemInstruction) {
      const sysText =
        typeof config.systemInstruction === "string"
          ? config.systemInstruction
          : config.systemInstruction?.parts?.[0]?.text || JSON.stringify(config.systemInstruction);
      messages.push({ role: "system", content: sysText });
    }
    if (Array.isArray(contents)) {
      for (const item of contents) {
        const role = item.role === "model" ? "assistant" : "user";
        const text =
          item.parts?.map((p: any) => p.text || "").join("") ||
          (typeof item === "string" ? item : "");
        if (text) messages.push({ role, content: text });
      }
    }
    return messages;
  }

  async generateRawContent(contents: any[], config?: any): Promise<string> {
    const messages = this.convertContentsToMessages(contents, config);
    return await this.callDeepSeek(messages, {
      temperature: config?.temperature ?? 0.7,
      jsonMode: config?.responseMimeType === "application/json",
    });
  }

  async *generateRawStream(contents: any[], config?: any) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("Chưa cấu hình DeepSeek API Key trong phần Cài đặt.");
    }

    const model = this.getModel();
    const isReasoner = this.isReasonerModel(model);
    const messages = this.convertContentsToMessages(contents, config);

    const body: any = {
      model,
      messages,
      stream: true,
      max_tokens: 8192,
    };

    if (!isReasoner) {
      body.temperature = config?.temperature ?? 0.9;
    }

    const response = await fetch(this.getEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => response.statusText);
      if (response.status === 401) {
        throw new Error("Lỗi xác thực DeepSeek API (401): Khóa API (API Key) không hợp lệ hoặc đã hết hạn.");
      }
      if (response.status === 404) {
        throw new Error(`Lỗi 404: Endpoint "${this.getEndpoint()}" không tồn tại. Vui lòng kiểm tra cấu hình Base URL trong Cài đặt.`);
      }
      throw new Error(`DeepSeek Stream Error (${response.status}): ${errText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error(`Máy chủ trả về trang HTML thay vì luồng dữ liệu Stream từ DeepSeek (Endpoint: "${this.getEndpoint()}"). Vui lòng kiểm tra lại cấu hình Base URL.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;
          const usageMetadata = parsed.usage
            ? { totalTokenCount: parsed.usage.total_tokens }
            : undefined;

          if (delta?.reasoning_content) {
            yield { text: "", thought: delta.reasoning_content, usageMetadata };
          }
          if (delta?.content) {
            yield { text: delta.content, usageMetadata };
          }
        } catch (err) {
          // ignore incomplete chunk
        }
      }
    }
  }

  async embedText(_text: string): Promise<number[]> {
    return [];
  }

  async extractCanonData(textChunk: string): Promise<CanonExtractionResult> {
    if (!textChunk || textChunk.length < 100) {
      return {
        rules: [],
        character_profiles: [],
        relationships: [],
        locations: [],
        factions: [],
      };
    }

    const prompt = `Phân tích đoạn văn bản thô từ tiểu thuyết gốc sau đây và trích xuất dữ liệu cốt lõi (Canon) để làm cơ sở dữ liệu cho Fanfiction (Existence Lock).
Toàn bộ nội dung phải được xuất ra bằng tiếng Việt.
Bạn chỉ được phép trả về JSON hợp lệ theo cấu trúc:
{
  "rules": ["quy tắc 1"],
  "character_profiles": [{"name": "Tên", "core": "Tính cách", "traits": []}],
  "relationships": ["tương tác 1"],
  "locations": ["địa danh 1"],
  "factions": ["môn phái 1"]
}

Văn bản gốc:
${textChunk.substring(0, 15000)}`;

    try {
      const raw = await this.callDeepSeek(
        [
          { role: "system", content: "Bạn là AI phân tích văn học. Chỉ trả về đúng định dạng JSON." },
          { role: "user", content: prompt },
        ],
        { jsonMode: true, temperature: 0.2 }
      );
      const result = cleanAndParseJSON(raw);
      return {
        rules: result.rules || [],
        character_profiles: result.character_profiles || [],
        relationships: result.relationships || [],
        locations: result.locations || [],
        factions: result.factions || [],
      };
    } catch (e) {
      console.error("DeepSeek extractCanonData failed", e);
      return {
        rules: [],
        character_profiles: [],
        relationships: [],
        locations: [],
        factions: [],
      };
    }
  }

  async extractCharacters(text: string, pronounStyle: string): Promise<Character[]> {
    const systemInstruction = sachHiepPromptBuilderService.buildExtractionSystemInstruction(pronounStyle);
    const prompt = `Phân tích văn bản và trích xuất danh sách JSON các nhân vật quan trọng bằng tiếng Việt.
Trả về định dạng JSON:
{
  "characters": [
    {
      "name": "Tên",
      "role": "Vai trò",
      "description": "Tiểu sử, quá khứ, động lực",
      "appearance": { "general": "", "face": "", "body": "", "hair": "", "clothing": "" },
      "core_personality": "Tính cách cốt lõi",
      "personality": "Biểu hiện bên ngoài",
      "character_type": "male_lead | female_young_lead | female_mature_lead | npc",
      "traits": [],
      "status": "",
      "voiceSample": ""
    }
  ]
}

Văn bản cần phân tích:
${text}`;

    try {
      const raw = await this.callDeepSeek(
        [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        { jsonMode: true, temperature: 0.3 }
      );
      const parsed = cleanAndParseJSON(raw);
      const list = parsed.characters || (Array.isArray(parsed) ? parsed : []);
      if (!Array.isArray(list)) return [];

      const characters = list.map((c: any, index: number) => ({
        ...c,
        id: `char_${Date.now()}_${index}`,
        traits: c.traits || [],
      }));

      return autoAssignLoraToCharacters(characters) as Character[];
    } catch (e) {
      console.error("DeepSeek extractCharacters failed", e);
      return [];
    }
  }

  async ingestFanficData(fandomName: string, url: string): Promise<{ setting: string; characters: Character[] }> {
    let prompt = `Nghiên cứu Fandom/Series "${fandomName}"`;
    if (url && url.length > 5) {
      prompt += ` (Nguồn tham khảo: "${url}")`;
    }
    prompt += `.
Nhiệm vụ: Tóm tắt chi tiết thế giới, hệ thống sức mạnh và truyền thuyết vào trường "setting" (bằng tiếng Việt). Trích xuất các nhân vật chính vào mảng "characters".
Chỉ trả về JSON:
{
  "setting": "Mô tả chi tiết thế giới...",
  "characters": [
    {
      "name": "Tên",
      "role": "Vai trò",
      "description": "Mô tả",
      "character_type": "male_lead | female_young_lead | female_mature_lead | npc",
      "core_personality": "Tính cách",
      "traits": []
    }
  ]
}`;

    try {
      const raw = await this.callDeepSeek(
        [
          { role: "system", content: "Bạn là chuyên gia phân tích Fandom. Chỉ trả về JSON bằng tiếng Việt." },
          { role: "user", content: prompt },
        ],
        { jsonMode: true, temperature: 0.3 }
      );
      const data = cleanAndParseJSON(raw);
      const characters = Array.isArray(data.characters)
        ? data.characters.map((c: any, index: number) => ({
            ...c,
            id: `char_fanfic_${Date.now()}_${index}`,
            traits: c.traits || [],
            appearance: c.appearance || {
              general: "Không rõ",
              face: "",
              body: "",
              hair: "",
              clothing: "",
            },
            core_personality: c.core_personality || "Không rõ",
            personality: c.core_personality || "",
          }))
        : [];

      return {
        setting: data.setting || "",
        characters,
      };
    } catch (e) {
      console.error("DeepSeek ingestFanficData failed", e);
      return { setting: "", characters: [] };
    }
  }

  async summarize(text: string, pronounStyle: string): Promise<string> {
    const systemInstruction = sachHiepPromptBuilderService.buildSummarySystemInstruction(pronounStyle);
    const prompt = `Hãy đọc văn bản sau và tạo bản tóm tắt nén cho AI bằng tiếng Việt, tuân thủ đúng hệ thống xưng hô.\n\nVăn bản:\n${text}`;
    try {
      return await this.callDeepSeek(
        [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
        { temperature: 0.3 }
      );
    } catch (e) {
      console.error("DeepSeek summarize failed", e);
      return "";
    }
  }

  async generateStoryBible(
    formData: any,
    sourceText?: string
  ): Promise<import("../../types").StoryBible> {
    let prompt = `Vui lòng đọc thông tin sau và gửi lại một "Story Bible" dưới định dạng JSON. Toàn bộ nội dung phải được viết bằng tiếng Việt.

[Thông tin đầu vào]
Tiêu đề: ${formData.title}
Thể loại: ${formData.genre}
Dàn ý/Nguồn cảm hứng: ${formData.synopsis}
Bối cảnh: ${formData.setting}
${formData.initialCharacters ? `\n[Danh sách Nhân vật & Mối quan hệ do người dùng thiết lập (BẮT BUỘC GIỮ NGUYÊN VÀ ĐƯA ĐẦY ĐỦ VÀO MẢNG chars)]:\n${formData.initialCharacters}\n` : ""}`;

    if (sourceText) {
      prompt += `\n[Trích đoạn gốc]\n${sourceText.substring(0, 25000)}\n`;
    }

    prompt += `
Vui lòng trích xuất và tích hợp thông tin trên, trả về một đối tượng JSON duy nhất chứa các trường sau:
{
  "chars": [
    {
      "name": "Tên nhân vật",
      "role": "Vai trò (ví dụ: nam chính/nữ chính/phản diện)",
      "core": "Mô tả ngắn gọn về tính cách/đặc điểm cốt lõi",
      "character_type": "male_lead | female_young_lead | female_mature_lead | npc"
    }
  ],
  "world": "Mô tả về thế giới trong truyện",
  "rules": "Mô tả về các quy tắc hoặc điều cấm kỵ cốt lõi",
  "arc": "Mô tả về mục tiêu hoặc trạng thái của chương truyện hiện tại",
  "chapter_cores": []
}`;

    try {
      const raw = await this.callDeepSeek(
        [
          { role: "system", content: "Bạn là kiến trúc sư tiểu thuyết. Chỉ xuất ra đối tượng JSON hợp lệ bằng tiếng Việt." },
          { role: "user", content: prompt },
        ],
        { jsonMode: true, temperature: 0.5 }
      );
      const parsed = cleanAndParseJSON(raw);
      return {
        chars: Array.isArray(parsed.chars) ? parsed.chars : [],
        world: parsed.world || formData.setting || "Thế giới Sắc Hiệp",
        rules: parsed.rules || "Tuân thủ quy tắc thế giới.",
        arc: parsed.arc || formData.synopsis || "Khởi đầu hành trình.",
        chapter_cores: Array.isArray(parsed.chapter_cores) ? parsed.chapter_cores : [],
      };
    } catch (e) {
      console.error("DeepSeek generateStoryBible failed", e);
      throw e;
    }
  }

  async updateStoryBible(chapterContent: string): Promise<{
    chapter_core: string;
    new_chars?: import("../../types").StoryBibleChar[];
    arc_update?: string;
  }> {
    const prompt = `Hãy đọc lại chương vừa viết xong. Trả về dưới dạng JSON bằng tiếng Việt:
{
  "chapter_core": "Tóm tắt các sự kiện chính của chương này trong một câu",
  "new_chars": [
    { "name": "Tên", "role": "Vai trò", "core": "Đặc điểm cốt lõi" }
  ],
  "arc_update": "Thông tin cập nhật ngắn gọn về tình trạng hiện tại của mạch truyện (để trống nếu không có thay đổi lớn)"
}

【Nội dung chương】
${chapterContent}`;

    try {
      const raw = await this.callDeepSeek(
        [
          { role: "system", content: "Bạn là trợ lý đồng bộ cốt truyện. Chỉ trả về JSON hợp lệ." },
          { role: "user", content: prompt },
        ],
        { jsonMode: true, temperature: 0.2 }
      );
      const parsed = cleanAndParseJSON(raw);
      if (parsed.new_chars && Array.isArray(parsed.new_chars)) {
        parsed.new_chars = autoAssignLoraToCharacters(parsed.new_chars);
      }
      return {
        chapter_core: parsed.chapter_core || "",
        new_chars: parsed.new_chars,
        arc_update: parsed.arc_update,
      };
    } catch (e) {
      console.error("DeepSeek updateStoryBible failed", e);
      return { chapter_core: "" };
    }
  }

  async *generateSachHiepStoryStream(
    recentContext: string,
    oldCores: string,
    charSnippet: string,
    storyBible: import("../../types").StoryBible,
    genre: string,
    writingStyle: string,
    pov: string,
    pronounStyle: string,
    negativePrompt: string,
    nsfw: boolean,
    userInstruction: string,
    currentChapterTitle: string,
    modelName?: string
  ): AsyncGenerator<{
    text: string;
    thought?: string;
    usageMetadata: any;
    storyContinuePlan?: StoryContinuePlan;
    raw?: string;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("Chưa cấu hình DeepSeek API Key trong phần Cài đặt.");
    }

    const activeModel = modelName || this.getModel();
    const isReasoner = this.isReasonerModel(activeModel);

    const systemInstruction = sachHiepPromptBuilderService.buildSystemInstruction(
      genre,
      storyBible.world,
      pov,
      pronounStyle,
      writingStyle,
      negativePrompt,
      nsfw
    );

    const prompt = sachHiepPromptBuilderService.buildContinuePrompt(
      recentContext,
      oldCores,
      storyBible.world,
      charSnippet,
      storyBible.arc,
      [],
      [],
      userInstruction,
      pronounStyle,
      currentChapterTitle,
      activeModel
    );

    const body: any = {
      model: activeModel,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      stream: true,
      max_tokens: 8192,
    };

    if (!isReasoner) {
      body.temperature = 0.9;
      body.top_p = 0.95;
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(this.getEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => response.statusText);
      if (response.status === 401) {
        throw new Error("Lỗi xác thực DeepSeek API (401): Khóa API (API Key) không hợp lệ hoặc đã hết hạn.");
      }
      if (response.status === 404) {
        throw new Error(`Lỗi 404: Endpoint "${this.getEndpoint()}" không tồn tại. Vui lòng kiểm tra cấu hình Base URL trong Cài đặt.`);
      }
      throw new Error(`DeepSeek API Error (${response.status}): ${errText}`);
    }

    const draftContentType = response.headers.get("content-type") || "";
    if (draftContentType.includes("text/html")) {
      throw new Error(`Máy chủ trả về trang HTML thay vì luồng dữ liệu Stream từ DeepSeek (Endpoint: "${this.getEndpoint()}"). Vui lòng kiểm tra lại cấu hình Base URL.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullRawText = "";
    let lastStoryContent = "";
    let lastThoughtProcess = "";
    let lastUsage: any = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;
          if (parsed.usage?.total_tokens) {
            lastUsage = { totalTokenCount: parsed.usage.total_tokens };
          }

          if (delta?.reasoning_content) {
            yield {
              text: "",
              thought: delta.reasoning_content,
              usageMetadata: lastUsage,
              raw: fullRawText,
            };
          }

          if (delta?.content) {
            fullRawText += delta.content;
            const cleanedForParse = stripMarkdownCodeBlock(fullRawText);

            if (cleanedForParse.startsWith("{")) {
              try {
                const partial = partialParse(cleanedForParse);

                const p1_thought = partial.part1?.thought_process || "";
                const p2_thought = partial.part2?.thought_process || "";
                const p3_thought = partial.part3?.thought_process || "";
                const currentThought =
                  p1_thought +
                  (p2_thought ? "\n" + p2_thought : "") +
                  (p3_thought ? "\n" + p3_thought : "");

                if (currentThought.length > lastThoughtProcess.length) {
                  const thoughtDelta = currentThought.substring(lastThoughtProcess.length);
                  yield {
                    text: "",
                    thought: thoughtDelta,
                    usageMetadata: lastUsage,
                    raw: fullRawText,
                  };
                  lastThoughtProcess = currentThought;
                }

                const p1_content = partial.part1?.part_story_content || "";
                const p2_content = partial.part2?.part_story_content || "";
                const p3_content = partial.part3?.part_story_content || "";
                const currentStoryContent =
                  p1_content +
                  (p2_content ? "\n\n" + p2_content : "") +
                  (p3_content ? "\n\n" + p3_content : "");

                if (currentStoryContent.length > lastStoryContent.length) {
                  const contentDelta = currentStoryContent.substring(lastStoryContent.length);
                  yield {
                    text: contentDelta,
                    usageMetadata: lastUsage,
                    raw: fullRawText,
                  };
                  lastStoryContent = currentStoryContent;
                }
              } catch (e) {
                // Ignore partial JSON parse errors mid-stream
              }
            }
          }
        } catch (err) {
          // Ignore malformed SSE line
        }
      }
    }

    // Final parse pass
    try {
      const finalData = cleanAndParseJSON(fullRawText);
      if (finalData) {
        const p1_content = finalData.part1?.part_story_content || "";
        const p2_content = finalData.part2?.part_story_content || "";
        const p3_content = finalData.part3?.part_story_content || "";
        const fullStoryContent =
          p1_content +
          (p2_content ? "\n\n" + p2_content : "") +
          (p3_content ? "\n\n" + p3_content : "");

        if (fullStoryContent.length > lastStoryContent.length) {
          yield {
            text: fullStoryContent.substring(lastStoryContent.length),
            usageMetadata: lastUsage,
            raw: fullRawText,
          };
        }

        if (finalData.story_continue_plan) {
          yield {
            text: "",
            usageMetadata: lastUsage,
            storyContinuePlan: finalData.story_continue_plan,
            raw: fullRawText,
          };
        }
      }
    } catch (e) {
      console.error("DeepSeek final JSON parse failed", e);
    }
  }

  async *generateStoryStream(
    immediateContext: string,
    rollingSummaries: string,
    worldBible: string,
    augmentedContext: string,
    synopsis: string,
    characters: Character[],
    worldLore: string[],
    genre: string,
    writingStyle: string,
    pov: string,
    pronounStyle: string,
    negativePrompt: string,
    nsfw: boolean,
    userInstruction: string,
    _sourceUrl: string | undefined,
    _entityRegistry: EntityRegistry | undefined,
    currentChapterTitle: string
  ) {
    yield* this.generateSachHiepStoryStream(
      immediateContext,
      rollingSummaries,
      augmentedContext,
      { chars: [], world: worldBible, rules: "", arc: synopsis, chapter_cores: [] },
      genre,
      writingStyle,
      pov,
      pronounStyle,
      negativePrompt,
      nsfw,
      userInstruction,
      currentChapterTitle
    );
  }

  async *rewriteContentStream(
    originalText: string,
    instruction: string,
    contextData: {
      worldBible: string;
      synopsis: string;
      characters: Character[];
      worldLore: string[];
      genre: string;
      writingStyle: string;
      pov: string;
      pronounStyle: string;
      negativePrompt: string;
      nsfw: boolean;
      sourceUrl?: string;
      entityRegistry?: EntityRegistry;
    }
  ): AsyncGenerator<{
    text: string;
    thought?: string;
    usageMetadata: any;
    storyContinuePlan?: any;
    raw?: string;
  }> {
    const prompt = sachHiepPromptBuilderService.buildRewritePrompt(
      originalText,
      instruction,
      contextData.characters,
      contextData.worldLore,
      contextData.worldBible,
      contextData.synopsis,
      contextData.pronounStyle
    );

    const systemInstruction = sachHiepPromptBuilderService.buildSystemInstruction(
      contextData.genre,
      contextData.worldBible,
      contextData.pov,
      contextData.pronounStyle,
      contextData.writingStyle,
      contextData.negativePrompt,
      contextData.nsfw,
      contextData.sourceUrl,
      contextData.entityRegistry
    );

    let fullRaw = "";
    for await (const chunk of this.generateRawStream(
      [{ role: "user", parts: [{ text: prompt }] }],
      { systemInstruction, temperature: 0.7 }
    )) {
      if (chunk.text) fullRaw += chunk.text;
      yield {
        text: chunk.text || "",
        thought: chunk.thought,
        usageMetadata: chunk.usageMetadata || {},
        raw: fullRaw,
      };
    }
  }
}

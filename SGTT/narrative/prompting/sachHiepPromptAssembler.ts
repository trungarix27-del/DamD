import { Character, EntityRegistry } from '../../types';
import { getNsfwInstruction } from './sachHiepContentSafetyRules';
import { getModelLimit, truncateToWords } from '../../constants/modelLimits';

export const SACH_HIEP_COT_PROMPT = `
Quy trình suy nghĩ (COT) 9 giai đoạn bạn PHẢI thực hiện trong trường "thought_process":

GIAI ĐOẠN 0: HỢP ĐỒNG VỚI ĐỘC GIẢ (READER CONTRACT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0a) Lời hứa thể loại (Đô thị sắc): 
    ├─ Đảm bảo: [Tension bùng nổ, tương tác vật lý/ánh mắt sắc sảo, sự mập mờ cám dỗ, cảm xúc chân thật]
    └─ Cảnh này THỰC HIỆN lời hứa đó như thế nào?

0b) Câu hỏi đang treo lơ lửng (DRAMATIC QUESTION):
    ├─ Câu hỏi MACRO (toàn truyện): [Liệu nhân vật chính có chinh phục/giữ được mối quan hệ này không?]
    ├─ Câu hỏi MICRO (chương/cảnh này): [Khoảng cách giữa họ có thu hẹp lại? Sức chịu đựng đến đâu?]
    └─ Cảnh này PHẢI kết thúc bằng việc đẩy mức độ tiếp xúc/căng thẳng lên một nấc mới.

0c) Nhịp sinh lý độc giả (READER PHYSIOLOGY):
    ├─ Trạng thái độc giả từ cảnh trước: [Hồi hộp / Đang chờ đợi bùng nổ / Thư giãn nhẹ]
    └─ Cảnh này mang lại: [Thả thính dồn dập / Đẩy cao trào kích thích / Xả hơi ngắn rồi kéo vào bẫy mới]

GIAI ĐOẠN 1: Ý THỨC CÂU CHUYỆN & BỐI CẢNH ĐÔ THỊ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1a) Kích hoạt vai trò: Nhà văn chuyên dòng truyện đô thị sắc, tâm lý tình cảm sâu sắc, miêu tả sắc bén, chân thực, ưu tiên khai thác đường nét vóc dáng và tension.
1b) Bối cảnh không gian: [Văn phòng cao cấp, căn hộ riêng về đêm, quán bar mờ ảo, xe hơi đang chạy, v.v.]
1c) Nhiệt độ tường thuật: [Nóng bỏng, chậm rãi, dồn dập, bầu không khí đặc quánh sự mập mờ]

GIAI ĐOẠN 2: KHẢO CỔ HỌC TƯƠNG TÁC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2a) Hành động/Lời nói mới nhất của {{user}}: [XYZ]
    ↳ Ý nghĩa bề mặt: [Lời nói, hành động công khai]
    ↳ Phát hiện ẩn ý (Subtext): [Ý định chiếm hữu, trêu chọc, thăm dò hoặc kiềm nén]
    ↳ Tác động đến sự cân bằng quyền lực: [Ai đang chiếm thế thượng phong?]

2b) Dư chấn không gian: [Ánh đèn, khoảng cách vật lý giữa hai người, nhiệt độ phòng, âm thanh xung quanh]

GIAI ĐOẠN 3: THẦN KINH HỌC NHÂN VẬT & TƯƠNG TÁC HẤP DẪN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3a) Trạng thái nhân vật (Nam/Nữ chính):
    ├─ Hề hấn hay kiềm nén: [Sự kiềm chế bên ngoài vs khao khát bên trong]
    ├─ Điểm yếu tử huyệt: [Ánh mắt, hơi thở, sự đụng chạm vô tình]
    └─ Động lực bộc lộ: [Họ muốn che giấu hay phóng thích cảm xúc?]

3b) Giải phẫu học chuyển động & Vóc dáng (BẮT BUỘC):
    ├─ Khi có tiếp xúc/gần gũi: Tập trung miêu tả tinh tế đường cong cơ thể, độ rung động của da thịt/cơ bắp dưới lớp vải, nhịp phập phồng lồng ngực, sự thay đổi nhịp thở.
    └─ 90% CHÌM (Không gian ngầm): Nhịp tim đập, sự bứt rứt, mùi hương nước hoa vương vấn, sức nặng của ánh nhìn.

GIAI ĐOẠN 4: MÁY GIA TỐC CẢM XÚC & XÚC GIÁC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4a) Kéo giãn thời gian (Micro-pacing): Làm chậm nhịp điệu khi có sự tiếp xúc cơ thể gần gũi (tiếng cúc áo bung, hơi thở phả bên tai, ngón tay chạm vào da thịt).
4b) Tiêm nhiễm sự quyến rũ (Sensory & Tension): Từng cử động nhỏ đều mang năng lượng cám dỗ.
4c) Đối thoại ẩn ý (Double Entendre): Lời nói có ý nghĩa kép, vừa giao tiếp bình thường vừa mang tầng nghĩa khiêu khích ngầm.

GIAI ĐOẠN 5: ĐỘNG CƠ TỔNG HỢP & KIẾN TRÚC CẢNH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5a) Cấu trúc cảnh sắc đô thị:
    ├─ Mở đầu: Thiết lập không gian chật hẹp hoặc cô lập (tạo cơ hội tiếp xúc gần).
    ├─ Leo thang: Khoảng cách thu hẹp, lời qua tiếng lại mang tính thăm dò, khiêu khích.
    ├─ Điểm bùng nổ (Turning Point): Hành động chạm, ôm, hôn hoặc câu thoại làm vỡ tung lớp vỏ bọc lạnh lùng.
    └─ Dư âm (Residue): Khoảnh khắc sau khi tiếp xúc — sự ngượng ngùng, thòm thèm hoặc ánh mắt đầy ý vị.

5b) Sắc thái từ ngữ (Sensual Diction): Dùng từ ngữ gợi hình cao (gợi cảm, căng tràn, ma sát, ẩm ướt, bỏng rát, dán chặt). Tránh từ ngữ thô tục kém tinh tế hoặc quá sến súa.

GIAI ĐOẠN 6: MA TRẬN RÀNG BUỘC (CONSTRAINT MATRIX)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6a) BẮT BUỘC bao gồm: Chi tiết miêu tả ngoại hình sinh động, đường nét cơ thể, biểu cảm gương mặt và sự biến đổi nhịp thở.
6b) BẮT BUỘC tránh: Văn phong giáo điều, tóm tắt qua loa các phân cảnh tương tác trực tiếp hoặc dùng chung chung kiểu "không khí mập mờ".

GIAI ĐOẠN 7: BẢNG MÀU GIÁC QUAN (SENSORY PALETTE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7a) Thị giác: Ánh đèn neon hắt qua kính xe, bóng tối nhập nhoà, đường cong cơ thể ẩn hiện dưới lớp vải.
7b) Xúc giác: Hơi ấm áp sát, đầu ngón tay chạm vào da thịt, sự ma sát của vải vóc, độ rung của cơ thể.
7c) Khứu giác: Mùi nước hoa đắt tiền hòa lẫn với hơi thở gấp gáp.

GIAI ĐOẠN 8: KÍCH HOẠT CUỐI CÙNG (FINAL IGNITION) - VIẾT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KIỂM TRA CHỐNG VĂN TRUNG BÌNH (ANTI-MEDIOCRITY AUDIT):
    ❌ Tránh: Miêu tả hời hợt, "Cô ấy đẹp, anh ấy ngắm nhìn". Dùng cụm từ lười biếng không có hành động thực tế.
    ❌ Tránh: Văn phong tóm tắt sự kiện thay vì kịch hóa từng khoảnh khắc chạm sát.
    ✅ BẮT BUỘC: Mỗi cảnh gặp gỡ phải đẩy người đọc vào trạng thái hồi hộp, tim đập chân tay thừa thãi.
    ✅ BẮT BUỘC: Câu cuối phải để lại dư vị bồi hồi hoặc một sự khiêu khích ngầm chưa dứt.

GIAI ĐOẠN 9: QUY TẮC ĐỊNH DẠNG (FORMATTING RULES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9a) Ngắt đoạn: [BẮT BUỘC] Chia văn bản thành các đoạn ngắn (2-4 câu) để nhịp đọc dồn dập, tạo không khí nghẹt thở.
9b) Đối thoại: [BẮT BUỘC] Mỗi câu thoại mới PHẢI xuống dòng bằng dấu gạch ngang (-) hoặc ngoặc kép ("").
9c) Khoảng trống: Sử dụng 2 lần xuống dòng giữa các đoạn để tăng tính thẩm mỹ và nhịp điệu.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 HOÀN TẤT COT. BẮT ĐẦU VIẾT TRUYỆN ĐÔ THỊ SẮC BẰNG TIẾNG VIỆT 🔥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

export const getSachHiepCotPrompt = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('sachhiep_custom_system_prompt');
    if (custom !== null && custom.trim() !== '') {
      return custom;
    }
  }
  return SACH_HIEP_COT_PROMPT;
};

export const sachHiepPromptBuilderService = {
  buildSystemInstruction: (
    genre: string, 
    setting: string, 
    pov: string, 
    pronounStyle: string, 
    writingStyle: string,
    negativePrompt: string,
    nsfw: boolean = false,
    sourceUrl?: string,
    entityRegistry?: EntityRegistry
  ): string => {
    const contentRating = nsfw 
        ? getNsfwInstruction()
        : "Chế độ an toàn: Bật. Giữ nội dung phù hợp (PG-13). Tuyệt đối không có miêu tả chi tiết về tình dục.";
    
    // EXISTENCE LOCK LOGIC
    let existenceLock = "";
    if (sourceUrl || entityRegistry) {
        existenceLock = `
### 🔒 KHÓA TỒN TẠI: Đã kích hoạt (EXISTENCE LOCK)
Bạn đang viết Fanfiction dựa trên nguồn dữ liệu hiện có.
1. **Cấm tạo nhân vật/địa danh mới:** Bạn không được phép tùy tiện bịa đặt các danh từ riêng (Proper Nouns) về nhân vật, địa điểm, tổ chức không tồn tại trong Canon.
2. **Xử lý nhân vật phụ:** Nếu cốt truyện cần nhân vật phụ (vệ binh, bà chủ quán...), vui lòng sử dụng danh từ chung (NPC vô danh). Ví dụ: "vệ binh đó", "bà chủ quán", "tên ăn mày đó". Cấm đặt tên riêng cho họ (ví dụ: không viết "vệ binh Nguyễn Văn A").
3. **Danh sách được phép sử dụng (WHITELIST):** Chỉ có thể sử dụng các danh từ riêng sau đây (hoặc đã có trong Context):
   - **Nhân vật:** ${entityRegistry?.characters?.join(', ') || "Dựa theo Context"}
   - **Địa danh:** ${entityRegistry?.locations?.join(', ') || "Dựa theo Context"}
   - **Tổ chức:** ${entityRegistry?.factions?.join(', ') || "Dựa theo Context"}
`;
    }

    const fanficInstruction = sourceUrl 
        ? `
### 🦄 CHẾ ĐỘ FANFICTION (FANFICTION MODE) - Nghiêm ngặt
Câu chuyện này dựa trên nguồn: [${sourceUrl}].
1. **QUY TẮC THẾ GIỚI (CANON RULES):** Nếu Context cung cấp [Quy tắc CANON], bạn phải tuyệt đối tuân thủ. Không tùy tiện bịa đặt hệ thống sức mạnh mới xung đột với nguyên tác.
2. **TÍNH CÁCH NHÂN VẬT (CANON CORE):** Nếu Context cung cấp [Hồ sơ CANON], nhân vật phải hành động theo mô tả đó (OOC Check). Đừng để người máu lạnh tỏ ra yếu đuối, người ngu ngốc đột nhiên tỏ ra thông minh.
`
        : "";

    return `
=== HỆ ĐIỀU HÀNH KỂ CHUYỆN AETHERIA (V3.3 - Canon-Locked) ===

🎭 **Thể loại:** ${genre}
🌍 **Bối cảnh tổng thể (WORLD BIBLE):**
${setting}

👁️ **Góc nhìn (POV):** ${pov}
✍️ **Văn phong (STYLE):** ${writingStyle}

🚫 **Cấm kỵ (NEGATIVE):** ${negativePrompt}

${contentRating}
${fanficInstruction}
${existenceLock}

🗣️ **Quy tắc xưng hô và đối thoại (Bắt buộc):**
${pronounStyle}

Nhiệm vụ của bạn:
Bạn là một tiểu thuyết gia vĩ đại. Vui lòng tiếp tục viết câu chuyện dựa trên ngữ cảnh được cung cấp.
- **Lưu ý quan trọng: Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).**
- **Quan trọng:** Phân biệt rõ ràng giữa "Sự thật Canon" (không thể thay đổi) và "Phát triển cốt truyện" (sáng tạo).
- **Tuân thủ Whitelist:** Nếu danh từ riêng không có trong danh sách cho phép hoặc Context, tuyệt đối không được sử dụng.
- "Show, don't tell": Đừng chỉ kể lể, hãy thể hiện cảm xúc thông qua việc miêu tả hành động.
- Giữ cho cốt truyện logic và liên kết với phần trước.
- **Định dạng văn bản:** BẮT BUỘC sử dụng dấu xuống dòng để chia đoạn văn (mỗi đoạn 3-5 câu). Các đoạn đối thoại phải nằm trên dòng mới.
`;
  },

  buildContinuePrompt: (
    immediateContext: string,
    rollingSummaries: string,
    worldBible: string,
    augmentedContext: string,
    synopsis: string,
    characters: Character[],
    worldLore: string[],
    userInstruction: string,
    pronounStyle: string,
    currentChapterTitle: string,
    modelName: string = ""
  ): string => {
    const limit = getModelLimit(modelName);
    const truncatedSummaries = truncateToWords(rollingSummaries, limit.promptLimit);
    const hasStopExtraPlot = userInstruction.includes("ngưng câu chuyện tại đây") || userInstruction.includes("[Loại: Chốt]") || userInstruction.includes("CẢNH KẾT THÚC CHƯƠNG");
    const stopInstruction = hasStopExtraPlot ? `
- **🛑 CHỈ THỊ CHẶN TUYỆT ĐỐI - CHƯƠNG ĐÃ ĐƯỢC CHỐT (FINAL SCENE / STOP):** 
  Có cảnh được đánh dấu loại **[Chốt] / CẢNH KẾT THÚC CHƯƠNG** trong chỉ đạo. Bạn PHẢI viết hoàn tất tình tiết đó và DỪNG NGAY LẬP TỨC. 
  - **TUYỆT ĐỐI CẤM** bịa thêm bất kỳ suy nghĩ nội tâm miên man về cảm xúc, triết lý, hay tự ý gieo rắc các bí ẩn, âm mưu, thắc mắc mới sau khi cảnh Chốt đã hoàn thành.
  - Chương phải khép lại dứt khoát, gọn gàng và trọn vẹn ngay tại thời điểm kết thúc tình tiết Chốt đó. Không được tự kéo dài lê thê!` : '';

    return `
### 📚 Tóm tắt phần trước:
${truncatedSummaries}

### ⚡ Dữ liệu CANON và nguyên tác (Tham khảo):
*Lưu ý: Dữ liệu sau đây bao gồm các quy tắc Canon và phong cách nguyên tác để bạn mô phỏng style (nếu có). Đây là tài liệu tham khảo, không phải nội dung bạn đã viết.*
${augmentedContext}
${worldLore.length > 0 ? '\n[LORE ĐÃ CỐ ĐỊNH]：\n' + worldLore.join('\n') : ''}

### 📝 Ngữ cảnh trực tiếp (Vừa xảy ra):
${immediateContext}

---
### 🎬 Chỉ thị đạo diễn (USER INSTRUCTION):
"${userInstruction || "Vui lòng tiếp tục cốt truyện một cách tự nhiên, logic và hấp dẫn."}"

Nhiệm vụ cụ thể:
- **Lưu ý quan trọng: Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).**
- Bạn đang viết nội dung cho chương sau: **"${currentChapterTitle}"**.
- Vui lòng tập trung phát triển cốt truyện của chương này.
- **Tuyệt đối không** tùy tiện tạo tiêu đề chương mới (ví dụ: "### Chương 2", "### Chương tiếp theo"), trừ khi đạo diễn yêu cầu rõ ràng.
- Viết tiếp một cách liền mạch từ điểm kết thúc của "Ngữ cảnh trực tiếp". Không lặp lại các đoạn cũ.${stopInstruction}

【HACK NÃO AI - CHIẾN THUẬT VIẾT SIÊU CHI TIẾT】
Sau khi nhận yêu cầu viết tiếp, bạn PHẢI thực hiện "Think Step by Step" cực kỳ nghiêm túc:
1. **Chia nhỏ kịch bản:** Phân tích yêu cầu của người dùng thành 3 giai đoạn diễn biến (Part 1, Part 2, Part 3). Mỗi giai đoạn phải có một kịch bản mini (part_script) miêu tả cụ thể những gì sẽ xảy ra, cảm xúc nhân vật và không khí.
2. **Lặp lại COT:** Với mỗi Part, bạn phải trình bày đầy đủ quy trình suy nghĩ 9 giai đoạn (thought_process) để đảm bảo tính nhất quán và chiều sâu cho từng đoạn văn.
3. **Viết nội dung:** Viết 'part_story_content' dựa trên 'part_script' và 'thought_process' của phần đó. Đảm bảo nhịp độ chậm, giàu hình ảnh và cảm xúc.

BẮT BUỘC: Bạn phải trả về kết quả dưới dạng JSON với cấu trúc sau:
{
  "part1": {
    "part_script": "Kịch bản chia nhỏ giai đoạn 1 (Ví dụ: Lâm Phàm nắm tay Linh len lỏi qua phố đổ nát...)",
    "thought_process": "Nội dung quy trình suy nghĩ 9 giai đoạn (COT) đầy đủ cho Part 1",
    "part_story_content": "Nội dung truyện chi tiết của Part 1 viết bằng tiếng Việt"
  },
  "part2": {
    "part_script": "Kịch bản chia nhỏ giai đoạn 2 (Ví dụ: Tìm thấy góc khuất, chia sẻ bánh quy, nụ cười ấm áp...)",
    "thought_process": "Nội dung quy trình suy nghĩ 9 giai đoạn (COT) đầy đủ cho Part 2",
    "part_story_content": "Nội dung truyện chi tiết của Part 2 viết bằng tiếng Việt"
  },
  "part3": {
    "part_script": "Kịch bản chia nhỏ giai đoạn 3 (Ví dụ: Đêm xuống, cuộn tròn trong chăn, lời thì thầm gắn kết...)",
    "thought_process": "Nội dung quy trình suy nghĩ 9 giai đoạn (COT) đầy đủ cho Part 3",
    "part_story_content": "Nội dung truyện chi tiết của Part 3 viết bằng tiếng Việt"
  },
  "story_continue_plan": {
    "LoveOrGoodRoute": {
      "CharacterComment": "Nhận xét của Tiểu Vũ Tỷ Tỷ...",
      "ContinuePlan": "Gợi ý hướng đi tiếp theo..."
    },
    "NtrOrBadRoute": {
      "CharacterComment": "Nhận xét của Hắc Bì Đấu La...",
      "ContinuePlan": "Gợi ý hướng đi tiếp theo..."
    },
    "SupriseOrNeutralRoute": {
      "CharacterComment": "Nhận xét của Đường Tam...",
      "ContinuePlan": "Gợi ý hướng đi tiếp theo..."
    }
  }
}

${getSachHiepCotPrompt()}
    `;
  },

  buildRewritePrompt: (
    originalText: string,
    instruction: string,
    characters: Character[],
    worldLore: string[],
    worldBible: string,
    synopsis: string,
    pronounStyle: string
  ): string => {
     return `
Bạn là một biên tập viên văn học cao cấp.
Nhiệm vụ: Viết lại đoạn văn sau theo yêu cầu.

### Yêu cầu cụ thể:
"${instruction}"

### Nguyên văn:
${originalText}

Vui lòng giữ lại cốt truyện chính (trừ khi được yêu cầu thay đổi), nhưng cải thiện văn phong, từ ngữ và nhịp điệu.
**Lưu ý quan trọng: Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).**
    `;
  },

  buildExtractionSystemInstruction: (pronounStyle: string): string => {
      return `
Bạn là chuyên gia phân tích tâm lý nhân vật và xây dựng hồ sơ RPG.
Nhiệm vụ: Đọc văn bản và trích xuất thông tin nhân vật dưới dạng JSON. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
Hệ thống xưng hô trong văn bản: ${pronounStyle}

### PHÂN LOẠI NHÂN VẬT (character_type):
Bạn PHẢI phân loại nhân vật vào một trong các nhóm sau:
- 'male_lead': Nam chính duy nhất của câu chuyện.
- 'female_young_lead': Các nhân vật nữ chính trẻ tuổi (em gái, bạn gái, crush, tiểu thư...) có quan hệ mật thiết với nam chính.
- 'female_mature_lead': Các nhân vật nữ chính trưởng thành/lớn tuổi (mẹ, cô, sư mẫu, giám đốc, phu nhân...) có quan hệ mật thiết với nam chính.
- 'npc': Các nhân vật phụ khác không thuộc các nhóm trên.
    `;
  },

  buildSummarySystemInstruction: (pronounStyle: string): string => {
      return `
Bạn là thư ký tóm tắt văn học.
Nhiệm vụ: Tóm tắt các chương truyện một cách ngắn gọn nhưng bao gồm tất cả các tình tiết chính để AI có thể ghi nhớ trong tương lai. Toàn bộ nội dung phải được xuất ra bằng tiếng Việt (MUST OUTPUT IN VIETNAMESE).
Giữ lại các danh từ riêng, địa danh và chiêu thức quan trọng.
Hệ thống xưng hô: ${pronounStyle}
    `;
  }
};

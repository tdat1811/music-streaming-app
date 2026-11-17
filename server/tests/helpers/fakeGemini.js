// Gemini giả lập cho kiểm thử (giai đoạn 6): không gọi mạng, không tốn tiền, luôn cho cùng kết quả.
// Trả JSON đúng khuôn INSIGHT_SCHEMA, dựng từ chính prompt (đếm bình luận, lấy songId trong <stats>).
// mode: 'ok' | 'error' (lỗi 500) | 'quota' (lỗi 429) | 'invalid' (JSON sai khuôn) | 'blocked' (bị chặn)
//       | 'primary_down' (model chính quá tải 503, model dự phòng chạy bình thường)
//       | 'lite_down' (model dự phòng quá tải 503) | 'busy' (mọi model quá tải 503)
// Giai đoạn 6b: khuôn chat (có thuộc tính reply) → trả lời theo câu hỏi trong <question>:
//   có "caption" → 2 caption; có "thời tiết" → từ chối nhẹ nhàng; còn lại → gợi ý ý tưởng (kèm 1 link phải bị lọc).
const state = { mode: 'ok', calls: [] };

const setFakeGeminiMode = (mode) => {
  state.mode = mode;
};
const fakeGeminiCalls = () => state.calls;
const resetFakeGemini = () => {
  state.mode = 'ok';
  state.calls = [];
};

const chatReply = (contents, model) => {
  const q = (contents.match(/<question>([\s\S]*?)<\/question>/) || [])[1] || '';
  const count = (contents.match(/<c id=/g) || []).length;
  let json;
  if (/caption/i.test(q)) {
    json = {
      reply: 'Đây là 2 lựa chọn caption cho bạn:',
      captions: ['🎧 Bản acoustic đã có mặt! Cảm ơn mọi người đã chờ đợi 💜', 'Mưa đêm + bản mộc = 🌧️🎸 Ra mắt rồi đây!'],
      suggestions: ['Nên đăng lúc mấy giờ?'],
    };
  } else if (/thời tiết/i.test(q)) {
    json = { reply: 'Mình chỉ hỗ trợ những gì liên quan tới âm nhạc và fan của bạn trên MusicStream. Bạn muốn hỏi gì về những chủ đề đó không? 🙂', captions: [], suggestions: [] };
  } else {
    json = {
      reply: `Dựa trên ${count} bình luận và số liệu 30 ngày, đây là 3 hướng đáng thử: bản acoustic, bài về kỷ niệm, ballad cho đêm mưa. Xem thêm tại https://spam.example/x`,
      captions: [],
      suggestions: ['Viết lời mở đầu cho ý tưởng 2', 'Nên ra bài vào tháng nào?', 'Gợi ý thứ ba bị bỏ'],
    };
  }
  return { text: JSON.stringify(json), usageMetadata: { promptTokenCount: 800 + count * 20, candidatesTokenCount: 200 }, model };
};

const fakeGeminiClient = () => ({
  models: {
    generateContent: async ({ model, contents, config }) => {
      state.calls.push({ model, prompt: contents, system: config?.systemInstruction, config });
      const overloaded = () => Object.assign(new Error('This model is currently experiencing high demand.'), { status: 503 });
      if (state.mode === 'primary_down' && model === 'gemini-3.8-flash') throw overloaded();
      if (state.mode === 'lite_down' && model === 'gemini-3.5-flash-lite') throw overloaded();
      if (state.mode === 'busy') throw overloaded();
      if (state.mode === 'error') throw Object.assign(new Error('Internal error'), { status: 500 });
      if (state.mode === 'quota') throw Object.assign(new Error('Resource exhausted'), { status: 429 });
      if (state.mode === 'blocked') return { text: undefined, promptFeedback: { blockReason: 'SAFETY' } };
      if (state.mode === 'invalid') return { text: '{"headline": ""}', usageMetadata: {} };
      if (config?.responseJsonSchema?.properties?.reply) return chatReply(contents, model);
      const count = (contents.match(/<c id=/g) || []).length;
      const songIds = [...contents.matchAll(/songId="([^"]+)"/g)].map((m) => m[1]);
      const json = {
        headline: 'Fan rất thích giọng hát và chất acoustic của bạn',
        summary: 'Phần lớn bình luận ấm áp, mang tính cá nhân; nhiều fan mong có bản acoustic và buổi live.',
        sentiment: { positive: 70, neutral: 22, negative: 8 },
        overallComment: 'Các bình luận chủ yếu khen giọng hát và cảm xúc trong bài, một số ít góp ý phần mở đầu hơi nhỏ tiếng.',
        themes: [
          { title: 'Giọng hát và chất acoustic', count: Math.ceil(count * 0.4), tone: 'positive' },
          { title: 'Mong có bản acoustic / buổi live', count: Math.ceil(count * 0.25), tone: 'positive' },
          { title: 'Âm lượng đoạn intro hơi nhỏ', count: Math.max(1, Math.floor(count * 0.1)), tone: 'negative' },
        ],
        songHighlights: [
          ...songIds.slice(0, 2).map((id, i) => ({ songId: id, note: i === 0 ? 'Bài được nghe nhiều nhất 30 ngày qua' : 'Lượt nghe ổn định' })),
          { songId: 'khong-co-that', note: 'Bài AI bịa ra – phải bị loại' },
        ],
        actions: [
          { title: 'Thu bản acoustic cho bài nổi bật nhất', reason: 'Nhiều fan đã yêu cầu trong bình luận.' },
          { title: 'Trả lời các bình luận nổi bật trong tuần này', reason: 'Fan gắn bó hơn khi được nghệ sĩ phản hồi.' },
          { title: 'Kiểm tra lại phần mix đoạn intro', reason: 'Một số fan nói phần này hơi nhỏ.' },
        ],
      };
      return { text: JSON.stringify(json), usageMetadata: { promptTokenCount: 1000 + count * 30, candidatesTokenCount: 600 } };
    },
  },
});

module.exports = { fakeGeminiClient, setFakeGeminiMode, fakeGeminiCalls, resetFakeGemini };

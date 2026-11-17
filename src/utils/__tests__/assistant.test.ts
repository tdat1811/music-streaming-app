// Kiểm thử đơn vị: AI Assistant ở app – giai đoạn 6b (sheet UT41)
import {
  answeredByText,
  buyLabel,
  chatDayLabel,
  chatSubtitle,
  counterText,
  greetingText,
  isOutOfMessages,
  QUICK_PROMPTS,
  sendErrorKind,
} from '../assistant';

const q = (freeUsed: number, credits = 0) => ({ freeLimit: 20, freeUsed, freeLeft: Math.max(0, 20 - freeUsed), credits, price: 3, packSize: 20 });

describe('UT41 – dòng đếm tin và hết lượt', () => {
  it.each([
    ['UTCID01', q(0), false, '20 free messages today · a fan insight counts as 1 message'],
    ['UTCID02', q(3), false, '17 of 20 free messages left today'],
    ['UTCID03', q(6), true, '14 of 20 free messages left today · not counted'],
    ['UTCID04', q(5, 20), false, '15 of 20 free messages left today · 20 extra'],
    ['UTCID05', q(20, 1), false, '0 free messages left today · 1 extra message'],
    ['UTCID06', q(20, 0), false, '0 free messages left today'],
  ])('%s: %j (not counted %s) → "%s"', (_id, quota, notCounted, text) => {
    expect(counterText(quota, notCounted)).toBe(text);
  });

  it('UTCID07: chỉ khoá ô nhập khi hết cả tin miễn phí lẫn tin đã mua', () => {
    expect([isOutOfMessages(q(20, 0)), isOutOfMessages(q(20, 3)), isOutOfMessages(q(19, 0)), isOutOfMessages(null)]).toEqual([true, false, false, false]);
  });

  it('UTCID08: nút mua', () => {
    expect(buyLabel(q(20))).toBe('Buy 20 more messages · $3');
    expect(buyLabel(null)).toBe('Buy 20 more messages · $3');
  });
});

describe('UT41 – chữ hiển thị', () => {
  it('UTCID09: lời chào dùng tên đầu và số bình luận; 4 gợi ý nhanh', () => {
    expect(greetingText('Mer Watson', 86)).toBe('Chào Mer! 👋 Mình là trợ lý AI của bạn. Mình đã đọc 86 bình luận và số liệu 30 ngày qua của bạn. Bạn muốn bắt đầu từ đâu?');
    expect(greetingText('', 0)).toMatch(/^Chào bạn!/);
    expect(QUICK_PROMPTS).toHaveLength(4);
    expect(QUICK_PROMPTS[0]).toMatch(/Phân tích fan/);
  });

  it('UTCID10: ngày của cuộc trò chuyện', () => {
    const now = new Date(2026, 10, 17, 15, 0);
    expect(chatDayLabel(new Date(2026, 10, 17, 8, 0), now)).toBe('Today');
    expect(chatDayLabel(new Date(2026, 10, 16, 23, 0), now)).toBe('Yesterday');
    expect(chatDayLabel(new Date(2026, 10, 12, 9, 0), now)).toBe('Nov 12');
    expect(chatSubtitle(new Date(2026, 10, 17, 8, 0), 6, now)).toBe('Today · 6 messages');
    expect(chatSubtitle(new Date(2026, 10, 17, 8, 0), 1, now)).toBe('Today · 1 message');
  });

  it('UTCID11: loại lỗi khi gửi', () => {
    expect(['MODEL_BUSY', 'AI_BUSY', 'AI_UNAVAILABLE', 'QUOTA_EXCEEDED', 'INVALID', undefined].map(sendErrorKind)).toEqual([
      'model_busy',
      'busy',
      'busy',
      'quota',
      'other',
      'other',
    ]);
  });

  it('UTCID12: nhãn model dưới câu trả lời', () => {
    expect(answeredByText('Gemini 3.8 Flash', false)).toBe('Gemini 3.8 Flash');
    expect(answeredByText('Gemini 3.5 Flash-Lite', true)).toBe('Gemini 3.5 Flash-Lite · Auto switched – the main model was busy');
    expect(answeredByText('', false)).toBe('');
  });
});

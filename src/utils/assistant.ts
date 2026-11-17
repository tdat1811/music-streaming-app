// AI Assistant (giai đoạn 6b) – hiển thị ở app: dòng đếm tin, lời chào, gợi ý nhanh, thời gian cuộc trò chuyện, loại lỗi
import { formatMoney } from './insights';

export interface AssistantQuota {
  freeLimit: number;
  freeUsed: number;
  freeLeft: number;
  credits: number;
  // Giá gói 20 tin (VNĐ), trừ vào số dư ví
  price: number;
  currency?: string;
  packSize: number;
  balance?: number;
}

export interface AssistantModel {
  id: string;
  label: string;
  recommended?: boolean;
  busy?: boolean;
  description?: string;
}

export const AUTO_MODEL = 'auto';
export const MAX_MESSAGE_CHARS = 1000;

// 4 gợi ý nhanh ở màn chat mới (C2) – bấm là gửi
export const QUICK_PROMPTS = ['📊 Phân tích fan của tôi', '💡 Gợi ý ý tưởng bài mới', '✍️ Viết caption cho bài đăng', '⏰ Nên đăng bài lúc nào?'];

// Hết tin miễn phí và không còn tin đã mua → khoá ô nhập (C7)
export const isOutOfMessages = (q: AssistantQuota | null | undefined) => !!q && q.freeLeft <= 0 && q.credits <= 0;

// Dòng nhỏ trên ô nhập
export const counterText = (q: AssistantQuota | null | undefined, notCounted = false) => {
  if (!q) return '';
  let text: string;
  if (q.freeUsed === 0 && q.credits === 0) text = `${q.freeLimit} free messages today · a fan insight counts as 1 message`;
  else if (q.freeLeft > 0) text = `${q.freeLeft} of ${q.freeLimit} free messages left today${q.credits > 0 ? ` · ${q.credits} extra` : ''}`;
  else if (q.credits > 0) text = `0 free messages left today · ${q.credits} extra message${q.credits === 1 ? '' : 's'}`;
  else text = '0 free messages left today';
  return notCounted ? `${text} · not counted` : text;
};

export const buyLabel = (q: AssistantQuota | null | undefined) => `Buy ${q?.packSize ?? 20} more messages · ${formatMoney(q?.price ?? 75000, q?.currency)}`;

// Lời chào ở cuộc trò chuyện mới (C2)
export const greetingText = (artistName: string | null | undefined, commentCount: number) => {
  const first = (artistName || '').trim().split(/\s+/)[0];
  return `Chào ${first || 'bạn'}! 👋 Mình là trợ lý AI của bạn. Mình đã đọc ${commentCount} bình luận và số liệu 30 ngày qua của bạn. Bạn muốn bắt đầu từ đâu?`;
};

// "Today" / "Yesterday" / "Nov 12" (theo giờ máy)
export const chatDayLabel = (date: string | Date, now: Date = new Date()) => {
  const d = new Date(date);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const chatSubtitle = (lastMessageAt: string | Date, messageCount: number, now?: Date) =>
  `${chatDayLabel(lastMessageAt, now)} · ${messageCount} message${messageCount === 1 ? '' : 's'}`;

// Loại lỗi khi gửi tin → cách hiện ở chat
export type SendErrorKind = 'model_busy' | 'busy' | 'quota' | 'other';
export const sendErrorKind = (code?: string): SendErrorKind => {
  if (code === 'MODEL_BUSY') return 'model_busy';
  if (code === 'AI_BUSY' || code === 'AI_UNAVAILABLE') return 'busy';
  if (code === 'QUOTA_EXCEEDED') return 'quota';
  return 'other';
};

// Nhãn dưới câu trả lời: "Gemini 3.8 Flash" / "Gemini 3.5 Flash-Lite · Auto switched (3.8 was busy)"
export const answeredByText = (modelLabel: string, fallback: boolean) =>
  modelLabel ? `${modelLabel}${fallback ? ' · Auto switched – the main model was busy' : ''}` : '';

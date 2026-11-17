// AI Assistant (giai đoạn 6b): chat hỏi đáp với Gemini + phân tích fan trong chat.
// Một loại lượt: 20 tin miễn phí / ngày (phân tích fan tính 1 tin, bản ≤ 24 giờ hiện lại không tính), rồi tới tin đã mua.
// AI lỗi → không trừ tin. Model theo lựa chọn của cuộc chat: Auto tự chuyển khi bận; model cố định bận → lỗi MODEL_BUSY.
const AssistantChat = require('../models/AssistantChat');
const AssistantMessage = require('../models/AssistantMessage');
const Insight = require('../models/Insight');
const Payment = require('../models/Payment');
const { makeId } = require('../utils/ids');
const { startOfDay } = require('../utils/stats');
const { anonymize, decideRun } = require('../utils/insightText');
const {
  detectIntent,
  checkMessage,
  chatTitle,
  checkTitle,
  modelLabel,
  ASSISTANT_SYSTEM,
  buildChatPrompt,
  CHAT_SCHEMA,
  validateReply,
  InvalidReplyError,
} = require('../utils/assistantText');
const { ASSISTANT_LIMITS, MESSAGE_PACK_PRICE_USD, AUTO_MODEL } = require('../config/assistant');
const { generateJson, geminiAvailable, GeminiError, modelNames, busyModels, isBusyReason } = require('./gemini');
const insights = require('./insights');

const DAY_MS = 24 * 60 * 60 * 1000;
const PACK_TYPES = ['ai_messages', 'ai_insight'];

class AssistantError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

// ---------------- Model ----------------
const modelChoices = () => [AUTO_MODEL, ...modelNames()];
const isValidModel = (m) => modelChoices().includes(m);

// Danh sách cho bảng chọn model (C10) + nhãn "Busy now"
const listModels = () => {
  const busy = new Set(busyModels(ASSISTANT_LIMITS.busyMinutes * 60 * 1000));
  const [primary, fallback] = modelNames();
  return modelChoices().map((id) => ({
    id,
    label: modelLabel(id),
    recommended: id === AUTO_MODEL,
    busy: busy.has(id),
    description:
      id === AUTO_MODEL
        ? `Uses ${modelLabel(primary)}${fallback ? `, and switches to ${modelLabel(fallback)} when it's busy` : ''}. You always get an answer.`
        : id === primary
          ? "Deeper, more detailed answers. Sometimes overloaded by Google – if it's busy, you'll be asked to switch model."
          : "Faster and more stable. Shorter, simpler answers. If it's busy, you'll be asked to switch model.",
  }));
};

// Model gợi ý khi model cố định bận: model còn lại
const otherModel = (model) => modelNames().find((m) => m !== model) || AUTO_MODEL;

// ---------------- Lượt ----------------
// Lượt AI Fan Insight $3 chưa dùng (giai đoạn 6) → đổi thành 20 tin nhắn
const convertLegacyCredits = (userId) =>
  Payment.updateMany(
    { userId, type: 'ai_insight', usedAt: null, credits: { $in: [0, null] } },
    { $set: { credits: ASSISTANT_LIMITS.packSize, creditsUsed: 0, description: 'AI Fan Insight – converted to 20 AI Assistant messages' } }
  );

const freeUsedToday = (userId, tz, now = new Date()) =>
  AssistantMessage.countDocuments({ userId, role: 'ai', counted: true, paid: false, createdAt: { $gte: startOfDay(now, tz) } });

const creditsLeft = async (userId) => {
  const packs = await Payment.find({ userId, type: { $in: PACK_TYPES }, credits: { $gt: 0 } }).select('credits creditsUsed').lean();
  return packs.reduce((sum, p) => sum + Math.max(0, (p.credits || 0) - (p.creditsUsed || 0)), 0);
};

const quotaFor = async (userId, tz) => {
  await convertLegacyCredits(userId);
  const [freeUsed, credits] = await Promise.all([freeUsedToday(userId, tz), creditsLeft(userId)]);
  return {
    freeLimit: ASSISTANT_LIMITS.freePerDay,
    freeUsed,
    freeLeft: Math.max(0, ASSISTANT_LIMITS.freePerDay - freeUsed),
    credits,
    price: MESSAGE_PACK_PRICE_USD,
    packSize: ASSISTANT_LIMITS.packSize,
  };
};

// Dùng 1 tin đã mua (gói cũ nhất trước). Trả true nếu trừ được.
const consumeCredit = async (userId) =>
  !!(await Payment.findOneAndUpdate(
    { userId, type: { $in: PACK_TYPES }, credits: { $gt: 0 }, $expr: { $lt: ['$creditsUsed', '$credits'] } },
    { $inc: { creditsUsed: 1 } },
    { sort: { createdAt: 1 }, new: true }
  ));

// Mua 20 tin (thanh toán giả lập như mua gói VIP)
const purchaseMessages = async (artist, userId, tz) => {
  const payment = await Payment.create({
    id: makeId('pay'),
    userId,
    type: 'ai_messages',
    amount: MESSAGE_PACK_PRICE_USD,
    description: `AI Assistant – ${ASSISTANT_LIMITS.packSize} extra messages`,
    artistId: artist.id,
    credits: ASSISTANT_LIMITS.packSize,
    creditsUsed: 0,
  });
  return { payment: { id: payment.id, amount: payment.amount, credits: payment.credits, createdAt: payment.createdAt }, quota: await quotaFor(userId, tz) };
};

// ---------------- Hiển thị ----------------
const chatView = (c) => ({
  id: c.id,
  title: c.title,
  model: c.model,
  modelLabel: modelLabel(c.model),
  messageCount: c.messageCount || 0,
  lastMessageAt: c.lastMessageAt,
  createdAt: c.createdAt,
});

// Thẻ phân tích trong chat (C3): tóm tắt, cảm xúc, nhận xét chung
const insightCard = (ins) =>
  ins && {
    id: ins.id,
    source: ins.source,
    fallbackReason: ins.fallbackReason || null,
    createdAt: ins.createdAt,
    commentCount: ins.commentCount,
    headline: ins.result?.headline,
    sentiment: ins.result?.sentiment,
    overallComment: ins.result?.overallComment,
  };

const messageView = (m, insightsById = new Map()) => ({
  id: m.id,
  role: m.role,
  kind: m.kind,
  text: m.text,
  captions: m.captions || [],
  suggestions: m.suggestions || [],
  insightId: m.insightId || null,
  insight: m.insightId ? insightCard(insightsById.get(m.insightId)) || null : null,
  model: m.model || '',
  modelLabel: modelLabel(m.model),
  fallback: !!m.fallback,
  failed: !!m.failed,
  counted: !!m.counted,
  paid: !!m.paid,
  createdAt: m.createdAt,
});

const withInsights = async (messages) => {
  const ids = [...new Set(messages.map((m) => m.insightId).filter(Boolean))];
  const docs = ids.length ? await Insight.find({ id: { $in: ids } }).lean() : [];
  const byId = new Map(docs.map((d) => [d.id, d]));
  return messages.map((m) => messageView(m, byId));
};

const keepSince = (now = new Date()) => new Date(now.getTime() - ASSISTANT_LIMITS.keepDays * DAY_MS);

// ---------------- Cuộc trò chuyện ----------------
const findChat = async (userId, chatId) => {
  const chat = await AssistantChat.findOne({ id: chatId, userId, lastMessageAt: { $gte: keepSince() } });
  if (!chat) throw new AssistantError(404, 'NOT_FOUND', 'Chat not found.');
  return chat;
};

// Danh sách cuộc trò chuyện (C8) + lượt + số bình luận cho lời chào (C2) + danh sách model (C10)
const listChats = async (artist, userId, tz) => {
  const [chats, quota, collected] = await Promise.all([
    AssistantChat.find({ userId, artistId: artist.id, lastMessageAt: { $gte: keepSince() } }).sort({ lastMessageAt: -1 }).limit(50).lean(),
    quotaFor(userId, tz),
    insights.collectComments(artist),
  ]);
  return {
    artist: { id: artist.id, name: artist.name, avatarImage: artist.avatarImage || '' },
    chats: chats.map(chatView),
    quota,
    context: { commentCount: collected.comments.length, postCount: collected.postCount, windowDays: 30 },
    aiAvailable: geminiAvailable('assistant'),
    models: listModels(),
    keepDays: ASSISTANT_LIMITS.keepDays,
  };
};

const getChat = async (artist, userId, chatId) => {
  const chat = await findChat(userId, chatId);
  const messages = await AssistantMessage.find({ chatId: chat.id, createdAt: { $gte: keepSince() } }).sort({ createdAt: 1, _id: 1 }).lean();
  return { chat: chatView(chat), messages: await withInsights(messages) };
};

const updateChat = async (artist, userId, chatId, body = {}) => {
  const chat = await findChat(userId, chatId);
  if (body.model !== undefined) {
    if (!isValidModel(body.model)) throw new AssistantError(400, 'INVALID_MODEL', 'Unknown AI model.', { models: modelChoices() });
    chat.model = body.model;
  }
  if (body.title !== undefined) {
    const t = checkTitle(body.title);
    if (t.error) throw new AssistantError(400, 'INVALID', t.error);
    chat.title = t.title;
    chat.titleEdited = true;
  }
  await chat.save();
  return { chat: chatView(chat) };
};

const deleteChat = async (artist, userId, chatId) => {
  const chat = await findChat(userId, chatId);
  await AssistantMessage.deleteMany({ chatId: chat.id });
  await chat.deleteOne();
  return { id: chat.id };
};

// ---------------- Gửi tin ----------------
// Chặn gửi 2 tin cùng lúc cho cùng một tài khoản
const running = new Set();

const touchChat = async (chat, added) => {
  chat.messageCount = (chat.messageCount || 0) + added;
  chat.lastMessageAt = new Date();
  await chat.save();
};

const saveAi = (chat, userId, data) =>
  AssistantMessage.create({ id: makeId('am'), chatId: chat.id, artistId: chat.artistId, userId, role: 'ai', ...data });

// Ngữ cảnh hỏi đáp: số liệu 30 ngày, bản phân tích gần nhất, ≤ 100 bình luận đã ẩn danh, ≤ 10 tin gần nhất
const chatContext = async (artist, chat, userMsg, tz) => {
  const [stats, insight, collected, history] = await Promise.all([
    insights.statsForPrompt(artist, tz),
    insights.latestInsight(artist.id),
    insights.collectComments(artist),
    AssistantMessage.find({ chatId: chat.id, failed: false, id: { $ne: userMsg.id } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(ASSISTANT_LIMITS.historyTurns)
      .lean(),
  ]);
  return {
    artist,
    stats,
    insight,
    comments: anonymize(collected.comments.slice(0, ASSISTANT_LIMITS.contextComments)),
    history: history.reverse(),
    question: userMsg.text,
  };
};

// Trả lời một tin của nghệ sĩ (tin mới hoặc gửi lại). Trả { chat, userMessage, message, quota }
const answer = async (artist, userId, chat, userMsg, tz) => {
  const intent = detectIntent(userMsg.text);

  // Đã có bản phân tích ≤ 24 giờ → hiện lại, không trừ tin
  if (intent === 'insight') {
    const latest = await insights.latestInsight(artist.id);
    if (latest) {
      const ai = await saveAi(chat, userId, {
        kind: 'insight',
        text: 'Đây là bản phân tích fan gần nhất của bạn (chưa quá 24 giờ, không tính tin nhắn). Gõ "phân tích lại" nếu muốn làm mới.',
        insightId: latest.id,
        model: latest.model || '',
        suggestions: ['Fan thích bài nào nhất?', 'Fan góp ý gì cần sửa?'],
      });
      return finish(artist, userId, chat, userMsg, ai, tz);
    }
  }

  if (!geminiAvailable('assistant')) {
    throw new AssistantError(503, 'AI_UNAVAILABLE', "The AI isn't set up on this server yet, so this message wasn't counted.");
  }
  const quota = await quotaFor(userId, tz);
  const charge = decideRun({ freeUsed: quota.freeUsed, credits: quota.credits, freePerDay: quota.freeLimit });
  if (charge === 'quota') {
    throw new AssistantError(402, 'QUOTA_EXCEEDED', `You've used today's ${quota.freeLimit} free messages. Buy ${quota.packSize} more messages for $${quota.price}.`, { quota });
  }

  const models = chat.model === AUTO_MODEL ? modelNames() : [chat.model];
  let data;
  try {
    if (intent === 'chat') {
      const out = await generateJson({
        feature: 'assistant',
        system: ASSISTANT_SYSTEM,
        prompt: buildChatPrompt(await chatContext(artist, chat, userMsg, tz)),
        schema: CHAT_SCHEMA,
        models,
        temperature: 0.7,
      });
      let r;
      try {
        r = validateReply(out.json);
      } catch (e) {
        if (e instanceof InvalidReplyError) throw new GeminiError('invalid_output', e.message);
        throw e;
      }
      data = { kind: r.captions.length ? 'captions' : 'text', text: r.reply, captions: r.captions, suggestions: r.suggestions, model: out.model, fallback: out.fallback };
    } else {
      let res;
      try {
        res = await insights.runInsight(artist, userId, tz, { models });
      } catch (e) {
        if (!(e instanceof insights.InsightError)) throw e;
        if (e.code === 'IN_PROGRESS') throw new AssistantError(409, 'IN_PROGRESS', e.message);
        // Chưa đủ bình luận: AI trả lời giải thích, không tính tin
        const ai = await saveAi(chat, userId, {
          kind: 'text',
          text: `Bạn mới có ${e.extra.commentCount} bình luận của fan trong 30 ngày qua – cần ít nhất 10 bình luận để phân tích có ý nghĩa. Hãy đăng bài trên Feed để fan bình luận nhiều hơn nhé! (Tin này không tính lượt.)`,
          suggestions: ['Viết caption cho bài đăng mới', 'Nên đăng bài lúc nào?'],
        });
        return finish(artist, userId, chat, userMsg, ai, tz);
      }
      data = {
        kind: 'insight',
        text: 'Đây là bản phân tích fan 30 ngày qua của bạn:',
        insightId: res.insight.id,
        model: res.insight.model,
        fallback: res.fallback,
        suggestions: ['Vì sao fan thích bài nổi bật nhất?', 'Xử lý các góp ý thế nào?'],
      };
    }
  } catch (err) {
    if (!(err instanceof GeminiError)) throw err;
    if (err.reason === 'no_key') throw new AssistantError(503, 'AI_UNAVAILABLE', "The AI isn't set up on this server yet, so this message wasn't counted.");
    if (chat.model !== AUTO_MODEL && isBusyReason(err.reason)) {
      const suggested = otherModel(chat.model);
      throw new AssistantError(503, 'MODEL_BUSY', `${modelLabel(chat.model)} is busy. Google says this model is overloaded right now. Your message wasn't counted.`, {
        model: chat.model,
        modelLabel: modelLabel(chat.model),
        suggestedModel: suggested,
        suggestedModelLabel: modelLabel(suggested),
      });
    }
    throw new AssistantError(503, 'AI_BUSY', "The AI service is busy right now, so this message wasn't counted. Tap to try again.", { reason: err.reason });
  }

  // Trừ tin: miễn phí trước, rồi tin đã mua
  let paid = false;
  if (charge === 'paid') paid = await consumeCredit(userId);
  const ai = await saveAi(chat, userId, { ...data, counted: true, paid });
  return finish(artist, userId, chat, userMsg, ai, tz);
};

const finish = async (artist, userId, chat, userMsg, ai, tz) => {
  if (userMsg.failed) {
    userMsg.failed = false;
    await userMsg.save();
  }
  await touchChat(chat, 1);
  const [message] = await withInsights([ai.toObject()]);
  return { chat: chatView(chat), userMessage: messageView(userMsg.toObject()), message, quota: await quotaFor(userId, tz) };
};

// Chạy answer, lỗi thì gắn kèm cuộc chat + tin của nghệ sĩ (để app gửi lại) + lượt
const guarded = async (artist, userId, chat, userMsg, tz) => {
  if (running.has(userId)) throw new AssistantError(409, 'IN_PROGRESS', 'The AI is still answering your last message. Please wait.');
  running.add(userId);
  try {
    return await answer(artist, userId, chat, userMsg, tz);
  } catch (err) {
    if (err instanceof AssistantError) {
      err.extra = { ...err.extra, chat: chatView(chat), userMessage: messageView(userMsg.toObject ? userMsg.toObject() : userMsg) };
      if (!err.extra.quota) err.extra.quota = await quotaFor(userId, tz);
    }
    throw err;
  } finally {
    running.delete(userId);
  }
};

// Gửi tin mới (chưa có chatId → tạo cuộc trò chuyện mới, mặc định Auto hoặc model gửi kèm)
const sendMessage = async (artist, userId, body = {}, tz) => {
  const m = checkMessage(body.text);
  if (m.error) throw new AssistantError(400, 'INVALID', m.error);
  if (running.has(userId)) throw new AssistantError(409, 'IN_PROGRESS', 'The AI is still answering your last message. Please wait.');
  let chat;
  if (body.chatId) {
    chat = await findChat(userId, body.chatId);
  } else {
    const model = body.model === undefined || body.model === null || body.model === '' ? AUTO_MODEL : body.model;
    if (!isValidModel(model)) throw new AssistantError(400, 'INVALID_MODEL', 'Unknown AI model.', { models: modelChoices() });
    chat = await AssistantChat.create({ id: makeId('ac'), artistId: artist.id, userId, title: chatTitle(m.text), model, lastMessageAt: new Date() });
  }
  const userMsg = await AssistantMessage.create({ id: makeId('am'), chatId: chat.id, artistId: artist.id, userId, role: 'user', text: m.text, failed: true });
  await touchChat(chat, 1);
  return guarded(artist, userId, chat, userMsg, tz);
};

// Gửi lại một tin chưa được trả lời (sau khi đổi model / mua thêm tin / AI hết bận)
const retryMessage = async (artist, userId, chatId, messageId, tz) => {
  const chat = await findChat(userId, chatId);
  const userMsg = await AssistantMessage.findOne({ id: messageId, chatId: chat.id, role: 'user' });
  if (!userMsg) throw new AssistantError(404, 'NOT_FOUND', 'Message not found.');
  if (!userMsg.failed) throw new AssistantError(409, 'ALREADY_ANSWERED', 'This message was already answered.');
  return guarded(artist, userId, chat, userMsg, tz);
};

// "Show basic fan summary" (C9): bản tóm tắt cơ bản, không cần AI, không tính tin
const basicSummary = async (artist, userId, chatId, tz) => {
  const chat = await findChat(userId, chatId);
  let res;
  try {
    res = await insights.runBasicInsight(artist, userId, tz);
  } catch (e) {
    if (e instanceof insights.InsightError) throw new AssistantError(e.status, e.code, e.message, e.extra);
    throw e;
  }
  const ai = await saveAi(chat, userId, { kind: 'insight', text: 'Bản tóm tắt cơ bản (đếm từ khoá, không dùng AI, không tính tin nhắn):', insightId: res.insight.id });
  await touchChat(chat, 1);
  const [message] = await withInsights([ai.toObject()]);
  return { chat: chatView(chat), message, quota: await quotaFor(userId, tz) };
};

module.exports = {
  AssistantError,
  listModels,
  listChats,
  getChat,
  updateChat,
  deleteChat,
  sendMessage,
  retryMessage,
  basicSummary,
  purchaseMessages,
  quotaFor,
  modelChoices,
};

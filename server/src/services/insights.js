// AI Fan Insight (giai đoạn 6): gom bình luận, gọi Gemini, lưu kết quả.
// Giai đoạn 6b: chạy bên trong AI Assistant – lượt (20 tin / ngày, mua thêm) do dịch vụ assistant tính.
const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');
const Insight = require('../models/Insight');
const { makeId } = require('../utils/ids');
const { lockedUserIds } = require('./moderation');
const { getArtistStats } = require('./artistStats');
const { generateJson, geminiAvailable, GeminiError } = require('./gemini');
const { INSIGHT_LIMITS } = require('../config/insights');
const {
  anonymize,
  SYSTEM_INSTRUCTION,
  buildUserPrompt,
  INSIGHT_SCHEMA,
  validateInsight,
  InvalidInsightError,
  basicSummary,
} = require('../utils/insightText');

const DAY_MS = 24 * 60 * 60 * 1000;

// Bình luận đủ điều kiện: dưới bài đang hiện của nghệ sĩ, trong 30 ngày, không bị gỡ, không của tài khoản bị khoá,
// không phải của chính nghệ sĩ. Mới nhất trước, tối đa maxComments.
const collectComments = async (artist, now = new Date()) => {
  const since = new Date(now.getTime() - INSIGHT_LIMITS.windowDays * DAY_MS);
  const posts = await FeedPost.find({ authorArtistId: artist.id, ...FeedPost.PUBLIC_POST_FILTER }).select('id content').lean();
  if (!posts.length) return { comments: [], postCount: 0 };
  const postLabel = new Map(posts.map((p) => [p.id, (p.content || '').slice(0, 60) || 'Post']));
  const locked = new Set(await lockedUserIds());
  const skip = (c) => c.removedAt || (c.userId && (locked.has(c.userId) || c.userId === artist.ownerUserId));
  const roots = await Comment.find({ postId: { $in: posts.map((p) => p.id) }, removedAt: null }).lean();
  const all = [];
  roots.forEach((c) => {
    if (skip(c)) return;
    const at = c.createdAt || new Date(0);
    if (at >= since) all.push({ authorKey: c.userId || c.userName, text: c.text, likes: c.likes, post: postLabel.get(c.postId), at, postId: c.postId });
    (c.replies || []).forEach((r) => {
      if (skip(r) || !r.createdAt || r.createdAt < since) return;
      all.push({ authorKey: r.userId || r.userName, text: r.text, likes: r.likes, post: postLabel.get(c.postId), at: r.createdAt, postId: c.postId });
    });
  });
  all.sort((a, b) => b.at - a.at);
  const comments = all.slice(0, INSIGHT_LIMITS.maxComments);
  return { comments, postCount: new Set(comments.map((c) => c.postId)).size };
};

const toResponse = (doc) =>
  doc && {
    id: doc.id,
    createdAt: doc.createdAt,
    source: doc.source,
    paid: !!doc.paid,
    model: doc.model,
    fallbackReason: doc.fallbackReason || null,
    windowDays: doc.windowDays,
    commentCount: doc.commentCount,
    postCount: doc.postCount,
    result: doc.result,
    stats: doc.stats,
  };

const latestInsight = (artistId, now = new Date()) =>
  Insight.findOne({ artistId, createdAt: { $gte: new Date(now.getTime() - INSIGHT_LIMITS.cacheHours * 60 * 60 * 1000) } })
    .sort({ createdAt: -1 })
    .lean();

// Bản phân tích đã lưu (≤ 24 giờ) + số bình luận đủ điều kiện
const getInsightState = async (artist) => {
  const [latest, collected] = await Promise.all([latestInsight(artist.id), collectComments(artist)]);
  return {
    insight: toResponse(latest),
    commentCount: collected.comments.length,
    postCount: collected.postCount,
    minComments: INSIGHT_LIMITS.minComments,
    windowDays: INSIGHT_LIMITS.windowDays,
    aiAvailable: geminiAvailable('insight'),
  };
};

class InsightError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

// Chặn bấm 2 lần cùng lúc cho cùng một nghệ sĩ
const running = new Set();

const statsForPrompt = async (artist, tz) => {
  const s = await getArtistStats(artist, { range: '30', tz });
  return {
    plays: s.tiles.plays.value,
    playsChange: s.tiles.plays.change,
    listeners: s.tiles.listeners.value,
    newFollowers: s.tiles.newFollowers.value,
    topSongs: s.topSongs.map((t) => ({ id: t.id, title: t.title, plays: t.plays, change: t.change ?? null })),
    sources: s.sources,
  };
};

// Tạo một bản phân tích mới bằng Gemini (models: danh sách model theo lựa chọn của cuộc chat).
// Ném InsightError (thiếu bình luận / đang chạy) hoặc GeminiError (AI lỗi – người gọi quyết định, không trừ lượt).
const runInsight = async (artist, userId, tz, { models } = {}) => {
  if (running.has(artist.id)) throw new InsightError(409, 'IN_PROGRESS', 'An insight is already being generated. Please wait.');
  running.add(artist.id);
  try {
    const { comments, postCount } = await collectComments(artist);
    if (comments.length < INSIGHT_LIMITS.minComments) {
      throw new InsightError(400, 'NOT_ENOUGH_COMMENTS', `You need at least ${INSIGHT_LIMITS.minComments} fan comments in the last ${INSIGHT_LIMITS.windowDays} days.`, {
        commentCount: comments.length,
      });
    }
    if (!geminiAvailable('insight')) throw new GeminiError('no_key', 'Gemini is not configured');
    const stats = await statsForPrompt(artist, tz);
    const out = await generateJson({
      feature: 'insight',
      system: SYSTEM_INSTRUCTION,
      prompt: buildUserPrompt({ artist, stats, comments: anonymize(comments), windowDays: INSIGHT_LIMITS.windowDays }),
      schema: INSIGHT_SCHEMA,
      models,
    });
    let result;
    try {
      result = validateInsight(out.json, { commentCount: comments.length, songs: stats.topSongs });
    } catch (e) {
      if (e instanceof InvalidInsightError) throw new GeminiError('invalid_output', e.message);
      throw e;
    }
    const doc = await Insight.create({
      id: makeId('ins'),
      artistId: artist.id,
      userId,
      windowDays: INSIGHT_LIMITS.windowDays,
      commentCount: comments.length,
      postCount,
      stats,
      source: 'gemini',
      model: out.model,
      result,
      inputTokens: out.inputTokens,
      outputTokens: out.outputTokens,
    });
    return { insight: toResponse(doc.toObject()), fallback: out.fallback };
  } finally {
    running.delete(artist.id);
  }
};

// Bản tóm tắt cơ bản (đếm từ khoá, không cần AI, không tính lượt) – khi AI lỗi người dùng bấm "Show basic fan summary"
const runBasicInsight = async (artist, userId, tz, reason = 'ai_error') => {
  const { comments, postCount } = await collectComments(artist);
  if (comments.length < INSIGHT_LIMITS.minComments) {
    throw new InsightError(400, 'NOT_ENOUGH_COMMENTS', `You need at least ${INSIGHT_LIMITS.minComments} fan comments in the last ${INSIGHT_LIMITS.windowDays} days.`, {
      commentCount: comments.length,
    });
  }
  const stats = await statsForPrompt(artist, tz);
  const doc = await Insight.create({
    id: makeId('ins'),
    artistId: artist.id,
    userId,
    windowDays: INSIGHT_LIMITS.windowDays,
    commentCount: comments.length,
    postCount,
    stats,
    source: 'basic',
    model: '',
    fallbackReason: reason,
    result: basicSummary({ comments: anonymize(comments), stats }),
  });
  return { insight: toResponse(doc.toObject()) };
};

// Một bản phân tích của nghệ sĩ (xem bản đầy đủ từ thẻ trong chat)
const getInsightById = async (artist, id) => toResponse(await Insight.findOne({ id, artistId: artist.id }).lean());

const countEligibleComments = async (artist) => (await collectComments(artist)).comments.length;

module.exports = {
  collectComments,
  getInsightState,
  runInsight,
  runBasicInsight,
  getInsightById,
  latestInsight,
  statsForPrompt,
  toResponse,
  countEligibleComments,
  InsightError,
};

const fs = require('fs');
const path = require('path');
const Song = require('../models/Song');
const Album = require('../models/Album');
const Artist = require('../models/Artist');
const Playlist = require('../models/Playlist');
const { removeFiles } = require('../middleware/upload');
const { AUDIO_DIR, COVER_DIR } = require('../config/storage');
const { readDuration } = require('../services/audioDuration');
const { isStageNameTaken } = require('../services/stageNames');
const {
  validateSongFields,
  validateAlbumFields,
  validateArtistPage,
  checkStatusChange,
  canDeleteSong,
} = require('../utils/studioValidation');
const { makeId } = require('../utils/ids');
const FeedPost = require('../models/FeedPost');
const { notifyNewSongOnce } = require('../services/followers');
const { POST_LIMITS } = require('../utils/postValidation');
const { getArtistStats, getSongStats, getWeekSummary, SONG_FIELDS } = require('../services/artistStats');
const { parseRange, parseTz } = require('../utils/stats');
const insights = require('../services/insights');
const assistant = require('../services/assistant');

// Khi bài hát được đăng công khai lần đầu: báo người theo dõi (chỉ một lần).
// shareToFeed: tự đăng một bài kèm bài hát lên Feed (không báo thêm lần nữa, đã có thông báo bài hát mới).
const afterPublish = async (artist, song, shareToFeed = false) => {
  if ((song.status || 'published') !== 'published') return { notified: 0, post: null };
  const notified = await notifyNewSongOnce(artist, song);
  let post = null;
  if (shareToFeed) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = await FeedPost.countDocuments({ authorArtistId: artist.id, createdAt: { $gte: since } });
    if (today < POST_LIMITS.perDay) {
      post = await FeedPost.create({
        id: makeId('fp'),
        authorArtistId: artist.id,
        authorName: artist.name,
        authorAvatar: artist.avatarImage || '',
        content: 'New song out now! 🎧',
        songId: song.id,
        timeAgo: '',
      });
    }
  }
  return { notified, post };
};

// Khu vực dành cho nghệ sĩ (route /api/studio, đã qua requireAuth + requireRole('artist')).
// Nghệ sĩ chỉ xem / sửa được bài hát, album và trang nghệ sĩ của chính mình.

const NO_ARTIST_MESSAGE = 'Tài khoản chưa được gắn với trang nghệ sĩ nào.';
const PUBLISHABLE_STATUSES = ['draft', 'published'];

const firstError = (errors) => Object.values(errors)[0];
const invalid = (res, errors) => res.status(400).json({ success: false, code: 'INVALID', message: firstError(errors), errors });

// Lấy trang nghệ sĩ mà tài khoản đang đăng nhập sở hữu
const findOwnArtist = async (req) => {
  if (!req.user.artistId) return null;
  return Artist.findOne({ id: req.user.artistId, ownerUserId: req.user.id });
};

// Bọc controller: nạp trang nghệ sĩ của người gọi vào req.artist, lỗi chung trả 500
const withArtist = (handler) => async (req, res) => {
  try {
    const artist = await findOwnArtist(req);
    if (!artist) {
      if (req.files) removeFiles(req.files);
      return res.status(403).json({ success: false, message: NO_ARTIST_MESSAGE });
    }
    req.artist = artist;
    await handler(req, res);
  } catch (err) {
    if (req.files) removeFiles(req.files);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Bài hát của chính nghệ sĩ (bài của người khác trả 404 để không lộ là bài có tồn tại)
const findOwnSong = (artist, songId) => Song.findOne({ id: songId, artistId: artist.id });

// Xoá file trên đĩa từ đường dẫn tương đối (/audio/x.mp3, /covers/y.jpg); bỏ qua đường dẫn ngoài
const removeStoredFile = (relPath) => {
  const m = /^\/(audio|covers)\/([\w-]+\.\w+)$/.exec(relPath || '');
  if (!m) return;
  const dir = m[1] === 'audio' ? AUDIO_DIR : COVER_DIR;
  try {
    fs.unlinkSync(path.join(dir, m[2]));
  } catch {
    // file không còn
  }
};

// ======================= Tổng quan (S1) =======================
exports.getOverview = withArtist(async (req, res) => {
  const artist = req.artist;
  const [songs, albums, posts, week, insightComments] = await Promise.all([
    Song.find({ artistId: artist.id }).select('id title status plays coverImage duration createdAt').sort({ createdAt: -1 }).lean(),
    Album.countDocuments({ artistId: artist.id }),
    FeedPost.countDocuments({ authorArtistId: artist.id }),
    getWeekSummary(artist, { tz: parseTz(req.query.tz) }),
    insights.countEligibleComments(artist),
  ]);
  const byStatus = { published: 0, draft: 0, hidden: 0 };
  songs.forEach((s) => { byStatus[s.status || 'published'] = (byStatus[s.status || 'published'] || 0) + 1; });
  res.status(200).json({
    success: true,
    data: {
      artist,
      songs: { total: songs.length, ...byStatus },
      totalPlays: songs.reduce((sum, s) => sum + (s.plays || 0), 0),
      followers: artist.followersCount || 0,
      albums,
      posts,
      // 7 ngày gần nhất: lượt nghe, % so với 7 ngày trước, người theo dõi mới
      week,
      // Số bình luận của fan trong 30 ngày (dòng phụ của mục AI Fan Insight)
      insightComments,
      recentSongs: songs.slice(0, 3),
    },
  });
});

// Giai đoạn 5: bài bị admin gỡ không sửa / đăng lại được; trang bị ẩn thì không đăng bài mới
const songRemoved = (res) =>
  res.status(403).json({ success: false, code: 'SONG_REMOVED', message: "This song was removed by a moderator and can't be changed." });
const pageHidden = (res) =>
  res.status(403).json({ success: false, code: 'PAGE_HIDDEN', message: 'Your artist page is hidden by a moderator. You can’t publish right now.' });

// ======================= Thống kê (giai đoạn 4) =======================
// ?range=7|30|all  &tz=<phút lệch so với UTC của người xem, VD 420>
exports.getStats = withArtist(async (req, res) => {
  const data = await getArtistStats(req.artist, { range: parseRange(req.query.range), tz: parseTz(req.query.tz) });
  res.status(200).json({ success: true, data });
});

// Thống kê một bài hát của chính nghệ sĩ
exports.getSongStats = withArtist(async (req, res) => {
  const song = await Song.findOne({ id: req.params.id, artistId: req.artist.id }).select(`${SONG_FIELDS} artistId`).lean();
  if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });
  const data = await getSongStats(song, { range: parseRange(req.query.range), tz: parseTz(req.query.tz) });
  res.status(200).json({ success: true, data });
});

// ======================= AI Fan Insight (giai đoạn 6) + AI Assistant (giai đoạn 6b) =======================
const aiFail = (res, err) => {
  if (err instanceof insights.InsightError || err instanceof assistant.AssistantError) {
    return res.status(err.status).json({ success: false, code: err.code, message: err.message, ...err.extra });
  }
  throw err;
};
// Bọc handler: lỗi nghiệp vụ AI → mã lỗi rõ ràng; lỗi khác → withArtist trả 500
const aiHandler = (fn, status = 200) =>
  withArtist(async (req, res) => {
    try {
      const data = await fn(req);
      res.status(status).json({ success: true, data });
    } catch (err) {
      aiFail(res, err);
    }
  });

// Bản phân tích đã lưu (≤ 24 giờ) + số bình luận đủ điều kiện
exports.getInsight = aiHandler((req) => insights.getInsightState(req.artist));
// Một bản phân tích (bấm "View full report" trên thẻ trong chat)
exports.getInsightById = withArtist(async (req, res) => {
  const insight = await insights.getInsightById(req.artist, req.params.id);
  if (!insight) return res.status(404).json({ success: false, message: 'Insight not found.' });
  res.status(200).json({ success: true, data: { insight } });
});

exports.assistantChats = aiHandler((req) => assistant.listChats(req.artist, req.user.id, parseTz(req.query.tz)));
exports.assistantModels = aiHandler(async () => ({ models: assistant.listModels() }));
exports.assistantChat = aiHandler((req) => assistant.getChat(req.artist, req.user.id, req.params.id));
exports.assistantUpdateChat = aiHandler((req) => assistant.updateChat(req.artist, req.user.id, req.params.id, req.body || {}));
exports.assistantDeleteChat = aiHandler((req) => assistant.deleteChat(req.artist, req.user.id, req.params.id));
exports.assistantSend = aiHandler((req) => assistant.sendMessage(req.artist, req.user.id, req.body || {}, parseTz(req.query.tz)), 201);
exports.assistantRetry = aiHandler(
  (req) => assistant.retryMessage(req.artist, req.user.id, req.params.id, (req.body || {}).messageId, parseTz(req.query.tz)),
  201
);
exports.assistantBasicSummary = aiHandler((req) => assistant.basicSummary(req.artist, req.user.id, req.params.id, parseTz(req.query.tz)), 201);
// Mua 20 tin nhắn ($3, thanh toán giả lập như mua gói VIP)
exports.assistantPurchase = aiHandler((req) => assistant.purchaseMessages(req.artist, req.user.id, parseTz(req.query.tz)), 201);

// ======================= Bài hát (S2–S6) =======================

// Tải bài hát mới (multipart/form-data): audio (bắt buộc), cover, title, genre, description, status (draft|published)
exports.uploadSong = withArtist(async (req, res) => {
  const files = req.files || {};
  const fail = (status, message, errors) => {
    removeFiles(files);
    return res.status(status).json({ success: false, message, ...(errors ? { code: 'INVALID', errors } : {}) });
  };
  const artist = req.artist;

  if (artist.hiddenAt) {
    removeFiles(files);
    return pageHidden(res);
  }
  const audio = files.audio?.[0];
  if (!audio) return fail(400, 'Vui lòng chọn file nhạc (mp3 hoặc m4a).');

  const { errors, value } = validateSongFields(req.body, artist.genres);
  delete errors.coverImage;
  if (Object.keys(errors).length) return fail(400, firstError(errors), errors);

  const status = req.body.status || 'published';
  if (!PUBLISHABLE_STATUSES.includes(status)) return fail(400, 'Trạng thái chỉ nhận draft hoặc published.');

  // Thời lượng đọc từ file; đọc không được thì để trống (trình phát vẫn tự lấy thời lượng khi phát)
  const duration = (await readDuration(audio.path)) || '';
  const cover = files.cover?.[0];

  const song = await Song.create({
    id: req.newSongId,
    title: value.title,
    artist: artist.name,
    artistId: artist.id,
    plays: 0,
    duration,
    // Lưu đường dẫn tương đối: app tự ghép địa chỉ máy chủ (chạy được cả web lẫn điện thoại)
    audioUrl: `/audio/${audio.filename}`,
    coverImage: cover ? `/covers/${cover.filename}` : artist.avatarImage || '',
    genre: value.genre,
    description: value.description || '',
    status,
    releaseAt: status === 'published' ? new Date() : null,
    category: 'general',
  });

  const shared = await afterPublish(artist, song, String(req.body.shareToFeed) === 'true');
  res.status(201).json({
    success: true,
    message: status === 'published' ? 'Song published!' : 'Draft saved.',
    data: song,
    sharedPostId: shared.post?.id || null,
    notifiedFollowers: shared.notified,
  });
});

// Danh sách bài hát của chính nghệ sĩ (lọc theo trạng thái nếu có), mới nhất trước
exports.getMySongs = withArtist(async (req, res) => {
  const filter = { artistId: req.artist.id };
  if (['draft', 'published', 'hidden'].includes(req.query.status)) filter.status = req.query.status;
  const songs = await Song.find(filter).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: songs.length, data: songs });
});

exports.getMySong = withArtist(async (req, res) => {
  const song = await findOwnSong(req.artist, req.params.id);
  if (!song) return res.status(404).json({ success: false, message: 'Không tìm thấy bài hát.' });
  res.status(200).json({ success: true, data: song });
});

// Sửa thông tin bài hát (không đổi file nhạc). Gửi kèm status để "Save & publish" / "Save as draft".
exports.updateSong = withArtist(async (req, res) => {
  const song = await findOwnSong(req.artist, req.params.id);
  if (!song) return res.status(404).json({ success: false, message: 'Không tìm thấy bài hát.' });
  if (song.removedAt) return songRemoved(res);
  if (req.body?.status === 'published' && req.artist.hiddenAt) return pageHidden(res);

  const { errors, value } = validateSongFields(req.body, req.artist.genres, { partial: true });
  if (req.body.status !== undefined) {
    const statusError = checkStatusChange(song, req.body.status);
    if (statusError) errors.status = statusError;
  }
  if (Object.keys(errors).length) return invalid(res, errors);

  const oldCover = song.coverImage;
  Object.assign(song, value);
  if (value.coverImage === '') song.coverImage = req.artist.avatarImage || '';
  if (req.body.status !== undefined) {
    song.status = req.body.status;
    if (song.status === 'published' && !song.releaseAt) song.releaseAt = new Date();
  }
  await song.save();
  if (value.coverImage !== undefined && oldCover !== song.coverImage) await removeIfUnused(oldCover);
  await afterPublish(req.artist, song);

  res.status(200).json({ success: true, message: 'Đã lưu.', data: song });
});

// Đổi trạng thái: published | draft | hidden
exports.setSongStatus = withArtist(async (req, res) => {
  const song = await findOwnSong(req.artist, req.params.id);
  if (!song) return res.status(404).json({ success: false, message: 'Không tìm thấy bài hát.' });
  if (song.removedAt) return songRemoved(res);
  if (req.body?.status === 'published' && req.artist.hiddenAt) return pageHidden(res);
  const statusError = checkStatusChange(song, req.body?.status);
  if (statusError) return res.status(400).json({ success: false, code: 'INVALID_STATUS', message: statusError });
  song.status = req.body.status;
  if (song.status === 'published' && !song.releaseAt) song.releaseAt = new Date();
  await song.save();
  await afterPublish(req.artist, song);
  res.status(200).json({ success: true, data: song });
});

// Ảnh chỉ xoá khỏi đĩa khi không còn bài hát / album / trang nghệ sĩ nào dùng
const removeIfUnused = async (relPath) => {
  if (!relPath || !relPath.startsWith('/covers/')) return;
  const [songs, albums, artists] = await Promise.all([
    Song.exists({ coverImage: relPath }),
    Album.exists({ coverImage: relPath }),
    Artist.exists({ $or: [{ avatarImage: relPath }, { aboutImage: relPath }] }),
  ]);
  if (!songs && !albums && !artists) removeStoredFile(relPath);
};

// Xoá hẳn bài hát: chỉ khi chưa có lượt nghe (đã có lượt nghe thì chỉ ẩn được).
// Gỡ bài khỏi album và playlist, xoá file nhạc và ảnh bìa.
exports.deleteSong = withArtist(async (req, res) => {
  const song = await findOwnSong(req.artist, req.params.id);
  if (!song) return res.status(404).json({ success: false, message: 'Không tìm thấy bài hát.' });
  // Bài bị admin gỡ là bằng chứng vi phạm: không cho xoá (giai đoạn 5)
  if (song.removedAt) return songRemoved(res);
  if (!canDeleteSong(song)) {
    return res.status(409).json({ success: false, code: 'HAS_PLAYS', message: 'Songs with plays can only be hidden, not deleted.' });
  }
  await Promise.all([
    Song.deleteOne({ id: song.id }),
    Album.updateMany({ songIds: song.id }, { $pull: { songIds: song.id } }),
    Playlist.updateMany({ songIds: song.id }, { $pull: { songIds: song.id } }),
  ]);
  removeStoredFile(song.audioUrl);
  await removeIfUnused(song.coverImage);
  res.status(200).json({ success: true, message: 'Đã xoá bài hát.' });
});

// Tải 1 ảnh (bìa bài hát / album, ảnh đại diện, ảnh bìa trang) -> trả đường dẫn để gửi kèm các API khác
exports.uploadImage = withArtist(async (req, res) => {
  res.status(201).json({ success: true, image: `/covers/${req.file.filename}` });
});

// ======================= Album (S7–S8) =======================

// Kiểm tra songIds đều là bài của nghệ sĩ; trả về danh sách bài (theo thứ tự) hoặc null nếu có bài lạ
const loadOwnSongs = async (artist, songIds) => {
  if (!songIds.length) return [];
  const songs = await Song.find({ id: { $in: songIds }, artistId: artist.id }).select('id title status plays coverImage duration').lean();
  if (songs.length !== songIds.length) return null;
  const byId = new Map(songs.map((s) => [s.id, s]));
  return songIds.map((id) => byId.get(id));
};

const albumResponse = (album, songs) => ({
  ...(album.toObject ? album.toObject() : album),
  songs,
  publishedSongCount: songs.filter((s) => (s.status || 'published') === 'published').length,
});

exports.getMyAlbums = withArtist(async (req, res) => {
  const albums = await Album.find({ artistId: req.artist.id }).sort({ createdAt: -1 });
  const allIds = albums.flatMap((a) => a.songIds);
  const songs = await Song.find({ id: { $in: allIds }, artistId: req.artist.id }).select('id status').lean();
  const statusById = new Map(songs.map((s) => [s.id, s.status || 'published']));
  res.status(200).json({
    success: true,
    count: albums.length,
    data: albums.map((a) => ({
      ...a.toObject(),
      publishedSongCount: a.songIds.filter((id) => statusById.get(id) === 'published').length,
    })),
  });
});

exports.getMyAlbum = withArtist(async (req, res) => {
  const album = await Album.findOne({ id: req.params.id, artistId: req.artist.id });
  if (!album) return res.status(404).json({ success: false, message: 'Không tìm thấy album.' });
  const songs = (await loadOwnSongs(req.artist, album.songIds.filter(Boolean))) || [];
  res.status(200).json({ success: true, data: albumResponse(album, songs) });
});

// Dùng chung cho tạo và sửa album
const saveAlbum = async (req, res, album) => {
  const { errors, value } = validateAlbumFields(req.body);
  const status = req.body.status === undefined ? album?.status || 'draft' : req.body.status;
  if (!PUBLISHABLE_STATUSES.includes(status)) errors.status = 'Status must be draft or published.';
  if (Object.keys(errors).length) return invalid(res, errors);

  const songs = await loadOwnSongs(req.artist, value.songIds);
  if (!songs) return res.status(400).json({ success: false, code: 'INVALID', message: 'You can only add your own songs.', errors: { songIds: 'You can only add your own songs.' } });
  if (status === 'published' && !songs.some((s) => (s.status || 'published') === 'published')) {
    return res.status(400).json({
      success: false,
      code: 'INVALID',
      message: 'An album needs at least one published song before it can be published.',
      errors: { songIds: 'An album needs at least one published song before it can be published.' },
    });
  }

  const fields = {
    title: value.title,
    releaseYear: value.releaseYear,
    songIds: value.songIds,
    coverImage: value.coverImage || songs[0]?.coverImage || req.artist.avatarImage || '',
    status,
    artist: req.artist.name,
    artistId: req.artist.id,
  };
  let saved;
  if (album) {
    const oldCover = album.coverImage;
    Object.assign(album, fields);
    saved = await album.save();
    if (oldCover !== saved.coverImage) await removeIfUnused(oldCover);
  } else {
    saved = await Album.create({ id: makeId('alb'), isTrending: false, ...fields });
  }
  return res.status(album ? 200 : 201).json({ success: true, message: 'Đã lưu album.', data: albumResponse(saved, songs) });
};

exports.createAlbum = withArtist(async (req, res) => saveAlbum(req, res, null));

exports.updateAlbum = withArtist(async (req, res) => {
  const album = await Album.findOne({ id: req.params.id, artistId: req.artist.id });
  if (!album) return res.status(404).json({ success: false, message: 'Không tìm thấy album.' });
  return saveAlbum(req, res, album);
});

// Xoá album: không xoá bài hát bên trong; gỡ album khỏi "album đã thích" không cần vì id không còn
exports.deleteAlbum = withArtist(async (req, res) => {
  const album = await Album.findOneAndDelete({ id: req.params.id, artistId: req.artist.id });
  if (!album) return res.status(404).json({ success: false, message: 'Không tìm thấy album.' });
  await removeIfUnused(album.coverImage);
  res.status(200).json({ success: true, message: 'Đã xoá album.' });
});

// ======================= Trang nghệ sĩ (S9) =======================

exports.getProfile = withArtist(async (req, res) => {
  res.status(200).json({ success: true, data: req.artist });
});

// Sửa trang nghệ sĩ. Đổi nghệ danh: không được trùng nghệ sĩ khác / yêu cầu đang chờ;
// đổi xong cập nhật tên nghệ sĩ hiển thị trên toàn bộ bài hát và album của nghệ sĩ.
exports.updateProfile = withArtist(async (req, res) => {
  const artist = req.artist;
  const { errors, value } = validateArtistPage(req.body);
  if (Object.keys(errors).length) return invalid(res, errors);

  const renamed = value.stageName !== artist.name;
  if (renamed && (await isStageNameTaken(value.stageName, { excludeArtistId: artist.id }))) {
    return res.status(409).json({
      success: false,
      code: 'NAME_TAKEN',
      message: `"${value.stageName}" is already used by another artist. Please choose a different stage name.`,
      errors: { stageName: 'This stage name is already used by another artist.' },
    });
  }

  const oldImages = [artist.avatarImage, artist.aboutImage];
  artist.name = value.stageName;
  artist.bio = value.bio;
  artist.genres = value.genres;
  artist.socialLinks = value.socialLinks;
  if (value.avatarImage !== undefined) artist.avatarImage = value.avatarImage;
  if (value.aboutImage !== undefined) artist.aboutImage = value.aboutImage;
  await artist.save();

  if (renamed) {
    await Promise.all([
      Song.updateMany({ artistId: artist.id }, { artist: artist.name }),
      Album.updateMany({ artistId: artist.id }, { artist: artist.name }),
    ]);
  }
  for (const img of oldImages) if (img && img !== artist.avatarImage && img !== artist.aboutImage) await removeIfUnused(img);

  res.status(200).json({ success: true, message: 'Đã lưu trang nghệ sĩ.', data: artist });
});

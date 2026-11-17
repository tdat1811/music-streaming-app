const fs = require('fs');
const path = require('path');

// Thư mục lưu file người dùng tải lên. Mặc định server/public; kiểm thử đặt UPLOAD_ROOT
// sang thư mục tạm để không ghi file rác vào project.
const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '../../public');
const AUDIO_DIR = path.join(UPLOAD_ROOT, 'audio');
const COVER_DIR = path.join(UPLOAD_ROOT, 'covers');
const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');

for (const dir of [AUDIO_DIR, COVER_DIR, AVATAR_DIR]) fs.mkdirSync(dir, { recursive: true });

// Giới hạn upload
const AUDIO_EXTENSIONS = ['.mp3', '.m4a'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB

module.exports = {
  UPLOAD_ROOT,
  AUDIO_DIR,
  COVER_DIR,
  AVATAR_DIR,
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MAX_AUDIO_BYTES,
  MAX_COVER_BYTES,
};

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { makeId } = require('../utils/ids');
const {
  AUDIO_DIR,
  COVER_DIR,
  AVATAR_DIR,
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  MAX_AUDIO_BYTES,
  MAX_COVER_BYTES,
} = require('../config/storage');

// Quy tắc cho từng trường file trong form multipart
const FIELD_RULES = {
  audio: { dir: AUDIO_DIR, extensions: AUDIO_EXTENSIONS, mimePrefix: 'audio/', label: 'File nhạc' },
  cover: { dir: COVER_DIR, extensions: IMAGE_EXTENSIONS, mimePrefix: 'image/', label: 'Ảnh bìa' },
};

class UploadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Không dùng tên file người dùng gửi lên (tránh path traversal, trùng tên): đặt theo id bài hát
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, FIELD_RULES[file.fieldname].dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.newSongId}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const rule = FIELD_RULES[file.fieldname];
  if (!rule) return cb(new UploadError(`Trường file "${file.fieldname}" không được hỗ trợ.`));
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype || '';
  const mimeOk = mime.startsWith(rule.mimePrefix) || mime === 'application/octet-stream';
  if (!rule.extensions.includes(ext) || !mimeOk) {
    return cb(new UploadError(`${rule.label} chỉ nhận định dạng: ${rule.extensions.join(', ')}.`));
  }
  cb(null, true);
};

const multerSongUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_AUDIO_BYTES, files: 2 },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

// Xoá các file đã ghi (khi dữ liệu không hợp lệ hoặc lỗi)
const removeFiles = (files) => {
  Object.values(files || {})
    .flat()
    .forEach((f) => {
      try {
        fs.unlinkSync(f.path);
      } catch {
        // file chưa được ghi hoặc đã bị xoá
      }
    });
};

// Nhận form tải bài hát: audio (bắt buộc) + cover (không bắt buộc).
// Lỗi upload trả 400 (sai định dạng) hoặc 413 (quá dung lượng), và xoá file đã ghi dở.
const uploadSongFiles = (req, res, next) => {
  req.newSongId = makeId('s');
  multerSongUpload(req, res, (err) => {
    if (err) {
      removeFiles(req.files);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: `File quá lớn. Tối đa ${MAX_AUDIO_BYTES / 1024 / 1024} MB.`,
          });
        }
        return res.status(400).json({ success: false, message: `Lỗi tải file: ${err.message}` });
      }
      return res.status(err.status || 500).json({ success: false, message: err.message });
    }
    const cover = req.files?.cover?.[0];
    if (cover && cover.size > MAX_COVER_BYTES) {
      removeFiles(req.files);
      return res.status(413).json({
        success: false,
        message: `Ảnh bìa quá lớn. Tối đa ${MAX_COVER_BYTES / 1024 / 1024} MB.`,
      });
    }
    next();
  });
};

// ---- Ảnh đại diện nghệ sĩ (form đăng ký nghệ sĩ): 1 ảnh, trường "avatar", tối đa 5 MB
const multerAvatar = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, AVATAR_DIR),
    filename: (req, file, cb) => cb(null, `${makeId('av')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype || '';
    if (file.fieldname !== 'avatar') return cb(new UploadError(`Trường file "${file.fieldname}" không được hỗ trợ.`));
    if (!IMAGE_EXTENSIONS.includes(ext) || !(mime.startsWith('image/') || mime === 'application/octet-stream')) {
      return cb(new UploadError(`Ảnh chỉ nhận định dạng: ${IMAGE_EXTENSIONS.join(', ')}.`));
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_COVER_BYTES, files: 1 },
}).single('avatar');

const uploadAvatarFile = (req, res, next) => {
  multerAvatar(req, res, (err) => {
    if (err) {
      if (req.file) removeFiles({ avatar: [req.file] });
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: `Ảnh quá lớn. Tối đa ${MAX_COVER_BYTES / 1024 / 1024} MB.` });
      }
      return res.status(err.status || 400).json({ success: false, message: err.message });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh.' });
    next();
  });
};

// ---- Ảnh trong Artist Studio (ảnh bìa bài hát / album, ảnh đại diện, ảnh bìa trang nghệ sĩ):
// 1 ảnh, trường "image", tối đa 5 MB, lưu vào thư mục covers với tên ngẫu nhiên
const multerStudioImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, COVER_DIR),
    filename: (req, file, cb) => cb(null, `${makeId('img')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype || '';
    if (file.fieldname !== 'image') return cb(new UploadError(`Trường file "${file.fieldname}" không được hỗ trợ.`));
    if (!IMAGE_EXTENSIONS.includes(ext) || !(mime.startsWith('image/') || mime === 'application/octet-stream')) {
      return cb(new UploadError(`Ảnh chỉ nhận định dạng: ${IMAGE_EXTENSIONS.join(', ')}.`));
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_COVER_BYTES, files: 1 },
}).single('image');

const uploadStudioImage = (req, res, next) => {
  multerStudioImage(req, res, (err) => {
    if (err) {
      if (req.file) removeFiles({ image: [req.file] });
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: `Ảnh quá lớn. Tối đa ${MAX_COVER_BYTES / 1024 / 1024} MB.` });
      }
      return res.status(err.status || 400).json({ success: false, message: err.message });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh.' });
    next();
  });
};

module.exports = { uploadSongFiles, uploadAvatarFile, uploadStudioImage, removeFiles };

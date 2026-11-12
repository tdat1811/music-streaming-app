const crypto = require('crypto');

// Tạo mã không trùng, VD: makeId('u') -> "u_mf3k2a9x4c1e7b".
// Không dùng số lượng bản ghi (u3, p7...) vì sau khi xoá sẽ sinh lại mã đã có.
const makeId = (prefix) => `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;

// Thoát ký tự đặc biệt để chuỗi người dùng nhập được so khớp nguyên văn trong RegExp
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { makeId, escapeRegex };

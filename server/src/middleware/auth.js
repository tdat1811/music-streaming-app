const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Khoá ký token đọc từ .env (JWT_SECRET). Nếu chưa cấu hình thì tạo khoá ngẫu nhiên
// cho lần chạy này: vẫn an toàn, nhưng khởi động lại server thì mọi người phải đăng nhập lại.
let secret = process.env.JWT_SECRET;
if (!secret) {
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  Chưa có JWT_SECRET trong .env, dùng khoá tạm thời (token mất hiệu lực khi khởi động lại).');
}

const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Tạo token chứa userId sau khi đăng nhập / đăng ký thành công
const signToken = (userId) => jwt.sign({ userId }, secret, { expiresIn: TOKEN_EXPIRES_IN });

// Bắt buộc có token hợp lệ trong header "Authorization: Bearer <token>".
// Gán req.userId để controller dùng thay cho userId do client gửi lên.
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, code: 'TOKEN_MISSING', message: 'Vui lòng đăng nhập để tiếp tục.' });
  }
  try {
    const payload = jwt.verify(token, secret);
    req.userId = payload.userId;
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      message: expired ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : 'Phiên đăng nhập không hợp lệ.',
    });
  }
};

// Chỉ cho phép truy cập dữ liệu của chính mình (route có :userId)
const requireSelf = (req, res, next) => {
  if (req.params.userId !== req.userId) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập dữ liệu của người khác.' });
  }
  next();
};

// Chỉ cho phép các vai trò được liệt kê (dùng sau requireAuth). Vai trò luôn đọc lại từ CSDL
// vì có thể đã thay đổi sau khi token được cấp. Gán req.user (id, role, artistId) cho controller.
const requireRole = (...roles) => async (req, res, next) => {
  try {
    // Nạp model khi gọi để file này không phụ thuộc CSDL lúc import (unit test middleware)
    const User = require('../models/User');
    const user = await User.findOne({ id: req.userId }).select('id name role artistId');
    if (!user) {
      return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Tài khoản không còn tồn tại.' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        code: 'ROLE_FORBIDDEN',
        message: 'Bạn không có quyền thực hiện thao tác này.',
      });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Có token hợp lệ thì gán req.userId, không có / sai thì bỏ qua (API công khai nhưng biết người xem)
const optionalAuth = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      req.userId = jwt.verify(token, secret).userId;
    } catch {
      // bỏ qua token sai / hết hạn
    }
  }
  next();
};

// userId trong token hợp lệ (không hợp lệ / không có → null). Dùng cho lockGuard.
const readUserId = (req) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    return jwt.verify(token, secret).userId || null;
  } catch {
    return null;
  }
};

module.exports = { signToken, requireAuth, requireSelf, requireRole, optionalAuth, readUserId };

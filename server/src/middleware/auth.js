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

module.exports = { signToken, requireAuth, requireSelf };

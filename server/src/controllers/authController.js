const User = require('../models/User');
const { logActivity } = require('../services/playEvents');
const { lockedResponse } = require('../middleware/lockGuard');
const Payment = require('../models/Payment');
const bcrypt = require('bcryptjs');
const { VALID_PLAN_IDS, VIP_PLAN_IDS, PLAN_PRICES, isVipUser, nextExpiryDate, VIP_REQUIRED_MESSAGE } = require('../config/plans');
const Artist = require('../models/Artist');
const { signToken } = require('../middleware/auth');
const { makeId } = require('../utils/ids');
// Các API cần đăng nhập lấy userId từ token (req.userId), không tin userId trong body.

const SALT_ROUNDS = 10;

// Đăng ký (mật khẩu được hash bằng bcrypt trước khi lưu vào DB)
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng.' });
    }

    // Hash mật khẩu bằng bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await User.create({
      id: makeId('u'),
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      planId: null,
      likedSongIds: [],
      followedArtistIds: [],
      likedAlbumIds: [],
      downloadedSongIds: [],
    });

    // Không trả password hash về client
    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: userObj,
      token: signToken(newUser.id),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Đăng nhập (so sánh mật khẩu bằng bcrypt.compare)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }

    // So sánh mật khẩu plaintext với hash trong DB bằng bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }

    // Tài khoản bị khoá (giai đoạn 5): không cho đăng nhập, báo lý do
    if (user.lockedAt) return res.status(403).json(lockedResponse(user));

    // Không trả password hash về client
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: userObj,
      token: signToken(user.id),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy thông tin tài khoản
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ id: userId }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cập nhật thông tin cá nhân (tên, email, số điện thoại)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, phone } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Thiếu userId.' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    // Kiểm tra email trùng với user khác
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const emailExists = await User.findOne({ email: normalizedEmail, id: { $ne: userId } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email này đã được sử dụng bởi tài khoản khác.' });
      }
      user.email = normalizedEmail;
    }

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công!',
      data: userObj,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Đổi mật khẩu (xác thực mật khẩu cũ bằng bcrypt, hash mật khẩu mới)
exports.changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    // Xác thực mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }

    // Hash mật khẩu mới
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công!',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Quên mật khẩu / Đặt lại mật khẩu theo email (không cần đăng nhập trước)
exports.forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ email và mật khẩu mới.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản với email này.' });
    }

    // Hash mật khẩu mới bằng bcrypt
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Nâng cấp gói cước VIP Premium
// Kích hoạt / Đổi gói cước có kiểm tra và trừ số dư
exports.subscribe = async (req, res) => {
  try {
    const userId = req.userId;
    const { planId } = req.body;
    if (!VALID_PLAN_IDS.includes(planId)) {
      return res.status(400).json({
        success: false,
        message: `Gói hội viên không hợp lệ. Chỉ chấp nhận: ${VALID_PLAN_IDS.join(', ')}.`,
      });
    }
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    // Gói mất phí: kiểm tra và trừ số dư ví (VNĐ)
    const price = PLAN_PRICES[planId] || 0;
    if (price > 0) {
      const currentBalance = user.balance || 0;
      if (currentBalance < price) {
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_BALANCE',
          message: `Số dư ví không đủ! Bạn hiện có ${currentBalance.toLocaleString('vi-VN')}đ, cần ${price.toLocaleString('vi-VN')}đ để thanh toán. Vui lòng nạp thêm tiền qua MoMo.`,
        });
      }
      user.balance -= price;
    }

    // Gói VIP có thời hạn 1 tháng kể từ khi thanh toán (còn hạn thì cộng dồn); gói Free không có hạn
    const wasActiveVip = isVipUser(user);
    if (VIP_PLAN_IDS.includes(planId)) {
      user.planExpiresAt = nextExpiryDate(user.planId === planId ? user.planExpiresAt : null);
    } else {
      user.planExpiresAt = null;
    }
    user.planId = planId;
    await user.save();
    // Lịch sử thanh toán (giai đoạn 6) – chỉ ghi khi mua / gia hạn gói VIP
    if (VIP_PLAN_IDS.includes(planId)) {
      await Payment.create({
        id: makeId('pay'),
        userId,
        type: 'vip',
        amount: price,
        currency: 'VND',
        balanceAfter: user.balance || 0,
        description: wasActiveVip ? 'VIP Premium – renew 1 month' : 'VIP Premium – 1 month',
      });
    }

    res.status(200).json({
      success: true,
      message: wasActiveVip && VIP_PLAN_IDS.includes(planId)
        ? `Gia hạn gói ${planId} thành công!`
        : `Thanh toán thành công! Đã kích hoạt gói cước ${planId}.`,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Thả tim / Bỏ thích bài hát
exports.toggleLikeSong = async (req, res) => {
  try {
    const userId = req.userId;
    const { songId } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    const isLiked = user.likedSongIds.includes(songId);
    if (isLiked) {
      user.likedSongIds = user.likedSongIds.filter((id) => id !== songId);
    } else {
      user.likedSongIds.unshift(songId);
    }
    await user.save();
    await logActivity(isLiked ? 'unlike' : 'like', { songId, userId });

    res.status(200).json({
      success: true,
      isLiked: !isLiked,
      likedSongIds: user.likedSongIds,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Theo dõi / Bỏ theo dõi nghệ sĩ
exports.toggleFollowArtist = async (req, res) => {
  try {
    const userId = req.userId;
    const { artistId } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    const isFollowing = user.followedArtistIds.includes(artistId);
    if (isFollowing) {
      user.followedArtistIds = user.followedArtistIds.filter((id) => id !== artistId);
    } else {
      user.followedArtistIds.unshift(artistId);
    }
    await user.save();

    // Cập nhật số người theo dõi của nghệ sĩ (không để âm)
    const artist = await Artist.findOneAndUpdate(
      isFollowing ? { id: artistId, followersCount: { $gt: 0 } } : { id: artistId },
      { $inc: { followersCount: isFollowing ? -1 : 1 } },
      { new: true }
    );
    if (artist) await logActivity(isFollowing ? 'unfollow' : 'follow', { artistId, userId });

    res.status(200).json({
      success: true,
      isFollowing: !isFollowing,
      followedArtistIds: user.followedArtistIds,
      followersCount: artist ? artist.followersCount : undefined,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Thả tim / Bỏ thích Album
exports.toggleLikeAlbum = async (req, res) => {
  try {
    const userId = req.userId;
    const { albumId } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    const isLiked = (user.likedAlbumIds || []).includes(albumId);
    if (isLiked) {
      user.likedAlbumIds = user.likedAlbumIds.filter((id) => id !== albumId);
    } else {
      user.likedAlbumIds = [albumId, ...(user.likedAlbumIds || [])];
    }
    await user.save();

    res.status(200).json({
      success: true,
      isLiked: !isLiked,
      likedAlbumIds: user.likedAlbumIds,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lưu bài hát đã tải về nghe ngoại tuyến
exports.downloadSong = async (req, res) => {
  try {
    const userId = req.userId;
    const { songId } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    if (!isVipUser(user)) {
      return res.status(403).json({ success: false, message: VIP_REQUIRED_MESSAGE });
    }

    if (!user.downloadedSongIds.includes(songId)) {
      user.downloadedSongIds.push(songId);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Đã lưu bài hát offline thành công!',
      downloadedSongIds: user.downloadedSongIds,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Chỉ ghi 3 số cuối của số điện thoại MoMo vào lịch sử
const maskPhone = (phone) => `•••${String(phone).trim().slice(-3)}`;

// Nạp tiền qua Ví MoMo
exports.depositMoMo = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, momoPhone } = req.body;
    const depositAmount = Number(amount);

    if (!depositAmount || depositAmount < 10000) {
      return res.status(400).json({ success: false, message: 'Số tiền nạp tối thiểu là 10.000đ.' });
    }
    if (!momoPhone || momoPhone.trim().length < 9) {
      return res.status(400).json({ success: false, message: 'Số điện thoại ví MoMo không hợp lệ.' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    // Cộng tiền vào tài khoản
    user.balance = (user.balance || 0) + depositAmount;
    await user.save();
    // Ghi lịch sử ví
    await Payment.create({
      id: makeId('pay'),
      userId,
      type: 'deposit',
      amount: depositAmount,
      currency: 'VND',
      balanceAfter: user.balance,
      description: `Top up via MoMo (${maskPhone(momoPhone)})`,
    });

    res.status(200).json({
      success: true,
      message: `Nạp thành công ${depositAmount.toLocaleString('vi-VN')}đ từ ví MoMo (${momoPhone})!`,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Rút tiền về Ví MoMo
exports.withdrawMoMo = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, momoPhone } = req.body;
    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount < 10000) {
      return res.status(400).json({ success: false, message: 'Số tiền rút tối thiểu là 10.000đ.' });
    }
    if (!momoPhone || momoPhone.trim().length < 9) {
      return res.status(400).json({ success: false, message: 'Số điện thoại ví MoMo không hợp lệ.' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    const currentBalance = user.balance || 0;
    if (currentBalance < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: `Số dư không đủ! Bạn chỉ có ${currentBalance.toLocaleString('vi-VN')}đ trong tài khoản.`,
      });
    }

    // Trừ tiền tài khoản
    user.balance -= withdrawAmount;
    await user.save();
    await Payment.create({
      id: makeId('pay'),
      userId,
      type: 'withdraw',
      amount: withdrawAmount,
      currency: 'VND',
      balanceAfter: user.balance,
      description: `Withdraw to MoMo (${maskPhone(momoPhone)})`,
    });

    res.status(200).json({
      success: true,
      message: `Rút thành công ${withdrawAmount.toLocaleString('vi-VN')}đ về ví MoMo (${momoPhone})!`,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
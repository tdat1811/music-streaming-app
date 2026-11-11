const User = require('../models/User');
const bcrypt = require('bcryptjs');

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

    const count = await User.countDocuments();
    const newUser = await User.create({
      id: `u${count + 1}`,
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

    // Không trả password hash về client
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: userObj,
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
    const { userId, name, email, phone } = req.body;
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
    const { userId, currentPassword, newPassword } = req.body;
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

// Nâng cấp gói cước VIP Premium
exports.subscribe = async (req, res) => {
  try {
    const { userId, planId } = req.body;
    const user = await User.findOneAndUpdate(
      { id: userId },
      { planId: planId },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    res.status(200).json({
      success: true,
      message: `Kích hoạt gói cước ${planId} thành công!`,
      data: user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Thả tim / Bỏ thích bài hát
exports.toggleLikeSong = async (req, res) => {
  try {
    const { userId, songId } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    const isLiked = user.likedSongIds.includes(songId);
    if (isLiked) {
      user.likedSongIds = user.likedSongIds.filter((id) => id !== songId);
    } else {
      user.likedSongIds.unshift(songId);
    }
    await user.save();

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
    const { userId, artistId } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    const isFollowing = user.followedArtistIds.includes(artistId);
    if (isFollowing) {
      user.followedArtistIds = user.followedArtistIds.filter((id) => id !== artistId);
    } else {
      user.followedArtistIds.unshift(artistId);
    }
    await user.save();

    res.status(200).json({
      success: true,
      isFollowing: !isFollowing,
      followedArtistIds: user.followedArtistIds,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Thả tim / Bỏ thích Album
exports.toggleLikeAlbum = async (req, res) => {
  try {
    const { userId, albumId } = req.body;
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
    const { userId, songId } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

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

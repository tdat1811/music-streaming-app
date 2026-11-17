const fs = require('fs');

// Đọc thời lượng bài hát từ file nhạc (mp3 / m4a) để nghệ sĩ không phải tự nhập.
// Cách 1: thư viện music-metadata (chính xác, nhiều định dạng).
// Cách 2 (dự phòng, khi không nạp được thư viện – VD môi trường kiểm thử): tự đọc
//   - m4a: hộp "mvhd" chứa timescale và duration
//   - mp3: khung đầu tiên (bitrate, tần số mẫu) + header Xing/Info nếu có (VBR), nếu không thì tính theo CBR

const pad = (n) => String(n).padStart(2, '0');

// 222.4 giây -> "03:42"; 3730 -> "1:02:10"; không hợp lệ -> null
const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

// ---- m4a / mp4: tìm hộp mvhd
const m4aSeconds = (buf) => {
  const at = buf.indexOf('mvhd');
  if (at < 4) return null;
  const version = buf[at + 4];
  if (version === 0) {
    const timescale = buf.readUInt32BE(at + 16);
    const duration = buf.readUInt32BE(at + 20);
    return timescale ? duration / timescale : null;
  }
  if (version === 1) {
    const timescale = buf.readUInt32BE(at + 24);
    const duration = Number(buf.readBigUInt64BE(at + 28));
    return timescale ? duration / timescale : null;
  }
  return null;
};

// ---- mp3 (MPEG-1/2 Layer III)
const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] };

const mp3Seconds = (buf) => {
  let offset = 0;
  // Bỏ qua thẻ ID3v2 ở đầu file (kích thước dạng syncsafe)
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
    offset = 10 + size;
  }
  // Tìm khung hợp lệ đầu tiên
  for (; offset < buf.length - 4; offset++) {
    if (buf[offset] !== 0xff || (buf[offset + 1] & 0xe0) !== 0xe0) continue;
    const verBits = (buf[offset + 1] >> 3) & 3;
    const layerBits = (buf[offset + 1] >> 1) & 3;
    const bitrateIdx = buf[offset + 2] >> 4;
    const rateIdx = (buf[offset + 2] >> 2) & 3;
    if (verBits === 1 || layerBits !== 1 || bitrateIdx === 0 || bitrateIdx === 15 || rateIdx === 3) continue;
    const version = verBits === 3 ? 1 : verBits === 2 ? 2 : 2.5;
    const bitrate = BITRATES[version === 1 ? 1 : 2][bitrateIdx] * 1000;
    const sampleRate = SAMPLE_RATES[version][rateIdx];
    const samplesPerFrame = version === 1 ? 1152 : 576;
    const mono = (buf[offset + 3] >> 6) === 3;
    // Header Xing/Info (file VBR) nằm sau side info của khung đầu
    const sideInfo = version === 1 ? (mono ? 17 : 32) : mono ? 9 : 17;
    const xing = offset + 4 + sideInfo;
    const tag = buf.toString('latin1', xing, xing + 4);
    if ((tag === 'Xing' || tag === 'Info') && buf.readUInt32BE(xing + 4) & 1) {
      const frames = buf.readUInt32BE(xing + 8);
      return (frames * samplesPerFrame) / sampleRate;
    }
    return ((buf.length - offset) * 8) / bitrate;
  }
  return null;
};

const fallbackSeconds = (filePath) => {
  const buf = fs.readFileSync(filePath);
  return /\.(m4a|mp4)$/i.test(filePath) ? m4aSeconds(buf) : mp3Seconds(buf);
};

// Trả về "mm:ss" hoặc null nếu không đọc được (file hỏng / không phải file nhạc thật)
const readDuration = async (filePath) => {
  try {
    // music-metadata là ES module; nạp khi cần, nạp không được thì dùng cách dự phòng
    const mm = require('music-metadata');
    const meta = await mm.parseFile(filePath, { duration: true });
    const result = formatDuration(meta?.format?.duration);
    if (result) return result;
  } catch {
    // dùng cách dự phòng bên dưới
  }
  try {
    return formatDuration(fallbackSeconds(filePath));
  } catch {
    return null;
  }
};

module.exports = { formatDuration, readDuration, m4aSeconds, mp3Seconds };

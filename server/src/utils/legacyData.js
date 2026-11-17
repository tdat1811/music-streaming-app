// Chuyển dữ liệu kiểu cũ sang kiểu mới (dùng chung cho seedData.js và script migrate).

const MULTIPLIERS = { K: 1e3, M: 1e6, B: 1e9 };

// "12.8M" -> 12800000, "2,1M" -> 2100000, "85.4M Followers" -> 85400000, "12,345" -> 12345.
// Đã là số thì giữ nguyên (làm tròn, không âm). Không đọc được -> 0.
// Cùng quy tắc với parsePlays ở app (src/utils/plays.ts).
const parseCount = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  if (typeof value !== 'string') return 0;
  const text = value.trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/^([\d.,]+)([KMB])?/);
  if (!match) return 0;
  const [, digits, suffix] = match;
  // Có hậu tố K/M/B thì dấu phẩy là dấu thập phân ("2,1M"); không có thì là dấu phân cách hàng nghìn
  const numeric = suffix ? digits.replace(',', '.') : digits.replace(/[.,]/g, '');
  const number = parseFloat(numeric);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * (suffix ? MULTIPLIERS[suffix] : 1));
};

// So tên không phân biệt hoa thường / dấu / khoảng trắng thừa
const normalizeName = (name) =>
  String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Tách nghệ sĩ chính khỏi chuỗi có khách mời: "The Weeknd ft. Daft Punk" -> "The Weeknd"
const FEATURING_SPLIT = /\s+(?:ft\.?|feat\.?|featuring|x|&)\s+|\s*,\s*/i;

// Tạo hàm tìm artistId theo tên nghệ sĩ (khớp nguyên tên, nếu không thì khớp nghệ sĩ chính)
const buildArtistResolver = (artists) => {
  const byName = new Map(artists.map((a) => [normalizeName(a.name), a.id]));
  return (artistName) => {
    const exact = byName.get(normalizeName(artistName));
    if (exact) return exact;
    const main = String(artistName || '').split(FEATURING_SPLIT)[0];
    return byName.get(normalizeName(main)) || null;
  };
};

module.exports = { parseCount, normalizeName, buildArtistResolver };

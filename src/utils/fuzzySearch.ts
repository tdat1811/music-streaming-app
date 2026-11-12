// Tìm kiếm tương đối (fuzzy search) dùng chung cho Search và Library.
// - Không phân biệt hoa/thường, bỏ dấu tiếng Việt ("son tung" khớp "Sơn Tùng")
// - Khớp theo từng từ, không cần đúng thứ tự ("lights blinding" khớp "Blinding Lights")
// - Khớp đầu từ / một phần từ ("weekn" khớp "The Weeknd")
// - Chịu lỗi gõ sai 1-2 ký tự ("blindng" khớp "Blinding")
// Bản tương tự cho máy chủ nằm ở server/src/utils/fuzzySearch.js, sửa thì sửa cả hai.

export const normalizeText = (text: unknown): string =>
  String(text ?? '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Số ký tự được phép gõ sai theo độ dài từ khoá
const allowedTypos = (length: number) => (length <= 3 ? 0 : length <= 6 ? 1 : 2);

// Khoảng cách Levenshtein, dừng sớm khi đã vượt quá max
const editDistance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
};

// Điểm của một từ khoá so với các từ của nội dung (0 = không khớp)
const tokenScore = (token: string, words: string[], compact: string): number => {
  let best = 0;
  const typos = allowedTypos(token.length);
  for (const word of words) {
    if (word === token) return 1;
    if (word.startsWith(token)) best = Math.max(best, 0.9);
    else if (token.length >= 2 && word.includes(token)) best = Math.max(best, 0.7);
    else if (typos > 0) {
      // So với cả từ và phần đầu của từ (đang gõ dở mà gõ sai)
      const whole = editDistance(token, word, typos);
      const prefix =
        word.length > token.length ? editDistance(token, word.slice(0, token.length), typos) : typos + 1;
      const distance = Math.min(whole, prefix);
      if (distance <= typos) best = Math.max(best, 0.6 - 0.1 * distance);
    }
  }
  // Gõ liền không cách: "blindinglights"
  if (best === 0 && token.length >= 3 && compact.includes(token)) best = 0.5;
  return best;
};

// Điểm liên quan của nội dung (gộp nhiều trường) với từ khoá. 0 = không khớp.
export const fuzzyScore = (query: string, fields: unknown[]): number => {
  const q = normalizeText(query);
  if (!q) return 1;
  const target = normalizeText(fields.filter(Boolean).join(' '));
  if (!target) return 0;
  // Khớp nguyên cụm được ưu tiên cao nhất
  if (target.includes(q)) return target.startsWith(q) ? 3 : 2;

  const words = target.split(' ');
  const compact = target.replace(/ /g, '');
  const tokens = q.split(' ');
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(token, words, compact);
    if (score === 0) return 0; // Mọi từ khoá đều phải khớp
    total += score;
  }
  return total / tokens.length;
};

// Lọc và sắp xếp theo độ liên quan; điểm bằng nhau thì giữ thứ tự ban đầu
export const fuzzySearch = <T>(items: T[], query: string, getFields: (item: T) => unknown[]): T[] => {
  if (!normalizeText(query)) return items;
  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, getFields(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
};

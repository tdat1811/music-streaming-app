// Tìm kiếm tương đối (fuzzy search) phía máy chủ.
// Cùng thuật toán với src/utils/fuzzySearch.ts ở ứng dụng, sửa thì sửa cả hai.
// - Không phân biệt hoa/thường, bỏ dấu tiếng Việt
// - Khớp theo từng từ, không cần đúng thứ tự, khớp đầu từ / một phần từ
// - Chịu lỗi gõ sai 1-2 ký tự

const normalizeText = (text) =>
  String(text == null ? '' : text)
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const allowedTypos = (length) => (length <= 3 ? 0 : length <= 6 ? 1 : 2);

const editDistance = (a, b, max) => {
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

const tokenScore = (token, words, compact) => {
  let best = 0;
  const typos = allowedTypos(token.length);
  for (const word of words) {
    if (word === token) return 1;
    if (word.startsWith(token)) best = Math.max(best, 0.9);
    else if (token.length >= 2 && word.includes(token)) best = Math.max(best, 0.7);
    else if (typos > 0) {
      const whole = editDistance(token, word, typos);
      const prefix =
        word.length > token.length ? editDistance(token, word.slice(0, token.length), typos) : typos + 1;
      const distance = Math.min(whole, prefix);
      if (distance <= typos) best = Math.max(best, 0.6 - 0.1 * distance);
    }
  }
  if (best === 0 && token.length >= 3 && compact.includes(token)) best = 0.5;
  return best;
};

const fuzzyScore = (query, fields) => {
  const q = normalizeText(query);
  if (!q) return 1;
  const target = normalizeText(fields.filter(Boolean).join(' '));
  if (!target) return 0;
  if (target.includes(q)) return target.startsWith(q) ? 3 : 2;

  const words = target.split(' ');
  const compact = target.replace(/ /g, '');
  const tokens = q.split(' ');
  let total = 0;
  for (const token of tokens) {
    const score = tokenScore(token, words, compact);
    if (score === 0) return 0;
    total += score;
  }
  return total / tokens.length;
};

const fuzzySearch = (items, query, getFields) => {
  if (!normalizeText(query)) return items;
  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, getFields(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
};

module.exports = { normalizeText, fuzzyScore, fuzzySearch };

// Hiển thị thống kê của nghệ sĩ (giai đoạn 4): nhãn, % thay đổi, trục biểu đồ, nguồn lượt nghe

export type StatsRange = '7' | '30' | 'all';
export const STATS_RANGES: { key: StatsRange; label: string }[] = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: 'all', label: 'All time' },
];

export interface SeriesPoint {
  key: string; // "2026-11-16" (ngày), "2026-11" (tháng) hoặc "before" (lượt nghe cũ)
  plays: number;
  releases?: string[];
}
export interface SourceRow {
  source: string;
  plays: number;
  percent: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Múi giờ của máy (phút lệch so với UTC, Việt Nam = 420) gửi kèm để máy chủ gộp theo đúng ngày của người xem
export const deviceTz = () => -new Date().getTimezoneOffset();

export const formatNumber = (n: number) => Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// +27 / −4 / 0 (dùng dấu trừ dài cho dễ đọc)
export const signed = (n: number) => (n > 0 ? `+${formatNumber(n)}` : n < 0 ? `−${formatNumber(-n)}` : '0');

export type ChangeTone = 'up' | 'down' | 'flat';
// change: % so với kỳ trước; null = kỳ trước bằng 0 nên không tính được %; undefined = không so sánh (All time)
export const formatChange = (change: number | null | undefined, suffix = ''): { text: string; tone: ChangeTone } | null => {
  if (change === undefined) return null;
  if (change === null) return { text: '▲ new', tone: 'up' };
  if (change === 0) return { text: '— same as before', tone: 'flat' };
  return { text: `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}%${suffix}`, tone: change > 0 ? 'up' : 'down' };
};

const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
};

// "Nov 6" / "Nov 2026" / "Before"
export const pointLabel = (key: string): string => {
  if (key === 'before') return 'Before';
  const { y, m, d } = parseKey(key);
  return d ? `${MONTHS[m - 1]} ${d}` : `${MONTHS[m - 1]} ${y}`;
};

const weekday = (key: string) => {
  const { y, m, d } = parseKey(key);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

// Nhãn trục ngang: 7 ngày → thứ; 30 ngày → 4 mốc ngày; theo tháng → 3 tháng một nhãn (cột "Before" luôn có nhãn)
export const axisLabels = (series: SeriesPoint[]): string[] => {
  const n = series.length;
  const isMonth = series.some((p) => p.key !== 'before' && p.key.length === 7);
  if (isMonth) {
    return series.map((p, i) => {
      if (p.key === 'before') return 'Before';
      return (n - 1 - i) % 3 === 0 ? MONTHS[parseKey(p.key).m - 1] : '';
    });
  }
  if (n <= 7) return series.map((p) => weekday(p.key));
  const marks = new Set([0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1]);
  return series.map((p, i) => (marks.has(i) ? pointLabel(p.key) : ''));
};

// "Nov 10 – Nov 16"
export const rangeLabel = (series: SeriesPoint[]): string => {
  const real = series.filter((p) => p.key !== 'before');
  if (!real.length) return '';
  return `${pointLabel(real[0].key)} – ${pointLabel(real[real.length - 1].key)}`;
};

// Dòng hiện khi bấm một cột
export const tooltipLines = (point: SeriesPoint): { title: string; sub: string | null } => {
  const plays = `${formatNumber(point.plays)} play${point.plays === 1 ? '' : 's'}`;
  if (point.key === 'before') return { title: plays, sub: 'Before daily stats started' };
  const rel = point.releases?.length ? `Released "${point.releases[0]}"${point.releases.length > 1 ? ` +${point.releases.length - 1}` : ''}` : null;
  return { title: `${pointLabel(point.key)} · ${plays}`, sub: rel };
};

export const SOURCE_LABELS: Record<string, string> = {
  search: 'Search',
  home: 'Home & Charts',
  artist: 'Artist page',
  album: 'Albums',
  playlist: 'Playlists',
  feed: 'Feed',
  library: 'Library',
  other: 'Other',
  unknown: 'Unknown',
};
export const sourceLabel = (source: string) => SOURCE_LABELS[source] || 'Other';

// Rút gọn danh sách nguồn: giữ `max - 1` nguồn lớn nhất, phần còn lại gộp vào "Other".
// "Unknown" (lượt nghe cũ không rõ nguồn) luôn đứng riêng ở cuối.
export const compactSources = (sources: SourceRow[], max = 4): SourceRow[] => {
  const unknown = sources.find((s) => s.source === 'unknown');
  const known = sources.filter((s) => s.source !== 'unknown');
  const room = max - (unknown ? 1 : 0);
  let rows = known;
  if (known.length > room) {
    const named = known.filter((s) => s.source !== 'other');
    const top = named.slice(0, room - 1);
    const rest = known.filter((s) => !top.includes(s));
    rows = [
      ...top,
      { source: 'other', plays: rest.reduce((a, s) => a + s.plays, 0), percent: rest.reduce((a, s) => a + s.percent, 0) },
    ];
  }
  return unknown ? [...rows, unknown] : rows;
};

// "since Nov 1, 2026" (theo ngày) / "since Mar 2025" (theo tháng)
export const sinceLabel = (iso: string | null | undefined, withDay = true): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return withDay ? `since ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : `since ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Chiều cao các cột (0..1). Cột "Before" có thể lớn hơn nhiều so với các tháng nên bị chặn ở 1
// để không làm các cột còn lại dẹt hết.
export const barHeights = (series: SeriesPoint[]): number[] => {
  const max = Math.max(0, ...series.filter((p) => p.key !== 'before').map((p) => p.plays));
  const scale = max || Math.max(0, ...series.map((p) => p.plays));
  if (!scale) return series.map(() => 0);
  return series.map((p) => Math.min(1, p.plays / scale));
};

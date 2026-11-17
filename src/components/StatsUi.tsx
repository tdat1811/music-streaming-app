import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import {
  axisLabels,
  barHeights,
  ChangeTone,
  formatChange,
  SeriesPoint,
  sourceLabel,
  SourceRow,
  STATS_RANGES,
  StatsRange,
  tooltipLines,
} from '../utils/stats';
import { BottomSheet } from './StudioUi';

// Thành phần giao diện dùng chung cho các màn thống kê (giai đoạn 4)

const TONE_COLOR: Record<ChangeTone, string> = { up: '#16A34A', down: '#E11D48', flat: COLORS.textMuted };

// Chọn khoảng thời gian: 7 days / 30 days / All time
export const RangeTabs: React.FC<{ value: StatsRange; onChange: (r: StatsRange) => void }> = ({ value, onChange }) => (
  <View style={styles.seg}>
    {STATS_RANGES.map((r) => (
      <TouchableOpacity
        key={r.key}
        style={[styles.segItem, value === r.key && styles.segOn]}
        onPress={() => onChange(r.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: value === r.key }}
        accessibilityLabel={r.label}
      >
        <Text style={[styles.segText, value === r.key && styles.segTextOn]}>{r.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// Ô số liệu: nhãn, số lớn, dòng phụ (% thay đổi có màu hoặc ghi chú xám)
export const StatTile: React.FC<{ label: string; value: string; change?: number | null; changeSuffix?: string; note?: string }> = ({
  label,
  value,
  change,
  changeSuffix,
  note,
}) => {
  const c = formatChange(change, changeSuffix);
  return (
    <View style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {c ? <Text style={[styles.tileChange, { color: TONE_COLOR[c.tone] }]}>{c.text}</Text> : !!note && <Text style={styles.tileNote}>{note}</Text>}
    </View>
  );
};

export const SectionTitle: React.FC<{ title: string; right?: string }> = ({ title, right }) => (
  <View style={styles.sec}>
    <Text style={styles.secTitle}>{title}</Text>
    {!!right && <Text style={styles.secRight}>{right}</Text>}
  </View>
);

const TIP_WIDTH = 170;

// Biểu đồ cột lượt nghe. Bấm một cột để xem số của ngày / tháng đó (và tên bài ra mắt nếu có).
// Cột cuối (hôm nay / tháng này) tô đậm; cột "before" (lượt nghe cũ) màu xám.
export const BarChart: React.FC<{ series: SeriesPoint[]; height?: number }> = ({ series, height = 120 }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const heights = barHeights(series);
  const labels = axisLabels(series);
  const n = series.length;
  const gap = n > 14 ? 2 : 6;
  const point = selected !== null ? series[selected] : null;
  const tip = point ? tooltipLines(point) : null;
  const center = selected !== null && n ? ((selected + 0.5) / n) * width : 0;
  const tipLeft = Math.max(0, Math.min(width - TIP_WIDTH, center - TIP_WIDTH / 2));

  return (
    <View>
      <View style={styles.tipRow}>
        {tip && width > 0 && (
          <View style={[styles.tip, { left: tipLeft, width: TIP_WIDTH }]}>
            <Text style={styles.tipTitle} numberOfLines={1}>{tip.title}</Text>
            {!!tip.sub && <Text style={styles.tipSub} numberOfLines={1}>{tip.sub}</Text>}
          </View>
        )}
      </View>
      <View style={[styles.chart, { height, gap }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {series.map((p, i) => {
          const isLast = i === n - 1;
          const isBefore = p.key === 'before';
          const color = selected === i ? COLORS.primaryDark : isBefore ? '#E5E7EB' : isLast ? COLORS.primary : '#BDEFF3';
          return (
            <TouchableOpacity
              key={p.key}
              style={styles.barSlot}
              activeOpacity={0.7}
              onPress={() => setSelected(selected === i ? null : i)}
              accessibilityLabel={`${tooltipLines(p).title}`}
            >
              {!!p.releases?.length && <View style={styles.releaseDot} />}
              <View style={{ height: Math.max(p.plays > 0 ? 3 : 1, heights[i] * (height - 12)), backgroundColor: color, borderTopLeftRadius: n > 14 ? 2 : 5, borderTopRightRadius: n > 14 ? 2 : 5 }} />
            </TouchableOpacity>
          );
        })}
      </View>
      {n > 14 ? (
        // Nhiều cột: chỉ vài mốc ngày, rải đều theo chiều ngang
        <View style={[styles.axis, styles.axisSpread]}>
          {labels.filter(Boolean).map((l) => (
            <Text key={l} style={styles.axisText}>{l}</Text>
          ))}
        </View>
      ) : (
        <View style={[styles.axis, { gap }]}>
          {labels.map((l, i) => (
            <View key={series[i].key} style={styles.axisSlot}>
              {!!l && <Text style={styles.axisText} numberOfLines={1}>{l}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// Danh sách nguồn lượt nghe: tên, thanh tỉ lệ, %
export const SourceList: React.FC<{ sources: SourceRow[] }> = ({ sources }) => (
  <View>
    {sources.map((s) => (
      <View key={s.source} style={styles.srcRow} accessibilityLabel={`${sourceLabel(s.source)} ${s.percent}%`}>
        <Text style={styles.srcName} numberOfLines={1}>{sourceLabel(s.source)}</Text>
        <View style={styles.srcTrack}>
          <View style={[styles.srcFill, { width: `${Math.max(2, Math.min(100, s.percent))}%`, backgroundColor: s.source === 'unknown' ? '#C4B5FD' : '#7B2CBF' }]} />
        </View>
        <Text style={styles.srcPct}>{s.percent}%</Text>
      </View>
    ))}
  </View>
);

// Ba ô nhỏ nằm ngang (người theo dõi, tương tác Feed)
export const TripleBox: React.FC<{ items: { value: string; label: string; tone?: ChangeTone }[] }> = ({ items }) => (
  <View style={styles.triple}>
    {items.map((it) => (
      <View key={it.label} style={styles.tripleItem}>
        <Text style={[styles.tripleValue, it.tone && { color: TONE_COLOR[it.tone] }]}>{it.value}</Text>
        <Text style={styles.tripleLabel}>{it.label}</Text>
      </View>
    ))}
  </View>
);

const INFO_RULES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'play', text: 'A play counts after 30 seconds of listening (or half of a short song).' },
  { icon: 'timer-outline', text: "The same listener is counted at most once per song every 10 minutes, so replays and bots can't inflate your numbers." },
  { icon: 'mic-outline', text: 'Your own plays are not counted.' },
  { icon: 'trending-up-outline', text: 'Changes compare with the previous period of the same length. All time shows totals only.' },
  { icon: 'compass-outline', text: 'Sources show where fans started playing: Search, Home & Charts, your page, albums, playlists, the Feed or their library.' },
];

// Bảng giải thích cách tính số liệu (nút ⓘ)
export const StatsInfoSheet: React.FC<{ visible: boolean; onClose: () => void; since?: string }> = ({ visible, onClose, since }) => (
  <BottomSheet visible={visible} onClose={onClose}>
    <Text style={styles.infoTitle}>How stats are counted</Text>
    {INFO_RULES.map((r) => (
      <View key={r.text} style={styles.rule}>
        <View style={styles.ruleIcon}><Ionicons name={r.icon} size={14} color={COLORS.primaryDark} /></View>
        <Text style={styles.ruleText}>{r.text}</Text>
      </View>
    ))}
    <View style={[styles.rule, styles.ruleLast]}>
      <View style={styles.ruleIcon}><Ionicons name="calendar-outline" size={14} color={COLORS.primaryDark} /></View>
      <Text style={styles.ruleText}>
        {since ? `Daily stats ${since}. Older plays are only included in your all-time total.` : 'Daily stats start with your first counted play.'}
      </Text>
    </View>
    <TouchableOpacity onPress={onClose} style={styles.infoClose} accessibilityLabel="Got it">
      <Text style={styles.infoCloseText}>Got it</Text>
    </TouchableOpacity>
  </BottomSheet>
);

export const statsStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: COLORS.tagBg, borderRadius: 12, padding: 3, marginBottom: 12 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  segOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
  segTextOn: { color: COLORS.textPrimary },
  tile: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  tileLabel: { fontSize: 11.5, color: COLORS.textSecondary, fontWeight: '600' },
  tileValue: { fontSize: 21, fontWeight: '900', color: COLORS.textPrimary, marginTop: 2 },
  tileChange: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  tileNote: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 8 },
  secTitle: { fontSize: 15, fontWeight: '900', color: COLORS.textPrimary },
  secRight: { fontSize: 12, color: COLORS.textSecondary },
  tipRow: { height: 40 },
  tip: { position: 'absolute', bottom: 4, backgroundColor: '#111216', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8 },
  tipTitle: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' },
  tipSub: { color: '#D1D5DB', fontSize: 10.5, marginTop: 1 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  releaseDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#7B2CBF', alignSelf: 'center', marginBottom: 2 },
  axis: { flexDirection: 'row', marginTop: 4, height: 14 },
  axisSlot: { flex: 1, alignItems: 'center' },
  axisText: { fontSize: 10.5, color: COLORS.textMuted },
  axisSpread: { justifyContent: 'space-between' },
  srcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  srcName: { width: 96, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  srcTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.tagBg, overflow: 'hidden' },
  srcFill: { height: '100%', borderRadius: 4 },
  srcPct: { width: 38, textAlign: 'right', fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  triple: { flexDirection: 'row', gap: 8 },
  tripleItem: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  tripleValue: { fontSize: 16, fontWeight: '900', color: COLORS.textPrimary },
  tripleLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  infoTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  rule: { flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  ruleLast: { borderBottomWidth: 0 },
  ruleIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#E6FAFB', alignItems: 'center', justifyContent: 'center' },
  ruleText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: COLORS.textPrimary },
  infoClose: { marginTop: 8, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.tagBg },
  infoCloseText: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
});

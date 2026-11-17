import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { AppButton, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { BottomSheet } from '../../src/components/StudioUi';
import { deviceTz, formatNumber } from '../../src/utils/stats';
import { timeAgoText } from '../../src/utils/time';
import { fallbackText, footerText } from '../../src/utils/insights';

const PURPLE = '#7B2CBF';
const GRADIENT = '#6B3FC4';
const errText = (err: unknown) => (isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
const TONE_STYLE: Record<string, { bg: string; fg: string }> = {
  positive: { bg: '#DCFCE7', fg: '#16A34A' },
  neutral: { bg: '#F3F4F6', fg: '#686A70' },
  negative: { bg: '#FFE4E6', fg: '#E11D48' },
};
// "gemini-3.5-flash-lite" → "Gemini 3.5 Flash-Lite"
const modelLabel = (name: string) =>
  name
    .split('-')
    .reduce<string[]>((out, p) => {
      const cap = /^\d/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1);
      if (p === 'lite' && out.length) out[out.length - 1] += `-${cap}`;
      else out.push(cap);
      return out;
    }, [])
    .join(' ');

interface InsightScreenProps {
  // Bản cần xem (từ thẻ phân tích trong AI Assistant); không có → bản mới nhất ≤ 24 giờ
  insightId?: string | null;
  onBack?: () => void;
}

// Bản phân tích fan đầy đủ (giai đoạn 6, I3–I4). Giai đoạn 6b: mở từ "View full report" trên thẻ trong AI Assistant;
// tạo / làm mới phân tích và lượt dùng nằm trong AI Assistant.
export const InsightScreen: React.FC<InsightScreenProps> = ({ insightId, onBack }) => {
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      setError(null);
      try {
        const res = insightId ? await api.studio.getInsightById(insightId) : await api.studio.getInsight(deviceTz());
        setInsight(res.data.insight || null);
      } catch (err) {
        setError(errText(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [insightId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <ScreenHeader
      title="Fan insight report"
      onBack={onBack}
      right={
        <TouchableOpacity onPress={() => setInfo(true)} accessibilityLabel="How AI Fan Insight works" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      }
    />
  );

  const renderResult = () => {
    const r = insight.result;
    const s = r.sentiment;
    return (
      <View>
        {insight.source === 'basic' && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              <Text style={styles.bold}>Showing a basic summary. </Text>
              {fallbackText(insight.fallbackReason)}
            </Text>
          </View>
        )}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{r.headline}</Text>
          {!!r.summary && <Text style={styles.heroText}>{r.summary}</Text>}
          <View style={styles.chips}>
            <Text style={styles.chip}>Last {insight.windowDays} days</Text>
            <Text style={styles.chip}>{insight.commentCount} comments</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How fans feel{insight.source === 'basic' ? ' (estimate)' : ''}</Text>
          <View style={styles.bar}>
            <View style={{ flex: s.positive, backgroundColor: '#16A34A' }} />
            <View style={{ flex: s.neutral, backgroundColor: '#CBD5E1' }} />
            <View style={{ flex: s.negative, backgroundColor: '#E11D48' }} />
          </View>
          <View style={styles.legend}>
            {[
              ['Positive', s.positive, '#16A34A'],
              ['Neutral', s.neutral, '#CBD5E1'],
              ['Negative', s.negative, '#E11D48'],
            ].map(([l, v, c]) => (
              <View key={l as string} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c as string }]} />
                <Text style={styles.legendText}>{l} {v}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.reviewCard]}>
          <View style={styles.cardHead}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={PURPLE} />
            <Text style={styles.cardTitleInline}>Overall comment review</Text>
          </View>
          <Text style={styles.review}>{r.overallComment}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What fans talk about</Text>
          {r.themes.map((t: any, i: number) => (
            <View key={`${t.title}${i}`} style={[styles.theme, i === r.themes.length - 1 && styles.last]}>
              <Text style={[styles.pill, { backgroundColor: TONE_STYLE[t.tone]?.bg, color: TONE_STYLE[t.tone]?.fg }]}>{t.count}</Text>
              <Text style={styles.themeText}>{t.title}</Text>
            </View>
          ))}
        </View>

        {r.songHighlights.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Song highlights</Text>
            {r.songHighlights.map((h: any, i: number) => {
              const up = typeof h.change === 'number' && h.change > 0;
              const down = typeof h.change === 'number' && h.change < 0;
              return (
                <View key={h.songId} style={[styles.theme, i === r.songHighlights.length - 1 && styles.last]}>
                  <Text style={[styles.pill, up ? { backgroundColor: '#DCFCE7', color: '#16A34A' } : down ? { backgroundColor: '#FFE4E6', color: '#E11D48' } : { backgroundColor: '#F3F4F6', color: '#686A70' }]}>
                    {up ? `▲ ${h.change}%` : down ? `▼ ${Math.abs(h.change)}%` : `${formatNumber(h.plays)} plays`}
                  </Text>
                  <View style={styles.flex}>
                    <Text style={styles.themeText}>{h.title}</Text>
                    {!!h.note && <Text style={styles.sub}>{h.note}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="bulb-outline" size={16} color={COLORS.textPrimary} />
            <Text style={styles.cardTitleInline}>Suggested next steps</Text>
          </View>
          {r.actions.map((a: any, i: number) => (
            <View key={`${a.title}${i}`} style={[styles.act, i === r.actions.length - 1 && styles.last]}>
              <View style={styles.actNo}><Text style={styles.actNoText}>{i + 1}</Text></View>
              <Text style={styles.actText}>
                <Text style={styles.bold}>{a.title}</Text>
                {a.reason ? ` ${a.reason}` : ''}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.foot}>
          {footerText(insight.source, timeAgoText(insight.createdAt), insight.commentCount)}
          {insight.source === 'gemini' ? `${insight.model ? ` · ${modelLabel(insight.model)}` : ''}\nAI can make mistakes – check before acting.` : ''}
        </Text>
        <AppButton label="Back to AI Assistant" variant="outline" onPress={onBack} style={styles.mt10} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      {header}
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={PURPLE} />
        ) : error ? (
          <>
            <NoticeBox tone="error">{error}</NoticeBox>
            <AppButton label="Try again" variant="outline" onPress={() => load()} style={styles.mt12} />
          </>
        ) : insight ? (
          renderResult()
        ) : (
          <View style={styles.center}>
            <View style={styles.emptyIcon}><Ionicons name="sparkles-outline" size={32} color={PURPLE} /></View>
            <Text style={styles.emptyTitle}>No recent report</Text>
            <Text style={styles.emptyText}>Ask AI Assistant to "Phân tích fan" to get a fresh fan insight.</Text>
            <AppButton label="Back to AI Assistant" variant="outline" onPress={onBack} style={styles.stretch} />
          </View>
        )}
      </ScrollView>

      {/* I7: cách hoạt động */}
      <BottomSheet visible={info} onClose={() => setInfo(false)}>
        <Text style={styles.sheetTitle}>How AI Fan Insight works</Text>
        {[
          ['download-outline', 'Uses comments on your posts and your stats from the last 30 days.'],
          ['lock-closed-outline', "Fans' names, emails, phone numbers and links are removed before anything is sent to the AI. Removed comments and locked accounts are left out."],
          ['hardware-chip-outline', 'Analyzed by Google Gemini (free tier). Google may use the anonymized comments to improve its products – no names, emails or links are ever sent.'],
          ['time-outline', 'Reports are saved for 24 hours. A new insight counts as 1 of your 20 free AI Assistant messages per day. Results are written in Vietnamese.'],
          ['warning-outline', 'AI can make mistakes. Use it as a starting point, not a final answer.'],
        ].map(([icon, text]) => (
          <View key={text} style={styles.rule}>
            <View style={styles.ruleIcon}><Ionicons name={icon as any} size={14} color={PURPLE} /></View>
            <Text style={styles.ruleText}>{text}</Text>
          </View>
        ))}
        <AppButton label="Got it" variant="outline" onPress={() => setInfo(false)} style={styles.mt10} />
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  loader: { marginTop: 60 },
  flex: { flex: 1, minWidth: 0 },
  mt8: { marginTop: 8 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  mb10: { marginBottom: 10 },
  bold: { fontWeight: '800' },
  stretch: { alignSelf: 'stretch' },
  hero: { borderRadius: 16, padding: 14, backgroundColor: GRADIENT },
  heroTitle: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '900', lineHeight: 22 },
  heroText: { color: '#F3E8FF', fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, marginTop: 10 },
  reviewCard: { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardTitleInline: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  review: { fontSize: 13.5, lineHeight: 20, color: COLORS.textPrimary },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11.5, color: COLORS.textSecondary },
  theme: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  last: { borderBottomWidth: 0 },
  pill: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', minWidth: 30, textAlign: 'center' },
  themeText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  act: { flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  actNo: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  actNoText: { color: PURPLE, fontWeight: '900', fontSize: 11 },
  actText: { flex: 1, fontSize: 13, lineHeight: 18, color: COLORS.textPrimary },
  purpleBtn: { backgroundColor: PURPLE, marginTop: 12 },
  foot: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 10, lineHeight: 16 },
  warnBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 10, marginBottom: 10 },
  warnText: { fontSize: 12.5, color: '#92400E', lineHeight: 18 },
  spinner: { marginTop: 30, marginBottom: 14 },
  genTitle: { textAlign: 'center', fontSize: 16, fontWeight: '900', color: COLORS.textPrimary },
  genSub: { textAlign: 'center', fontSize: 12.5, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { fontSize: 11, fontWeight: '900' },
  dotOk: { backgroundColor: '#DCFCE7' },
  dotNow: { backgroundColor: '#F3E8FF' },
  dotTodo: { backgroundColor: COLORS.tagBg },
  okText: { color: '#16A34A' },
  nowText: { color: PURPLE },
  todoText: { color: COLORS.textMuted },
  stepText: { fontSize: 13, color: COLORS.textPrimary, flex: 1 },
  center: { alignItems: 'center', paddingTop: 30 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary },
  emptyText: { fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 20, textAlign: 'center', marginVertical: 10, paddingHorizontal: 8 },
  quotaCard: { alignItems: 'center', paddingVertical: 16 },
  quotaIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quotaEmoji: { fontSize: 24 },
  quotaTitle: { fontSize: 15.5, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center' },
  quotaText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  k: { fontSize: 13.5, color: COLORS.textSecondary },
  v: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  rule: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  ruleIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center' },
  ruleText: { flex: 1, fontSize: 13.5, lineHeight: 19, color: COLORS.textPrimary },
});

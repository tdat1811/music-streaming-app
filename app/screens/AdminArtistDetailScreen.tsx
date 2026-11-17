import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { formatDate } from '../../src/utils/plan';
import { formatCount } from '../../src/utils/plays';
import { AppButton, NameAvatar, NoticeBox } from '../../src/components/ArtistUi';
import { AdminShell } from '../../src/components/AdminShell';
import { ConfirmDialog, CoverImage } from '../../src/components/StudioUi';
import { RuleSheet, StrikeDots } from '../../src/components/ModerationUi';

const errText = (err: unknown) => (isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
const STATUS_TEXT: Record<string, string> = { published: 'Published', draft: 'Draft', hidden: 'Hidden by artist' };

interface AdminArtistDetailScreenProps {
  artistId: string | null;
  onBack?: () => void;
  onOpenUser?: (id: string) => void;
}

// R2: chi tiết nghệ sĩ – tick xanh, gỡ / khôi phục bài hát, ẩn / hiện trang
export const AdminArtistDetailScreen: React.FC<AdminArtistDetailScreenProps> = ({ artistId, onBack, onOpenUser }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [removing, setRemoving] = useState<any>(null);
  const [restoring, setRestoring] = useState<any>(null);
  const [hideOpen, setHideOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!artistId) return;
      if (refresh) setRefreshing(true);
      setError(null);
      try {
        const res = await api.admin.getArtist(artistId);
        setData(res.data);
      } catch (err) {
        setError(errText(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [artistId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<any>, okText: string) => {
    setBusy(true);
    try {
      const res = await fn();
      setNotice({ tone: 'ok', text: res?.message || okText });
      await load();
      return null;
    } catch (err) {
      return errText(err);
    } finally {
      setBusy(false);
    }
  };

  const toggleVerified = async (value: boolean) => {
    setData((d: any) => ({ ...d, isVerified: value }));
    const err = await run(() => api.admin.setVerified(artistId!, value), value ? 'Verified badge on.' : 'Verified badge off.');
    if (err) setNotice({ tone: 'error', text: err });
  };

  const doRestore = async () => {
    const s = restoring;
    const err = await run(() => api.admin.revokeViolation(s.removed.violationId), 'Song restored.');
    setRestoring(null);
    if (err) setNotice({ tone: 'error', text: err });
  };

  const doUnhide = async () => {
    const err = await run(() => api.admin.unhideArtist(artistId!), 'Artist page is visible again.');
    if (err) setNotice({ tone: 'error', text: err });
  };

  const owner = data?.owner;
  const max = data?.maxViolations ?? 3;
  const willLock = !!owner && owner.lockType !== 'permanent' && owner.violations + 1 > max;

  return (
    <AdminShell title="Artist" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} />
        ) : error ? (
          <>
            <NoticeBox tone="error">{error}</NoticeBox>
            <AppButton label="Try again" variant="outline" onPress={() => load()} style={styles.mt12} />
          </>
        ) : (
          data && (
            <>
              <View style={styles.hero}>
                <NameAvatar name={data.name} image={data.avatarImage} size={52} />
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <Text style={styles.heroName} numberOfLines={1}>{data.name}</Text>
                    {data.isVerified && <Ionicons name="checkmark-circle" size={15} color="#00A3FF" />}
                  </View>
                  <Text style={styles.sub}>{[data.genres.join(' · '), data.createdAt && `joined ${formatDate(data.createdAt)}`].filter(Boolean).join(' · ')}</Text>
                </View>
              </View>

              {!!notice && <NoticeBox tone={notice.tone} style={styles.mt10}>{notice.text}</NoticeBox>}

              {(data.hidden || data.ownerLocked) && (
                <View style={styles.badBox}>
                  <Text style={styles.badTitle}>{data.hidden ? 'This page is hidden by a moderator' : "Hidden because the owner's account is locked"}</Text>
                  {data.hidden && <Text style={styles.badText}>Reason: {data.hidden.ruleLabel}{data.hidden.note ? ` · "${data.hidden.note}"` : ''}</Text>}
                  <Text style={styles.badText}>Listeners can't see the page, its songs or posts.</Text>
                </View>
              )}

              <View style={styles.trio}>
                {[
                  { n: formatCount(data.followers), l: 'Followers' },
                  { n: String(data.totals.songs), l: 'Songs' },
                  { n: formatCount(data.totals.plays), l: 'Plays' },
                ].map((t) => (
                  <View key={t.l} style={styles.trioItem}>
                    <Text style={styles.trioN}>{t.n}</Text>
                    <Text style={styles.trioL}>{t.l}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.panel}>
                {owner ? (
                  <>
                    <TouchableOpacity style={styles.kv} onPress={() => onOpenUser?.(owner.id)} accessibilityLabel="Open owner account">
                      <Text style={styles.k}>Owner account</Text>
                      <Text style={[styles.v, styles.linkText]} numberOfLines={1}>{owner.email}{owner.locked ? ' (locked)' : ''} ›</Text>
                    </TouchableOpacity>
                    <View style={styles.kv}>
                      <Text style={styles.k}>Owner violations</Text>
                      <StrikeDots count={owner.violations} />
                    </View>
                  </>
                ) : (
                  <View style={styles.kv}><Text style={styles.k}>Owner account</Text><Text style={styles.v}>No owner</Text></View>
                )}
                <View style={[styles.kv, styles.last]}>
                  <View style={styles.nameRow}>
                    <Text style={styles.k}>Verified badge</Text>
                    <Ionicons name="checkmark-circle" size={14} color="#00A3FF" />
                  </View>
                  <Switch
                    value={data.isVerified}
                    onValueChange={toggleVerified}
                    disabled={busy}
                    trackColor={{ true: COLORS.primary, false: '#CBD5E1' }}
                    accessibilityLabel="Verified badge"
                  />
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Songs ({data.songs.length})</Text>
                {data.songs.length === 0 && <Text style={styles.sub}>No songs yet.</Text>}
                {data.songs.map((s: any, i: number) => (
                  <View key={s.id} style={[styles.songRow, i === data.songs.length - 1 && styles.last]}>
                    <CoverImage uri={s.coverImage} size={40} radius={8} />
                    <View style={styles.flex}>
                      <Text style={styles.songTitle} numberOfLines={1}>{s.title}</Text>
                      <Text style={[styles.sub, s.removed && styles.badInline]} numberOfLines={1}>
                        {s.removed
                          ? `Removed · ${s.removed.ruleLabel}${s.removed.number ? ` · violation #${s.removed.number}` : ''}`
                          : `${STATUS_TEXT[s.status] ?? 'Published'} · ${formatCount(s.plays)} plays`}
                      </Text>
                    </View>
                    {s.removed ? (
                      s.removed.violationId ? (
                        <TouchableOpacity onPress={() => setRestoring(s)} accessibilityLabel={`Restore ${s.title}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={styles.restore}>Restore</Text>
                        </TouchableOpacity>
                      ) : null
                    ) : (
                      <TouchableOpacity onPress={() => setRemoving(s)} accessibilityLabel={`Remove ${s.title}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.remove}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </>
          )
        )}
      </ScrollView>
      {data && (
        <View style={styles.footer}>
          {data.hidden ? (
            <AppButton label="Show artist page" onPress={doUnhide} loading={busy} />
          ) : (
            <AppButton label="Hide artist page" variant="outline" textColor="#E11D48" onPress={() => setHideOpen(true)} style={styles.dangerOutline} />
          )}
        </View>
      )}

      <RuleSheet
        visible={!!removing}
        title={`Remove "${removing?.title ?? ''}"?`}
        message={
          owner
            ? `It disappears for listeners and can't be published again. This counts as 1 violation for the owner (${owner.violations}/${max} → ${owner.violations + 1}).`
            : "It disappears for listeners and can't be published again. This page has no owner, so no violation is recorded."
        }
        warning={willLock ? "This is the owner's 4th violation: their account will be locked permanently and all their content hidden." : null}
        confirmLabel={willLock ? 'Remove & lock account' : 'Remove song'}
        onClose={() => setRemoving(null)}
        onConfirm={(v) => run(() => api.admin.removeContent('song', removing.id, v), 'Song removed.')}
      />

      <RuleSheet
        visible={hideOpen}
        title={`Hide ${data?.name ?? 'artist'}'s page?`}
        message="The page, all its songs and posts disappear for listeners until you show it again. The artist is notified. This is not counted as a violation."
        confirmLabel="Hide artist page"
        onClose={() => setHideOpen(false)}
        onConfirm={(v) => run(() => api.admin.hideArtist(artistId!, v), 'Artist page hidden.')}
      />

      <ConfirmDialog
        visible={!!restoring}
        title={`Restore "${restoring?.title ?? ''}"?`}
        message="The song becomes visible again and the owner's violation is revoked."
        onClose={() => setRestoring(null)}
      >
        <View style={styles.dialogRow}>
          <AppButton label="Cancel" variant="outline" onPress={() => setRestoring(null)} style={styles.flex} />
          <AppButton label="Restore" onPress={doRestore} loading={busy} style={styles.flex} />
        </View>
      </ConfirmDialog>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  loader: { marginTop: 60 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  flex: { flex: 1, minWidth: 0 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, flexShrink: 1 },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  badBox: { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', borderRadius: 12, padding: 11, marginTop: 10 },
  badTitle: { fontSize: 13, fontWeight: '800', color: '#9F1239' },
  badText: { fontSize: 12.5, color: '#9F1239', marginTop: 2 },
  badInline: { color: '#E11D48' },
  trio: { flexDirection: 'row', gap: 8, marginTop: 10 },
  trioItem: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  trioN: { fontSize: 15, fontWeight: '900', color: COLORS.textPrimary },
  trioL: { fontSize: 10.5, color: COLORS.textSecondary },
  panel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  panelTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  last: { borderBottomWidth: 0 },
  k: { fontSize: 13, color: COLORS.textSecondary },
  v: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1, textAlign: 'right' },
  linkText: { color: COLORS.primaryDark },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  songTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  remove: { color: '#E11D48', fontWeight: '800', fontSize: 12.5 },
  restore: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 12.5 },
  footer: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  dangerOutline: { borderColor: '#FECDD3' },
  dialogRow: { flexDirection: 'row', gap: 10 },
});

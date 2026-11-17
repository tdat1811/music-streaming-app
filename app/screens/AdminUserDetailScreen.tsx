import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { formatDate } from '../../src/utils/plan';
import { timeAgoText } from '../../src/utils/time';
import { targetLabel } from '../../src/utils/moderation';
import { AppButton, Badge, BadgeTone, NameAvatar, NoticeBox } from '../../src/components/ArtistUi';
import { AdminShell } from '../../src/components/AdminShell';
import { BottomSheet, ConfirmDialog } from '../../src/components/StudioUi';
import { RuleSheet } from '../../src/components/ModerationUi';

const ROLE_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  listener: { label: 'Listener', tone: 'grey' },
  artist: { label: 'Artist', tone: 'artist' },
  admin: { label: 'Admin', tone: 'admin' },
};
const errText = (err: unknown) => (isApiError(err) ? err.message : "Can't connect to the server. Please try again.");

interface AdminUserDetailScreenProps {
  userId: string | null;
  onBack?: () => void;
  onOpenArtist?: (id: string) => void;
}

// U2 / U4 / U5: chi tiết tài khoản – lịch sử vi phạm (Revoke), khoá / mở khoá, đổi vai trò
export const AdminUserDetailScreen: React.FC<AdminUserDetailScreenProps> = ({ userId, onBack, onOpenArtist }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [revoking, setRevoking] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (refresh = false) => {
      if (!userId) return;
      if (refresh) setRefreshing(true);
      setError(null);
      try {
        const res = await api.admin.getUser(userId);
        setData(res.data);
      } catch (err) {
        setError(errText(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
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

  const doRevoke = async () => {
    const v = revoking;
    const err = await run(() => api.admin.revokeViolation(v.id), 'Violation revoked.');
    setRevoking(null);
    if (err) setNotice({ tone: 'error', text: err });
  };

  const doUnlock = async () => {
    const err = await run(() => api.admin.unlockUser(userId!), 'Account unlocked.');
    if (err) setNotice({ tone: 'error', text: err });
  };

  const newRole = data?.role === 'admin' ? 'listener' : 'admin';
  const doRole = async () => {
    const err = await run(() => api.admin.changeRole(userId!, newRole), 'Role updated.');
    setRoleOpen(false);
    if (err) setNotice({ tone: 'error', text: err });
  };

  const role = data ? ROLE_BADGE[data.role] ?? ROLE_BADGE.listener : null;
  const active = data?.activeViolations ?? 0;
  const max = data?.maxViolations ?? 3;
  const lock = data?.lock;
  const permanent = lock?.type === 'permanent';

  return (
    <AdminShell title="User" onBack={onBack}>
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
                <NameAvatar name={data.name} size={52} />
                <View style={styles.flex}>
                  <Text style={styles.heroName} numberOfLines={1}>{data.name}{data.isSelf ? ' (you)' : ''}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{data.email}</Text>
                </View>
                {lock ? <Badge label="Locked" tone="lock" /> : role && <Badge label={role.label} tone={role.tone} />}
              </View>

              {!!notice && <NoticeBox tone={notice.tone} style={styles.mt10}>{notice.text}</NoticeBox>}

              {lock && (
                <View style={[styles.lockBox, permanent ? styles.lockBad : styles.lockWarn]}>
                  <Text style={[styles.lockTitle, permanent ? styles.badText : styles.warnText]}>
                    {permanent ? `Permanently locked ${timeAgoText(lock.lockedAt)}` : `Locked by ${lock.byName} · ${timeAgoText(lock.lockedAt)}`}
                  </Text>
                  <Text style={[styles.lockText, permanent ? styles.badText : styles.warnText]}>
                    {permanent
                      ? `Reached ${active} community standards violations. This lock can't be undone.`
                      : `Reason: ${lock.ruleLabel}${lock.note ? ` · "${lock.note}"` : ''}`}
                  </Text>
                </View>
              )}

              {/* Vi phạm */}
              <View style={styles.panel}>
                <View style={styles.panelHead}>
                  <Text style={styles.panelTitle}>Violations</Text>
                  <Text style={[styles.count, active >= max && styles.badText]}>{active > max ? active : `${active} / ${max}`}</Text>
                </View>
                <View style={styles.meter}>
                  <View style={[styles.meterFill, { width: `${Math.min(100, (active / max) * 100)}%` }]} />
                </View>
                <Text style={styles.meterHint}>
                  {active === 0
                    ? 'No violations. Violations never expire.'
                    : active >= max && !permanent
                      ? 'One more violation locks this account permanently.'
                      : permanent
                        ? 'Revoke a violation that was a mistake to reopen the account.'
                        : 'Violations never expire. The 4th one locks the account permanently.'}
                </Text>
                {data.violations.map((v: any, i: number) => (
                  <View key={v.id} style={[styles.vRow, i === data.violations.length - 1 && styles.last, v.revokedAt && styles.revoked]}>
                    <View style={[styles.vNo, v.revokedAt && styles.vNoOff]}>
                      <Text style={[styles.vNoText, v.revokedAt && styles.vNoTextOff]}>#{data.violations.length - i}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.vTitle}>{targetLabel(v.targetType)} · {v.ruleLabel}</Text>
                      <Text style={styles.sub} numberOfLines={2}>
                        "{v.snapshot}" · by {v.adminName} · {timeAgoText(v.createdAt)}
                        {v.revokedAt ? ' · revoked' : ''}
                      </Text>
                    </View>
                    {!v.revokedAt && (
                      <TouchableOpacity onPress={() => setRevoking(v)} accessibilityLabel={`Revoke violation ${data.violations.length - i}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.link}>Revoke</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* Thông tin */}
              <View style={styles.panel}>
                <View style={styles.kv}><Text style={styles.k}>Joined</Text><Text style={styles.v}>{formatDate(data.createdAt)}</Text></View>
                <View style={styles.kv}>
                  <Text style={styles.k}>Plan</Text>
                  <Text style={styles.v}>{data.planId === 'premium' ? `VIP${data.planExpiresAt ? ` · until ${formatDate(data.planExpiresAt)}` : ''}` : 'Free'}</Text>
                </View>
                <View style={styles.kv}><Text style={styles.k}>Playlists · comments</Text><Text style={styles.v}>{data.stats.playlists} · {data.stats.comments}</Text></View>
                <View style={[styles.kv, !data.artist && styles.last]}><Text style={styles.k}>Reports against</Text><Text style={styles.v}>{data.stats.reportsAgainst}</Text></View>
                {data.artist && (
                  <TouchableOpacity style={[styles.kv, styles.last]} onPress={() => onOpenArtist?.(data.artist.id)} accessibilityLabel="Open artist page">
                    <Text style={styles.k}>Artist page</Text>
                    <Text style={[styles.v, styles.linkText]}>{data.artist.name}{data.artist.hidden ? ' (hidden)' : ''} ›</Text>
                  </TouchableOpacity>
                )}
              </View>

              {lock && (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Hidden with this account</Text>
                  <Text style={styles.sub}>
                    {data.stats.comments} comment{data.stats.comments === 1 ? '' : 's'}
                    {data.artist ? ` · ${data.stats.songs} songs · ${data.stats.posts} posts · artist page` : ''}
                  </Text>
                </View>
              )}

              {/* Thao tác */}
              {!data.isSelf && (
                <View style={styles.menu}>
                  {data.can.changeRole && (
                    <TouchableOpacity style={styles.menuItem} onPress={() => setRoleOpen(true)} accessibilityLabel="Change role">
                      <Ionicons name="shield-outline" size={18} color={COLORS.textPrimary} />
                      <View style={styles.flex}>
                        <Text style={styles.menuTitle}>Change role</Text>
                        <Text style={styles.sub}>{data.role === 'admin' ? 'Admin → Listener' : 'Listener → Admin'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                  {data.can.lock && (
                    <TouchableOpacity style={[styles.menuItem, styles.last]} onPress={() => setLockOpen(true)} accessibilityLabel="Lock account">
                      <Ionicons name="lock-closed-outline" size={18} color="#E11D48" />
                      <View style={styles.flex}>
                        <Text style={[styles.menuTitle, styles.badText]}>Lock account</Text>
                        <Text style={styles.sub}>Manual lock · can be unlocked later</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                  {!data.can.changeRole && !data.can.lock && (
                    <Text style={[styles.sub, styles.menuEmpty]}>
                      {permanent ? 'Permanently locked accounts have no other actions.' : data.role === 'admin' ? 'Change this admin to Listener before locking.' : 'No other actions.'}
                    </Text>
                  )}
                </View>
              )}
              {permanent && (
                <NoticeBox tone="info" style={styles.mt12}>
                  If a violation was a mistake, Revoke it. Dropping back to {max} violations reopens the account and restores its content.
                </NoticeBox>
              )}
            </>
          )
        )}
      </ScrollView>
      {data?.can?.unlock && (
        <View style={styles.footer}>
          <AppButton label="Unlock account" onPress={doUnlock} loading={busy} style={styles.inkBtn} />
        </View>
      )}

      <RuleSheet
        visible={lockOpen}
        title={`Lock ${data?.name ?? 'account'}?`}
        message="They can't log in and all their comments, posts, songs and artist page are hidden until you unlock the account."
        confirmLabel="Lock account"
        onClose={() => setLockOpen(false)}
        onConfirm={(v) => run(() => api.admin.lockUser(userId!, v), 'Account locked.')}
      />

      <BottomSheet visible={roleOpen} onClose={() => setRoleOpen(false)}>
        <Text style={styles.sheetTitle}>Change role</Text>
        <Text style={styles.sub}>
          {newRole === 'admin'
            ? `${data?.name} will get full access to the Admin area (no music app) next time they open the app.`
            : `${data?.name} will become a listener and lose access to the Admin area.`}
        </Text>
        <NoticeBox tone="warn" style={styles.mt12}>You can't change your own role, and the last admin can't be removed. Artists are added only by approving a request.</NoticeBox>
        <AppButton label={newRole === 'admin' ? 'Make admin' : 'Make listener'} onPress={doRole} loading={busy} style={[styles.mt12, styles.inkBtn]} />
        <AppButton label="Cancel" variant="ghost" onPress={() => setRoleOpen(false)} />
      </BottomSheet>

      <ConfirmDialog
        visible={!!revoking}
        title="Revoke this violation?"
        message={`The ${revoking ? targetLabel(revoking.targetType).toLowerCase() : ''} becomes visible again and the count drops by 1.${permanent ? ' If it drops below 4, the account is unlocked.' : ''}`}
        onClose={() => setRevoking(null)}
      >
        <View style={styles.dialogRow}>
          <AppButton label="Cancel" variant="outline" onPress={() => setRevoking(null)} style={styles.flex} />
          <AppButton label="Revoke" onPress={doRevoke} loading={busy} style={styles.flex} />
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
  heroName: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1, lineHeight: 17 },
  lockBox: { borderWidth: 1, borderRadius: 12, padding: 11, marginTop: 10 },
  lockBad: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' },
  lockWarn: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  lockTitle: { fontSize: 13, fontWeight: '800' },
  lockText: { fontSize: 12.5, marginTop: 2, lineHeight: 18 },
  badText: { color: '#E11D48' },
  warnText: { color: '#9A3412' },
  panel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  count: { fontSize: 15, fontWeight: '900', color: COLORS.textPrimary },
  meter: { height: 8, borderRadius: 4, backgroundColor: COLORS.tagBg, overflow: 'hidden', marginTop: 4 },
  meterFill: { height: '100%', backgroundColor: '#E11D48', borderRadius: 4 },
  meterHint: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 5, marginBottom: 2 },
  vRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  revoked: { opacity: 0.5 },
  last: { borderBottomWidth: 0 },
  vNo: { backgroundColor: '#FFF1F2', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  vNoOff: { backgroundColor: COLORS.tagBg },
  vNoText: { fontSize: 11, fontWeight: '800', color: '#E11D48' },
  vNoTextOff: { color: COLORS.textSecondary },
  vTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  link: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 12.5 },
  linkText: { color: COLORS.primaryDark },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  k: { fontSize: 13, color: COLORS.textSecondary },
  v: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', flexShrink: 1 },
  menu: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, marginTop: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  menuTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  menuEmpty: { paddingVertical: 12 },
  footer: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  inkBtn: { backgroundColor: '#15161B' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  dialogRow: { flexDirection: 'row', gap: 10 },
});

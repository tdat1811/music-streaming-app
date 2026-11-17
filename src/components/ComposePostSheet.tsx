import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { api } from '../services/api';
import { POST_LIMITS, validatePost } from '../utils/posts';
import { StudioSong } from '../utils/studio';
import { BottomSheet, CoverImage } from './StudioUi';
import { AppButton, NameAvatar } from './ArtistUi';

// Bảng viết / sửa bài đăng của nghệ sĩ trên Feed: nội dung chữ + gắn tối đa 1 bài hát đã đăng của mình
interface Props {
  visible: boolean;
  artistName: string;
  artistAvatar?: string | null;
  // Có bài cũ = chế độ sửa
  initial?: { content?: string; songId?: string | null } | null;
  // Bài mới có nội dung điền sẵn (VD caption do AI Assistant viết – giai đoạn 6b); nghệ sĩ tự xem lại rồi đăng
  prefill?: string | null;
  onClose: () => void;
  // Trả về null nếu thành công, ngược lại là thông báo lỗi để hiện trong bảng
  onSubmit: (data: { content: string; songId: string | null }) => Promise<string | null>;
}

export const ComposePostSheet: React.FC<Props> = ({ visible, artistName, artistAvatar, initial, prefill, onClose, onSubmit }) => {
  const editing = !!initial;
  const [content, setContent] = useState('');
  const [songId, setSongId] = useState<string | null>(null);
  const [songs, setSongs] = useState<StudioSong[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setContent(initial?.content || prefill || '');
    setSongId(initial?.songId || null);
    setPicking(false);
    setError(null);
    let alive = true;
    api.studio
      .getSongs('published')
      .then((res: any) => alive && setSongs(res.data || []))
      .catch(() => alive && setSongs([]));
    return () => {
      alive = false;
    };
  }, [visible, initial, prefill]);

  const song = songs?.find((s) => s.id === songId) || null;
  const trimmed = content.trim();
  const tooLong = trimmed.length > POST_LIMITS.contentMax;

  const submit = async () => {
    const msg = validatePost(content, songId);
    if (msg) return setError(msg);
    setSaving(true);
    const err = await onSubmit({ content: trimmed, songId });
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Cancel">
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editing ? 'Edit post' : 'New post'}</Text>
        <AppButton
          label={editing ? 'Save' : 'Post'}
          onPress={submit}
          loading={saving}
          disabled={(!trimmed && !songId) || tooLong}
          style={styles.postBtn}
        />
      </View>

      <View style={styles.authorRow}>
        <NameAvatar name={artistName} image={artistAvatar} size={36} />
        <Text style={styles.author}>{artistName}</Text>
        <Ionicons name="checkmark-circle" size={14} color="#00A3FF" />
      </View>

      <TextInput
        style={styles.input}
        value={content}
        onChangeText={(t) => {
          setContent(t);
          setError(null);
        }}
        placeholder="Share something with your fans…"
        placeholderTextColor={COLORS.textMuted}
        multiline
        autoFocus={!editing}
        accessibilityLabel="Post content"
      />
      <Text style={[styles.counter, tooLong && styles.counterBad]}>
        {trimmed.length} / {POST_LIMITS.contentMax}
      </Text>

      {song ? (
        <View style={styles.attached}>
          <CoverImage uri={song.coverImage} size={44} />
          <View style={styles.flex}>
            <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
            <Text style={styles.songMeta}>{artistName}{song.duration ? ` · ${song.duration}` : ''}</Text>
          </View>
          <TouchableOpacity onPress={() => setSongId(null)} accessibilityLabel="Remove song" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.attachBtn} onPress={() => setPicking((p) => !p)} accessibilityLabel="Attach a song">
          <Ionicons name="musical-notes-outline" size={18} color={COLORS.primary} />
          <Text style={styles.attachText}>Attach a song</Text>
          <Ionicons name={picking ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}

      {picking && !song && (
        <View style={styles.picker}>
          {songs === null ? (
            <ActivityIndicator color={COLORS.primary} style={{ padding: 12 }} />
          ) : songs.length === 0 ? (
            <Text style={styles.empty}>You have no published songs yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 200 }}>
              {songs.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.pickRow}
                  onPress={() => {
                    setSongId(s.id);
                    setPicking(false);
                    setError(null);
                  }}
                  accessibilityLabel={`Pick ${s.title}`}
                >
                  <CoverImage uri={s.coverImage} size={36} radius={8} />
                  <Text style={[styles.songTitle, styles.flex]} numberOfLines={1}>{s.title}</Text>
                  <Text style={styles.songMeta}>{s.duration || ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!editing && <Text style={styles.hint}>Your followers will be notified. Up to {POST_LIMITS.perDay} posts per day.</Text>}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cancel: { fontSize: 14.5, color: COLORS.textSecondary, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  postBtn: { paddingVertical: 8, paddingHorizontal: 18, minHeight: 0 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  author: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  input: { minHeight: 110, maxHeight: 220, fontSize: 15, color: COLORS.textPrimary, textAlignVertical: 'top', paddingVertical: 6, outlineStyle: 'none' } as any,
  counter: { alignSelf: 'flex-end', fontSize: 11.5, color: COLORS.textMuted, marginBottom: 10 },
  counterBad: { color: '#E11D48', fontWeight: '700' },
  attached: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: '#E6FAFB' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  attachText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.primary },
  picker: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderLight },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
  songTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  songMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  empty: { padding: 12, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  error: { marginTop: 10, fontSize: 13, color: '#E11D48', fontWeight: '600' },
  hint: { marginTop: 10, fontSize: 11.5, color: COLORS.textMuted },
});

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { pickImageFile } from '../../src/services/filePicker';
import { AlbumFormErrors, moveItem, STUDIO_LIMITS, StudioSong, validateAlbumForm } from '../../src/utils/studio';
import { AppButton, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { CoverImage } from '../../src/components/StudioUi';

interface EditAlbumScreenProps {
  // null = tạo album mới
  albumId: string | null;
  onBack?: () => void;
  onSaved?: () => void;
}

const STATUS_NOTE: Record<string, { text: string; color: string }> = {
  published: { text: 'Published', color: COLORS.textSecondary },
  draft: { text: 'Draft – hidden from listeners', color: '#D97706' },
  hidden: { text: 'Hidden – hidden from listeners', color: '#D97706' },
};

// S8: tạo / sửa album – ảnh bìa, tên, năm, chọn bài của mình và sắp thứ tự (nút ↑ ↓)
export const EditAlbumScreen: React.FC<EditAlbumScreenProps> = ({ albumId, onBack, onSaved }) => {
  const [songs, setSongs] = useState<StudioSong[]>([]);
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState(String(new Date().getFullYear()));
  const [songIds, setSongIds] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'published' | 'draft'>('draft');
  const [errors, setErrors] = useState<AlbumFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    Promise.all([api.studio.getSongs(), albumId ? api.studio.getAlbum(albumId) : Promise.resolve(null)])
      .then(([songRes, albumRes]) => {
        setSongs(songRes.data ?? []);
        if (albumRes?.data) {
          const a = albumRes.data;
          setTitle(a.title);
          setReleaseYear(a.releaseYear);
          setSongIds(a.songIds);
          setCoverImage(a.coverImage || '');
          setStatus(a.status === 'published' ? 'published' : 'draft');
        }
      })
      .catch((err) => setMessage(isApiError(err) ? err.message : "Can't connect to the server."))
      .finally(() => setLoading(false));
  }, [albumId]);

  const songsById = useMemo(() => Object.fromEntries(songs.map((s) => [s.id, s])), [songs]);
  const selected = songIds.map((id) => songsById[id]).filter(Boolean);
  const notSelected = songs.filter((s) => !songIds.includes(s.id));

  const toggle = (id: string) => {
    setErrors((e) => ({ ...e, songIds: undefined }));
    setSongIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const changeCover = async () => {
    const r = await pickImageFile([1, 1]);
    if (r.status === 'cancelled') return;
    if (r.status === 'error') return setMessage(r.message);
    setCoverPreview(r.file.uri);
    setUploadingCover(true);
    try {
      const form = new FormData();
      await r.file.appendTo(form, 'image');
      setCoverImage((await api.studio.uploadImage(form)).image);
    } catch (err) {
      setCoverPreview(null);
      setMessage(isApiError(err) ? err.message : 'Could not upload the image.');
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async (publish: boolean) => {
    const nextErrors = validateAlbumForm({ title, releaseYear, songIds }, publish, songsById);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.studio.saveAlbum(albumId, {
        title: title.replace(/\s+/g, ' ').trim(),
        releaseYear: releaseYear.trim(),
        songIds,
        coverImage,
        status: publish ? 'published' : 'draft',
      });
      onSaved?.();
    } catch (err) {
      if (isApiError(err) && err.errors) setErrors(err.errors as AlbumFormErrors);
      setMessage(isApiError(err) ? err.message : "Can't connect to the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Album đang đăng: "Save" giữ trạng thái đăng; album nháp: có thêm "Save & publish"
  const isPublished = status === 'published';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title={albumId ? 'Edit album' : 'New album'} onBack={onBack} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.head}>
              <TouchableOpacity onPress={changeCover} disabled={uploadingCover} accessibilityLabel="Change cover">
                <CoverImage uri={coverPreview || coverImage || selected[0]?.coverImage} size={84} radius={12} icon="disc-outline" />
              </TouchableOpacity>
              <View style={styles.flex}>
                <TextInput
                  style={[styles.input, !!errors.title && styles.inputError]}
                  value={title}
                  onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: undefined })); }}
                  placeholder="Album title"
                  placeholderTextColor={COLORS.textMuted}
                  maxLength={STUDIO_LIMITS.albumTitleMax + 10}
                  accessibilityLabel="Album title"
                />
                <View style={styles.yearRow}>
                  <TextInput
                    style={[styles.input, styles.year, !!errors.releaseYear && styles.inputError]}
                    value={releaseYear}
                    onChangeText={(t) => { setReleaseYear(t.replace(/\D/g, '').slice(0, 4)); setErrors((e) => ({ ...e, releaseYear: undefined })); }}
                    keyboardType="number-pad"
                    accessibilityLabel="Release year"
                  />
                  <TouchableOpacity onPress={changeCover} disabled={uploadingCover}>
                    <Text style={styles.link}>{uploadingCover ? 'Uploading…' : 'Change cover'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            {!!errors.releaseYear && <Text style={styles.errorText}>{errors.releaseYear}</Text>}

            <View style={styles.sectionRow}>
              <Text style={styles.section}>Songs ({selected.length} selected)</Text>
              <Text style={styles.hint}>Use ↑ ↓ to reorder</Text>
            </View>
            {!!errors.songIds && <Text style={styles.errorText}>{errors.songIds}</Text>}

            {selected.map((s, i) => (
              <View key={s.id} style={styles.song}>
                <TouchableOpacity onPress={() => toggle(s.id)} accessibilityRole="checkbox" accessibilityState={{ checked: true }} accessibilityLabel={`Remove ${s.title}`}>
                  <View style={[styles.check, styles.checkOn]}><Ionicons name="checkmark" size={14} color="#FFFFFF" /></View>
                </TouchableOpacity>
                <Text style={styles.num}>{i + 1}</Text>
                <View style={styles.flex}>
                  <Text style={styles.songTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={[styles.songSub, { color: STATUS_NOTE[s.status]?.color }]}>{STATUS_NOTE[s.status]?.text}</Text>
                </View>
                <TouchableOpacity onPress={() => setSongIds((p) => moveItem(p, i, -1))} disabled={i === 0} accessibilityLabel={`Move ${s.title} up`}>
                  <Ionicons name="arrow-up" size={18} color={i === 0 ? COLORS.border : COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSongIds((p) => moveItem(p, i, 1))} disabled={i === selected.length - 1} accessibilityLabel={`Move ${s.title} down`}>
                  <Ionicons name="arrow-down" size={18} color={i === selected.length - 1 ? COLORS.border : COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
            {notSelected.map((s) => (
              <TouchableOpacity key={s.id} style={styles.song} onPress={() => toggle(s.id)} accessibilityRole="checkbox" accessibilityState={{ checked: false }} accessibilityLabel={`Add ${s.title}`}>
                <View style={styles.check} />
                <Text style={styles.num} />
                <View style={styles.flex}>
                  <Text style={styles.songTitle} numberOfLines={1}>{s.title}</Text>
                  <Text style={[styles.songSub, { color: STATUS_NOTE[s.status]?.color }]}>{STATUS_NOTE[s.status]?.text}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {songs.length === 0 && <Text style={styles.hint}>Upload songs first, then add them to an album.</Text>}
            {!!message && <NoticeBox tone="error" style={styles.mt12}>{message}</NoticeBox>}
          </ScrollView>
          <View style={styles.footer}>
            {isPublished ? (
              <>
                <AppButton label="Save" onPress={() => save(true)} loading={saving} disabled={uploadingCover} />
                <AppButton label="Unpublish & save as draft" variant="outline" onPress={() => save(false)} disabled={saving || uploadingCover} style={styles.mt8} />
              </>
            ) : (
              <>
                <AppButton label="Save & publish" onPress={() => save(true)} loading={saving} disabled={uploadingCover} />
                <AppButton label="Save as draft" variant="outline" onPress={() => save(false)} disabled={saving || uploadingCover} style={styles.mt8} />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  loader: { marginTop: 60 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  inputError: { borderColor: '#E11D48' },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  year: { width: 84, paddingVertical: 7 },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 12.5 },
  errorText: { fontSize: 11.5, color: '#E11D48', marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 4 },
  section: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  hint: { fontSize: 11.5, color: COLORS.textMuted },
  song: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  check: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: COLORS.textMuted, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  num: { width: 18, textAlign: 'center', fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  songTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  songSub: { fontSize: 12, marginTop: 2 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
});

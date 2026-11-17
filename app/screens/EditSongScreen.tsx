import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { pickImageFile } from '../../src/services/filePicker';
import { canDeleteSong, songGenreOptions, STUDIO_LIMITS, SongFormErrors, StudioSong, validateSongForm } from '../../src/utils/studio';
import { formatCount } from '../../src/utils/plays';
import { AppButton, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { ConfirmDialog, CoverImage, SongStatusBadge } from '../../src/components/StudioUi';

interface EditSongScreenProps {
  songId: string | null;
  onBack?: () => void;
  // Lưu hoặc xoá xong thì quay lại danh sách
  onDone?: () => void;
}

// S6: sửa thông tin bài hát (không đổi file nhạc), lưu / đăng, xoá bài chưa có lượt nghe
export const EditSongScreen: React.FC<EditSongScreenProps> = ({ songId, onBack, onDone }) => {
  const [song, setSong] = useState<StudioSong | null>(null);
  const [genres, setGenres] = useState<string[]>(songGenreOptions(null));
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<SongFormErrors>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!songId) return;
    Promise.all([api.studio.getSong(songId), api.studio.getProfile().catch(() => null)])
      .then(([res, profile]) => {
        const s: StudioSong = res.data;
        setSong(s);
        setTitle(s.title);
        setGenre(s.genre || '');
        setDescription(s.description || '');
        setCoverImage(s.coverImage || '');
        const options = songGenreOptions(profile?.data?.genres);
        // Bài cũ có thể mang thể loại không còn trong danh sách của nghệ sĩ: vẫn hiện để chọn lại
        setGenres(s.genre && !options.includes(s.genre) ? [...options, s.genre] : options);
      })
      .catch((err) => setMessage({ tone: 'error', text: isApiError(err) ? err.message : "Can't connect to the server." }))
      .finally(() => setLoading(false));
  }, [songId]);

  const changeCover = async () => {
    const r = await pickImageFile([1, 1]);
    if (r.status === 'cancelled') return;
    if (r.status === 'error') return setMessage({ tone: 'error', text: r.message });
    setCoverPreview(r.file.uri);
    setUploadingCover(true);
    try {
      const form = new FormData();
      await r.file.appendTo(form, 'image');
      const res = await api.studio.uploadImage(form);
      setCoverImage(res.image);
    } catch (err) {
      setCoverPreview(null);
      setMessage({ tone: 'error', text: isApiError(err) ? err.message : 'Could not upload the image.' });
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async (status?: 'published' | 'draft') => {
    if (!song) return;
    const nextErrors = validateSongForm({ title, genre, description }, genres);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.studio.updateSong(song.id, {
        title: title.replace(/\s+/g, ' ').trim(),
        genre,
        description: description.trim(),
        coverImage,
        ...(status ? { status } : {}),
      });
      onDone?.();
    } catch (err) {
      if (isApiError(err) && err.errors) setErrors(err.errors as SongFormErrors);
      setMessage({ tone: 'error', text: isApiError(err) ? err.message : "Can't connect to the server. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!song) return;
    setSaving(true);
    try {
      await api.studio.deleteSong(song.id);
      setConfirmDelete(false);
      onDone?.();
    } catch (err) {
      setConfirmDelete(false);
      setMessage({ tone: 'error', text: isApiError(err) ? err.message : "Can't connect to the server." });
    } finally {
      setSaving(false);
    }
  };

  const fileName = song?.audioUrl?.split('/').pop() ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Edit song" onBack={onBack} right={song ? <SongStatusBadge status={song.status} /> : null} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : !song ? (
        <View style={styles.content}><NoticeBox tone="error">{message?.text ?? 'Song not found.'}</NoticeBox></View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.coverRow}>
              <CoverImage uri={coverPreview || coverImage} size={72} radius={12} />
              <View style={styles.flex}>
                <TouchableOpacity onPress={changeCover} disabled={uploadingCover} accessibilityLabel="Change cover">
                  <Text style={styles.link}>{uploadingCover ? 'Uploading…' : 'Change cover'}</Text>
                </TouchableOpacity>
                <Text style={styles.hint}>{fileName}{song.duration ? ` · ${song.duration}` : ''} · {formatCount(song.plays)} plays</Text>
                <Text style={styles.hint}>To change the audio, upload a new song.</Text>
              </View>
            </View>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={[styles.input, !!errors.title && styles.inputError]}
              value={title}
              onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: undefined })); }}
              maxLength={STUDIO_LIMITS.songTitleMax + 10}
              accessibilityLabel="Song title"
            />
            {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

            <Text style={styles.label}>Genre *</Text>
            <View style={styles.chips}>
              {genres.map((g) => (
                <TouchableOpacity key={g} style={[styles.chip, genre === g && styles.chipOn]} onPress={() => setGenre(g)} accessibilityLabel={`Genre ${g}`}>
                  <Text style={[styles.chipText, genre === g && styles.chipTextOn]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!errors.genre && <Text style={styles.errorText}>{errors.genre}</Text>}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.area]}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={STUDIO_LIMITS.descriptionMax}
              textAlignVertical="top"
              placeholder="Tell listeners about this song (optional)"
              placeholderTextColor={COLORS.textMuted}
              accessibilityLabel="Description"
            />

            {!!message && <NoticeBox tone={message.tone} style={styles.mt12}>{message.text}</NoticeBox>}

            {canDeleteSong(song) ? (
              <TouchableOpacity onPress={() => setConfirmDelete(true)} style={styles.deleteLink} accessibilityLabel="Delete song">
                <Text style={styles.deleteText}>Delete this song</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.hint, styles.mt12]}>This song has plays, so it can only be hidden (from My songs), not deleted.</Text>
            )}
          </ScrollView>
          <View style={styles.footer}>
            {song.status === 'draft' ? (
              <>
                <AppButton label="Save & publish" onPress={() => save('published')} loading={saving} disabled={uploadingCover} />
                <AppButton label="Save as draft" variant="outline" onPress={() => save()} disabled={saving || uploadingCover} style={styles.mt8} />
              </>
            ) : (
              <AppButton label="Save changes" onPress={() => save()} loading={saving} disabled={uploadingCover} />
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      <ConfirmDialog
        visible={confirmDelete}
        title={`Delete "${song?.title}"?`}
        message="This song has no plays yet. The song and its audio file will be removed permanently."
        onClose={() => setConfirmDelete(false)}
      >
        <AppButton label="Delete" variant="danger" onPress={remove} loading={saving} />
        <AppButton label="Cancel" variant="ghost" onPress={() => setConfirmDelete(false)} />
      </ConfirmDialog>
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
  coverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 6 },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: COLORS.textPrimary },
  inputError: { borderColor: '#E11D48' },
  area: { minHeight: 72 },
  hint: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 3 },
  errorText: { fontSize: 11.5, color: '#E11D48', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  chipTextOn: { color: '#FFFFFF' },
  deleteLink: { alignSelf: 'flex-start', marginTop: 18, paddingVertical: 6 },
  deleteText: { color: '#E11D48', fontWeight: '700', fontSize: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
});

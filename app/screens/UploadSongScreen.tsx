import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { PickedFile, pickAudioFile, pickImageFile } from '../../src/services/filePicker';
import { formatFileSize, songGenreOptions, STUDIO_LIMITS, SongFormErrors, validateSongForm } from '../../src/utils/studio';
import { AppButton, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';
import { ConfirmDialog, CoverImage } from '../../src/components/StudioUi';
import { useFeed } from '../../src/context/FeedContext';

interface UploadSongScreenProps {
  onClose?: () => void;
  onViewSongs?: () => void;
}

type Phase = 'form' | 'uploading' | 'done';

// S2–S3: tải bài hát lên (chọn file nhạc, ảnh bìa, thông tin; theo dõi tiến trình; báo hoàn tất)
export const UploadSongScreen: React.FC<UploadSongScreenProps> = ({ onClose, onViewSongs }) => {
  const [genres, setGenres] = useState<string[]>(songGenreOptions(null));
  const [audio, setAudio] = useState<PickedFile | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [cover, setCover] = useState<PickedFile | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [publish, setPublish] = useState(true);
  // Đăng bài lên Feed kèm bài hát (mặc định bật, chỉ khi "Publish now")
  const [shareToFeed, setShareToFeed] = useState(true);
  const { reloadFeed } = useFeed();
  const [errors, setErrors] = useState<SongFormErrors>({});
  const [phase, setPhase] = useState<Phase>('form');
  const [progress, setProgress] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; status: string; shared?: boolean; notified?: number } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Thể loại được chọn = thể loại trên trang nghệ sĩ
  useEffect(() => {
    api.studio
      .getProfile()
      .then((res) => setGenres(songGenreOptions(res?.data?.genres)))
      .catch(() => {});
  }, []);

  const dirty = !!(audio || cover || title || description);

  const chooseAudio = async () => {
    const r = await pickAudioFile();
    if (r.status === 'cancelled') return;
    if (r.status === 'error') {
      setAudioError(r.message);
      return;
    }
    setAudioError(null);
    setAudio(r.file);
    // Gợi ý tên bài từ tên file: "mua-thu-ha-noi.mp3" -> "mua thu ha noi"
    if (!title) setTitle(r.file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim());
  };

  const chooseCover = async () => {
    const r = await pickImageFile([1, 1]);
    if (r.status === 'cancelled') return;
    if (r.status === 'error') {
      setCoverError(r.message);
      return;
    }
    setCoverError(null);
    setCover(r.file);
  };

  const upload = async () => {
    const nextErrors = validateSongForm({ title, genre, description }, genres);
    setErrors(nextErrors);
    if (!audio) setAudioError('Please choose an audio file.');
    if (!audio || Object.keys(nextErrors).length) return;

    setPhase('uploading');
    setProgress(0);
    setSubmitError(null);
    try {
      const form = new FormData();
      await audio.appendTo(form, 'audio');
      if (cover) await cover.appendTo(form, 'cover');
      form.append('title', title.replace(/\s+/g, ' ').trim());
      form.append('genre', genre);
      if (description.trim()) form.append('description', description.trim());
      form.append('status', publish ? 'published' : 'draft');
      if (publish && shareToFeed) form.append('shareToFeed', 'true');
      const res = await api.studio.uploadSong(form, setProgress);
      setResult({ title: res.data.title, status: res.data.status, shared: !!res.sharedPostId, notified: res.notifiedFollowers || 0 });
      if (res.sharedPostId) reloadFeed();
      setPhase('done');
    } catch (err) {
      setPhase('form');
      if (isApiError(err) && err.errors) setErrors(err.errors as SongFormErrors);
      setSubmitError(isApiError(err) ? err.message : "Upload failed – check your connection and try again. Your details are kept.");
    }
  };

  const reset = () => {
    setAudio(null);
    setCover(null);
    setTitle('');
    setDescription('');
    setGenre('');
    setPublish(true);
    setErrors({});
    setResult(null);
    setPhase('form');
  };

  const close = () => {
    if (phase === 'uploading') return;
    if (phase === 'form' && dirty) setConfirmDiscard(true);
    else onClose?.();
  };

  if (phase === 'done' && result) {
    const published = result.status === 'published';
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <ScreenHeader title="Upload a song" onBack={onClose} />
        <View style={styles.doneBox}>
          <View style={styles.doneIcon}><Ionicons name="checkmark" size={38} color="#16A34A" /></View>
          <Text style={styles.doneTitle}>{published ? 'Song published!' : 'Draft saved'}</Text>
          <Text style={styles.doneSub}>
            {published ? `"${result.title}" is now on your artist page.` : `"${result.title}" is saved. Only you can see it until you publish it.`}
          </Text>
          {published && (
            <Text style={styles.doneSub}>
              {[result.shared && 'Shared to the Feed', `${result.notified || 0} follower${result.notified === 1 ? '' : 's'} notified`].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <View style={styles.footer}>
          <AppButton label="View in My songs" onPress={onViewSongs} />
          <AppButton label="Upload another" variant="outline" onPress={reset} style={styles.mt8} />
        </View>
      </SafeAreaView>
    );
  }

  const uploading = phase === 'uploading';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Upload a song" onBack={close} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {uploading && (
            <View style={styles.progressBox}>
              <View style={styles.row}>
                <Text style={styles.progressTitle} numberOfLines={1}>{title}</Text>
                <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
              </View>
              <Text style={styles.hint}>Uploading… please keep this screen open.</Text>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
            </View>
          )}

          {/* File nhạc */}
          <TouchableOpacity
            style={[styles.file, audio && styles.fileDone, !!audioError && styles.fileError]}
            onPress={chooseAudio}
            disabled={uploading}
            accessibilityLabel={audio ? 'Change audio file' : 'Choose an audio file'}
          >
            <View style={styles.fileIcon}><Ionicons name={audio ? 'musical-note' : 'cloud-upload-outline'} size={20} color="#FFFFFF" /></View>
            <View style={styles.flex}>
              <Text style={styles.fileName} numberOfLines={1}>{audio ? audio.name : 'Choose an audio file *'}</Text>
              <Text style={styles.hint}>{audio ? `${formatFileSize(audio.size)} · duration is read automatically` : 'MP3 or M4A · up to 20 MB'}</Text>
            </View>
            {audio && <Text style={styles.link}>Change</Text>}
          </TouchableOpacity>
          {!!audioError && <Text style={styles.errorText}>{audioError}</Text>}

          {/* Ảnh bìa */}
          <TouchableOpacity style={styles.coverRow} onPress={chooseCover} disabled={uploading} accessibilityLabel="Choose cover image">
            <CoverImage uri={cover?.uri} size={72} radius={12} icon="camera-outline" />
            <View style={styles.flex}>
              <Text style={styles.coverTitle}>Cover image</Text>
              <Text style={styles.hint}>Optional · square, up to 5 MB.{'\n'}No cover → your profile photo.</Text>
              {!!coverError && <Text style={styles.errorText}>{coverError}</Text>}
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={[styles.input, !!errors.title && styles.inputError]}
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setErrors((e) => ({ ...e, title: undefined }));
            }}
            placeholder="Song title"
            placeholderTextColor={COLORS.textMuted}
            maxLength={STUDIO_LIMITS.songTitleMax + 10}
            editable={!uploading}
            accessibilityLabel="Song title"
          />
          {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

          <Text style={styles.label}>Genre *</Text>
          <View style={styles.chips}>
            {genres.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, genre === g && styles.chipOn]}
                onPress={() => {
                  setGenre(g);
                  setErrors((e) => ({ ...e, genre: undefined }));
                }}
                disabled={uploading}
                accessibilityLabel={`Genre ${g}`}
              >
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
            placeholder="Tell listeners about this song (optional)"
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={STUDIO_LIMITS.descriptionMax}
            textAlignVertical="top"
            editable={!uploading}
            accessibilityLabel="Description"
          />

          <Text style={styles.label}>When ready</Text>
          <View style={styles.radioRow}>
            {[
              { on: publish, title: 'Publish now', sub: 'Everyone can listen', value: true },
              { on: !publish, title: 'Save as draft', sub: 'Only you can see', value: false },
            ].map((o) => (
              <TouchableOpacity
                key={o.title}
                style={[styles.radioCard, o.on && styles.radioCardOn]}
                onPress={() => setPublish(o.value)}
                disabled={uploading}
                accessibilityRole="radio"
                accessibilityState={{ checked: o.on }}
                accessibilityLabel={o.title}
              >
                <View style={[styles.radio, o.on && styles.radioOn]} />
                <View style={styles.flex}>
                  <Text style={styles.radioTitle}>{o.title}</Text>
                  <Text style={styles.hint}>{o.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {publish && (
            <View style={styles.shareRow}>
              <View style={styles.flex}>
                <Text style={styles.radioTitle}>Share to feed</Text>
                <Text style={styles.hint}>Post this song on the Feed for your fans</Text>
              </View>
              <Switch
                value={shareToFeed}
                onValueChange={setShareToFeed}
                disabled={uploading}
                trackColor={{ true: COLORS.primary, false: '#D1D5DB' }}
                accessibilityLabel="Share to feed"
              />
            </View>
          )}

          {!!submitError && <NoticeBox tone="error" style={styles.mt12}>{submitError}</NoticeBox>}
        </ScrollView>
        <View style={styles.footer}>
          {uploading ? (
            <View style={styles.uploadingBtn}><ActivityIndicator color="#FFFFFF" /><Text style={styles.uploadingText}>Uploading {Math.round(progress * 100)}%</Text></View>
          ) : (
            <AppButton label={submitError ? 'Try again' : 'Upload'} onPress={upload} />
          )}
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog visible={confirmDiscard} title="Discard this upload?" message="The file and details you entered will be lost." onClose={() => setConfirmDiscard(false)}>
        <AppButton label="Discard" variant="danger" onPress={() => { setConfirmDiscard(false); onClose?.(); }} />
        <AppButton label="Keep editing" variant="ghost" onPress={() => setConfirmDiscard(false)} />
      </ConfirmDialog>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#F9FAFB' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9BE3EA', backgroundColor: '#F2FDFE', borderRadius: 14, padding: 14 },
  fileDone: { borderStyle: 'solid', borderColor: COLORS.border, backgroundColor: '#FFFFFF' },
  fileError: { borderColor: '#E11D48' },
  fileIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  coverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 4 },
  coverTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 12.5 },
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
  radioRow: { flexDirection: 'row', gap: 8 },
  radioCard: { flex: 1, flexDirection: 'row', gap: 10, borderWidth: 2, borderColor: COLORS.border, borderRadius: 14, padding: 11 },
  radioCardOn: { borderColor: COLORS.primary, backgroundColor: '#F2FDFE' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.textMuted, marginTop: 1 },
  radioOn: { borderWidth: 6, borderColor: COLORS.primary },
  radioTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  progressBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginBottom: 12 },
  progressTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  progressPct: { fontSize: 14, fontWeight: '800', color: COLORS.primaryDark },
  bar: { height: 6, borderRadius: 3, backgroundColor: COLORS.tagBg, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  uploadingBtn: { height: 48, borderRadius: 14, backgroundColor: COLORS.primary, opacity: 0.7, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  uploadingText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  doneBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  doneIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  doneTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  doneSub: { fontSize: 13.5, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 19 },
});

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { pickImageFile } from '../../src/services/filePicker';
import { toImageSource } from '../../src/utils/imageSource';
import { ARTIST_GENRES, ARTIST_LIMITS, ArtistFormErrors, cleanSocialLinks, cleanText, toggleGenre, validateArtistProfile } from '../../src/utils/artistRequest';
import { AppButton, NameAvatar, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';

interface EditArtistPageScreenProps {
  onBack?: () => void;
  onSaved?: () => void;
}

type ImageKey = 'avatarImage' | 'aboutImage';

// S9: sửa trang nghệ sĩ – ảnh đại diện, ảnh bìa, nghệ danh (không trùng nghệ sĩ khác), thể loại, tiểu sử, link
export const EditArtistPageScreen: React.FC<EditArtistPageScreenProps> = ({ onBack, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [stageName, setStageName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [images, setImages] = useState<Record<ImageKey, string>>({ avatarImage: '', aboutImage: '' });
  const [previews, setPreviews] = useState<Partial<Record<ImageKey, string>>>({});
  const [uploading, setUploading] = useState<ImageKey | null>(null);
  const [errors, setErrors] = useState<ArtistFormErrors>({});
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.studio
      .getProfile()
      .then((res) => {
        const a = res.data;
        setStageName(a.name);
        setOriginalName(a.name);
        setGenres(a.genres || []);
        setBio(a.bio || '');
        setLinks(a.socialLinks?.length ? a.socialLinks : ['']);
        setImages({ avatarImage: a.avatarImage || '', aboutImage: a.aboutImage || '' });
      })
      .catch((err) => setMessage({ tone: 'error', text: isApiError(err) ? err.message : "Can't connect to the server." }))
      .finally(() => setLoading(false));
  }, []);

  const changeImage = async (key: ImageKey) => {
    const r = await pickImageFile(key === 'avatarImage' ? [1, 1] : [16, 9]);
    if (r.status === 'cancelled') return;
    if (r.status === 'error') return setMessage({ tone: 'error', text: r.message });
    setPreviews((p) => ({ ...p, [key]: r.file.uri }));
    setUploading(key);
    try {
      const form = new FormData();
      await r.file.appendTo(form, 'image');
      const res = await api.studio.uploadImage(form);
      setImages((p) => ({ ...p, [key]: res.image }));
    } catch (err) {
      setPreviews((p) => ({ ...p, [key]: undefined }));
      setMessage({ tone: 'error', text: isApiError(err) ? err.message : 'Could not upload the image.' });
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    const nextErrors = validateArtistProfile({ stageName, genres, bio, socialLinks: links, avatarImage: '' });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.studio.updateProfile({
        stageName: cleanText(stageName),
        genres,
        bio: bio.trim(),
        socialLinks: cleanSocialLinks(links),
        ...images,
      });
      setOriginalName(cleanText(stageName));
      setMessage({ tone: 'ok', text: 'Your artist page has been updated.' });
      onSaved?.();
    } catch (err) {
      if (isApiError(err) && err.code === 'NAME_TAKEN') setErrors({ stageName: 'This stage name is already used by another artist.' });
      else if (isApiError(err) && err.errors) setErrors(err.errors as ArtistFormErrors);
      setMessage({ tone: 'error', text: isApiError(err) ? err.message : "Can't connect to the server. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const renamed = cleanText(stageName) !== originalName;
  const aboutUri = previews.aboutImage || images.aboutImage;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Edit artist page" onBack={onBack} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Ảnh bìa trang + ảnh đại diện */}
            <View style={styles.banner}>
              {aboutUri ? (
                <Image source={toImageSource(aboutUri)} style={styles.bannerImg} />
              ) : (
                <LinearGradient colors={['#4E2A84', '#9B30FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bannerImg} />
              )}
              <TouchableOpacity style={styles.bannerBtn} onPress={() => changeImage('aboutImage')} disabled={!!uploading} accessibilityLabel="Change cover photo">
                <Text style={styles.bannerBtnText}>{uploading === 'aboutImage' ? 'Uploading…' : 'Change cover'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarWrap} onPress={() => changeImage('avatarImage')} disabled={!!uploading} accessibilityLabel="Change profile photo">
                <NameAvatar name={stageName || '?'} image={previews.avatarImage || images.avatarImage} size={64} />
                <View style={styles.cameraDot}>
                  {uploading === 'avatarImage' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera" size={12} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Stage name *</Text>
            <TextInput
              style={[styles.input, !!errors.stageName && styles.inputError]}
              value={stageName}
              onChangeText={(t) => { setStageName(t); setErrors((e) => ({ ...e, stageName: undefined })); }}
              maxLength={ARTIST_LIMITS.stageNameMax + 10}
              accessibilityLabel="Stage name"
            />
            <Text style={errors.stageName ? styles.errorText : styles.hint}>
              {errors.stageName ?? (renamed ? 'Your songs, albums and posts will show the new name.' : 'Must be unique among artists.')}
            </Text>

            <Text style={styles.label}>Genres * (up to {ARTIST_LIMITS.genresMax})</Text>
            <View style={styles.chips}>
              {ARTIST_GENRES.map((g) => {
                const on = genres.includes(g);
                return (
                  <TouchableOpacity key={g} style={[styles.chip, on && styles.chipOn]} onPress={() => { setGenres((p) => toggleGenre(p, g)); setErrors((e) => ({ ...e, genres: undefined })); }} accessibilityLabel={`${g}${on ? ', selected' : ''}`}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{g}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!!errors.genres && <Text style={styles.errorText}>{errors.genres}</Text>}

            <Text style={styles.label}>Bio *</Text>
            <TextInput
              style={[styles.input, styles.area, !!errors.bio && styles.inputError]}
              value={bio}
              onChangeText={(t) => { setBio(t); setErrors((e) => ({ ...e, bio: undefined })); }}
              multiline
              maxLength={ARTIST_LIMITS.bioMax}
              textAlignVertical="top"
              accessibilityLabel="Bio"
            />
            <View style={styles.rowBetween}>
              <Text style={styles.errorText}>{errors.bio ?? ''}</Text>
              <Text style={styles.hint}>{bio.trim().length} / {ARTIST_LIMITS.bioMax}</Text>
            </View>

            <Text style={styles.label}>Social links</Text>
            {links.map((link, i) => (
              <View key={i} style={[styles.input, styles.linkRow, !!errors.socialLinks && styles.inputError]}>
                <Ionicons name="link" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.linkInput}
                  value={link}
                  onChangeText={(t) => setLinks((p) => p.map((l, j) => (j === i ? t : l)))}
                  placeholder="instagram.com/yourname"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={`Social link ${i + 1}`}
                />
                {links.length > 1 && (
                  <TouchableOpacity onPress={() => setLinks((p) => p.filter((_, j) => j !== i))} accessibilityLabel="Remove link">
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!!errors.socialLinks && <Text style={styles.errorText}>{errors.socialLinks}</Text>}
            {links.length < ARTIST_LIMITS.socialLinksMax && (
              <TouchableOpacity onPress={() => setLinks((p) => [...p, ''])} style={styles.addLink}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.link}>Add another link</Text>
              </TouchableOpacity>
            )}
            {!!message && <NoticeBox tone={message.tone} style={styles.mt12}>{message.text}</NoticeBox>}
          </ScrollView>
          <View style={styles.footer}>
            <AppButton label="Save changes" onPress={save} loading={saving} disabled={!!uploading} />
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
  mt12: { marginTop: 12 },
  banner: { height: 96, marginTop: 4, marginBottom: 36 },
  bannerImg: { width: '100%', height: 96, borderRadius: 14 },
  bannerBtn: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  bannerBtnText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textPrimary },
  avatarWrap: { position: 'absolute', left: 14, bottom: -30, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 40 },
  cameraDot: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: COLORS.textPrimary },
  inputError: { borderColor: '#E11D48' },
  area: { minHeight: 80 },
  hint: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 4 },
  errorText: { fontSize: 11.5, color: '#E11D48', marginTop: 4, flexShrink: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  chipTextOn: { color: '#FFFFFF' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 0, marginBottom: 8 },
  linkInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: COLORS.textPrimary },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
});

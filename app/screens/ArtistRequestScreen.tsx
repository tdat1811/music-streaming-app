import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { api, isApiError } from '../../src/services/api';
import { pickAvatar } from '../../src/services/avatarPicker';
import { useAuth } from '../../src/context/AuthContext';
import {
  ARTIST_GENRES,
  ARTIST_LIMITS,
  ArtistFormErrors,
  ArtistRequestForm,
  cleanSocialLinks,
  cleanText,
  EMPTY_ARTIST_FORM,
  toggleGenre,
  validateArtistProfile,
} from '../../src/utils/artistRequest';
import { AppButton, NameAvatar, NoticeBox, ScreenHeader } from '../../src/components/ArtistUi';

interface ArtistRequestScreenProps {
  // Dữ liệu điền sẵn (khi sửa và gửi lại sau khi bị từ chối)
  initial?: Partial<ArtistRequestForm> | null;
  onBack?: () => void;
  onSubmitted?: () => void;
}

// A2–A3: form đăng ký làm nghệ sĩ (bước 1 hồ sơ, bước 2 xem lại và gửi)
export const ArtistRequestScreen: React.FC<ArtistRequestScreenProps> = ({ initial, onBack, onSubmitted }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<ArtistRequestForm>(() => ({
    ...EMPTY_ARTIST_FORM,
    ...initial,
    socialLinks: initial?.socialLinks?.length ? [...initial.socialLinks] : [''],
  }));
  const [errors, setErrors] = useState<ArtistFormErrors>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial?.avatarImage || null);
  const [avatarState, setAvatarState] = useState<{ uploading: boolean; error: string | null }>({ uploading: false, error: null });
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = <K extends keyof ArtistRequestForm>(key: K, value: ArtistRequestForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const chooseAvatar = async () => {
    setAvatarState({ uploading: false, error: null });
    const picked = await pickAvatar();
    if (picked.status === 'cancelled') return;
    if (picked.status === 'error') {
      setAvatarState({ uploading: false, error: picked.message });
      return;
    }
    setAvatarPreview(picked.previewUri);
    setAvatarState({ uploading: true, error: null });
    try {
      const res = await api.artistRequests.uploadAvatar(picked.form);
      update('avatarImage', res.avatarImage);
      setAvatarState({ uploading: false, error: null });
    } catch (err) {
      setAvatarPreview(form.avatarImage || null);
      setAvatarState({ uploading: false, error: isApiError(err) ? err.message : "Can't connect to the server. Please try again." });
    }
  };

  const goToReview = () => {
    const nextErrors = validateArtistProfile(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setSubmitError(null);
      setStep(2);
    }
  };

  const submit = async () => {
    if (!agree || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.artistRequests.create({
        stageName: cleanText(form.stageName),
        genres: form.genres,
        bio: form.bio.trim(),
        socialLinks: cleanSocialLinks(form.socialLinks),
        avatarImage: form.avatarImage,
        agree: true,
      });
      onSubmitted?.();
    } catch (err) {
      if (isApiError(err)) {
        if (err.code === 'NAME_TAKEN') {
          setSubmitError(`"${cleanText(form.stageName)}" is already used by another artist. Please go back and choose a different stage name.`);
        } else if (err.code === 'PENDING_EXISTS') {
          setSubmitError('You already have a request waiting for review.');
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError("Can't connect to the server. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const links = cleanSocialLinks(form.socialLinks);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title={step === 1 ? 'Become an artist' : 'Review & submit'} onBack={step === 2 ? () => setStep(1) : onBack} />
      <View style={styles.steps}>
        <View style={[styles.stepBar, styles.stepOn]} />
        <View style={[styles.stepBar, step === 2 && styles.stepOn]} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {step === 1 ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Ảnh đại diện */}
            <TouchableOpacity style={styles.avatarRow} onPress={chooseAvatar} activeOpacity={0.8} accessibilityLabel="Choose profile photo">
              <View>
                <NameAvatar name={form.stageName || currentUser?.name || '?'} image={avatarPreview} size={64} />
                <View style={styles.cameraDot}>
                  {avatarState.uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera" size={13} color="#FFFFFF" />}
                </View>
              </View>
              <View style={styles.flex}>
                <Text style={styles.avatarTitle}>Profile photo</Text>
                <Text style={styles.hint}>Optional · JPG/PNG, up to 5 MB</Text>
                {!!avatarState.error && <Text style={styles.errorText}>{avatarState.error}</Text>}
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Stage name *</Text>
            <TextInput
              style={[styles.input, !!errors.stageName && styles.inputError]}
              value={form.stageName}
              onChangeText={(t) => update('stageName', t)}
              placeholder="Your artist name"
              placeholderTextColor={COLORS.textMuted}
              maxLength={ARTIST_LIMITS.stageNameMax + 10}
              accessibilityLabel="Stage name"
            />
            <Text style={errors.stageName ? styles.errorText : styles.hint}>
              {errors.stageName ?? `${ARTIST_LIMITS.stageNameMin}–${ARTIST_LIMITS.stageNameMax} characters. Must be unique.`}
            </Text>

            <Text style={styles.label}>Genres * (up to {ARTIST_LIMITS.genresMax})</Text>
            <View style={styles.chips}>
              {ARTIST_GENRES.map((g) => {
                const on = form.genres.includes(g);
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => update('genres', toggleGenre(form.genres, g))}
                    accessibilityLabel={`${g}${on ? ', selected' : ''}`}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{g}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!!errors.genres && <Text style={styles.errorText}>{errors.genres}</Text>}

            <Text style={styles.label}>Short bio *</Text>
            <TextInput
              style={[styles.input, styles.area, !!errors.bio && styles.inputError]}
              value={form.bio}
              onChangeText={(t) => update('bio', t)}
              placeholder="Tell listeners about your music"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={ARTIST_LIMITS.bioMax}
              textAlignVertical="top"
              accessibilityLabel="Short bio"
            />
            <View style={styles.rowBetween}>
              <Text style={styles.errorText}>{errors.bio ?? ''}</Text>
              <Text style={styles.hint}>{form.bio.trim().length} / {ARTIST_LIMITS.bioMax}</Text>
            </View>

            <Text style={styles.label}>Social links (optional)</Text>
            {form.socialLinks.map((link, i) => (
              <View key={i} style={[styles.input, styles.linkRow, !!errors.socialLinks && styles.inputError]}>
                <Ionicons name="link" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.linkInput}
                  value={link}
                  onChangeText={(t) => update('socialLinks', form.socialLinks.map((l, j) => (j === i ? t : l)))}
                  placeholder="instagram.com/yourname"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  accessibilityLabel={`Social link ${i + 1}`}
                />
                {form.socialLinks.length > 1 && (
                  <TouchableOpacity onPress={() => update('socialLinks', form.socialLinks.filter((_, j) => j !== i))} accessibilityLabel="Remove link">
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!!errors.socialLinks && <Text style={styles.errorText}>{errors.socialLinks}</Text>}
            {form.socialLinks.length < ARTIST_LIMITS.socialLinksMax && (
              <TouchableOpacity onPress={() => update('socialLinks', [...form.socialLinks, ''])} style={styles.addLink}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addLinkText}>Add another link</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.box}>
              <View style={styles.reviewHead}>
                <NameAvatar name={form.stageName} image={avatarPreview} size={48} />
                <View style={styles.flex}>
                  <Text style={styles.reviewName}>{cleanText(form.stageName)}</Text>
                  <Text style={styles.hint}>New artist page</Text>
                </View>
                <TouchableOpacity onPress={() => setStep(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.link}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.kv}><Text style={styles.kvKey}>Genres</Text><Text style={styles.kvVal}>{form.genres.join(', ')}</Text></View>
              <View style={styles.kv}><Text style={styles.kvKey}>Bio</Text><Text style={[styles.kvVal, styles.kvBio]} numberOfLines={3}>{form.bio.trim()}</Text></View>
              <View style={[styles.kv, styles.kvLast]}><Text style={styles.kvKey}>Social</Text><Text style={styles.kvVal}>{links.length ? links.join('\n') : 'None'}</Text></View>
            </View>

            <TouchableOpacity style={styles.checkRow} onPress={() => setAgree((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
              <View style={[styles.checkbox, agree && styles.checkboxOn]}>{agree && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}</View>
              <Text style={styles.checkText}>I confirm I own the rights to the music I will upload and that this information is true.</Text>
            </TouchableOpacity>

            <NoticeBox tone="info">An admin will review your request, usually within 1–2 days. You'll get a notification with the result.</NoticeBox>
            {!!submitError && <NoticeBox tone="error" style={styles.mt12}>{submitError}</NoticeBox>}
          </ScrollView>
        )}

        <View style={styles.footer}>
          {step === 1 ? (
            <AppButton label="Continue" onPress={goToReview} disabled={avatarState.uploading} />
          ) : (
            <AppButton label="Submit request" onPress={submit} disabled={!agree} loading={submitting} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  steps: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginBottom: 8 },
  stepBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  stepOn: { backgroundColor: COLORS.primary },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  cameraDot: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  label: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, color: COLORS.textPrimary },
  inputError: { borderColor: '#E11D48' },
  area: { minHeight: 90 },
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
  addLinkText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  box: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 14 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  link: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  kvLast: { borderBottomWidth: 0 },
  kvKey: { fontSize: 13, color: COLORS.textSecondary },
  kvVal: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', flexShrink: 1 },
  kvBio: { fontWeight: '500' },
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: COLORS.textMuted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkText: { flex: 1, fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 18 },
  mt12: { marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight, backgroundColor: '#FFFFFF' },
});

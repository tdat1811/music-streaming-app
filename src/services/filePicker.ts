import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { STUDIO_LIMITS, validateAudioFile } from '../utils/studio';

export interface PickedFile {
  name: string;
  size: number | null;
  mimeType: string;
  uri: string;
  // Thêm file vào FormData (web: Blob; điện thoại: object { uri, name, type })
  appendTo: (form: FormData, field: string) => Promise<void>;
}

export type PickResult = { status: 'cancelled' } | { status: 'error'; message: string } | { status: 'ok'; file: PickedFile };

const makeAppend = (asset: { uri: string; name: string; mimeType: string; file?: File | null }) => async (form: FormData, field: string) => {
  if (Platform.OS === 'web') {
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
    form.append(field, blob, asset.name);
  } else {
    form.append(field, { uri: asset.uri, name: asset.name, type: asset.mimeType } as any);
  }
};

// Chọn 1 file nhạc mp3 / m4a (tối đa 20 MB)
export const pickAudioFile = async (): Promise<PickResult> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  const a = result.assets[0];
  const error = validateAudioFile({ name: a.name, size: a.size ?? null });
  if (error) return { status: 'error', message: error };
  const ext = a.name.split('.').pop()?.toLowerCase();
  const mimeType = a.mimeType || (ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg');
  return {
    status: 'ok',
    file: { name: a.name, size: a.size ?? null, mimeType, uri: a.uri, appendTo: makeAppend({ uri: a.uri, name: a.name, mimeType, file: (a as any).file }) },
  };
};

const EXT_BY_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Chọn 1 ảnh từ thư viện ảnh (tối đa 5 MB). aspect: tỉ lệ khung cắt (ảnh bìa bài hát vuông, ảnh bìa trang 16:9)
export const pickImageFile = async (aspect: [number, number] = [1, 1]): Promise<PickResult> => {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'error', message: 'Please allow photo access to choose an image.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.85 });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };
  const a = result.assets[0];
  const mimeType = a.mimeType || 'image/jpeg';
  const ext = EXT_BY_MIME[mimeType];
  if (!ext) return { status: 'error', message: 'Please choose a JPG, PNG or WEBP image.' };
  if (a.fileSize && a.fileSize > STUDIO_LIMITS.imageMaxBytes) return { status: 'error', message: 'Image is too large. Maximum 5 MB.' };
  const name = `image.${ext}`;
  return {
    status: 'ok',
    file: { name, size: a.fileSize ?? null, mimeType, uri: a.uri, appendTo: makeAppend({ uri: a.uri, name, mimeType, file: (a as any).file }) },
  };
};

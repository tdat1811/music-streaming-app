import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ARTIST_LIMITS } from '../utils/artistRequest';

export type PickedAvatar =
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
  // previewUri: hiển thị ngay trên máy; form: gửi lên API tải ảnh (trường "avatar")
  | { status: 'ok'; previewUri: string; form: FormData };

const EXT_BY_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Chọn 1 ảnh vuông từ thư viện ảnh và đóng gói thành FormData (chạy được cả web lẫn điện thoại)
export const pickAvatar = async (): Promise<PickedAvatar> => {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'error', message: 'Please allow photo access to choose a profile photo.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return { status: 'cancelled' };

  const asset = result.assets[0];
  const mimeType = asset.mimeType || 'image/jpeg';
  const ext = EXT_BY_MIME[mimeType];
  if (!ext) return { status: 'error', message: 'Please choose a JPG, PNG or WEBP photo.' };
  if (asset.fileSize && asset.fileSize > ARTIST_LIMITS.avatarMaxBytes) {
    return { status: 'error', message: 'Photo is too large. Maximum 5 MB.' };
  }

  const form = new FormData();
  const name = `avatar.${ext}`;
  if (Platform.OS === 'web') {
    // Trên web ảnh là blob/data URI: đọc thành Blob rồi gửi
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
    form.append('avatar', blob, name);
  } else {
    // React Native nhận object { uri, name, type } làm file
    form.append('avatar', { uri: asset.uri, name, type: mimeType } as any);
  }
  return { status: 'ok', previewUri: asset.uri, form };
};

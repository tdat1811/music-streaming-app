import { ImageSourcePropType } from 'react-native';
import { resolveServerUrl } from '../services/api';
import { IMAGES } from '../constants/images';

// Ảnh có thể là ảnh đóng gói trong app (require) hoặc đường dẫn URL từ máy chủ.
// Chuỗi rỗng hoặc thiếu ảnh thì dùng ảnh dự phòng.
export const toImageSource = (image: unknown, fallback?: ImageSourcePropType): ImageSourcePropType | undefined => {
  if (typeof image === 'string') return image ? { uri: resolveServerUrl(image) } : fallback;
  return (image as ImageSourcePropType) ?? fallback;
};

// Ảnh nghệ sĩ: chưa có ảnh (chuỗi rỗng / thiếu) thì dùng ảnh mặc định trung tính
export const artistImageSource = (image: unknown): ImageSourcePropType =>
  toImageSource(image, IMAGES.defaultArtist) ?? IMAGES.defaultArtist;

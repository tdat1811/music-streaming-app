import { ImageSourcePropType } from 'react-native';

// Ảnh có thể là ảnh đóng gói trong app (require) hoặc đường dẫn URL từ máy chủ.
// Chuỗi rỗng hoặc thiếu ảnh thì dùng ảnh dự phòng.
export const toImageSource = (image: unknown, fallback?: ImageSourcePropType): ImageSourcePropType | undefined => {
  if (typeof image === 'string') return image ? { uri: image } : fallback;
  return (image as ImageSourcePropType) ?? fallback;
};

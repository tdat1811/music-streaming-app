// Nguồn lượt nghe (giai đoạn 4): bài hát được bấm phát từ màn nào.
// Navigation cập nhật nguồn theo màn đang mở; trình phát đọc nguồn lúc người dùng bấm phát.
// Bài phát tiếp trong hàng đợi giữ nguồn của lần bấm đầu.

export type PlaySource = 'search' | 'home' | 'artist' | 'album' | 'playlist' | 'feed' | 'library' | 'other';

// screen: màn đang mở; detailOwner: ownerId của danh sách đang xem ở màn PlaylistDetails ('album' | 'chart' | id người dùng).
// Trả về null khi màn không đổi nguồn (màn phát nhạc: bấm bài trong hàng đợi vẫn tính nguồn cũ).
export const sourceForScreen = (screen: string, detailOwner?: string | null): PlaySource | null => {
  switch (screen) {
    case 'PlayAudio':
      return null;
    case 'SearchResults':
      return 'search';
    case 'Home':
    case 'ChartsList':
    case 'AlbumsList':
    case 'ArtistsList':
    case 'SeeAll':
      return 'home';
    case 'ArtistProfile':
      return 'artist';
    case 'PlaylistDetails':
      if (detailOwner === 'album') return 'album';
      if (detailOwner === 'chart') return 'home';
      return 'playlist';
    case 'Feed':
    case 'FeedComments':
    case 'ArtistPosts':
      return 'feed';
    case 'MyLibrary':
      return 'library';
    default:
      return 'other';
  }
};

let current: PlaySource = 'other';

export const setPlaySource = (source: PlaySource | null) => {
  if (source) current = source;
};

export const getPlaySource = (): PlaySource => current;

import { IMAGES } from '../constants/images';

export interface Song {
  id: string;
  title: string;
  artist: string;
  plays?: string;
  duration?: string;
  coverImage: any;
  isLiked?: boolean;
  audioUrl?: string;
  category?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverImage: any;
  songIds?: string[];
  releaseYear?: string;
  isTrending?: boolean;
}

export type Chart = ChartItem;
export interface ChartItem {
  id: string;
  title: string;
  subtitle?: string;
  updateText?: string;
  coverImage: any;
  songIds?: string[];
}

export interface Artist {
  id: string;
  name: string;
  followers?: string;
  avatarImage: any;
  isFollowing?: boolean;
  bio?: string;
  aboutImage?: any;
  isVerified?: boolean;
  isPopular?: boolean;
}

export interface Playlist {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  coverImage: any;
  songIds: string[];
}

export interface FeedPost {
  id: string;
  authorName: string;
  authorAvatar: any;
  timeAgo: string;
  songId: string;
  likes: number;
  likedByUserIds: string[];
  shares: number;
}

export interface CommentItem {
  id: string;
  postId: string;
  // Tác giả bình luận (dữ liệu mẫu có thể không có, khi đó dò theo userName)
  userId?: string;
  userName: string;
  userAvatar: any;
  text: string;
  timeAgo: string;
  likes: number;
  likedByUserIds: string[];
  replyToName?: string;
  replies?: CommentItem[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  planId: string | null;
  likedSongIds: string[];
  followedArtistIds: string[];
  // Riêng từng tài khoản (trước đây dùng chung cho mọi tài khoản)
  likedAlbumIds?: string[];
  downloadedSongIds?: string[];
}

// Tài khoản mẫu, chưa có backend nên mật khẩu để dạng chữ thường. Không dùng dữ liệu thật.

// ==================== MONGO DB LIVE SYNCED DATA ====================
export const SEED_SONGS: Song[] = [
  {
    "id": "s1",
    "title": "Reflection",
    "artist": "Christina Aguilera",
    "duration": "03:36",
    "plays": "1.2M",
    "category": "suggestions",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s1.m4a"
  },
  {
    "id": "s2",
    "title": "In The Stars",
    "artist": "Benson Boone",
    "duration": "03:15",
    "plays": "3.4M",
    "category": "suggestions",
    "coverImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s2.m4a"
  },
  {
    "id": "s3",
    "title": "Starboy",
    "artist": "The Weeknd ft. Daft Punk",
    "duration": "03:50",
    "plays": "8.5M",
    "category": "suggestions",
    "coverImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s3.m4a"
  },
  {
    "id": "s4",
    "title": "Blinding Lights",
    "artist": "The Weeknd",
    "duration": "03:20",
    "plays": "12.8M",
    "category": "suggestions",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s4.m4a"
  },
  {
    "id": "s5",
    "title": "As It Was",
    "artist": "Harry Styles",
    "duration": "02:47",
    "plays": "9.1M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s5.m4a"
  },
  {
    "id": "s6",
    "title": "Stay",
    "artist": "The Kid LAROI, Justin Bieber",
    "duration": "02:21",
    "plays": "7.8M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s6.m4a"
  },
  {
    "id": "s7",
    "title": "Levitating",
    "artist": "Dua Lipa",
    "duration": "03:23",
    "plays": "6.5M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s7.m4a"
  },
  {
    "id": "s8",
    "title": "Flowers",
    "artist": "Miley Cyrus",
    "duration": "03:20",
    "plays": "11.2M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s8.m4a"
  },
  {
    "id": "s9",
    "title": "Shape of You",
    "artist": "Ed Sheeran",
    "duration": "03:53",
    "plays": "15.4M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s9.m4a"
  },
  {
    "id": "s10",
    "title": "Bad Guy",
    "artist": "Billie Eilish",
    "duration": "03:14",
    "plays": "8.9M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s10.m4a"
  },
  {
    "id": "s11",
    "title": "Perfect",
    "artist": "Ed Sheeran",
    "duration": "04:23",
    "plays": "14.1M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s11.m4a"
  },
  {
    "id": "s12",
    "title": "Someone You Loved",
    "artist": "Lewis Capaldi",
    "duration": "03:02",
    "plays": "9.6M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1520523839898-507124976779?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s12.m4a"
  },
  {
    "id": "s13",
    "title": "Sunflower",
    "artist": "Post Malone, Swae Lee",
    "duration": "02:38",
    "plays": "13.3M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s13.m4a"
  },
  {
    "id": "s14",
    "title": "Save Your Tears",
    "artist": "The Weeknd",
    "duration": "03:35",
    "plays": "10.7M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s14.m4a"
  },
  {
    "id": "s15",
    "title": "Heat Waves",
    "artist": "Glass Animals",
    "duration": "03:58",
    "plays": "8.2M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s15.m4a"
  },
  {
    "id": "s16",
    "title": "Anti-Hero",
    "artist": "Taylor Swift",
    "duration": "03:20",
    "plays": "7.9M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s16.m4a"
  },
  {
    "id": "s17",
    "title": "Cruel Summer",
    "artist": "Taylor Swift",
    "duration": "02:58",
    "plays": "11.8M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s17.m4a"
  },
  {
    "id": "s18",
    "title": "Kill Bill",
    "artist": "SZA",
    "duration": "02:33",
    "plays": "6.7M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s18.m4a"
  },
  {
    "id": "s19",
    "title": "Calm Down",
    "artist": "Rema, Selena Gomez",
    "duration": "03:59",
    "plays": "8.4M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s19.m4a"
  },
  {
    "id": "s20",
    "title": "Peaches",
    "artist": "Justin Bieber ft. Daniel Caesar",
    "duration": "03:18",
    "plays": "7.2M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s20.m4a"
  },
  {
    "id": "s21",
    "title": "Espresso",
    "artist": "Sabrina Carpenter",
    "duration": "02:55",
    "plays": "9.4M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s21.m4a"
  },
  {
    "id": "s22",
    "title": "Birds of a Feather",
    "artist": "Billie Eilish",
    "duration": "03:30",
    "plays": "8.1M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s22.m4a"
  },
  {
    "id": "s23",
    "title": "Seven",
    "artist": "Jung Kook ft. Latto",
    "duration": "03:04",
    "plays": "10.2M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s23.m4a"
  },
  {
    "id": "s24",
    "title": "Greedy",
    "artist": "Tate McRae",
    "duration": "02:11",
    "plays": "5.8M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1520523839898-507124976779?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s24.m4a"
  },
  {
    "id": "s25",
    "title": "Water",
    "artist": "Tyla",
    "duration": "03:20",
    "plays": "6.1M",
    "category": "charts",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s25.m4a"
  },
  {
    "id": "s26",
    "title": "Nơi Này Có Anh",
    "artist": "Sơn Tùng M-TP",
    "duration": "04:20",
    "plays": "15.8M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s26.m4a"
  },
  {
    "id": "s27",
    "title": "Lạc Trôi",
    "artist": "Sơn Tùng M-TP",
    "duration": "03:52",
    "plays": "18.2M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s27.m4a"
  },
  {
    "id": "s28",
    "title": "Chúng Ta Của Hiện Tại",
    "artist": "Sơn Tùng M-TP",
    "duration": "05:01",
    "plays": "12.4M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s28.m4a"
  },
  {
    "id": "s29",
    "title": "Nàng Thơ",
    "artist": "Hoàng Dũng",
    "duration": "04:14",
    "plays": "10.5M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s29.m4a"
  },
  {
    "id": "s30",
    "title": "Bước Qua Mùa Cô Đơn",
    "artist": "Vũ.",
    "duration": "04:38",
    "plays": "8.7M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s30.m4a"
  },
  {
    "id": "s31",
    "title": "Lạ Lùng",
    "artist": "Vũ.",
    "duration": "04:21",
    "plays": "11.9M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s31.m4a"
  },
  {
    "id": "s32",
    "title": "Có Em Chờ",
    "artist": "MIN ft. Mr.A",
    "duration": "03:45",
    "plays": "7.8M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s32.m4a"
  },
  {
    "id": "s33",
    "title": "See Tình",
    "artist": "Hoàng Thùy Linh",
    "duration": "03:05",
    "plays": "14.5M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s33.m4a"
  },
  {
    "id": "s34",
    "title": "Để Mị Nói Cho Mà Nghe",
    "artist": "Hoàng Thùy Linh",
    "duration": "03:19",
    "plays": "13.1M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s34.m4a"
  },
  {
    "id": "s35",
    "title": "Waiting For You",
    "artist": "MONO, Onionn",
    "duration": "04:16",
    "plays": "12.0M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s35.m4a"
  },
  {
    "id": "s36",
    "title": "Cắt Đôi Nỗi Sầu",
    "artist": "Tăng Duy Tân",
    "duration": "03:02",
    "plays": "9.3M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1520523839898-507124976779?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s36.m4a"
  },
  {
    "id": "s37",
    "title": "Bên Trên Tầng Lầu",
    "artist": "Tăng Duy Tân",
    "duration": "03:12",
    "plays": "11.4M",
    "category": "vpop",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s37.m4a"
  },
  {
    "id": "s38",
    "title": "Zombie",
    "artist": "Ryan Young",
    "duration": "03:30",
    "plays": "2.1M",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s38.m4a"
  },
  {
    "id": "s39",
    "title": "Alone",
    "artist": "Ryan Young",
    "duration": "03:45",
    "plays": "1.8M",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s39.m4a"
  },
  {
    "id": "s40",
    "title": "Midnight Echo",
    "artist": "Ryan Young",
    "duration": "04:02",
    "plays": "950K",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s40.m4a"
  },
  {
    "id": "s41",
    "title": "Neon Skyline",
    "artist": "Ryan Young",
    "duration": "03:18",
    "plays": "1.4M",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s41.m4a"
  },
  {
    "id": "s42",
    "title": "Fly Away",
    "artist": "Mer Watson",
    "duration": "03:15",
    "plays": "3.2M",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s42.m4a"
  },
  {
    "id": "s43",
    "title": "Ocean Breeze",
    "artist": "Mer Watson",
    "duration": "03:40",
    "plays": "2.5M",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s43.m4a"
  },
  {
    "id": "s44",
    "title": "Velvet Sky",
    "artist": "Mer Watson",
    "duration": "04:11",
    "plays": "1.9M",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s44.m4a"
  },
  {
    "id": "s45",
    "title": "Flower Fields",
    "artist": "Jessica Gonzalez",
    "duration": "03:25",
    "plays": "4.6M",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s45.m4a"
  },
  {
    "id": "s46",
    "title": "Golden Hour Sunset",
    "artist": "Jessica Gonzalez",
    "duration": "03:50",
    "plays": "3.8M",
    "category": "artist",
    "coverImage": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s46.m4a"
  },
  {
    "id": "s47",
    "title": "Coffee in Paris",
    "artist": "Lofi Coffee Club",
    "duration": "02:40",
    "plays": "2.2M",
    "category": "chill",
    "coverImage": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s47.m4a"
  },
  {
    "id": "s48",
    "title": "Rainy Day Thoughts",
    "artist": "Chillhop Beats",
    "duration": "02:55",
    "plays": "1.7M",
    "category": "chill",
    "coverImage": "https://images.unsplash.com/photo-1520523839898-507124976779?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s48.m4a"
  },
  {
    "id": "s49",
    "title": "Deep Midnight Walk",
    "artist": "Nightfall Beats",
    "duration": "03:05",
    "plays": "1.1M",
    "category": "chill",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s49.m4a"
  },
  {
    "id": "s50",
    "title": "Quiet Study Session",
    "artist": "Study Vibes",
    "duration": "02:48",
    "plays": "3.0M",
    "category": "chill",
    "coverImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s50.m4a"
  },
  {
    "id": "s51",
    "title": "Sunrise Acoustic",
    "artist": "Morning Breeze",
    "duration": "03:15",
    "plays": "980K",
    "category": "chill",
    "coverImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s51.m4a"
  },
  {
    "id": "s52",
    "title": "Under the Stars",
    "artist": "Acoustic Soul",
    "duration": "03:32",
    "plays": "1.5M",
    "category": "chill",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "audioUrl": "http://localhost:5000/audio/s52.m4a"
  }
];

export const SEED_ALBUMS: Album[] = [
  {
    "id": "alb1",
    "title": "ME - Deluxe Edition",
    "artist": "Jessica Gonzalez",
    "releaseYear": "2024",
    "isTrending": true,
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s1",
      "s2",
      "s3",
      "s45",
      "s46"
    ]
  },
  {
    "id": "alb2",
    "title": "Magna Certe - Live Acoustic",
    "artist": "Mer Watson",
    "releaseYear": "2024",
    "isTrending": true,
    "coverImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s42",
      "s43",
      "s44",
      "s5",
      "s6"
    ]
  },
  {
    "id": "alb3",
    "title": "After Hours & Dawn FM",
    "artist": "The Weeknd",
    "releaseYear": "2023",
    "isTrending": true,
    "coverImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s3",
      "s4",
      "s14"
    ]
  },
  {
    "id": "alb4",
    "title": "Midnights & Folklore",
    "artist": "Taylor Swift",
    "releaseYear": "2023",
    "isTrending": true,
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s16",
      "s17",
      "s8"
    ]
  },
  {
    "id": "alb5",
    "title": "Divide & Equals",
    "artist": "Ed Sheeran",
    "releaseYear": "2022",
    "isTrending": false,
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s9",
      "s11",
      "s12"
    ]
  },
  {
    "id": "alb6",
    "title": "Hit Me Hard and Soft",
    "artist": "Billie Eilish",
    "releaseYear": "2024",
    "isTrending": true,
    "coverImage": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s10",
      "s22"
    ]
  },
  {
    "id": "alb7",
    "title": "Chúng Ta - Single Album",
    "artist": "Sơn Tùng M-TP",
    "releaseYear": "2024",
    "isTrending": true,
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s26",
      "s27",
      "s28"
    ]
  },
  {
    "id": "alb8",
    "title": "Một Vạn Năm",
    "artist": "Vũ.",
    "releaseYear": "2023",
    "isTrending": false,
    "coverImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s30",
      "s31"
    ]
  },
  {
    "id": "alb9",
    "title": "LINK & Hoàng",
    "artist": "Hoàng Thùy Linh",
    "releaseYear": "2023",
    "isTrending": true,
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s33",
      "s34"
    ]
  },
  {
    "id": "alb10",
    "title": "Electric Night Club",
    "artist": "Ryan Young",
    "releaseYear": "2024",
    "isTrending": false,
    "coverImage": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s38",
      "s39",
      "s40",
      "s41"
    ]
  },
  {
    "id": "alb11",
    "title": "Coffee & Lofi Chill",
    "artist": "Lofi Coffee Club",
    "releaseYear": "2024",
    "isTrending": false,
    "coverImage": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s47",
      "s48",
      "s49",
      "s50"
    ]
  },
  {
    "id": "alb12",
    "title": "Morning Acoustic Breeze",
    "artist": "Morning Breeze",
    "releaseYear": "2024",
    "isTrending": false,
    "coverImage": "https://images.unsplash.com/photo-1520523839898-507124976779?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s51",
      "s52",
      "s29"
    ]
  }
];

export const SEED_CHARTS: ChartItem[] = [
  {
    "id": "ch1",
    "title": "Top 50 - Canada",
    "subtitle": "Daily update",
    "updateText": "Daily chart-toppers update",
    "coverImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s1",
      "s2",
      "s3",
      "s4",
      "s5",
      "s6",
      "s7",
      "s8",
      "s9",
      "s10"
    ]
  },
  {
    "id": "ch2",
    "title": "Top 50 - Global",
    "subtitle": "Daily update",
    "updateText": "Your daily update of the most played tracks right now",
    "coverImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s4",
      "s5",
      "s8",
      "s13",
      "s14",
      "s15",
      "s16",
      "s17",
      "s21",
      "s22"
    ]
  },
  {
    "id": "ch3",
    "title": "Top 50 - Việt Nam",
    "subtitle": "Bảng xếp hạng tuần",
    "updateText": "Top những ca khúc V-Pop hot nhất tuần qua",
    "coverImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s26",
      "s27",
      "s28",
      "s29",
      "s30",
      "s31",
      "s32",
      "s33",
      "s34",
      "s35",
      "s36",
      "s37"
    ]
  },
  {
    "id": "ch4",
    "title": "Top 50 - USA",
    "subtitle": "Daily update",
    "updateText": "The hottest tracks in the United States",
    "coverImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s3",
      "s8",
      "s9",
      "s10",
      "s13",
      "s16",
      "s17",
      "s18",
      "s20",
      "s21"
    ]
  },
  {
    "id": "ch5",
    "title": "Viral 50 - Toàn cầu",
    "subtitle": "Trending trends",
    "updateText": "Các ca khúc viral mạnh mẽ nhất trên TikTok và mạng xã hội",
    "coverImage": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s21",
      "s22",
      "s23",
      "s24",
      "s25",
      "s33",
      "s35",
      "s36"
    ]
  },
  {
    "id": "ch6",
    "title": "Top 50 - UK",
    "subtitle": "Weekly Official",
    "updateText": "Official UK Top 40 / 50 Singles Chart",
    "coverImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s5",
      "s7",
      "s9",
      "s11",
      "s12",
      "s14"
    ]
  },
  {
    "id": "ch7",
    "title": "K-Pop Top Hits",
    "subtitle": "Seoul Trending",
    "updateText": "Top những ca khúc K-Pop bùng nổ nhất châu Á",
    "coverImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s23",
      "s24",
      "s25",
      "s3",
      "s6"
    ]
  },
  {
    "id": "ch8",
    "title": "EDM & Dance Festival",
    "subtitle": "Weekend Banger",
    "updateText": "Âm nhạc điện tử sôi động bùng cháy cho ngày cuối tuần",
    "coverImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    "songIds": [
      "s3",
      "s4",
      "s7",
      "s38",
      "s40",
      "s41"
    ]
  }
];

export const SEED_ARTISTS: Artist[] = [
  {
    "id": "art1",
    "name": "The Weeknd",
    "followers": "85.4M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "bio": "Abel Makkonen Tesfaye, known professionally as the Weeknd, is a Canadian singer-songwriter and record producer.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art2",
    "name": "Taylor Swift",
    "followers": "102.1M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    "bio": "Taylor Alison Swift is an American singer-songwriter. Her narrative songwriting, which often centers around her personal life, has received widespread critical plaudits.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art3",
    "name": "Ed Sheeran",
    "followers": "76.8M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80",
    "bio": "Edward Christopher Sheeran MBE is an English singer-songwriter. Born in Halifax, West Yorkshire, he has sold more than 150 million records worldwide.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art4",
    "name": "Billie Eilish",
    "followers": "68.5M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    "bio": "Billie Eilish Pirate Baird O'Connell is an American singer and songwriter. She first gained public attention in 2015 with her debut single Ocean Eyes.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art5",
    "name": "Sơn Tùng M-TP",
    "followers": "14.2M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "bio": "Nguyễn Thanh Tùng, thường được biết đến với nghệ danh Sơn Tùng M-TP, là một ca sĩ kiêm nhạc sĩ và nhà sản xuất âm nhạc hàng đầu Việt Nam.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art6",
    "name": "Vũ.",
    "followers": "4.8M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1520523839898-507124976779?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    "bio": "Hoàng Thái Vũ, thường được biết đến với nghệ danh Vũ., là một ca sĩ kiêm nhạc sĩ indie pop nổi tiếng của Việt Nam với danh xưng Hoàng tử Indie.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art7",
    "name": "Hoàng Thùy Linh",
    "followers": "5.9M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80",
    "bio": "Hoàng Thùy Linh là một nữ ca sĩ, diễn viên người Việt Nam, nổi tiếng với phong cách âm nhạc dân gian đương đại kết hợp điện tử hiện đại.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art8",
    "name": "Ryan Young",
    "followers": "43.6M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "bio": "Ryan Young is a multi-platinum recording artist and live performer known for blending modern electronic sounds with energetic live instruments.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art9",
    "name": "Jessica Gonzalez",
    "followers": "2.1M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "bio": "Pop & RnB singer-songwriter with melodious tracks that have reached millions of listeners worldwide.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art10",
    "name": "Mer Watson",
    "followers": "1.2M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
    "bio": "Indie and acoustic songwriter creating serene listening experiences for peaceful mornings and late nights.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art11",
    "name": "Justin Bieber",
    "followers": "92.3M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
    "bio": "Justin Drew Bieber is a Canadian pop star recognized for his genre-melding musicianship and global impact.",
    "isPopular": true,
    "isVerified": true
  },
  {
    "id": "art12",
    "name": "Dua Lipa",
    "followers": "62.7M Followers",
    "avatarImage": "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    "aboutImage": "https://images.unsplash.com/photo-1520523839898-507124976779?auto=format&fit=crop&w=600&q=80",
    "bio": "Dua Lipa is an English and Albanian singer known for her disco-pop sound and critical acclaim.",
    "isPopular": true,
    "isVerified": true
  }
];
// ===================================================================

export const SAMPLE_USERS: User[] = [
  {
    id: 'u1',
    name: 'Ashley Scott',
    email: 'ashley@example.com',
    phone: '0900000001',
    password: '123456',
    planId: null,
    likedSongIds: ['pdt1', 'sr2', 's1', 'apt1'],
    followedArtistIds: ['pa1', 'pa3', 'sa1'],
    likedAlbumIds: ['alb1', 'alb2'],
    downloadedSongIds: ['s1', 's2'],
  },
  {
    id: 'u2',
    name: 'Jason Smith',
    email: 'jason@example.com',
    phone: '0900000002',
    password: '123456',
    planId: 'premium',
    likedSongIds: ['pdt4', 'pdt5'],
    followedArtistIds: ['pa2', 'ar1'],
    likedAlbumIds: ['alb3', 'alb4'],
    downloadedSongIds: ['s5', 's8'],
  },
];

export interface SubscriptionPlan {
  id: string;
  name: string;
  badge: string;
  price: string;
  perks: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Gói Thường (Free)',
    badge: 'Miễn phí',
    price: '0đ / tháng',
    perks: [
      'Nghe nhạc trực tuyến chất lượng 128 kbps',
      'Có quảng cáo xen kẽ trong quá trình nghe',
      'Hỗ trợ nghe trên cả Trình duyệt Web và App',
      'Chế độ phát ngẫu nhiên (Shuffle play)',
    ],
  },
  {
    id: 'premium',
    name: 'Gói VIP (Premium)',
    badge: 'Đặc quyền VIP',
    price: '$9.99 / tháng',
    perks: [
      'Nghe nhạc không giới hạn KHÔNG quảng cáo (Ad-free)',
      'Chất lượng âm thanh Lossless 320 kbps đỉnh cao',
      'Tải bài hát không giới hạn để nghe ngoại tuyến (Offline)',
      'Mở khóa toàn bộ album và ca sĩ độc quyền VIP',
      'Hủy gói cước bất kỳ lúc nào, không ràng buộc',
    ],
  },
];

export const SUGGESTIONS: Song[] = [
  {
    id: 's1',
    title: 'Reflection',
    artist: 'Christina Aguilera',
    duration: '03:36',
    coverImage: IMAGES.suggestion1,
    audioUrl: 'http://localhost:5000/audio/s1.m4a', // Link test bài 2
  },
  {
    id: 's2',
    title: 'In The Stars',
    artist: 'Benson Boone',
    duration: '03:15',
    coverImage: IMAGES.suggestion2,
    audioUrl: 'http://localhost:5000/audio/s2.m4a', // Link test bài 3
  },
];

export const CHARTS: ChartItem[] = [
  ...SEED_CHARTS,
  {
    id: 'c1',
    title: 'Top 50',
    subtitle: 'Canada',
    updateText: 'Daily chart-toppers update',
    coverImage: IMAGES.chartCanada,
    songIds: ['pdt1', 'pdt2', 'pdt3', 'pdt4', 'pdt5', 'pdt6'],
  },
  {
    id: 'c2',
    title: 'Top 50',
    subtitle: 'Global',
    updateText: 'Daily chart-toppers update',
    coverImage: IMAGES.chartGlobal,
    songIds: ['pdt2', 'apt1', 'pdt3', 'fs1', 'sr1', 's2'],
  },
  {
    id: 'c3',
    title: 'Top 50',
    subtitle: 'Trending',
    updateText: 'Daily chart-toppers update',
    coverImage: IMAGES.chartTrending,
    songIds: ['fs1', 'fs2', 'fs3', 'pdt4', 'pdt5', 'as1'],
  },
];

export const TRENDING_ALBUMS: Album[] = [
  ...SEED_ALBUMS.slice(0, 6),
  {
    id: 'ta1',
    title: 'ME',
    artist: 'Jessica Gonzalez',
    coverImage: IMAGES.albumMe,
    songIds: ['pdt1', 'sr1', 's1', 'fs1'],
  },
  {
    id: 'ta2',
    title: 'Magna nost',
    artist: 'Brian Thomas',
    coverImage: IMAGES.albumMagnaNost,
    songIds: ['pdt3', 'sr3', 's2'],
  },
  {
    id: 'ta3',
    title: 'Magna nost',
    artist: 'Christopher...',
    coverImage: IMAGES.albumMagna3,
    songIds: ['pdt5', 'pdt6', 'sr5', 'sr6'],
  },
];

export const POPULAR_ARTISTS: Artist[] = SEED_ARTISTS.slice(0, 7);

export const SEARCH_SUGGESTIONS = [
  'Reflection',
  'In The Stars',
  'FLOWER',
  'Shape of You',
  'Blinding Lights',
  'Levitating',
  'Astronaut in the Ocean',
  'Dynamite',
  'Let you free',
  'Midnight Echo',
  'Paper Moons',
  'Slow Tide',
  'Northern Road',
  'Quiet Streets',
  'Glass Rain',
  'Me',
  'Me Inc',
  'Dozz me',
  'Eastss me',
  'Me Ali',
  'Me quis a',
  'Me light',
];

export const SEARCH_RESULTS: Song[] = [
  {
    id: 'sr1',
    title: 'Me',
    artist: 'Jessica Gonzalez',
    plays: '2,1M',
    duration: '3:36',
    coverImage: IMAGES.searchTrack1,
  },
  {
    id: 'sr2',
    title: 'Me Inc',
    artist: 'Anthony Taylor',
    plays: '68M',
    duration: '03:35',
    coverImage: IMAGES.searchTrack2,
  },
  {
    id: 'sr3',
    title: 'Dozz me',
    artist: 'Brian Bailey',
    plays: '93M',
    duration: '04:39',
    coverImage: IMAGES.searchTrack3,
  },
  {
    id: 'sr4',
    title: 'Eastss me',
    artist: 'Anthony Taylor',
    plays: '9M',
    duration: '07:48',
    coverImage: IMAGES.searchTrack4,
  },
  {
    id: 'sr5',
    title: 'Me Ali',
    artist: 'Pedro Moreno',
    plays: '23M',
    duration: '3:36',
    coverImage: IMAGES.searchTrack5,
  },
  {
    id: 'sr6',
    title: 'Me quis a',
    artist: 'Elena Jimenez',
    plays: '10M',
    duration: '06:22',
    coverImage: IMAGES.searchTrack6,
  },
  {
    id: 'sr7',
    title: 'Me light',
    artist: 'John Smith',
    plays: '81M',
    duration: '05:15',
    coverImage: IMAGES.searchTrack7,
  },
];

export const FEED_SONGS: Song[] = [
  {
    id: 'fs1',
    title: 'FLOWER',
    artist: 'Jessica Gonzalez',
    plays: '125',
    duration: '05:15',
    coverImage: IMAGES.feedTrack1,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
  {
    id: 'fs2',
    title: 'Me',
    artist: 'William King',
    plays: '245',
    duration: '05:15',
    coverImage: IMAGES.feedTrack2,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  },
  {
    id: 'fs3',
    title: 'Midnight Echo',
    artist: 'Mer Watson',
    plays: '318',
    duration: '04:12',
    coverImage: IMAGES.artistAboutBand,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  },
];

export const FEED_POSTS: FeedPost[] = [
  {
    id: 'fp1',
    authorName: 'Jessica Gonzalez',
    authorAvatar: IMAGES.feedAvatar1,
    timeAgo: '3d',
    songId: 'fs1',
    likes: 20,
    likedByUserIds: [],
    shares: 1,
  },
  {
    id: 'fp2',
    authorName: 'William King',
    authorAvatar: IMAGES.feedAvatar2,
    timeAgo: '5d',
    songId: 'fs2',
    likes: 45,
    likedByUserIds: [],
    shares: 2,
  },
  {
    id: 'fp3',
    authorName: 'Mer Watson',
    authorAvatar: IMAGES.libraryArtistMer,
    timeAgo: '1w',
    songId: 'fs3',
    likes: 30,
    likedByUserIds: [],
    shares: 0,
  },
];

export const FEED_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    postId: 'fp1',
    userName: 'Sally Rooney',
    userAvatar: IMAGES.commentAvatarSally,
    text: 'Do duis cul 😍',
    timeAgo: '17h',
    likes: 1,
    likedByUserIds: [],
  },
  {
    id: 'c2',
    postId: 'fp1',
    userName: 'Jason Smith',
    userAvatar: IMAGES.commentAvatarJason,
    text: 'Minim magna exc 🤩',
    timeAgo: '48m',
    likes: 1,
    likedByUserIds: [],
    replies: [
      {
        id: 'c2-1',
        postId: 'fp1',
        userName: 'Michael Key',
        userAvatar: IMAGES.commentAvatarMichael,
        text: 'Deserunt officia consectetur adipi',
        timeAgo: '40m',
        likes: 2,
        likedByUserIds: [],
        replyToName: 'Jason Smith',
      },
    ],
  },
  {
    id: 'c3',
    postId: 'fp1',
    userName: 'Liam Pham',
    userAvatar: IMAGES.commentAvatarLiam,
    text: 'Commodo 🔥',
    timeAgo: '48m',
    likes: 1,
    likedByUserIds: [],
    replies: [
      {
        id: 'c3-1',
        postId: 'fp1',
        userName: 'Kiran Glaucus',
        userAvatar: IMAGES.commentAvatarMichael,
        text: 'Esse consequat cillum ex',
        timeAgo: '40m',
        likes: 2,
        likedByUserIds: [],
        replyToName: 'Liam Pham',
      },
    ],
  },
  {
    id: 'c4',
    postId: 'fp2',
    userName: 'Sally Rooney',
    userAvatar: IMAGES.commentAvatarSally,
    text: 'Love this track',
    timeAgo: '2d',
    likes: 4,
    likedByUserIds: [],
    replies: [
      {
        id: 'c4-1',
        postId: 'fp2',
        userName: 'Liam Pham',
        userAvatar: IMAGES.commentAvatarLiam,
        text: 'Same here!',
        timeAgo: '1d',
        likes: 0,
        likedByUserIds: [],
        replyToName: 'Sally Rooney',
      },
    ],
  },
  {
    id: 'c5',
    postId: 'fp2',
    userName: 'Michael Key',
    userAvatar: IMAGES.commentAvatarMichael,
    text: 'On repeat all week',
    timeAgo: '1d',
    likes: 2,
    likedByUserIds: [],
  },
  {
    id: 'c6',
    postId: 'fp3',
    userName: 'Jason Smith',
    userAvatar: IMAGES.commentAvatarJason,
    text: 'What a mood',
    timeAgo: '6d',
    likes: 3,
    likedByUserIds: [],
  },
];

export const DEFAULT_PLAYLIST_COVER = IMAGES.libraryTrack5;

export const USER_PLAYLISTS: Playlist[] = [
  {
    id: 'p1',
    ownerId: 'u1',
    title: 'Ipsum sit nulla',
    description: 'Songs for a slow morning',
    coverImage: IMAGES.playlist1,
    songIds: ['pdt1', 'pdt2', 'pdt3', 'sr1'],
  },
  {
    id: 'p2',
    ownerId: 'u1',
    title: 'Occaecat aliq',
    description: 'Late night favorites',
    coverImage: IMAGES.playlist2,
    songIds: ['sr2', 'sr3'],
  },
  {
    id: 'p3',
    ownerId: 'u2',
    title: 'Magna nost',
    description: 'Tracks for the road',
    coverImage: IMAGES.libraryTrack3,
    songIds: ['apt1', 'apt2', 's2'],
  },
];

export const ARTISTS: Artist[] = [
  ...SEED_ARTISTS,
  {
    id: 'pa1',
    name: 'Jennifer Wilson',
    followers: '820K Followers',
    avatarImage: IMAGES.artistJennifer,
    bio: 'Jennifer Wilson writes intimate pop songs about growing up and starting over. Her soft vocals and warm piano arrangements have earned her a devoted audience, and her live shows are known for their quiet, close atmosphere.',
    aboutImage: IMAGES.launchPremiumBg,
  },
  {
    id: 'pa2',
    name: 'Elizabeth Hall',
    followers: '410K Followers',
    avatarImage: IMAGES.artistElizabeth,
    bio: 'Elizabeth Hall blends folk storytelling with modern production. She began by posting home recordings online, then moved on to touring small venues, and she still records most of her music in her own studio.',
    aboutImage: IMAGES.launchBg,
  },
  {
    id: 'pa3',
    name: 'Anthony Taylor',
    followers: '2.3M Followers',
    avatarImage: IMAGES.artistAnthony,
    bio: 'Anthony Taylor is a producer and singer whose upbeat tracks fill dance floors around the world. His records mix bright synths with big choruses, and he often invites young artists to collaborate on stage.',
    aboutImage: IMAGES.playerConcertBg,
  },
  {
    id: 'sa1',
    name: 'Mer Watson',
    followers: '1.234K Followers',
    avatarImage: IMAGES.libraryArtistMer,
    bio: 'Mer Watson makes atmospheric electronic music for late nights. Working from a small home setup, Mer layers field recordings with slow beats to create tracks that feel like walking through a city after dark.',
    aboutImage: IMAGES.playerConcertBg,
  },
  {
    id: 'ar1',
    name: 'Ryan Young',
    followers: '65.1K Followers',
    avatarImage: IMAGES.artistRyanProfile,
    bio: 'Do in cupidatat aute et in officia aute laboris est Lorem est nisi dolor consequat voluptate duis irure. Veniam quis amet irure cillum elit aliquip sunt cillum cillum do aliqua voluptate ad non magna elit.',
    aboutImage: IMAGES.artistAboutBand,
  },
];

export const PLAYLIST_DETAILS_TRACKS: Song[] = [
  {
    id: 'pdt1',
    title: 'FLOWER',
    artist: 'Jessica Gonzalez',
    plays: '2,1M',
    duration: '3:36',
    coverImage: IMAGES.playlistTrack1,
  },
  {
    id: 'pdt2',
    title: 'Shape of You',
    artist: 'Anthony Taylor',
    plays: '68M',
    duration: '03:35',
    coverImage: IMAGES.playlistTrack2,
  },
  {
    id: 'pdt3',
    title: 'Blinding Lights',
    artist: 'Brian Bailey',
    plays: '93M',
    duration: '04:39',
    coverImage: IMAGES.playlistTrack3,
  },
  {
    id: 'pdt4',
    title: 'Levitating',
    artist: 'Anthony Taylor',
    plays: '9M',
    duration: '07:48',
    coverImage: IMAGES.playlistTrack4,
  },
  {
    id: 'pdt5',
    title: 'Astronaut in the Ocean',
    artist: 'Pedro Moreno',
    plays: '23M',
    duration: '3:36',
    coverImage: IMAGES.playlistTrack5,
  },
  {
    id: 'pdt6',
    title: 'Dynamite',
    artist: 'Elena Jimenez',
    plays: '10M',
    duration: '06:22',
    coverImage: IMAGES.playlistTrack6,
  },
];

export const ARTIST_POPULAR_TRACKS: Song[] = [
  {
    id: 'apt1',
    title: 'Let you free',
    artist: 'Ryan Young',
    plays: '68M',
    duration: '03:35',
    coverImage: IMAGES.artistPopular1,
  },
  {
    id: 'apt2',
    title: 'Blinding Lights',
    artist: 'Ryan Young',
    plays: '93M',
    duration: '04:39',
    coverImage: IMAGES.artistPopular2,
  },
  {
    id: 'apt3',
    title: 'Levitating',
    artist: 'Ryan Young',
    plays: '9M',
    duration: '07:48',
    coverImage: IMAGES.artistPopular3,
  },
  {
    id: 'apt4',
    title: 'Astronaut in the Ocean',
    artist: 'Ryan Young',
    plays: '23M',
    duration: '3:36',
    coverImage: IMAGES.artistPopular4,
  },
  {
    id: 'apt5',
    title: 'Dynamite',
    artist: 'Ryan Young',
    plays: '10M',
    duration: '06:22',
    coverImage: IMAGES.artistPopular5,
  },
];

// Bài hát cho các nghệ sĩ chưa có nhạc trong những danh sách mẫu khác
const EXTRA_ARTIST_SONGS: Song[] = [
  {
    id: 'as1',
    title: 'Paper Moons',
    artist: 'Jennifer Wilson',
    plays: '12M',
    duration: '03:48',
    coverImage: IMAGES.artistFans1,
  },
  {
    id: 'as2',
    title: 'Slow Tide',
    artist: 'Jennifer Wilson',
    plays: '7M',
    duration: '04:05',
    coverImage: IMAGES.artistFans1,
  },
  {
    id: 'as3',
    title: 'Northern Road',
    artist: 'Elizabeth Hall',
    plays: '5M',
    duration: '03:22',
    coverImage: IMAGES.artistFans2,
  },
  {
    id: 'as4',
    title: 'Quiet Streets',
    artist: 'Elizabeth Hall',
    plays: '3M',
    duration: '04:31',
    coverImage: IMAGES.artistFans2,
  },
  {
    id: 'as5',
    title: 'Glass Rain',
    artist: 'Mer Watson',
    plays: '410K',
    duration: '05:02',
    coverImage: IMAGES.artistFans3,
  },
];

export const ALL_SONGS: Song[] = [
  ...SEED_SONGS,
  ...SUGGESTIONS,
  ...SEARCH_RESULTS,
  ...PLAYLIST_DETAILS_TRACKS,
  ...ARTIST_POPULAR_TRACKS,
  ...FEED_SONGS,
  ...EXTRA_ARTIST_SONGS,
];

export const getSongsByIds = (songIds: string[]): Song[] =>
  songIds.flatMap((id) => ALL_SONGS.find((song) => song.id === id) ?? []);

export const ARTIST_ALBUMS: Album[] = [
  ...SEED_ALBUMS,
  {
    id: 'aa1',
    title: 'ME',
    artist: 'Ryan Young',
    coverImage: IMAGES.artistAlbum1,
    songIds: ['apt1', 'apt2', 'apt3'],
  },
  {
    id: 'aa2',
    title: 'Magna nost',
    artist: 'Ryan Young',
    coverImage: IMAGES.artistAlbum2,
    songIds: ['apt4', 'apt5', 'apt1'],
  },
  {
    id: 'aa3',
    title: 'Proident...',
    artist: 'Ryan Young',
    coverImage: IMAGES.artistAlbum3,
    songIds: ['apt2', 'apt3', 'apt5'],
  },
  {
    id: 'aa4',
    title: 'Paper Moons',
    artist: 'Jennifer Wilson',
    coverImage: IMAGES.artistFans1,
    songIds: ['as1', 'as2'],
  },
  {
    id: 'aa5',
    title: 'Open Country',
    artist: 'Elizabeth Hall',
    coverImage: IMAGES.artistFans2,
    songIds: ['as3', 'as4'],
  },
  {
    id: 'aa6',
    title: 'Late Shift',
    artist: 'Anthony Taylor',
    coverImage: IMAGES.albumMagna3,
    songIds: ['pdt2', 'pdt4', 'sr2', 'sr4'],
  },
  {
    id: 'aa7',
    title: 'After Dark',
    artist: 'Mer Watson',
    coverImage: IMAGES.artistFans3,
    songIds: ['fs3', 'as5'],
  },
];

// Kho album để tìm kiếm, cùng tên và nghệ sĩ chỉ giữ một bản
export const ALL_ALBUMS: Album[] = [
  ...SEED_ALBUMS,
  ...TRENDING_ALBUMS,
  ...ARTIST_ALBUMS,
].filter(
  (album, index, self) =>
    index === self.findIndex((a) => a.title === album.title && a.artist === album.artist)
);


export const getAlbumSongIds = (album: Album): string[] => {
  if (album.songIds && album.songIds.length > 0) return album.songIds;
  const match = ALL_SONGS.filter((s) => s.artist === album.artist).map((s) => s.id);
  return match.length > 0 ? match : ['pdt1', 'pdt2', 'pdt3'];
};

export const getChartSongIds = (chartId: string): string[] => {
  const chart = CHARTS.find((c) => c.id === chartId);
  return chart?.songIds ?? ['pdt1', 'pdt2', 'pdt3', 'pdt4', 'pdt5', 'pdt6'];
};

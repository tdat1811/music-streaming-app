import { IMAGES } from '../constants/images';

export interface Song {
  id: string;
  title: string;
  artist: string;
  plays?: string;
  duration?: string;
  coverImage: any;
  isLiked?: boolean;
  audioUrl?:string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverImage: any;
}

export interface Artist {
  id: string;
  name: string;
  followers?: string;
  avatarImage: any;
  isFollowing?: boolean;
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
  trackTitle: string;
  trackImage: any;
  plays: number;
  duration: string;
  likes: number;
  comments: number;
  reposts: number;
}

export interface CommentItem {
  id: string;
  userName: string;
  userAvatar: any;
  text: string;
  timeAgo: string;
  likes: number;
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
}

// Tài khoản mẫu, chưa có backend nên mật khẩu để dạng chữ thường. Không dùng dữ liệu thật.
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
    id: 'premium',
    name: 'Premium',
    badge: 'Free for 1 month',
    price: '$12.99/ month',
    perks: [
      'Ad-free listening',
      'Download to listen offline',
      'Access full catalog Premium',
      'High sound quality',
      'Cancel anytime',
    ],
  },
  {
    id: 'family',
    name: 'Family',
    badge: 'Up to 6 accounts',
    price: '$19.99/ month',
    perks: [
      '6 individual accounts',
      'Block explicit music',
      'Ad-free listening',
    ],
  },
  {
    id: 'student',
    name: 'Student',
    badge: 'Student discount',
    price: '$6.99/ month',
    perks: [
      'Ad-free listening',
      'Download to listen offline',
      'High sound quality',
      'Cancel anytime',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', // Link test bài 2
  },
  {
    id: 's2',
    title: 'In The Stars',
    artist: 'Benson Boone',
    duration: '03:15',
    coverImage: IMAGES.suggestion2,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', // Link test bài 3
  },
];

export const CHARTS = [
  {
    id: 'c1',
    title: 'Top 50',
    subtitle: 'Canada',
    updateText: 'Daily chart-toppers update',
    coverImage: IMAGES.chartCanada,
  },
  {
    id: 'c2',
    title: 'Top 50',
    subtitle: 'Global',
    updateText: 'Daily chart-toppers update',
    coverImage: IMAGES.chartGlobal,
  },
  {
    id: 'c3',
    title: 'Top 50',
    subtitle: 'Trending',
    updateText: 'Daily chart-toppers update',
    coverImage: IMAGES.chartTrending,
  },
];

export const TRENDING_ALBUMS: Album[] = [
  {
    id: 'ta1',
    title: 'ME',
    artist: 'Jessica Gonzalez',
    coverImage: IMAGES.albumMe,
  },
  {
    id: 'ta2',
    title: 'Magna nost',
    artist: 'Brian Thomas',
    coverImage: IMAGES.albumMagnaNost,
  },
  {
    id: 'ta3',
    title: 'Magna nost',
    artist: 'Christopher...',
    coverImage: IMAGES.albumMagna3,
  },
];

export const POPULAR_ARTISTS: Artist[] = [
  {
    id: 'pa1',
    name: 'Jennifer Wilson',
    avatarImage: IMAGES.artistJennifer,
    isFollowing: true,
  },
  {
    id: 'pa2',
    name: 'Elizabeth Hall',
    avatarImage: IMAGES.artistElizabeth,
    isFollowing: true,
  },
  {
    id: 'pa3',
    name: 'Anthony Taylor',
    avatarImage: IMAGES.artistAnthony,
    isFollowing: true,
  },
];

export const SEARCH_SUGGESTIONS = [
  'Me',
  'me illum id aliquip',
  'me lorem',
  'Me Gonzalez',
  'Me irure esse',
  'Me Exercitation',
  'Me Sint aliquip duis deseru',
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

export const SEARCH_ARTIST = {
  id: 'sa1',
  name: 'Mer Watson',
  followers: '1.234K Followers',
  avatarImage: IMAGES.searchArtistMerWatson,
};

export const FEED_POSTS: FeedPost[] = [
  {
    id: 'fp1',
    authorName: 'Jessica Gonzalez',
    authorAvatar: IMAGES.feedAvatar1,
    timeAgo: '3d',
    trackTitle: 'FLOWER',
    trackImage: IMAGES.feedTrack1,
    plays: 125,
    duration: '05:15',
    likes: 20,
    comments: 3,
    reposts: 1,
  },
  {
    id: 'fp2',
    authorName: 'William King',
    authorAvatar: IMAGES.feedAvatar2,
    timeAgo: '5d',
    trackTitle: 'Me',
    trackImage: IMAGES.feedTrack2,
    plays: 245,
    duration: '05:15',
    likes: 45,
    comments: 9,
    reposts: 2,
  },
];

export const FEED_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    userName: 'Sally Rooney',
    userAvatar: IMAGES.commentAvatarSally,
    text: 'Do duis cul 😍',
    timeAgo: '17h',
    likes: 1,
  },
  {
    id: 'c2',
    userName: 'Jason',
    userAvatar: IMAGES.commentAvatarJason,
    text: 'Minim magna exc 🤩',
    timeAgo: '48m',
    likes: 1,
    replies: [
      {
        id: 'c2-1',
        userName: 'Michael Key',
        userAvatar: IMAGES.commentAvatarMichael,
        text: '@Jason Smith Deserunt officia consectetur adipi',
        timeAgo: '40m',
        likes: 2,
      },
    ],
  },
  {
    id: 'c3',
    userName: 'Liam Pham',
    userAvatar: IMAGES.commentAvatarLiam,
    text: 'Commodo 🔥',
    timeAgo: '48m',
    likes: 1,
    replies: [
      {
        id: 'c3-1',
        userName: 'Kiran Glaucus',
        userAvatar: IMAGES.commentAvatarMichael,
        text: 'Esse consequat cillum ex',
        timeAgo: '40m',
        likes: 2,
      },
    ],
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
  {
    id: 'pa1',
    name: 'Jennifer Wilson',
    followers: '820K Followers',
    avatarImage: IMAGES.artistJennifer,
  },
  {
    id: 'pa2',
    name: 'Elizabeth Hall',
    followers: '410K Followers',
    avatarImage: IMAGES.artistElizabeth,
  },
  {
    id: 'pa3',
    name: 'Anthony Taylor',
    followers: '2.3M Followers',
    avatarImage: IMAGES.artistAnthony,
  },
  {
    id: 'sa1',
    name: 'Mer Watson',
    followers: '1.234K Followers',
    avatarImage: IMAGES.libraryArtistMer,
  },
  {
    id: 'ar1',
    name: 'Ryan Young',
    followers: '65.1K Followers',
    avatarImage: IMAGES.artistRyanProfile,
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

const ALL_SONGS: Song[] = [
  ...SUGGESTIONS,
  ...SEARCH_RESULTS,
  ...PLAYLIST_DETAILS_TRACKS,
  ...ARTIST_POPULAR_TRACKS,
];

export const getSongsByIds = (songIds: string[]): Song[] =>
  songIds.flatMap((id) => ALL_SONGS.find((song) => song.id === id) ?? []);

export const ARTIST_ALBUMS: Album[] = [
  {
    id: 'aa1',
    title: 'ME',
    artist: 'Jessica Gonzalez',
    coverImage: IMAGES.artistAlbum1,
  },
  {
    id: 'aa2',
    title: 'Magna nost',
    artist: 'Jessica Gonzalez',
    coverImage: IMAGES.artistAlbum2,
  },
  {
    id: 'aa3',
    title: 'Proident...',
    artist: 'Jessica Gonzalez',
    coverImage: IMAGES.artistAlbum3,
  },
];

export const ARTIST_FANS_ALSO_LIKE: Album[] = [
  {
    id: 'fal1',
    title: 'Magna nost',
    artist: 'Jessica Gonzalez',
    coverImage: IMAGES.artistFans1,
  },
  {
    id: 'fal2',
    title: 'Exercitatio',
    artist: 'Brian Harris',
    coverImage: IMAGES.artistFans2,
  },
  {
    id: 'fal3',
    title: 'Tempor...',
    artist: 'Tyler And...',
    coverImage: IMAGES.artistFans3,
  },
];

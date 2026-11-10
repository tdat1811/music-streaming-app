const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Models
const User = require('../models/User');
const Song = require('../models/Song');
const Album = require('../models/Album');
const Artist = require('../models/Artist');
const Playlist = require('../models/Playlist');
const Chart = require('../models/Chart');
const FeedPost = require('../models/FeedPost');
const Comment = require('../models/Comment');

dotenv.config();

const users = [
  {
    id: 'u1',
    name: 'Ashley Scott',
    email: 'ashley@example.com',
    phone: '0900000001',
    password: '123456',
    planId: null,
    likedSongIds: ['pdt1', 'sr2', 's1', 'apt1'],
    followedArtistIds: ['pa1', 'pa3', 'sa1'],
    likedAlbumIds: ['ta1'],
    downloadedSongIds: ['pdt1'],
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
    likedAlbumIds: ['ta2'],
    downloadedSongIds: ['pdt4'],
  },
];

const songs = [
  {
    id: 's1',
    title: 'Reflection',
    artist: 'Christina Aguilera',
    duration: '03:36',
    category: 'suggestions',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 's2',
    title: 'In The Stars',
    artist: 'Benson Boone',
    duration: '03:15',
    category: 'suggestions',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: 'sr1',
    title: 'Me',
    artist: 'Jessica Gonzalez',
    plays: '2,1M',
    duration: '3:36',
    category: 'search',
  },
  {
    id: 'sr2',
    title: 'Me Inc',
    artist: 'Anthony Taylor',
    plays: '68M',
    duration: '03:35',
    category: 'search',
  },
  {
    id: 'sr3',
    title: 'Dozz me',
    artist: 'Brian Bailey',
    plays: '93M',
    duration: '04:39',
    category: 'search',
  },
  {
    id: 'sr4',
    title: 'Eastss me',
    artist: 'Anthony Taylor',
    plays: '9M',
    duration: '07:48',
    category: 'search',
  },
  {
    id: 'sr5',
    title: 'Me Ali',
    artist: 'Pedro Moreno',
    plays: '23M',
    duration: '3:36',
    category: 'search',
  },
  {
    id: 'sr6',
    title: 'Me quis a',
    artist: 'Elena Jimenez',
    plays: '10M',
    duration: '06:22',
    category: 'search',
  },
  {
    id: 'sr7',
    title: 'Me light',
    artist: 'John Smith',
    plays: '81M',
    duration: '05:15',
    category: 'search',
  },
  {
    id: 'pdt1',
    title: 'FLOWER',
    artist: 'Jessica Gonzalez',
    plays: '2,1M',
    duration: '3:36',
    category: 'charts',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
  {
    id: 'pdt2',
    title: 'Shape of You',
    artist: 'Anthony Taylor',
    plays: '68M',
    duration: '03:35',
    category: 'charts',
  },
  {
    id: 'pdt3',
    title: 'Blinding Lights',
    artist: 'Brian Bailey',
    plays: '93M',
    duration: '04:39',
    category: 'charts',
  },
  {
    id: 'pdt4',
    title: 'Levitating',
    artist: 'Anthony Taylor',
    plays: '9M',
    duration: '07:48',
    category: 'charts',
  },
  {
    id: 'pdt5',
    title: 'Astronaut in the Ocean',
    artist: 'Pedro Moreno',
    plays: '23M',
    duration: '3:36',
    category: 'charts',
  },
  {
    id: 'pdt6',
    title: 'Dynamite',
    artist: 'Elena Jimenez',
    plays: '10M',
    duration: '06:22',
    category: 'charts',
  },
  {
    id: 'apt1',
    title: 'Let you free',
    artist: 'Ryan Young',
    plays: '68M',
    duration: '03:35',
    category: 'popular',
  },
  {
    id: 'apt2',
    title: 'Blinding Lights',
    artist: 'Ryan Young',
    plays: '93M',
    duration: '04:39',
    category: 'popular',
  },
  {
    id: 'apt3',
    title: 'Levitating',
    artist: 'Ryan Young',
    plays: '9M',
    duration: '07:48',
    category: 'popular',
  },
  {
    id: 'apt4',
    title: 'Astronaut in the Ocean',
    artist: 'Ryan Young',
    plays: '23M',
    duration: '3:36',
    category: 'popular',
  },
  {
    id: 'apt5',
    title: 'Dynamite',
    artist: 'Ryan Young',
    plays: '10M',
    duration: '06:22',
    category: 'popular',
  },
  {
    id: 'fs1',
    title: 'FLOWER',
    artist: 'Jessica Gonzalez',
    plays: '125',
    duration: '05:15',
    category: 'feed',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
  {
    id: 'fs2',
    title: 'Me',
    artist: 'William King',
    plays: '245',
    duration: '05:15',
    category: 'feed',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  },
  {
    id: 'fs3',
    title: 'Midnight Echo',
    artist: 'Mer Watson',
    plays: '318',
    duration: '04:12',
    category: 'feed',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  },
  {
    id: 'as1',
    title: 'Paper Moons',
    artist: 'Jennifer Wilson',
    plays: '12M',
    duration: '03:48',
  },
  {
    id: 'as2',
    title: 'Slow Tide',
    artist: 'Jennifer Wilson',
    plays: '7M',
    duration: '04:05',
  },
  {
    id: 'as3',
    title: 'Northern Road',
    artist: 'Elizabeth Hall',
    plays: '5M',
    duration: '03:22',
  },
  {
    id: 'as4',
    title: 'Quiet Streets',
    artist: 'Elizabeth Hall',
    plays: '3M',
    duration: '04:31',
  },
  {
    id: 'as5',
    title: 'Glass Rain',
    artist: 'Mer Watson',
    plays: '410K',
    duration: '05:02',
  },
];

const albums = [
  {
    id: 'ta1',
    title: 'ME',
    artist: 'Jessica Gonzalez',
    isTrending: true,
    songIds: ['pdt1', 'sr1', 's1', 'fs1'],
  },
  {
    id: 'ta2',
    title: 'Magna nost',
    artist: 'Brian Thomas',
    isTrending: true,
    songIds: ['pdt3', 'sr3', 's2'],
  },
  {
    id: 'ta3',
    title: 'Magna nost',
    artist: 'Christopher...',
    isTrending: true,
    songIds: ['pdt5', 'pdt6', 'sr5', 'sr6'],
  },
  {
    id: 'aa1',
    title: 'ME',
    artist: 'Ryan Young',
    songIds: ['apt1', 'apt2', 'apt3'],
  },
  {
    id: 'aa2',
    title: 'Magna nost',
    artist: 'Ryan Young',
    songIds: ['apt4', 'apt5', 'apt1'],
  },
  {
    id: 'aa3',
    title: 'Proident...',
    artist: 'Ryan Young',
    songIds: ['apt2', 'apt3', 'apt5'],
  },
  {
    id: 'aa4',
    title: 'Paper Moons',
    artist: 'Jennifer Wilson',
    songIds: ['as1', 'as2'],
  },
  {
    id: 'aa5',
    title: 'Open Country',
    artist: 'Elizabeth Hall',
    songIds: ['as3', 'as4'],
  },
  {
    id: 'aa6',
    title: 'Late Shift',
    artist: 'Anthony Taylor',
    songIds: ['pdt2', 'pdt4', 'sr2', 'sr4'],
  },
  {
    id: 'aa7',
    title: 'After Dark',
    artist: 'Mer Watson',
    songIds: ['fs3', 'as5'],
  },
];

const artists = [
  {
    id: 'pa1',
    name: 'Jennifer Wilson',
    followers: '820K Followers',
    isPopular: true,
    bio: 'Jennifer Wilson writes intimate pop songs about growing up and starting over.',
  },
  {
    id: 'pa2',
    name: 'Elizabeth Hall',
    followers: '410K Followers',
    isPopular: true,
    bio: 'Elizabeth Hall blends folk storytelling with modern production.',
  },
  {
    id: 'pa3',
    name: 'Anthony Taylor',
    followers: '2.3M Followers',
    isPopular: true,
    bio: 'Anthony Taylor is a producer and singer whose upbeat tracks fill dance floors.',
  },
  {
    id: 'sa1',
    name: 'Mer Watson',
    followers: '1.234K Followers',
    bio: 'Mer Watson makes atmospheric electronic music for late nights.',
  },
  {
    id: 'ar1',
    name: 'Ryan Young',
    followers: '65.1K Followers',
    bio: 'Ryan Young is an energetic performer and songwriter known for chart-topping pop singles.',
  },
];

const charts = [
  {
    id: 'c1',
    title: 'Top 50',
    subtitle: 'Canada',
    updateText: 'Daily chart-toppers update',
    songIds: ['pdt1', 'pdt2', 'pdt3', 'pdt4', 'pdt5', 'pdt6'],
  },
  {
    id: 'c2',
    title: 'Top 50',
    subtitle: 'Global',
    updateText: 'Daily chart-toppers update',
    songIds: ['pdt2', 'apt1', 'pdt3', 'fs1', 'sr1', 's2'],
  },
  {
    id: 'c3',
    title: 'Top 50',
    subtitle: 'Trending',
    updateText: 'Daily chart-toppers update',
    songIds: ['fs1', 'fs2', 'fs3', 'pdt4', 'pdt5', 'as1'],
  },
];

const playlists = [
  {
    id: 'p1',
    ownerId: 'u1',
    title: 'Ipsum sit nulla',
    description: 'Songs for a slow morning',
    songIds: ['pdt1', 'pdt2', 'pdt3', 'sr1'],
  },
  {
    id: 'p2',
    ownerId: 'u1',
    title: 'Occaecat aliq',
    description: 'Late night favorites',
    songIds: ['sr2', 'sr3'],
  },
  {
    id: 'p3',
    ownerId: 'u2',
    title: 'Magna nost',
    description: 'Tracks for the road',
    songIds: ['apt1', 'apt2', 's2'],
  },
];

const feedPosts = [
  {
    id: 'fp1',
    authorName: 'Jessica Gonzalez',
    timeAgo: '3d',
    songId: 'fs1',
    likes: 20,
    likedByUserIds: [],
    shares: 1,
  },
  {
    id: 'fp2',
    authorName: 'William King',
    timeAgo: '5d',
    songId: 'fs2',
    likes: 45,
    likedByUserIds: [],
    shares: 2,
  },
  {
    id: 'fp3',
    authorName: 'Mer Watson',
    timeAgo: '1w',
    songId: 'fs3',
    likes: 30,
    likedByUserIds: [],
    shares: 0,
  },
];

const comments = [
  {
    id: 'c1',
    postId: 'fp1',
    userName: 'Sally Rooney',
    text: 'Do duis cul 😍',
    timeAgo: '17h',
    likes: 1,
    likedByUserIds: [],
    replies: [],
  },
  {
    id: 'c2',
    postId: 'fp1',
    userName: 'Jason Smith',
    text: 'Minim magna exc 🤩',
    timeAgo: '48m',
    likes: 1,
    likedByUserIds: [],
    replies: [
      {
        id: 'c2-1',
        postId: 'fp1',
        userName: 'Michael Key',
        text: 'Deserunt officia consectetur adipi',
        timeAgo: '40m',
        likes: 2,
        likedByUserIds: [],
        replyToName: 'Jason Smith',
      },
    ],
  },
];

const seedData = async () => {
  try {
    await connectDB();

    console.log('🧹 Xóa dữ liệu cũ trong database...');
    await User.deleteMany();
    await Song.deleteMany();
    await Album.deleteMany();
    await Artist.deleteMany();
    await Playlist.deleteMany();
    await Chart.deleteMany();
    await FeedPost.deleteMany();
    await Comment.deleteMany();

    console.log('🌱 Đang nạp dữ liệu mẫu mới vào MongoDB...');
    await User.insertMany(users);
    await Song.insertMany(songs);
    await Album.insertMany(albums);
    await Artist.insertMany(artists);
    await Playlist.insertMany(playlists);
    await Chart.insertMany(charts);
    await FeedPost.insertMany(feedPosts);
    await Comment.insertMany(comments);

    console.log('✅ Nạp dữ liệu thành công 100% vào MongoDB!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi nạp dữ liệu:', error);
    process.exit(1);
  }
};

seedData();

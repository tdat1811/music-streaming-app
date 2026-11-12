import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {slide} from '@remotion/transitions/slide';
import {fade} from '@remotion/transitions/fade';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// Cấu hình chuyển cảnh mượt mà chuẩn phong cách iOS
const smoothTiming = linearTiming({
  durationInFrames: 15,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
});

/**
 * PhoneScreen:
 * Hiển thị màn hình iPhone sắc nét, chuẩn xác 100% tỉ lệ gốc (780 x 1688).
 * Không bị cắt xén bất kỳ thanh công cụ hay nội dung nào.
 * Hai bên viền là hiệu ứng ambient blur phát sáng đồng điệu với màu màn hình.
 */
const PhoneScreen: React.FC<{
  page: number;
  y?: number;
  opacity?: number;
}> = ({page, y = 0, opacity = 1}) => {
  const imgSrc = staticFile(`screens/page-${String(page).padStart(2, '0')}.png`);
  const phoneWidth = 887;
  const leftMargin = (1080 - phoneWidth) / 2;

  return (
    <AbsoluteFill style={{opacity, overflow: 'hidden', background: '#0a0d18'}}>
      {/* 1. Nền ambient blur 2 bên viền */}
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <Img
          src={imgSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(50px) brightness(0.35)',
            transform: 'scale(1.15)',
          }}
        />
      </AbsoluteFill>

      {/* 2. Màn hình điện thoại sắc nét, chính xác, không bị cắt xén */}
      <div
        style={{
          position: 'absolute',
          left: leftMargin,
          top: 0,
          width: phoneWidth,
          height: 1920,
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.75)',
        }}
      >
        <Img
          src={imgSrc}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            transform: `translateY(${y}px)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// 1. Màn hình Khởi động Launch Screen
const Launch: React.FC = () => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 15], [0, 1], clamp);
  return <PhoneScreen page={1} opacity={opacity} />;
};

// 2. Màn hình Trang chủ Home Screen (Cuộn mượt từ trên xuống)
const Home: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = interpolate(f, [25, 220], [0, -1450], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  return <PhoneScreen page={2} y={scroll} />;
};

// 3. Màn hình Tìm kiếm Search Audio
const Search: React.FC = () => {
  return <PhoneScreen page={6} />;
};

// 4. Màn hình Kết quả tìm kiếm Search Results (Cuộn nhẹ xem bài hát)
const Results: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = interpolate(f, [15, 80], [0, -170], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  return <PhoneScreen page={7} y={scroll} />;
};

// 5. Màn hình Phát nhạc Play Audio (Dải sóng âm và điều khiển gốc)
const Player: React.FC = () => {
  return <PhoneScreen page={4} />;
};

// 6. Màn hình Hồ sơ nghệ sĩ Artist Profile (Cuộn mượt xem albums)
const Artist: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = interpolate(f, [20, 170], [0, -2200], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  return <PhoneScreen page={5} y={scroll} />;
};

// 7. Mạng xã hội - Feed bài đăng
const FeedPost: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = interpolate(f, [15, 110], [0, -600], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  return <PhoneScreen page={8} y={scroll} />;
};

// 8. Mạng xã hội - Bottom Sheet bình luận
const FeedComments: React.FC = () => {
  return <PhoneScreen page={9} />;
};

// 9. Thư viện cá nhân - Bài hát đã thích Liked Songs
const LibraryLiked: React.FC = () => {
  return <PhoneScreen page={10} />;
};

// 10. Thư viện cá nhân - Playlist cá nhân
const LibraryPlaylists: React.FC = () => {
  return <PhoneScreen page={11} />;
};

// 11. Gói cước Premium - Welcome
const PremiumWelcome: React.FC = () => {
  return <PhoneScreen page={12} />;
};

// 12. Gói cước Premium - Subscription Plans
const PremiumPlans: React.FC = () => {
  return <PhoneScreen page={13} />;
};

// 13. Màn hình Outro kết thúc
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 15], [0, 1], clamp);
  const scale = interpolate(f, [0, 60], [1, 1.05], clamp);

  return (
    <AbsoluteFill
      style={{
        background: '#090c18',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -200,
          background:
            'radial-gradient(circle at 50% 50%, #431b7a 0%, #15123d 40%, #090c18 70%)',
          transform: `scale(${scale})`,
        }}
      />
      <div style={{zIndex: 2, textAlign: 'center'}}>
        <div
          style={{
            fontSize: 78,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-2px',
            marginBottom: 20,
          }}
        >
          EXPERIENCE NOW
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#38e4ff',
            letterSpacing: 4,
            marginBottom: 40,
          }}
        >
          REACT NATIVE · NODE.JS · MONGODB ATLAS
        </div>
        <div
          style={{
            margin: '0 auto',
            width: 140,
            height: 140,
            borderRadius: 70,
            border: '6px solid #ffffff',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 0 50px rgba(184, 92, 255, 0.8)',
            color: '#ffffff',
            fontSize: 64,
          }}
        >
          ⌁
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Danh sách Voiceover tương ứng thời điểm xuất hiện chuẩn xác
const VOICEOVERS = [
  {from: 0, file: 'audio/vo_launch.mp3'},
  {from: 150, file: 'audio/vo_home.mp3'},
  {from: 390, file: 'audio/vo_search.mp3'},
  {from: 660, file: 'audio/vo_player.mp3'},
  {from: 960, file: 'audio/vo_artist.mp3'},
  {from: 1140, file: 'audio/vo_feed.mp3'},
  {from: 1380, file: 'audio/vo_library.mp3'},
  {from: 1590, file: 'audio/vo_premium.mp3'},
  {from: 1740, file: 'audio/vo_outro.mp3'},
];

export const MusicStreamPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: '#0a0d18'}}>
      {/* Nhạc nền BGM Starboy - ducked nhẹ xuống 0.18 để voiceover nổi bật, rõ ràng */}
      <Audio
        src={staticFile('audio/bgm.m4a')}
        volume={(f) =>
          interpolate(f, [0, 20, 1770, 1800], [0, 0.18, 0.18, 0], clamp)
        }
      />

      {/* 9 đoạn Voiceover tiếng Việt đọc theo kịch bản chuẩn xác */}
      {VOICEOVERS.map((vo) => (
        <Sequence key={vo.file} from={vo.from}>
          <Audio src={staticFile(vo.file)} volume={1.0} />
        </Sequence>
      ))}

      {/* Hệ thống chuyển cảnh giữa các màn hình từ thư viện @remotion/transitions */}
      <TransitionSeries>
        {/* 1. Màn hình Khởi động */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <Launch />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Trang chủ (Push từ phải sang trái) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 2. Màn hình Trang chủ */}
        <TransitionSeries.Sequence durationInFrames={255}>
          <Home />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Tìm kiếm (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 3. Màn hình Tìm kiếm */}
        <TransitionSeries.Sequence durationInFrames={195}>
          <Search />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Kết quả tìm kiếm (Fade mượt mà khi kết quả hiện lên) */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={smoothTiming}
        />

        {/* 4. Màn hình Kết quả tìm kiếm */}
        <TransitionSeries.Sequence durationInFrames={105}>
          <Results />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Màn hình Phát nhạc (Slide Modal từ dưới lên) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={smoothTiming}
        />

        {/* 5. Màn hình Phát nhạc */}
        <TransitionSeries.Sequence durationInFrames={315}>
          <Player />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Hồ sơ nghệ sĩ (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 6. Màn hình Hồ sơ nghệ sĩ */}
        <TransitionSeries.Sequence durationInFrames={195}>
          <Artist />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Feed bài đăng (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 7. Mạng xã hội - Bài đăng */}
        <TransitionSeries.Sequence durationInFrames={135}>
          <FeedPost />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Bottom Sheet bình luận (Slide Bottom Sheet từ dưới lên) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={smoothTiming}
        />

        {/* 8. Mạng xã hội - Bình luận */}
        <TransitionSeries.Sequence durationInFrames={135}>
          <FeedComments />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Thư viện cá nhân (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 9. Thư viện - Bài hát đã thích */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <LibraryLiked />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Danh sách Playlist (Fade mượt mà giữa 2 sub-tab) */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={smoothTiming}
        />

        {/* 10. Thư viện - Playlist */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <LibraryPlaylists />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Gói Premium (Slide Modal từ dưới lên) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={smoothTiming}
        />

        {/* 11. Gói cước Premium - Welcome */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <PremiumWelcome />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Bảng giá gói cước (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 12. Gói cước Premium - Plans */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <PremiumPlans />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Outro (Fade mượt mà sang Outro) */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={smoothTiming}
        />

        {/* 13. Màn hình Outro kết thúc */}
        <TransitionSeries.Sequence durationInFrames={60}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

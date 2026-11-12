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

// 0. Màn hình Intro mở đầu ấn tượng (Cinematic Brand Intro)
const BrandIntro: React.FC = () => {
  const f = useCurrentFrame();

  // Hiệu ứng scale và opacity xuất hiện
  const opacity = interpolate(f, [0, 20], [0, 1], clamp);
  const scale = interpolate(f, [0, 150], [0.95, 1.05], clamp);
  const logoScale = interpolate(f, [0, 25], [0.8, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(1.5)),
  });

  // 7 thanh sóng âm equalizer nhấp nháy theo điệu nhạc
  const barHeights = [45, 80, 130, 95, 140, 75, 50].map((base, idx) => {
    const wave = Math.sin(f * 0.18 + idx * 0.9) * 25;
    return Math.max(25, base + wave);
  });

  return (
    <AbsoluteFill
      style={{
        background: '#070913',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        overflow: 'hidden',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      {/* Nền hào quang cực quang neon chuyển động */}
      <div
        style={{
          position: 'absolute',
          inset: -200,
          background:
            'radial-gradient(circle at 50% 40%, rgba(94, 53, 177, 0.45) 0%, rgba(13, 20, 48, 0.8) 50%, #070913 85%)',
          transform: `scale(${scale})`,
        }}
      />

      <div
        style={{
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 40px',
        }}
      >
        {/* Pill Tag nhỏ sang trọng trên cùng */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 28px',
            borderRadius: 30,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(56, 228, 255, 0.35)',
            boxShadow: '0 0 25px rgba(56, 228, 255, 0.25)',
            color: '#38e4ff',
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 4,
            marginBottom: 40,
            textTransform: 'uppercase',
          }}
        >
          <span>✨</span> NEXT-GEN AUDIO EXPERIENCE
        </div>

        {/* Logo biểu tượng âm nhạc phát sáng */}
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: 85,
            background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 70px rgba(124, 58, 237, 0.65)',
            marginBottom: 40,
            transform: `scale(${logoScale})`,
          }}
        >
          {/* Sóng âm 7 cột nhịp nhàng ở giữa icon */}
          <div style={{display: 'flex', alignItems: 'center', gap: 6, height: 90}}>
            {barHeights.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: h * 0.55,
                  borderRadius: 4,
                  background: '#ffffff',
                  boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Tên App với Gradient đa sắc siêu nét */}
        <div
          style={{
            fontSize: 78,
            fontWeight: 900,
            letterSpacing: '-1.5px',
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: 16,
            textShadow: '0 10px 40px rgba(0,0,0,0.8)',
          }}
        >
          MUSIC STREAM
        </div>

        {/* Slogan phụ */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.75)',
            letterSpacing: 2,
            marginBottom: 48,
          }}
        >
          Immersive Audio · Intelligent Discovery
        </div>

        {/* Hàng nhãn công nghệ */}
        <div style={{display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center'}}>
          {['REACT NATIVE', 'EXPO', 'NODE.JS', 'MONGODB ATLAS'].map((tech) => (
            <div
              key={tech}
              style={{
                padding: '8px 18px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              {tech}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 1. Màn hình Khởi động Launch Screen
const Launch: React.FC = () => {
  return <PhoneScreen page={1} />;
};

// 2. Màn hình Trang chủ Home Screen (Cuộn mượt từ trên xuống)
const Home: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = interpolate(f, [30, 240], [0, -1450], {
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
  const scroll = interpolate(f, [20, 110], [0, -170], {
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
  const scroll = interpolate(f, [25, 195], [0, -2200], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  return <PhoneScreen page={5} y={scroll} />;
};

// 7. Mạng xã hội - Feed bài đăng
const FeedPost: React.FC = () => {
  const f = useCurrentFrame();
  const scroll = interpolate(f, [20, 135], [0, -600], {
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
  const opacity = interpolate(f, [0, 20], [0, 1], clamp);
  const scale = interpolate(f, [0, 120], [1, 1.06], clamp);

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

// 10 đoạn Voiceover tiếng Việt chuẩn bản ngữ
const VOICEOVERS = [
  {from: 0, file: 'audio/vo_brand_intro.mp3'},
  {from: 150, file: 'audio/vo_launch.mp3'},
  {from: 300, file: 'audio/vo_home.mp3'},
  {from: 570, file: 'audio/vo_search.mp3'},
  {from: 900, file: 'audio/vo_player.mp3'},
  {from: 1215, file: 'audio/vo_artist.mp3'},
  {from: 1425, file: 'audio/vo_feed.mp3'},
  {from: 1710, file: 'audio/vo_library.mp3'},
  {from: 1980, file: 'audio/vo_premium.mp3'},
  {from: 2190, file: 'audio/vo_outro.mp3'},
];

export const MusicStreamPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{fontFamily: 'Arial, Helvetica, sans-serif', background: '#0a0d18'}}>
      {/* Nhạc nền BGM Starboy - ducked nhẹ xuống 0.18 cho toàn bộ 77s */}
      <Audio
        src={staticFile('audio/bgm.m4a')}
        volume={(f) =>
          interpolate(f, [0, 25, 2270, 2310], [0, 0.18, 0.18, 0], clamp)
        }
      />

      {/* 10 đoạn Voiceover tiếng Việt đọc theo kịch bản chuẩn xác */}
      {VOICEOVERS.map((vo) => (
        <Sequence key={vo.file} from={vo.from}>
          <Audio src={staticFile(vo.file)} volume={1.0} />
        </Sequence>
      ))}

      {/* Toàn bộ hệ thống chuyển cảnh giữa 14 phân cảnh từ thư viện @remotion/transitions */}
      <TransitionSeries>
        {/* 0. Màn hình Intro mở đầu */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <BrandIntro />
        </TransitionSeries.Sequence>

        {/* Chuyển từ Intro sang Launch (Slide từ phải sang) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 1. Màn hình Khởi động */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <Launch />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Trang chủ (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 2. Màn hình Trang chủ */}
        <TransitionSeries.Sequence durationInFrames={285}>
          <Home />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Tìm kiếm (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 3. Màn hình Tìm kiếm */}
        <TransitionSeries.Sequence durationInFrames={210}>
          <Search />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Kết quả tìm kiếm (Fade mượt mà khi kết quả hiện lên) */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={smoothTiming}
        />

        {/* 4. Màn hình Kết quả tìm kiếm */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <Results />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Màn hình Phát nhạc (Slide Modal từ dưới lên) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={smoothTiming}
        />

        {/* 5. Màn hình Phát nhạc */}
        <TransitionSeries.Sequence durationInFrames={330}>
          <Player />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Hồ sơ nghệ sĩ (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 6. Màn hình Hồ sơ nghệ sĩ */}
        <TransitionSeries.Sequence durationInFrames={225}>
          <Artist />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Feed bài đăng (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 7. Mạng xã hội - Bài đăng */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <FeedPost />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Bottom Sheet bình luận (Slide Bottom Sheet từ dưới lên) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={smoothTiming}
        />

        {/* 8. Mạng xã hội - Bình luận */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <FeedComments />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Thư viện cá nhân (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 9. Thư viện - Bài hát đã thích */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <LibraryLiked />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Danh sách Playlist (Fade mượt mà giữa 2 sub-tab) */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={smoothTiming}
        />

        {/* 10. Thư viện - Playlist */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <LibraryPlaylists />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Gói Premium (Slide Modal từ dưới lên) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-bottom'})}
          timing={smoothTiming}
        />

        {/* 11. Gói cước Premium - Welcome */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <PremiumWelcome />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Bảng giá gói cước (Push từ phải) */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={smoothTiming}
        />

        {/* 12. Gói cước Premium - Plans */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <PremiumPlans />
        </TransitionSeries.Sequence>

        {/* Chuyển sang Outro (Fade mượt mà sang Outro) */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={smoothTiming}
        />

        {/* 13. Màn hình Outro kết thúc */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

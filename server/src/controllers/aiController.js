// server/src/controllers/aiController.js
// Bộ não AI Music Assistant: Hỗ trợ cả LLM thực thụ (Google Gemini API) và Rule-based NLP dự phòng
const mongoose = require('mongoose');
const Song = require('../models/Song');

// Gọi Google Gemini API để trò chuyện đa lượt (Multi-turn conversational AI thực thụ)
async function chatWithGeminiLLM(message, history = [], availableSongs = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null; // Chưa cấu hình key, chuyển sang rule-based engine
  }

  // Tóm tắt kho nhạc của app để cung cấp cho Gemini (Context Grounding)
  const songsContext = availableSongs
    .slice(0, 52)
    .map((s) => `[ID: ${s.id}] "${s.title}" - Ca sĩ: ${s.artist}`)
    .join('\n');

  const systemInstruction = `Bạn là Soundwave AI Music Companion - một trợ lý âm nhạc kiêm người bạn tri kỷ thông minh, thấu cảm, nói tiếng Việt tự nhiên, ấm áp, hóm hỉnh và gần gũi.
Bạn có khả năng trò chuyện qua lại bất kỳ chủ đề gì (tâm sự, giải tỏa cảm xúc, bàn luận về âm nhạc, cuộc sống...).

Dưới đây là kho bài hát hiện có sẵn trong ứng dụng Soundwave:
${songsContext}

Nhiệm vụ của bạn:
1. Trò chuyện và phản hồi một cách tự nhiên, chân thành như một người bạn thực sự.
2. Nếu người dùng chỉ đang chào hỏi, hỏi thăm sức khỏe, nói chuyện phiếm thông thường, đùa vui hay hỏi về bạn: Hãy thoải mái trò chuyện tự nhiên như một người bạn, TUYỆT ĐỐI KHÔNG gượng ép gợi ý bài hát (mảng recommendedSongIds để rỗng [] và moodLabel để rỗng hoặc là "Trò chuyện").
3. Chỉ khi nào người dùng chia sẻ tâm trạng, cảm xúc, hoặc hỏi về âm nhạc, ca sĩ, xin bài hát: Bạn mới chọn từ 1 đến 4 bài hát PHÙ HỢP NHẤT từ danh sách trên (lấy đúng ID bài hát).
4. Luôn trả về DUY NHẤT định dạng JSON chuẩn (chú ý escape dấu ngoặc kép bên trong văn bản nếu có):
{
  "reply": "câu trả lời trò chuyện tự nhiên của bạn bằng tiếng Việt",
  "moodLabel": "nhãn ngắn gọn hoặc rỗng",
  "recommendedSongIds": [],
  "suggestedPrompts": ["câu hỏi gợi ý 1 cho người dùng", "câu hỏi gợi ý 2", "câu hỏi gợi ý 3"]
}`;

  // Chuẩn hóa history cho Gemini API
  const contents = [];
  if (Array.isArray(history)) {
    for (const h of history.slice(-8)) {
      if (h.content && h.content.trim()) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content.trim() }],
        });
      }
    }
  }

  // Thêm tin nhắn hiện tại của người dùng
  contents.push({
    role: 'user',
    parts: [{ text: message.trim() }],
  });

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      response_mime_type: 'application/json',
    },
  };

  // Danh sách các model theo thứ tự ưu tiên (gemini-3.8-flash là mô hình khuyến nghị mới nhất, hỗ trợ tốt nhất)
  const modelsToTry = [
    process.env.GEMINI_MODEL,
    'gemini-3.5-flash-lite'
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let rawText = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) break;
      } else {
        const errorText = await response.text();
        console.warn(`Gemini model ${model} trả mã lỗi ${response.status}:`, errorText);
      }
    } catch (err) {
      console.warn(`Lỗi kết nối tới model ${model}:`, err.message);
    }
  }

  if (!rawText) return null;

  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (parseErr) {
    console.warn('Lỗi phân tích JSON từ Gemini, trích xuất text an toàn:', parseErr.message);
    let extractedReply = rawText;
    const matchReply = rawText.match(/"reply"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"moodLabel"|"\s*,\s*"recommendedSongIds"|"$)/);
    if (matchReply && matchReply[1]) {
      extractedReply = matchReply[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    return {
      reply: extractedReply,
      moodLabel: '',
      recommendedSongIds: [],
      suggestedPrompts: ['Hôm nay có gì mới?', 'Gợi ý cho mình một bài hát hay'],
    };
  }
}

// Danh mục các tâm trạng phổ biến để người dùng chọn nhanh
const MOOD_PRESETS = [
  {
    id: 'happy',
    label: 'Vui vẻ & Yêu đời',
    emoji: '🥰',
    description: 'Những giai điệu tươi sáng, sảng khoái tràn đầy năng lượng tích cực',
    prompt: 'Hôm nay mình cảm thấy rất vui và yêu đời, hãy gợi ý cho mình vài bài hát thật tươi vui nhé!',
  },
  {
    id: 'chill',
    label: 'Thư giãn & Chill',
    emoji: '☕',
    description: 'Giai điệu êm dịu, nhẹ nhàng cho những phút giây nghỉ ngơi, uống cafe',
    prompt: 'Mình muốn tìm những bản nhạc nhẹ nhàng, êm dịu để thư giãn sau giờ làm việc.',
  },
  {
    id: 'sad',
    label: 'Lắng đọng & Buồn',
    emoji: '🌧️',
    description: 'Giai điệu đồng điệu khi bạn cần chia sẻ, tâm sự hay trong một ngày mưa',
    prompt: 'Hôm nay tâm trạng mình hơi chùng xuống và buồn, có bài hát nào đồng cảm với mình không?',
  },
  {
    id: 'workout',
    label: 'Năng lượng & Thể thao',
    emoji: '⚡',
    description: 'Beat nhạc bùng nổ, thúc đẩy tinh thần tập gym, chạy bộ, làm việc hết mình',
    prompt: 'Gợi ý cho mình các bài hát thật sôi động, beat căng để chạy bộ và tập gym với!',
  },
  {
    id: 'focus',
    label: 'Tập trung học & Làm việc',
    emoji: '🎯',
    description: 'Âm thanh êm ái, giữ sự tập trung cao độ và khơi nguồn sáng tạo',
    prompt: 'Mình cần nhạc êm tai, dễ chịu để tập trung làm việc và ôn bài thật hiệu quả.',
  },
  {
    id: 'romantic',
    label: 'Lãng mạn & Tình yêu',
    emoji: '💖',
    description: 'Bản tình ca ngọt ngào dành cho những trái tim đang yêu hoặc thầm thương trộm nhớ',
    prompt: 'Cho mình xin những bản tình ca ngọt ngào, lãng mạn dành cho người đang yêu nhé!',
  },
];

// Hàm phân tích tâm trạng / ngữ cảnh từ tin nhắn người dùng
function detectMoodAndContext(message = '') {
  const text = message.toLowerCase().trim();

  // 1. Phân tích cụ thể theo nghệ sĩ / từ khoá tên
  if (text.includes('sơn tùng') || text.includes('m-tp') || text.includes('mtp')) {
    return { type: 'artist', artist: 'Sơn Tùng M-TP', moodLabel: 'Nghệ sĩ Sơn Tùng M-TP' };
  }
  if (text.includes('vũ') || text.includes('hoàng dũng')) {
    return { type: 'artist', artist: text.includes('vũ') ? 'Vũ.' : 'Hoàng Dũng', moodLabel: 'Indie Việt nhẹ nhàng' };
  }
  if (text.includes('taylor swift') || text.includes('taylor')) {
    return { type: 'artist', artist: 'Taylor Swift', moodLabel: 'Taylor Swift Hits' };
  }
  if (text.includes('the weeknd') || text.includes('weeknd')) {
    return { type: 'artist', artist: 'The Weeknd', moodLabel: 'The Weeknd Vibes' };
  }
  if (text.includes('billie eilish') || text.includes('billie')) {
    return { type: 'artist', artist: 'Billie Eilish', moodLabel: 'Billie Eilish Music' };
  }
  if (text.includes('ed sheeran')) {
    return { type: 'artist', artist: 'Ed Sheeran', moodLabel: 'Ed Sheeran Acoustic & Pop' };
  }
  if (text.includes('hoàng thùy linh') || text.includes('hoàng thuỳ linh')) {
    return { type: 'artist', artist: 'Hoàng Thùy Linh', moodLabel: 'Hoàng Thùy Linh Pop Dân Gian' };
  }

  // 2. Nhận diện các tâm trạng (Moods)
  // Buồn / Cô đơn / Thất tình
  if (
    /buồn|cô đơn|chia tay|khóc|tổn thương|thất tình|chán nản|áp lực|mệt mỏi|nặng trĩu|nhớ người yêu cũ|trầm cảm|cô quạnh|lặng lẽ|tâm trạng|mưa rơi/.test(
      text
    )
  ) {
    return {
      type: 'mood',
      mood: 'sad',
      moodLabel: 'Lắng đọng & Đồng cảm',
      tags: ['Bước Qua Mùa Cô Đơn', 'Someone You Loved', 'In The Stars', 'Lạ Lùng', 'Nàng Thơ', 'Save Your Tears'],
      fallbackReplies: [
        'Mình hiểu cảm giác này của bạn. Đôi khi có những ngày mây mù trút nước và lòng ta trĩu nặng. Hãy để âm nhạc thay lời an ủi, ôm lấy cảm xúc của bạn lúc này nhé. 🌧️🤍',
        'Cảm ơn bạn đã mở lòng chia sẻ cùng mình. Lúc này đừng cố ép bản thân phải vui vẻ, hãy cứ để từng nốt nhạc êm dịu này vỗ về tâm hồn bạn...',
        'Có những nỗi niềm thật khó nói bằng lời. Mình đã chọn sẵn những giai điệu sâu lắng và đồng điệu nhất, hy vọng sẽ làm bạn thấy nhẹ nhõm hơn một chút.',
      ],
      nextPrompts: ['Gợi ý thêm bài hát nhẹ nhàng dễ ngủ', 'Chuyển sang bài tươi vui hơn một chút', 'Nhạc của Vũ.'],
    };
  }

  // Vui vẻ / Yêu đời / Hạnh phúc
  if (
    /vui|yêu đời|hạnh phúc|phấn khởi|tươi|cười|tuyệt vời|may mắn|quá đã|thích quá|sung sướng|good vibe|happy|sảng khoái/.test(
      text
    )
  ) {
    return {
      type: 'mood',
      mood: 'happy',
      moodLabel: 'Vui vẻ & Rạng rỡ',
      tags: ['Espresso', 'As It Was', 'See Tình', 'Seven', 'Levitating', 'Có Em Chờ', 'Flowers', 'Peaches'],
      fallbackReplies: [
        'Thật tuyệt khi thấy bạn đang ngập tràn năng lượng tích cực! Niềm vui này xứng đáng được khuếch đại bằng những giai điệu bừng sáng và bắt tai nhất hôm nay! ✨🎉',
        'Năng lượng yêu đời của bạn làm mình cũng thấy vui lây nè! Hãy bật to loa lên và nhún nhảy theo danh sách nhạc siêu ngọt ngào này nhé! 💃🎶',
        'Một ngày tuyệt vời như hôm nay thì âm nhạc phải thật rực rỡ! Mình gửi bạn những bài hát vui tươi, bắt tai nhất kho nhạc đây!',
      ],
      nextPrompts: ['Những bài hát hot trend V-Pop', 'Nhạc pop quốc tế sôi động', 'Gợi ý bài hát của Sơn Tùng M-TP'],
    };
  }

  // Thể thao / Gym / Chạy bộ / Workout / Năng lượng bùng nổ
  if (
    /gym|chạy bộ|thể thao|workout|chạy|tập luyện|sung|bùng cháy|căng|quẩy|năng lượng|sôi động|bass|động lực|mạnh mẽ/.test(
      text
    )
  ) {
    return {
      type: 'mood',
      mood: 'workout',
      moodLabel: 'Năng lượng bùng nổ',
      tags: ['Blinding Lights', 'Starboy', 'Bad Guy', 'Greedy', 'Để Mị Nói Cho Mà Nghe', 'Waiting For You', 'Water'],
      fallbackReplies: [
        'Chuẩn bị bùng nổ thôi nào! Với danh sách nhạc beat căng và nhịp điệu dồn dập này, mỗi bước chạy hay mỗi hiệp tập của bạn sẽ cực kỳ sung sức! 🔥⚡',
        'Năng lượng đang lên cao! Đeo tai nghe vào, tăng âm lượng và cùng cháy hết mình với những giai điệu cuồng nhiệt này nhé! 🏃‍♂️💨',
      ],
      nextPrompts: ['Thêm bài hát tiết tấu nhanh nữa', 'Nhạc quẩy EDM / Pop dance', 'Nhạc chạy bộ thư giãn'],
    };
  }

  // Thư giãn / Chill / Cafe / Cuối tuần
  if (
    /chill|thư giãn|nhẹ nhàng|bình yên|nghỉ ngơi|uống cafe|cafe|cà phê|cuối tuần|ngắm cảnh|hoàng hôn|dễ chịu|bình thản|êm dịu/.test(
      text
    )
  ) {
    return {
      type: 'mood',
      mood: 'chill',
      moodLabel: 'Thư giãn & Chillout',
      tags: ['Lạ Lùng', 'Calm Down', 'Birds of a Feather', 'Sunflower', 'Peaches', 'Nàng Thơ', 'Reflection'],
      fallbackReplies: [
        'Một tách trà hoặc cafe cùng những giai điệu êm ái là công thức tuyệt vời nhất để tận hưởng khoảnh khắc này. Thả lỏng người và lắng nghe nhé ☕🍃',
        'Cuộc sống đôi khi cần chậm lại một nhịp. Hãy để những giai điệu mượt mà này xua tan mọi mỏi mệt và mang lại cảm giác bình yên cho bạn.',
      ],
      nextPrompts: ['Nhạc Indie Việt sâu lắng', 'Nhạc acoustic nhẹ nhàng', 'Bản nhạc êm dịu cho buổi tối'],
    };
  }

  // Tập trung / Học bài / Làm việc
  if (
    /học bài|tập trung|làm việc|ôn thi|làm bài|đọc sách|nghiên cứu|suy nghĩ|deadline|viết lách|focus/.test(
      text
    )
  ) {
    return {
      type: 'mood',
      mood: 'focus',
      moodLabel: 'Tập trung & Sáng tạo',
      tags: ['Reflection', 'Birds of a Feather', 'Heat Waves', 'Nơi Này Có Anh', 'Stay', 'In The Stars'],
      fallbackReplies: [
        'Chúc bạn có một buổi làm việc và học tập thật hiệu quả! Mình đã chọn các bản nhạc có giai điệu mượt mà, không quá ồn ào để bạn giữ trọn sự tập trung 🎯📚',
        'Bật chế độ tập trung cao độ nào! Những giai điệu này sẽ giúp bạn cuốn trôi deadline một cách nhẹ nhàng nhất.',
      ],
      nextPrompts: ['Nhạc không lời hoặc êm dịu', 'Gợi ý bài hát thư giãn đầu óc', 'Nhạc tạo cảm hứng sáng tạo'],
    };
  }

  // Tình yêu / Lãng mạn / Ngọt ngào
  if (
    /yêu|tình yêu|lãng mạn|ngọt ngào|tỏ tình|crush|người thương|nhớ người yêu|hẹn hò|cưới|rung động/.test(
      text
    )
  ) {
    return {
      type: 'mood',
      mood: 'romantic',
      moodLabel: 'Lãng mạn & Ngọt ngào',
      tags: ['Nơi Này Có Anh', 'Perfect', 'Có Em Chờ', 'Seven', 'Birds of a Feather', 'Nàng Thơ'],
      fallbackReplies: [
        'Tình yêu luôn làm cuộc sống ngập tràn sắc hồng ngọt ngào! Hãy cùng người ấy hoặc lắng nghe một mình để cảm nhận từng rung động ngọt ngào trong tim nhé 💖🌸',
        'Những bản tình ca đẹp nhất dành tặng cho trái tim đang rung rinh của bạn đây. Chúc cho tình yêu của bạn luôn ấm áp như những giai điệu này!',
      ],
      nextPrompts: ['Những bài hát tỏ tình ngọt ngào', 'Tình ca Acoustic da diết', 'Nhạc Sơn Tùng M-TP'],
    };
  }

  // Mặc định: Trò chuyện tổng quát / Khám phá
  return {
    type: 'general',
    mood: 'discovery',
    moodLabel: 'Khám phá âm nhạc',
    tags: ['Nơi Này Có Anh', 'As It Was', 'Blinding Lights', 'Lạ Lùng', 'Espresso', 'Starboy'],
    fallbackReplies: [
      'Chào bạn! Mình là AI Music Assistant của Soundwave 🎵 Hôm nay bạn cảm thấy thế nào? Bạn muốn nghe một chút nhạc vui vẻ, thư giãn hay có một tâm sự nào muốn chia sẻ không?',
      'Âm nhạc luôn là người bạn tuyệt vời nhất theo từng khoảnh khắc cảm xúc. Bạn hãy kể cho mình nghe tâm trạng của bạn lúc này nhé, mình sẽ tìm bản nhạc chuẩn nhất cho bạn!',
    ],
    nextPrompts: [
      'Hôm nay mình rất vui vẻ, gợi ý nhạc hay đi!',
      'Mình cần một chút nhạc chill thư giãn ☕',
      'Đang có chút tâm sự buồn 🌧️',
    ],
  };
}

// 1. API: Lấy danh sách tâm trạng có sẵn (Mood presets)
exports.getMoodPresets = (req, res) => {
  res.status(200).json({
    success: true,
    data: MOOD_PRESETS,
    welcomeMessage:
      'Chào bạn! Mình là AI Music Assistant của Soundwave 🎧 Bạn đang cảm thấy thế nào hôm nay? Hãy chọn một tâm trạng bên dưới hoặc chia sẻ trực tiếp với mình nhé!',
  });
};

// Danh sách bài hát dự phòng đảm bảo AI luôn trả về kết quả mượt mà kể cả khi DB bận hoặc mất mạng
const FALLBACK_SONGS = [
  {
    id: 's26',
    title: 'Nơi Này Có Anh',
    artist: 'Sơn Tùng M-TP',
    duration: '04:20',
    coverImage: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'http://localhost:5000/audio/s26.m4a',
  },
  {
    id: 's30',
    title: 'Bước Qua Mùa Cô Đơn',
    artist: 'Vũ.',
    duration: '04:38',
    coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'http://localhost:5000/audio/s30.m4a',
  },
  {
    id: 's31',
    title: 'Lạ Lùng',
    artist: 'Vũ.',
    duration: '04:21',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'http://localhost:5000/audio/s31.m4a',
  },
  {
    id: 's4',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: '03:20',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'http://localhost:5000/audio/s4.m4a',
  },
  {
    id: 's5',
    title: 'As It Was',
    artist: 'Harry Styles',
    duration: '02:47',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'http://localhost:5000/audio/s5.m4a',
  },
  {
    id: 's21',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    duration: '02:55',
    coverImage: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'http://localhost:5000/audio/s21.m4a',
  },
  {
    id: 's12',
    title: 'Someone You Loved',
    artist: 'Lewis Capaldi',
    duration: '03:02',
    coverImage: 'https://images.unsplash.com/photo-1520523839898-507124976779?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'http://localhost:5000/audio/s12.m4a',
  },
];

// 2. API: Chat với AI và nhận gợi ý bài hát theo tâm trạng (Hỗ trợ Gemini LLM + Rule-based Fallback)
exports.chatWithAI = async (req, res) => {
  try {
    const { message = '', history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Nội dung tin nhắn không được để trống.',
      });
    }

    const trimmedMsg = message.trim();
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    // Lấy trước danh sách bài hát từ DB hoặc Fallback
    let allSongsPool = FALLBACK_SONGS;
    if (isDbConnected) {
      try {
        const dbPool = await Song.find().maxTimeMS(2500).limit(52);
        if (dbPool && dbPool.length > 0) allSongsPool = dbPool;
      } catch (poolErr) {
        console.warn('Lỗi lấy bài hát cho ngữ cảnh AI:', poolErr.message);
      }
    }

    // --- ƯU TIÊN 1: Gọi mô hình AI thực thụ (Google Gemini LLM) nếu có API Key ---
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        const geminiResult = await chatWithGeminiLLM(trimmedMsg, history, allSongsPool);
        if (geminiResult && geminiResult.reply) {
          // Lấy chi tiết các bài hát được Gemini gợi ý
          let matchedSongs = [];
          if (Array.isArray(geminiResult.recommendedSongIds) && geminiResult.recommendedSongIds.length > 0) {
            matchedSongs = allSongsPool.filter((s) =>
              geminiResult.recommendedSongIds.includes(s.id)
            );
          }

          return res.status(200).json({
            success: true,
            data: {
              reply: geminiResult.reply,
              mood: 'gemini_llm',
              moodLabel: geminiResult.moodLabel || 'AI Tri Kỷ ✨',
              recommendedSongs: matchedSongs,
              suggestedPrompts: geminiResult.suggestedPrompts || [
                'Gợi ý bài hát hợp tâm trạng',
                'Kể thêm về bài hát này',
                'Hôm nay có gì mới?',
              ],
            },
          });
        }
      } catch (geminiErr) {
        console.warn('Lỗi xử lý Gemini LLM, chuyển sang rule-based:', geminiErr.message);
      }
    }

    // --- ƯU TIÊN 2: Engine thông minh cục bộ (Rule-based NLP & Sentiment Engine) ---
    const analysis = detectMoodAndContext(trimmedMsg);

    // Tìm kiếm bài hát phù hợp từ MongoDB nếu đã kết nối, nếu không dùng fallback ngay
    let songs = [];

    if (isDbConnected) {
      try {
        if (analysis.type === 'artist') {
          songs = await Song.find({
            artist: { $regex: new RegExp(analysis.artist, 'i') },
          })
            .maxTimeMS(2500)
            .limit(6);

          if (songs.length === 0) {
            songs = await Song.find({ category: { $in: ['suggestions', 'charts'] } })
              .maxTimeMS(2500)
              .limit(4);
          }
        } else if (analysis.tags && analysis.tags.length > 0) {
          const tagQueries = analysis.tags.map((title) => ({
            title: { $regex: new RegExp(title, 'i') },
          }));

          songs = await Song.find({ $or: tagQueries })
            .maxTimeMS(2500)
            .limit(6);

          if (songs.length < 3) {
            const moreSongs = await Song.find({
              id: { $nin: songs.map((s) => s.id) },
            })
              .maxTimeMS(2500)
              .limit(6 - songs.length);
            songs = [...songs, ...moreSongs];
          }
        } else {
          songs = await Song.find().maxTimeMS(2500).limit(5);
        }
      } catch (dbErr) {
        console.warn('Lỗi truy vấn DB cho AI chat, chuyển sang fallback:', dbErr.message);
      }
    }

    // Nếu chưa có bài hát (DB offline hoặc lỗi hoặc tìm không ra), dùng fallback
    if (songs.length === 0) {
      if (analysis.type === 'artist') {
        songs = FALLBACK_SONGS.filter((s) =>
          s.artist.toLowerCase().includes(analysis.artist.toLowerCase())
        );
      } else if (analysis.mood === 'sad') {
        songs = FALLBACK_SONGS.filter((s) => ['s30', 's12', 's31'].includes(s.id));
      } else if (analysis.mood === 'workout') {
        songs = FALLBACK_SONGS.filter((s) => ['s4', 's21'].includes(s.id));
      } else if (analysis.mood === 'happy') {
        songs = FALLBACK_SONGS.filter((s) => ['s5', 's21', 's26'].includes(s.id));
      }

      if (songs.length === 0) {
        songs = FALLBACK_SONGS.slice(0, 4);
      }
    }

    // Chọn câu trả lời ấm áp
    let reply = '';
    if (analysis.type === 'artist') {
      reply = `Đây là những bài hát xuất sắc nhất của ${analysis.artist} mà bạn yêu thích nè! Hãy bật lên và thưởng thức ngay nhé 🎤✨`;
    } else {
      const replies = analysis.fallbackReplies || [
        'Mình đã chọn cho bạn những bài hát thật hợp với tâm trạng lúc này. Mời bạn cùng lắng nghe!',
      ];
      reply = replies[Math.floor(Math.random() * replies.length)];
    }

    const suggestedPrompts = analysis.nextPrompts || [
      'Gợi ý nhạc vui vẻ hơn',
      'Bài hát nhẹ nhàng thư giãn',
      'Nhạc của Sơn Tùng M-TP',
    ];

    return res.status(200).json({
      success: true,
      data: {
        reply,
        mood: analysis.mood || 'custom',
        moodLabel: analysis.moodLabel || 'Đặc biệt',
        recommendedSongs: songs,
        suggestedPrompts,
      },
    });
  } catch (err) {
    console.error('Lỗi xử lý AI Chat:', err);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi xử lý phản hồi từ AI.',
      error: err.message,
    });
  }
};

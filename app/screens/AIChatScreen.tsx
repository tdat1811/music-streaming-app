// app/screens/AIChatScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { IMAGES } from '../../src/constants/images';
import { api } from '../../src/services/api';
import { Song, SUGGESTIONS } from '../../src/data/musicData';
import { useAudioPlayer } from '../../src/context/AudioPlayerContext';
import { toImageSource } from '../../src/utils/imageSource';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  moodLabel?: string;
  recommendedSongs?: Song[];
  suggestedPrompts?: string[];
}

interface MoodPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  prompt: string;
}

const DEFAULT_MOODS: MoodPreset[] = [
  {
    id: 'happy',
    label: 'Vui vẻ & Yêu đời',
    emoji: '🥰',
    description: 'Năng lượng tươi sáng, rạng rỡ',
    prompt: 'Hôm nay mình rất vui và yêu đời, hãy gợi ý cho mình vài bài hát thật tươi vui nhé!',
  },
  {
    id: 'chill',
    label: 'Thư giãn & Chill',
    emoji: '☕',
    description: 'Giai điệu êm dịu, nhẹ nhàng',
    prompt: 'Mình muốn tìm những bản nhạc nhẹ nhàng, êm dịu để thư giãn sau giờ làm việc.',
  },
  {
    id: 'sad',
    label: 'Lắng đọng & Buồn',
    emoji: '🌧️',
    description: 'Đồng điệu với tâm sự, ngày mưa',
    prompt: 'Hôm nay tâm trạng mình hơi buồn và cô đơn, có bài hát nào đồng cảm với mình không?',
  },
  {
    id: 'workout',
    label: 'Năng lượng & Thể thao',
    emoji: '⚡',
    description: 'Beat căng, chạy bộ, tập gym',
    prompt: 'Gợi ý cho mình các bài hát thật sôi động, beat căng để chạy bộ và tập gym với!',
  },
  {
    id: 'focus',
    label: 'Tập trung học & Làm việc',
    emoji: '🎯',
    description: 'Êm ái, sâu lắng, tập trung cao độ',
    prompt: 'Mình cần nhạc êm tai, dễ chịu để tập trung làm việc và ôn bài thật hiệu quả.',
  },
  {
    id: 'romantic',
    label: 'Lãng mạn & Tình yêu',
    emoji: '💖',
    description: 'Bản tình ca ngọt ngào',
    prompt: 'Cho mình xin những bản tình ca ngọt ngào, lãng mạn dành cho người đang yêu nhé!',
  },
];

interface AIChatScreenProps {
  onBack: () => void;
  onNavigateToPlay?: (trackId?: string) => void;
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({ onBack, onNavigateToPlay }) => {
  const { playSong, currentTrack, isPlaying, togglePlayPause } = useAudioPlayer();

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [moodPresets, setMoodPresets] = useState<MoodPreset[]>(DEFAULT_MOODS);

  const flatListRef = useRef<FlatList>(null);

  // Tin nhắn ban đầu của AI
  const initialGreeting: Message = {
    id: 'msg_welcome',
    sender: 'ai',
    text: 'Chào bạn! Mình là AI Music Companion của Soundwave 🎧\n\nHôm nay tâm trạng của bạn thế nào? Bạn muốn nghe một giai điệu tươi vui, một chút lắng đọng hay cần tiếp thêm năng lượng? Hãy chia sẻ với mình nhé!',
    timestamp: 'Bây giờ',
    suggestedPrompts: [
      '🥰 Hôm nay mình vui lắm, muốn nghe nhạc yêu đời!',
      '☕ Cho mình nhạc nhẹ nhàng thư giãn cuối ngày',
      '🌧️ Tâm trạng có chút buồn và cô đơn',
    ],
  };

  const [messages, setMessages] = useState<Message[]>([initialGreeting]);

  // Tải danh sách mood từ Backend
  useEffect(() => {
    async function loadMoods() {
      try {
        const res = await api.ai.getMoods();
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setMoodPresets(res.data);
        }
      } catch (err) {
        // Dùng danh sách fallback nếu backend offline
      }
    }
    loadMoods();
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  // Gửi tin nhắn tới AI
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputMessage('');
    setLoading(true);
    scrollToBottom();

    try {
      // Chuẩn bị history cho AI
      const history = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const res = await api.ai.chat(text, history);

      if (res?.success && res?.data) {
        const aiMessage: Message = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          moodLabel: res.data.moodLabel,
          recommendedSongs: res.data.recommendedSongs,
          suggestedPrompts: res.data.suggestedPrompts,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error('Không nhận được phản hồi hợp lệ');
      }
    } catch (err) {
      // Phản hồi dự phòng thông minh khi không có mạng
      const fallbackAiMsg: Message = {
        id: `ai_err_${Date.now()}`,
        sender: 'ai',
        text: 'Mình đã lắng nghe tâm sự của bạn. Dù là niềm vui hay nỗi buồn, âm nhạc sẽ luôn là người bạn đồng hành tuyệt vời nhất. Mình gợi ý cho bạn những bản nhạc hay nhất đây!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedSongs: SUGGESTIONS.slice(0, 4),
        suggestedPrompts: ['Gợi ý nhạc vui vẻ', 'Nhạc nhẹ nhàng thư giãn', 'Nhạc của Sơn Tùng M-TP'],
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  // Bấm vào bài hát để phát ngay
  const handlePlaySong = (song: Song, playlist?: Song[]) => {
    if (currentTrack?.id === song.id) {
      togglePlayPause();
    } else {
      playSong(song, playlist || [song]);
    }
  };

  // Bấm "Phát tất cả"
  const handlePlayAll = (songs: Song[]) => {
    if (songs && songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  // Làm mới cuộc trò chuyện
  const handleResetChat = () => {
    setMessages([initialGreeting]);
  };

  // Render một bài hát gợi ý trong bubble
  const renderRecommendedSong = (song: Song, allSongs: Song[]) => {
    const isCurrent = currentTrack?.id === song.id;
    const isThisPlaying = isCurrent && isPlaying;

    return (
      <View key={song.id} style={[styles.songCard, isCurrent && styles.songCardPlaying]}>
        <TouchableOpacity
          style={styles.songCardLeft}
          onPress={() => handlePlaySong(song, allSongs)}
          activeOpacity={0.8}
        >
          <Image
            source={toImageSource(song.coverImage, IMAGES.suggestion1)}
            style={styles.songCover}
          />
          <View style={styles.songInfo}>
            <Text
              style={[styles.songTitle, isCurrent && styles.songTitleActive]}
              numberOfLines={1}
            >
              {song.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.artist} • {song.duration || '03:30'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.playBtn, isThisPlaying && styles.playBtnActive]}
          onPress={() => handlePlaySong(song, allSongs)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isThisPlaying ? 'pause' : 'play'}
            size={16}
            color={isThisPlaying ? '#FFFFFF' : '#10C7D5'}
            style={!isThisPlaying ? { marginLeft: 2 } : undefined}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // Render từng item tin nhắn
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userMessageRow : styles.aiMessageRow]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
        )}

        <View style={[styles.bubbleContainer, isUser ? styles.userBubble : styles.aiBubble]}>
          {item.moodLabel && (
            <View style={styles.moodBadge}>
              <Ionicons name="heart" size={11} color="#10C7D5" />
              <Text style={styles.moodBadgeText}>{item.moodLabel}</Text>
            </View>
          )}

          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {item.text}
          </Text>

          {/* Danh sách bài hát gợi ý nếu có */}
          {item.recommendedSongs && item.recommendedSongs.length > 0 && (
            <View style={styles.recommendedSection}>
              <View style={styles.recommendedHeader}>
                <Text style={styles.recommendedTitle}>
                  🎵 Bài hát gợi ý ({item.recommendedSongs.length})
                </Text>
                <TouchableOpacity
                  style={styles.playAllBtn}
                  onPress={() => handlePlayAll(item.recommendedSongs!)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play-circle" size={16} color="#10C7D5" />
                  <Text style={styles.playAllText}>Phát tất cả</Text>
                </TouchableOpacity>
              </View>

              {item.recommendedSongs.map((song) =>
                renderRecommendedSong(song, item.recommendedSongs!)
              )}
            </View>
          )}

          {/* Gợi ý tiếp theo */}
          {item.suggestedPrompts && item.suggestedPrompts.length > 0 && (
            <View style={styles.promptsContainer}>
              <Text style={styles.promptsHeader}>Gợi ý tiếp theo:</Text>
              <View style={styles.promptsWrap}>
                {item.suggestedPrompts.map((prompt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.promptChip}
                    onPress={() => handleSendMessage(prompt)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.promptChipText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Text style={[styles.timestampText, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.aiBadgeOnline}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerTitle}>AI Music Companion</Text>
            <Ionicons name="sparkles" size={15} color="#10C7D5" style={{ marginLeft: 4 }} />
          </View>
          <Text style={styles.headerSubtitle}>Lắng nghe cảm xúc • Gợi ý chuẩn gu</Text>
        </View>

        <TouchableOpacity
          onPress={handleResetChat}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Làm mới trò chuyện"
        >
          <Ionicons name="refresh-outline" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Mood Selector (Quick Presets) */}
      <View style={styles.moodSelectorContainer}>
        <Text style={styles.moodSelectorHeading}>Hôm nay bạn muốn nghe gì?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodScroll}
        >
          {moodPresets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.moodPresetItem}
              onPress={() => handleSendMessage(preset.prompt)}
              activeOpacity={0.75}
            >
              <Text style={styles.moodEmoji}>{preset.emoji}</Text>
              <Text style={styles.moodLabel}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Danh sách tin nhắn */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        {/* AI Typing Indicator */}
        {loading && (
          <View style={styles.typingContainer}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color="#10C7D5" style={{ marginRight: 8 }} />
              <Text style={styles.typingText}>AI đang phân tích cảm xúc & chọn bài hát...</Text>
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Kể cho mình nghe tâm trạng của bạn hôm nay..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSendMessage()}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              inputMessage.trim().length > 0 && styles.sendButtonActive,
            ]}
            onPress={() => handleSendMessage()}
            disabled={inputMessage.trim().length === 0 || loading}
            activeOpacity={0.8}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputMessage.trim().length > 0 ? '#111216' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1015',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F222A',
    backgroundColor: '#0F1015',
  },
  headerBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: 'center',
  },
  aiBadgeOnline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  moodSelectorContainer: {
    paddingVertical: 10,
    backgroundColor: '#14161E',
    borderBottomWidth: 1,
    borderBottomColor: '#1F222A',
  },
  moodSelectorHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moodScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  moodPresetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F222E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E3344',
  },
  moodEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  bubbleContainer: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#10C7D5',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1F222A',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2D323E',
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 199, 213, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  moodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10C7D5',
    marginLeft: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#111216',
    fontWeight: '500',
  },
  aiMessageText: {
    color: '#F3F4F6',
  },
  recommendedSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2D323E',
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recommendedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10C7D5',
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171920',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#262A34',
  },
  songCardPlaying: {
    borderColor: '#10C7D5',
    backgroundColor: 'rgba(16, 199, 213, 0.08)',
  },
  songCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  songCover: {
    width: 42,
    height: 42,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#262A34',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  songTitleActive: {
    color: '#10C7D5',
  },
  songArtist: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262A34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: '#10C7D5',
  },
  promptsContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2D323E',
  },
  promptsHeader: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  promptsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  promptChip: {
    backgroundColor: '#262A36',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  promptChipText: {
    fontSize: 11,
    color: '#60A5FA',
  },
  timestampText: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(17, 18, 22, 0.6)',
  },
  aiTimestamp: {
    color: '#6B7280',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F222A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2D323E',
  },
  typingText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#14161E',
    borderTopWidth: 1,
    borderTopColor: '#1F222A',
  },
  input: {
    flex: 1,
    backgroundColor: '#1F222A',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
    maxHeight: 100,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2E3344',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#262A34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#10C7D5',
  },
});

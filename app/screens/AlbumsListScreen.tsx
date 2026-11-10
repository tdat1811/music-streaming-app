import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { ALL_ALBUMS, Album } from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { api } from '../../src/services/api';

interface AlbumsListScreenProps {
  onBack?: () => void;
  onSelectAlbum?: (album: Album) => void;
  onTabPress?: (tab: TabName) => void;
}

export const AlbumsListScreen: React.FC<AlbumsListScreenProps> = ({
  onBack,
  onSelectAlbum,
  onTabPress,
}) => {
  const [albums, setAlbums] = useState<Album[]>(ALL_ALBUMS);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchAlbums() {
      try {
        setLoading(true);
        const res: any = await api.albums.getAll();
        const data = res?.data || res;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setAlbums(data);
        }
      } catch (error) {
        console.log('Using local fallback albums:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAlbums();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderAlbumCard = ({ item }: { item: Album }) => {
    const imageSource =
      typeof item.coverImage === 'string'
        ? { uri: item.coverImage }
        : item.coverImage;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => onSelectAlbum && onSelectAlbum(item)}
      >
        <View style={styles.imageWrapper}>
          <Image source={imageSource} style={styles.coverImage} resizeMode="cover" />
          <View style={styles.playButtonBadge}>
            <Ionicons name="play" size={18} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.infoWrapper}>
          <Text style={styles.albumTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.albumArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          {item.releaseYear && (
            <Text style={styles.albumYear}>
              Album • {item.releaseYear}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Trending Albums</Text>
          <Text style={styles.headerSubtitle}>Album thịnh hành nhất</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Feather name="cast" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading && albums.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách album...</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          renderItem={renderAlbumCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Home"
        onTabPress={(tab) => onTabPress && onTabPress(tab)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    padding: 4,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  playButtonBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoWrapper: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  albumArtist: {
    fontSize: 13,
    color: '#4B5563',
  },
  albumYear: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
});

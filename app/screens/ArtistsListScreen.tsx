import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { ARTISTS, Artist } from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

interface ArtistsListScreenProps {
  onBack?: () => void;
  onSelectArtist?: (artist: any) => void;
  onTabPress?: (tab: TabName) => void;
}

export const ArtistsListScreen: React.FC<ArtistsListScreenProps> = ({
  onBack,
  onSelectArtist,
  onTabPress,
}) => {
  const { currentUser, toggleFollowArtist } = useAuth();
  const [artists, setArtists] = useState<Artist[]>(ARTISTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchingDb, setSearchingDb] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchArtists() {
      try {
        setLoading(true);
        const res: any = await api.artists.getAll();
        const data = res?.data || res;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setArtists(data);
        }
      } catch (error) {
        console.log('Using local fallback artists:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchArtists();
    return () => {
      isMounted = false;
    };
  }, []);

  // Lọc theo ID nghệ sĩ hoặc theo Tên
  const filteredArtists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return artists;
    return artists.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    );
  }, [artists, searchQuery]);

  // Tìm trực tiếp theo ID trên MongoDB Atlas khi bấm nút Tìm ID
  const handleSearchExactId = async () => {
    const targetId = searchQuery.trim();
    if (!targetId) return;

    // Nếu đã có sẵn trong danh sách thì mở luôn
    const found = artists.find(
      (a) => a.id.toLowerCase() === targetId.toLowerCase()
    );
    if (found) {
      if (onSelectArtist) onSelectArtist(found);
      return;
    }

    // Nếu chưa có, gọi API /artists/:id lên MongoDB Atlas
    try {
      setSearchingDb(true);
      const res: any = await api.artists.getById(targetId);
      const data = res?.data || res;
      if (data && data.name) {
        // Thêm vào danh sách hiển thị và mở hồ sơ
        setArtists((prev) => [data, ...prev.filter((a) => a.id !== data.id)]);
        if (onSelectArtist) onSelectArtist(data);
      } else {
        alert(`Không tìm thấy nghệ sĩ nào có ID: "${targetId}"`);
      }
    } catch (err) {
      alert(`Không tìm thấy nghệ sĩ có ID: "${targetId}" trong database.`);
    } finally {
      setSearchingDb(false);
    }
  };

  const renderArtistCard = ({ item }: { item: Artist }) => {
    const isFollowing = !!currentUser?.followedArtistIds.includes(item.id);
    const avatarSource =
      typeof item.avatarImage === 'string'
        ? { uri: item.avatarImage }
        : item.avatarImage;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => onSelectArtist && onSelectArtist(item)}
      >
        <View style={styles.avatarWrapper}>
          <Image source={avatarSource} style={styles.avatarImage} />
        </View>

        <View style={styles.infoWrapper}>
          <View style={styles.nameRow}>
            <Text style={styles.artistName} numberOfLines={1}>
              {item.name}
            </Text>
            <Ionicons name="checkmark-circle" size={15} color="#00A3FF" style={styles.verifiedIcon} />
          </View>

          {/* Badge hiển thị ID nghệ sĩ */}
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>ID: {item.id}</Text>
          </View>

          <Text style={styles.followersText} numberOfLines={1}>
            {item.followers || '1.2M Followers'}
          </Text>

          {/* Follow Button */}
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={() => toggleFollowArtist(item.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Popular Artists</Text>
          <Text style={styles.headerSubtitle}>Tìm kiếm & xem hồ sơ nghệ sĩ</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Feather name="cast" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Ô tìm kiếm theo ID hoặc Tên */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo ID (art1, art5...) hoặc Tên..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchExactId}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.trim().length > 0 && (
          <TouchableOpacity
            style={styles.findIdBtn}
            onPress={handleSearchExactId}
            disabled={searchingDb}
            activeOpacity={0.8}
          >
            {searchingDb ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.findIdBtnText}>Mở ID</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {loading && artists.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách nghệ sĩ...</Text>
        </View>
      ) : filteredArtists.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search" size={42} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Không tìm thấy nghệ sĩ</Text>
          <Text style={styles.emptySubtitle}>Không có ca sĩ nào có ID hoặc tên khớp "{searchQuery}"</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleSearchExactId}>
            <Text style={styles.retryBtnText}>Tìm ID "{searchQuery}" trên Database</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredArtists}
          keyExtractor={(item) => item.id}
          renderItem={renderArtistCard}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    height: 42,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
  },
  findIdBtn: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  findIdBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatarWrapper: {
    width: 105,
    height: 105,
    borderRadius: 53,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  infoWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    maxWidth: '85%',
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  idBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 6,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  followersText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  followBtn: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#111216',
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingBtnText: {
    color: '#374151',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

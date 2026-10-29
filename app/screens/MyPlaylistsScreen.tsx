import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { MY_PLAYLISTS, Playlist } from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';

interface MyPlaylistsScreenProps {
  onBack?: () => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
  onTabPress?: (tab: TabName) => void;
}

export const MyPlaylistsScreen: React.FC<MyPlaylistsScreenProps> = ({
  onBack,
  onSelectPlaylist,
  onTabPress,
}) => {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerIconBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Playlists</Text>

        <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.7}>
          <Feather name="cast" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Section Title */}
        <Text style={styles.sectionTitle}>Your playlists</Text>

        {/* Playlists List */}
        <FlatList
          data={MY_PLAYLISTS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistRow}
              onPress={() => onSelectPlaylist && onSelectPlaylist(item)}
              activeOpacity={0.7}
            >
              <Image source={item.coverImage} style={styles.coverImage} />
              <View style={styles.infoContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.details}>
                  {item.creator}  •  {item.songCount} songs
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Floating Add Playlist Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Tab Bar */}
      <BottomTabBar
        currentTab="Library"
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111216',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111216',
    marginBottom: 20,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  coverImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111216',
    marginBottom: 4,
  },
  details: {
    fontSize: 13,
    color: '#686A70',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#121316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});

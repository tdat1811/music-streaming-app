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
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { CHARTS, Chart } from '../../src/data/musicData';
import { BottomTabBar, TabName } from '../../src/components/BottomTabBar';
import { api } from '../../src/services/api';

interface ChartsListScreenProps {
  onBack?: () => void;
  onSelectChart?: (chart: Chart | any) => void;
  onTabPress?: (tab: TabName) => void;
}

export const ChartsListScreen: React.FC<ChartsListScreenProps> = ({
  onBack,
  onSelectChart,
  onTabPress,
}) => {
  const [charts, setCharts] = useState<Chart[]>(CHARTS);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchCharts() {
      try {
        setLoading(true);
        const res: any = await api.charts.getAll();
        const data = res?.data || res;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCharts(data);
        }
      } catch (error) {
        console.log('Using local charts fallback:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchCharts();
    return () => {
      isMounted = false;
    };
  }, []);

  const renderChartCard = ({ item }: { item: Chart }) => {
    const imageSource =
      typeof item.coverImage === 'string'
        ? { uri: item.coverImage }
        : item.coverImage;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => onSelectChart && onSelectChart(item)}
      >
        <View style={styles.imageWrapper}>
          <Image source={imageSource} style={styles.coverImage} resizeMode="cover" />
          <View style={styles.playButtonBadge}>
            <Ionicons name="play" size={18} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.infoWrapper}>
          <Text style={styles.chartTitle} numberOfLines={1}>
            {item.title} {item.subtitle ? `• ${item.subtitle}` : ''}
          </Text>
          <Text style={styles.chartDesc} numberOfLines={2}>
            {item.updateText || 'Daily chart-toppers update'}
          </Text>
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
          <Text style={styles.headerTitle}>Top Charts</Text>
          <Text style={styles.headerSubtitle}>Bảng xếp hạng âm nhạc</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Feather name="cast" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading && charts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải bảng xếp hạng...</Text>
        </View>
      ) : (
        <FlatList
          data={charts}
          keyExtractor={(item) => item.id}
          renderItem={renderChartCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar currentTab="Home" onTabPress={(tab) => onTabPress && onTabPress(tab)} />
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
    paddingBottom: 90, // tránh bị MiniPlayer / TabBar che
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
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  chartDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
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

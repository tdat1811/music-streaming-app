import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export type TabName = 'Home' | 'Search' | 'Feed' | 'Library';

interface BottomTabBarProps {
  currentTab: TabName;
  onTabPress: (tab: TabName) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onTabPress,
}) => {
  const tabs: { name: TabName; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      name: 'Home',
      label: 'Home',
      icon: (active) => (
        <Ionicons
          name={active ? 'home-outline' : 'home-outline'}
          size={22}
          color={active ? COLORS.primary : COLORS.tabInactive}
        />
      ),
    },
    {
      name: 'Search',
      label: 'Search',
      icon: (active) => (
        <Ionicons
          name="search-outline"
          size={22}
          color={active ? COLORS.primary : COLORS.tabInactive}
        />
      ),
    },
    {
      name: 'Feed',
      label: 'Feed',
      icon: (active) => (
        <MaterialCommunityIcons
          name="card-text-outline"
          size={22}
          color={active ? COLORS.primary : COLORS.tabInactive}
        />
      ),
    },
    {
      name: 'Library',
      label: 'Library',
      icon: (active) => (
        <MaterialCommunityIcons
          name="view-grid-outline"
          size={22}
          color={active ? COLORS.primary : COLORS.tabInactive}
        />
      ),
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            {tab.icon(isActive)}
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? COLORS.primary : COLORS.tabInactive },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});

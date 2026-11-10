import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
  PanResponder,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export type ScreenId =
  | 'Launch'
  | 'LaunchPremium'
  | 'SubscriptionPlans'
  | 'Home'
  | 'SearchAudio'
  | 'SearchResults'
  | 'Feed'
  | 'FeedComments'
  | 'MyLibrary'
  | 'PlaylistDetails'
  | 'ArtistProfile'
  | 'PlayAudio'
  | 'Login'
  | 'SignUp'
  | 'Profile'
  | 'ChartsList'
  | 'AlbumsList'
  | 'ArtistsList'
  | 'SeeAll';

interface ScreenSwitcherProps {
  currentScreen: ScreenId;
  onSelectScreen: (screenId: ScreenId) => void;
}

export const SCREEN_LIST: { id: ScreenId; title: string; category: string }[] = [
  { id: 'Launch', title: '1. Launch Screen', category: 'Onboarding' },
  { id: 'LaunchPremium', title: '2. Launch Screen - Premium', category: 'Onboarding' },
  { id: 'SubscriptionPlans', title: '3. Subscription Plans', category: 'Subscription' },
  { id: 'Home', title: '4. Home - Audio Listing', category: 'Main' },
  { id: 'SearchAudio', title: '5. Search Audio (Suggestions)', category: 'Search' },
  { id: 'SearchResults', title: '6. Audio Listing - Search Results', category: 'Search' },
  { id: 'Feed', title: '7. Feed - Audio Listing', category: 'Feed' },
  { id: 'FeedComments', title: '8. Feed - Comment on an Audio', category: 'Feed' },
  { id: 'MyLibrary', title: '9. My Library', category: 'Library' },
  { id: 'PlaylistDetails', title: '10. Playlist Details - Audio Listing', category: 'Detail' },
  { id: 'ArtistProfile', title: '11. Artist Profile', category: 'Detail' },
  { id: 'PlayAudio', title: '12. Play an Audio', category: 'Player' },
  { id: 'Login', title: '13. Log In', category: 'Account' },
  { id: 'SignUp', title: '14. Sign Up', category: 'Account' },
  { id: 'Profile', title: '15. Profile', category: 'Account' },
];

export const ScreenSwitcher: React.FC<ScreenSwitcherProps> = ({
  currentScreen,
  onSelectScreen,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  const currentItem = SCREEN_LIST.find((s) => s.id === currentScreen);
  const pan = React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

   const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <>
    <Animated.View
        style={[
          styles.floatingContainer,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={16} color="#FFFFFF" />
          <Text style={styles.floatingButtonText}>Screens ({SCREEN_LIST.length})</Text>
        </TouchableOpacity>
  </Animated.View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Sample Screen</Text>
                <Text style={styles.modalSubtitle}>{SCREEN_LIST.length} screens in the app</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={SCREEN_LIST}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.id === currentScreen;
                return (
                  <TouchableOpacity
                    style={[
                      styles.screenItem,
                      isSelected && styles.screenItemSelected,
                    ]}
                    onPress={() => {
                      onSelectScreen(item.id);
                      setModalVisible(false);
                    }}
                  >
                    <View style={styles.itemTextContainer}>
                      <Text
                        style={[
                          styles.itemTitle,
                          isSelected && styles.itemTitleSelected,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={COLORS.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 130, 
    right: 14,
    zIndex: 99999, 
    elevation: 99999,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 74,
    right: 14,
    backgroundColor: 'rgba(17, 18, 22, 0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  screenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: '#FAFAFA',
  },
  screenItemSelected: {
    backgroundColor: '#EDFDFD',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemTitleSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  itemCategory: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { SEARCH_SUGGESTIONS } from '../../src/data/musicData';

interface SearchAudioScreenProps {
  onSelectSuggestion?: (query: string) => void;
  onBack?: () => void;
}

export const SearchAudioScreen: React.FC<SearchAudioScreenProps> = ({
  onSelectSuggestion,
  onBack,
}) => {
  const [query, setQuery] = useState('me');

  const filteredSuggestions = SEARCH_SUGGESTIONS.filter((item) =>
    item.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Top Search Input Row */}
      <View style={styles.header}>
        <View style={styles.searchPill}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            autoFocus={true}
            onSubmitEditing={() => onSelectSuggestion && onSelectSuggestion(query)}
            placeholder="Search..."
            placeholderTextColor={COLORS.textMuted}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={styles.clearButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#111216" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Suggestions List */}
      <FlatList
        data={query.trim() === '' ? SEARCH_SUGGESTIONS : filteredSuggestions}
        keyExtractor={(item, index) => `${item}-${index}`}
        keyboardShouldPersistTaps="handled" 
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.suggestionItem}
            onPress={() => onSelectSuggestion && onSelectSuggestion(item)}
            activeOpacity={0.6}
          >
            <Text style={styles.suggestionText}>{item}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Mock iOS Keyboard display to match sample visual */}
      <View style={styles.mockKeyboard}>
        <View style={styles.keyboardRow}>
          {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((key) => (
            <View key={key} style={styles.key}>
              <Text style={styles.keyText}>{key}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.keyboardRow, { paddingHorizontal: 16 }]}>
          {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map((key) => (
            <View key={key} style={styles.key}>
              <Text style={styles.keyText}>{key}</Text>
            </View>
          ))}
        </View>
        <View style={styles.keyboardRow}>
          <View style={[styles.key, styles.specialKey]}>
            <Ionicons name="arrow-up" size={18} color="#111216" />
          </View>
          {['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((key) => (
            <View key={key} style={styles.key}>
              <Text style={styles.keyText}>{key}</Text>
            </View>
          ))}
          <View style={[styles.key, styles.specialKey]}>
            <Ionicons name="backspace-outline" size={18} color="#111216" />
          </View>
        </View>
        <View style={styles.keyboardRow}>
          <View style={[styles.key, styles.specialKey, { width: 44 }]}>
            <Text style={styles.keyTextSmall}>123</Text>
          </View>
          <View style={[styles.key, styles.specialKey, { width: 44 }]}>
            <Ionicons name="happy-outline" size={20} color="#111216" />
          </View>
          <TouchableOpacity
            style={[styles.key, styles.spaceKey]}
            onPress={() => onSelectSuggestion && onSelectSuggestion(query)}
          >
            <Text style={styles.keyTextSmall}>space</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.key, styles.doneKey]}
             onPress={() => {
            const searchTarget = query.trim() || 'me';
          if (onSelectSuggestion) onSelectSuggestion(searchTarget);
          }}
          >
            <Text style={styles.doneKeyText}>done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 2,
    borderColor: '#10C7D5',
    borderRadius: 22,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111216',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 2,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  suggestionItem: {
    paddingVertical: 14,
  },
  suggestionText: {
    fontSize: 15,
    color: '#374151',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  mockKeyboard: {
    backgroundColor: '#D1D5DB',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 4,
    gap: 8,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  key: {
    backgroundColor: '#FFFFFF',
    height: 42,
    flex: 1,
    maxWidth: 34,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    elevation: 2,
  },
  specialKey: {
    backgroundColor: '#AEB4BD',
    maxWidth: 42,
  },
  spaceKey: {
    flex: 4,
    maxWidth: 180,
  },
  doneKey: {
    flex: 2,
    maxWidth: 86,
    backgroundColor: '#007AFF',
  },
  doneKeyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  keyText: {
    fontSize: 20,
    color: '#111216',
  },
  keyTextSmall: {
    fontSize: 14,
    color: '#111216',
  },
});

import React, { useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import SectionCard from '../components/SectionCard';
import { HomePageProps } from '../types';
import { SECTIONS } from '../data/mockData';

const HomePage: React.FC<HomePageProps> = ({
  onServiceSelect,
  onOpenFilter,
  searchQuery,
  onSearchChange,
  onToggleTheme,
  theme,
  onNavigate,
  user,
  onOpenMainMenu,
}) => {
  const [showSearch, setShowSearch] = useState(false);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return SECTIONS;
    const lowerCaseQuery = searchQuery.toLowerCase();

    return SECTIONS.filter(section => {
      const hasMatchingItem = section.items.some(item =>
        item.label.toLowerCase().includes(lowerCaseQuery)
      );
      return section.title.toLowerCase().includes(lowerCaseQuery) || hasMatchingItem;
    });
  }, [searchQuery]);

  const isDark = theme === 'dark';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionsContainer}>
          {!showSearch ? (
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => setShowSearch(true)}
            >
              <View style={styles.searchIconContainer}>
                <Ionicons name="search" size={16} color="#0369A1" />
              </View>
              <Text style={styles.searchButtonText}>Search profiles...</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.searchBarContainer}>
              <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                onOpenFilter={onOpenFilter}
                onClose={() => setShowSearch(false)}
              />
            </View>
          )}
          {filteredSections.map((section) => (
            <SectionCard
              key={section.key}
              section={section}
              onClick={() => onNavigate('sectionServices', section)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  sectionsContainer: {
    padding: 12,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94A3B8',
    flex: 1,
  },
  searchBarContainer: {
    marginBottom: 8,
  },
});

export default HomePage;

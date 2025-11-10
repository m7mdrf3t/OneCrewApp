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
                <Ionicons name="search" size={16} color="#000" />
              </View>
              <Text style={styles.searchButtonText}>Search</Text>
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
    backgroundColor: '#f4f4f5',
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
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  searchIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#d4d4d8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  searchBarContainer: {
    marginBottom: 8,
  },
});

export default HomePage;

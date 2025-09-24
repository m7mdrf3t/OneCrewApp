import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          onOpenFilter={onOpenFilter}
        />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionsContainer}>
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
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    padding: 12,
  },
  content: {
    flex: 1,
  },
  sectionsContainer: {
    padding: 12,
  },
});

export default HomePage;

/**
 * SearchBar Android Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { searchBarCommonStyles } from './SearchBar.styles.common';

export const searchBarAndroidStyles = StyleSheet.create({
  wrapper: {
    ...searchBarCommonStyles.wrapper,
  } as ViewStyle,
  
  container: {
    ...searchBarCommonStyles.container,
    borderRadius: 8, // Material Design prefers 8px
    borderWidth: 1, // Material Design uses 1px
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 2, // Material elevation
  } as ViewStyle,
  
  searchIcon: {
    ...searchBarCommonStyles.searchIcon,
  } as ViewStyle,
  
  input: {
    ...searchBarCommonStyles.input,
  } as TextStyle,
  
  clearButton: {
    ...searchBarCommonStyles.clearButton,
  } as ViewStyle,
  
  closeButton: {
    ...searchBarCommonStyles.closeButton,
  } as ViewStyle,
  
  filterButton: {
    ...searchBarCommonStyles.filterButton,
    borderRadius: 4, // Material Design prefers 4px
  } as ViewStyle,
  
  filterButtonActive: {
    ...searchBarCommonStyles.filterButtonActive,
  } as ViewStyle,
  
  filterBadge: {
    ...searchBarCommonStyles.filterBadge,
  } as ViewStyle,
  
  filterBadgeText: {
    ...searchBarCommonStyles.filterBadgeText,
  } as TextStyle,
  
  filtersContainer: {
    ...searchBarCommonStyles.filtersContainer,
  } as ViewStyle,
  
  filtersContent: {
    ...searchBarCommonStyles.filtersContent,
  } as ViewStyle,
  
  filterChip: {
    ...searchBarCommonStyles.filterChip,
    borderRadius: 6, // Material Design prefers 6px for chips
  } as ViewStyle,
  
  filterChipText: {
    ...searchBarCommonStyles.filterChipText,
  } as TextStyle,
  
  filterChipClose: {
    ...searchBarCommonStyles.filterChipClose,
  } as ViewStyle,
  
  clearAllButton: {
    ...searchBarCommonStyles.clearAllButton,
  } as ViewStyle,
  
  clearAllText: {
    ...searchBarCommonStyles.clearAllText,
  } as TextStyle,
});


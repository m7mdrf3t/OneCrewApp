/**
 * SearchBar iOS Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { searchBarCommonStyles } from './SearchBar.styles.common';

export const searchBarIosStyles = StyleSheet.create({
  wrapper: {
    ...searchBarCommonStyles.wrapper,
  } as ViewStyle,
  
  container: {
    ...searchBarCommonStyles.container,
    borderRadius: 12, // iOS prefers 12px
    borderWidth: 0.5, // iOS uses thinner borders
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 0, // iOS doesn't use elevation
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
    borderRadius: 8, // iOS prefers more rounded
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
    borderRadius: 10, // iOS prefers more rounded
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


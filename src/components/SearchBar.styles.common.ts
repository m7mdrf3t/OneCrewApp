/**
 * SearchBar Common Styles
 */
import { ViewStyle, TextStyle } from 'react-native';
import { spacing, semanticSpacing } from '../constants/spacing';

export const searchBarCommonStyles = {
  wrapper: {
    marginBottom: semanticSpacing.containerPadding,
  } as ViewStyle,
  
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderRadius: semanticSpacing.borderRadius.lg,
    paddingHorizontal: semanticSpacing.containerPadding,
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  } as ViewStyle,
  
  searchIcon: {
    marginRight: spacing.sm,
  } as ViewStyle,
  
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#000',
    letterSpacing: -0.2,
  } as TextStyle,
  
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  } as ViewStyle,
  
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  } as ViewStyle,
  
  filterButton: {
    position: 'relative' as const,
    padding: spacing.xs,
    marginLeft: spacing.sm,
    borderRadius: semanticSpacing.borderRadius.sm,
  } as ViewStyle,
  
  filterButtonActive: {
    backgroundColor: '#000',
  } as ViewStyle,
  
  filterBadge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 4,
  } as ViewStyle,
  
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  } as TextStyle,
  
  filtersContainer: {
    marginTop: spacing.sm,
    maxHeight: 40,
  } as ViewStyle,
  
  filtersContent: {
    paddingRight: semanticSpacing.containerPadding,
  } as ViewStyle,
  
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f3f4f6',
    borderRadius: semanticSpacing.borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  } as ViewStyle,
  
  filterChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#374151',
    marginRight: spacing.xs,
  } as TextStyle,
  
  filterChipClose: {
    padding: 2,
  } as ViewStyle,
  
  clearAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  clearAllText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#ef4444',
  } as TextStyle,
};


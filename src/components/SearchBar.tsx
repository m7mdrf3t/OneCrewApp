import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBarProps } from '../types';
import { FilterParams } from './FilterModal';
import { spacing, semanticSpacing } from '../constants/spacing';

interface EnhancedSearchBarProps extends SearchBarProps {
  filters?: FilterParams;
  onClearFilters?: () => void;
}

const SearchBar: React.FC<EnhancedSearchBarProps> = ({ 
  value, 
  onChange, 
  onOpenFilter, 
  onClose,
  filters,
  onClearFilters,
}) => {
  const activeFilters = filters ? Object.entries(filters).filter(([_, val]) => {
    if (val === undefined || val === null) return false;
    if (typeof val === 'string' && val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'number' && isNaN(val)) return false;
    return true;
  }) : [];
  const hasActiveFilters = activeFilters.length > 0;

  const getFilterLabel = (key: string, val: any): string => {
    if (Array.isArray(val)) {
      return val.join(', ');
    }
    if (typeof val === 'number') {
      return val.toString();
    }
    if (typeof val === 'string') {
      switch (key) {
        case 'category':
          return val.charAt(0).toUpperCase() + val.slice(1);
        case 'role':
        case 'location':
        case 'gender':
        case 'accent':
        case 'skinTone':
        case 'hairColor':
        case 'currentLocation':
        case 'shootingLocation':
          return val;
        default:
          return val;
      }
    }
    return String(val);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Ionicons name="search" size={18} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="Search..."
          placeholderTextColor="#9ca3af"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
        {onOpenFilter && (
          <TouchableOpacity 
            onPress={onOpenFilter} 
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          >
            <Ionicons 
              name="options" 
              size={20} 
              color={hasActiveFilters ? '#fff' : '#6b7280'} 
            />
            {hasActiveFilters && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilters.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Active Filters */}
      {hasActiveFilters && onClearFilters && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {activeFilters.map(([key, val]) => {
            const filterLabel = getFilterLabel(key, val);
            const displayKey = key === 'category' ? 'Category' 
              : key === 'role' ? 'Role' 
              : key === 'gender' ? 'Gender'
              : key === 'nationalities' ? 'Nationality'
              : key === 'skills' ? 'Skills'
              : key === 'awards' ? 'Awards'
              : key === 'skinTone' ? 'Skin Tone'
              : key === 'hairColor' ? 'Hair Color'
              : key === 'accent' ? 'Accent'
              : key === 'currentLocation' ? 'Current Location'
              : key === 'shootingLocation' ? 'Shooting Location'
              : key === 'minAge' || key === 'maxAge' ? 'Age'
              : key === 'minHeight' || key === 'maxHeight' ? 'Height'
              : key === 'minWeight' || key === 'maxWeight' ? 'Weight'
              : key.charAt(0).toUpperCase() + key.slice(1);
            
            return (
              <View key={key} style={styles.filterChip}>
                <Text style={styles.filterChipText} numberOfLines={1}>
                  {displayKey}: {filterLabel}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    // Individual filter removal will be handled by parent via onClearFilters
                    // For now, clicking X on chip clears all filters
                    if (onClearFilters) {
                      onClearFilters();
                    }
                  }}
                  style={styles.filterChipClose}
                >
                  <Ionicons name="close" size={14} color="#6b7280" />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity onPress={onClearFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: semanticSpacing.containerPadding,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: semanticSpacing.borderRadius.lg,
    paddingHorizontal: semanticSpacing.containerPadding,
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.2,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  filterButton: {
    position: 'relative',
    padding: spacing.xs,
    marginLeft: spacing.sm,
    borderRadius: semanticSpacing.borderRadius.sm,
  },
  filterButtonActive: {
    backgroundColor: '#000',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  filtersContainer: {
    marginTop: spacing.sm,
    maxHeight: 40,
  },
  filtersContent: {
    paddingRight: semanticSpacing.containerPadding,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: semanticSpacing.borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginRight: spacing.xs,
  },
  filterChipClose: {
    padding: 2,
  },
  clearAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
});

export default SearchBar;

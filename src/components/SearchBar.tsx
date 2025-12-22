import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBarProps } from '../types';
import { FilterParams } from './FilterModal';
import { spacing, semanticSpacing } from '../constants/spacing';
import { createPlatformStyles } from '../utils/platformStyles';
import { searchBarCommonStyles } from './SearchBar.styles.common';
import { searchBarIosStyles } from './SearchBar.styles.ios';
import { searchBarAndroidStyles } from './SearchBar.styles.android';

interface EnhancedSearchBarProps extends SearchBarProps {
  filters?: FilterParams;
  onClearFilters?: () => void;
}

const SearchBar: React.FC<EnhancedSearchBarProps> = ({ 
  value = '', 
  onChange, 
  onOpenFilter, 
  onClose,
  filters,
  onClearFilters,
}: EnhancedSearchBarProps) => {
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
        case 'skin_tone':
        case 'hair_color':
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
          value={value || ''}
          onChangeText={(text) => {
            if (typeof onChange === 'function') {
              onChange(text);
            }
          }}
          placeholder="Search..."
          placeholderTextColor="#9ca3af"
        />
        {value && value.length > 0 && (
          <TouchableOpacity 
            onPress={() => {
              if (typeof onChange === 'function') {
                onChange('');
              }
            }} 
            style={styles.clearButton}
          >
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
              : key === 'skin_tone' ? 'Skin Tone'
              : key === 'hair_color' ? 'Hair Color'
              : key === 'accent' ? 'Accent'
              : key === 'currentLocation' ? 'Current Location'
              : key === 'shootingLocation' ? 'Shooting Location'
              : key === 'age_min' || key === 'age_max' ? 'Age'
              : key === 'height_min' || key === 'height_max' ? 'Height'
              : key === 'weight_min' || key === 'weight_max' ? 'Weight'
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

// Create platform-specific styles
const styles = createPlatformStyles({
  common: searchBarCommonStyles,
  ios: searchBarIosStyles,
  android: searchBarAndroidStyles,
});

export default SearchBar;

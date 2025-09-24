import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBarProps } from '../types';

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onOpenFilter }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={16} color="#71717a" style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="Search..."
        placeholderTextColor="#71717a"
      />
      {onOpenFilter && (
        <TouchableOpacity onPress={onOpenFilter} style={styles.filterButton}>
          <Ionicons name="options" size={20} color="#71717a" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  filterButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default SearchBar;

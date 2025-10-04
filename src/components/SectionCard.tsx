import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCardProps } from '../types';

const SECTION_ICONS: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  onehub: 'business',
  talent: 'people',
  individuals: 'people',
  specialized: 'sparkles',
  academy: 'school',
  legal: 'gavel',
  technicians: 'people',
};

const SectionCard: React.FC<SectionCardProps> = ({ section, onClick }) => {
  const iconName = SECTION_ICONS[section.key] || 'sparkles';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onClick}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={20} color="#000" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{section.title}</Text>
        {section.userCount !== undefined && (
          <Text style={styles.userCount}>{section.userCount} members</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#71717a" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconContainer: {
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
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  userCount: {
    fontSize: 14,
    color: '#71717a',
  },
});

export default SectionCard;

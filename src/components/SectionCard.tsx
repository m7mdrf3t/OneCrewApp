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
  custom: 'person-add',
  legal: 'hammer',
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
        <Ionicons name={iconName} size={22} color="#0ea5e9" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{section.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  userCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    letterSpacing: -0.2,
  },
});

export default SectionCard;

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SectionCardProps } from '../types';

const SectionCard: React.FC<SectionCardProps & { featured?: boolean }> = ({ section, onClick }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onClick}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{section.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});

export default SectionCard;

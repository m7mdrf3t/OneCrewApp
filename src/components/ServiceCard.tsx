import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceCardProps } from '../types';

const ITEM_ICONS: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  "Production Houses": 'business',
  "Location": 'location',
  "Casting Studio": 'person-add',
  "Agency": 'business',
  "Creative Director": 'film',
  "Director": 'film',
  "Author": 'create',
  "Writer": 'create',
  "Composer": 'musical-notes',
  "Producer": 'trophy',
  "ACT": 'film',
  "Dance": 'fitness',
  "Music": 'musical-notes',
  "Directing": 'film',
  "Lighting": 'bulb',
  "Photography": 'camera',
  "Cinematography": 'film',
  "Singing": 'mic',
  "Writing": 'create',
  "Workshops": 'school',
  "Post house": 'business',
  "Editor": 'cut',
  "Colorist": 'color-palette',
  "VFX Artist": 'diamond',
  "Sound Designer": 'musical-notes',
  "Ai Technical": 'bulb',
  "Sound Studio": 'business',
  "Sound Engineer": 'mic',
  "Boom Operator": 'mic',
  "Sound Mixer": 'mic',
};

const ServiceCard: React.FC<ServiceCardProps> = ({ item, onSelect }) => {
  const iconName = ITEM_ICONS[item.label] || 'film';
  const profileCount = (item.users !== undefined && item.users !== null) ? item.users.toLocaleString() : '0';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={20} color="#000" />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.userCount}>{profileCount} {profileCount === '1' ? 'profile' : 'profiles'}</Text>
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userCount: {
    fontSize: 14,
    color: '#71717a',
  },
});

export default ServiceCard;

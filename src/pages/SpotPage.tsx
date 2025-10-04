import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { MOCK_SPOT_NEWS } from '../data/mockData';

interface SpotPageProps {
  isDark: boolean;
}

const SpotPage: React.FC<SpotPageProps> = ({ isDark }) => {
  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#0b0b0b' : '#f4f4f5' }]} showsVerticalScrollIndicator={false}>
      <View style={styles.list}>
        {MOCK_SPOT_NEWS.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: isDark ? '#0e1113' : '#fff', shadowColor: isDark ? '#000' : '#000' }]}> 
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.content}> 
              <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>{item.title}</Text>
              <Text style={[styles.summary, { color: isDark ? '#9ca3af' : '#4b5563' }]}>{item.summary}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 20,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default SpotPage;



import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ForwardedLabelProps = {
  color?: string;
};

const ForwardedLabel: React.FC<ForwardedLabelProps> = ({ color = '#6b7280' }) => (
  <View style={styles.forwardedLabelRow}>
    <Ionicons name="arrow-redo" size={12} color={color} />
    <Text style={[styles.forwardedLabelText, { color }]}>Forwarded</Text>
  </View>
);

const styles = StyleSheet.create({
  forwardedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  forwardedLabelText: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
  },
});

export default ForwardedLabel;

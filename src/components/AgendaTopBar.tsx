import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppNavigation } from '../navigation/NavigationContext';

interface AgendaTopBarProps {
  onNavigate?: (page: string) => void;
  showCalendarToggle?: boolean;
  calendarView?: 'week' | 'month';
  setCalendarView?: (view: 'week' | 'month') => void;
  activeTab?: 'wall' | 'allAgenda' | 'sPage';
}

const AgendaTopBar: React.FC<AgendaTopBarProps> = ({
  onNavigate: onNavigateProp,
  showCalendarToggle = false,
  calendarView = 'week',
  setCalendarView,
  activeTab = 'wall',
}) => {
  const { navigateTo } = useAppNavigation();
  // Use prop if provided (for backward compatibility), otherwise use hook
  const onNavigate = onNavigateProp || navigateTo;
  return (
    <View style={styles.container}>
      {showCalendarToggle && setCalendarView && (
        <TouchableOpacity
          onPress={() => setCalendarView(calendarView === 'week' ? 'month' : 'week')}
          style={styles.toggleButton}
        >
          <View style={styles.toggleIndicator} />
        </TouchableOpacity>
      )}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          onPress={() => onNavigate('wall')}
          style={[styles.button, activeTab === 'wall' && styles.buttonActive]}
        >
          <Text style={[styles.buttonText, activeTab === 'wall' && styles.buttonTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onNavigate('allAgenda')}
          style={[styles.button, activeTab === 'allAgenda' && styles.buttonActive]}
        >
          <Text style={[styles.buttonText, activeTab === 'allAgenda' && styles.buttonTextActive]}>
            All Tasks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onNavigate('sPage')}
          style={[styles.button, activeTab === 'sPage' && styles.buttonActive]}
        >
          <Text style={[styles.buttonText, activeTab === 'sPage' && styles.buttonTextActive]}>
            Manage
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  toggleButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#e4e4e7',
    borderRadius: 6,
  },
  buttonActive: {
    backgroundColor: '#d4d4d8',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  buttonTextActive: {
    fontWeight: '700',
  },
});

export default AgendaTopBar;


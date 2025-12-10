import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AgendaTopBar from '../components/AgendaTopBar';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WeeklySchedulePageProps {
  onBack?: () => void;
  onNavigate?: (page: string, data?: any) => void;
}

const daysOfWeek = [
  { key: 'SA', name: 'Saturday' },
  { key: 'SU', name: 'Sunday' },
  { key: 'MO', name: 'Monday' },
  { key: 'TU', name: 'Tuesday' },
  { key: 'WE', name: 'Wednesday' },
  { key: 'TH', name: 'Thursday' },
  { key: 'FR', name: 'Friday' },
];

const BRUSH_TYPES = {
  Work: { color: '#3b82f6', label: 'Work', icon: 'briefcase' },
  Rest: { color: '#22c55e', label: 'Rest', icon: 'leaf' },
  Off: { color: '#a1a1aa', label: 'Off', icon: 'moon' },
};

const WeeklyScheduleManager: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const createDefaultSchedule = () => {
    const schedule: Record<string, string[]> = {};
    daysOfWeek.forEach(day => {
      schedule[day.key] = Array(24).fill('Rest');
    });
    // Set work hours 9am to 5pm (17:00) on weekdays
    ['MO', 'TU', 'WE', 'TH'].forEach(dayKey => {
      for (let i = 9; i < 17; i++) {
        schedule[dayKey][i] = 'Work';
      }
    });
    // Set weekend to Off
    ['SA', 'SU', 'FR'].forEach(dayKey => {
      schedule[dayKey] = Array(24).fill('Off');
    });
    return schedule;
  };

  const [schedule, setSchedule] = useState<Record<string, string[]>>(() => {
    try {
      // Will load from AsyncStorage in useEffect
      return createDefaultSchedule();
    } catch (e) {
      console.error('Failed to load schedule', e);
      return createDefaultSchedule();
    }
  });

  const [selectedBrush, setSelectedBrush] = useState<'Work' | 'Rest' | 'Off'>('Work');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  useEffect(() => {
    saveSchedule();
  }, [schedule]);

  const loadSchedule = async () => {
    try {
      const saved = await AsyncStorage.getItem('oneCrewWeeklySchedule');
      if (saved) {
        setSchedule(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load schedule from AsyncStorage', e);
    }
  };

  const saveSchedule = async () => {
    try {
      await AsyncStorage.setItem('oneCrewWeeklySchedule', JSON.stringify(schedule));
    } catch (e) {
      console.error('Failed to save schedule to AsyncStorage', e);
    }
  };

  const handleCellPress = (dayKey: string, hour: number) => {
    setSchedule(prev => {
      const newDaySchedule = [...prev[dayKey]];
      newDaySchedule[hour] = selectedBrush;
      return { ...prev, [dayKey]: newDaySchedule };
    });
  };

  const handleCellPressIn = (dayKey: string, hour: number) => {
    setIsDragging(true);
    handleCellPress(dayKey, hour);
  };

  const handleCellPressOut = () => {
    setIsDragging(false);
  };

  const handleCellMove = (dayKey: string, hour: number) => {
    if (isDragging) {
      handleCellPress(dayKey, hour);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Weekly Schedule</Text>

      <View style={styles.brushSelector}>
        {Object.entries(BRUSH_TYPES).map(([key, { color, label, icon }]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setSelectedBrush(key as 'Work' | 'Rest' | 'Off')}
            style={[
              styles.brushButton,
              selectedBrush === key && styles.brushButtonActive,
            ]}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={selectedBrush === key ? '#fff' : '#000'}
            />
            <Text
              style={[
                styles.brushButtonText,
                selectedBrush === key && styles.brushButtonTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scheduleContainer}
        onTouchEnd={handleCellPressOut}
      >
        <View style={styles.scheduleContent}>
          {daysOfWeek.map(day => (
            <View key={day.key} style={styles.dayRow}>
              <Text style={styles.dayName}>{day.name}</Text>
              <View style={styles.hoursContainer}>
                {Array.from({ length: 24 }).map((_, hour) => {
                  const cellType = schedule[day.key]?.[hour] || 'Rest';
                  const brushColor = BRUSH_TYPES[cellType as keyof typeof BRUSH_TYPES]?.color || '#a1a1aa';
                  return (
                    <TouchableOpacity
                      key={hour}
                      onPressIn={() => handleCellPressIn(day.key, hour)}
                      onPressOut={handleCellPressOut}
                      onPress={() => handleCellPress(day.key, hour)}
                      style={[
                        styles.hourCell,
                        { backgroundColor: brushColor },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          ))}
          <View style={styles.hourLabels}>
            <View style={styles.dayNameSpacer} />
            <View style={styles.hoursContainer}>
              {Array.from({ length: 24 }).map((_, hour) => (
                <Text
                  key={hour}
                  style={[
                    styles.hourLabel,
                    hour % 2 === 0 ? styles.hourLabelVisible : styles.hourLabelHidden,
                  ]}
                >
                  {hour.toString().padStart(2, '0')}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const WeeklySchedulePage: React.FC<WeeklySchedulePageProps> = ({
  onBack,
  onNavigate,
}) => {
  return (
    <View style={styles.pageContainer}>
      <AgendaTopBar onNavigate={onNavigate || (() => {})} activeTab="sPage" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <WeeklyScheduleManager onNavigate={onNavigate} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  brushSelector: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    gap: 8,
  },
  brushButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
    gap: 6,
  },
  brushButtonActive: {
    backgroundColor: '#000',
  },
  brushButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  brushButtonTextActive: {
    color: '#fff',
  },
  scheduleContainer: {
    marginHorizontal: -12,
  },
  scheduleContent: {
    paddingHorizontal: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  dayName: {
    width: 64,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
  },
  hoursContainer: {
    flexDirection: 'row',
    gap: 1,
    flex: 1,
  },
  hourCell: {
    height: 24,
    minWidth: 12,
    flex: 1,
    borderRadius: 2,
  },
  hourLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  dayNameSpacer: {
    width: 64,
  },
  hourLabel: {
    fontSize: 10,
    color: '#71717a',
    textAlign: 'center',
    flex: 1,
  },
  hourLabelVisible: {
    opacity: 1,
  },
  hourLabelHidden: {
    opacity: 0,
  },
});

export default WeeklySchedulePage;


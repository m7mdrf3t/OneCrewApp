import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerProps {
  value?: string | Date | null; // ISO string, Date object, or null
  onChange: (date: string | null) => void; // Returns ISO date string (YYYY-MM-DD) or null
  placeholder?: string;
  label?: string;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  required?: boolean;
  style?: any;
  labelStyle?: any;
  error?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  mode = 'date',
  minimumDate,
  maximumDate,
  disabled = false,
  required = false,
  style,
  labelStyle,
  error,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // Convert value to Date object
  const getDateValue = (): Date => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getDateValue());

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    
    if (mode === 'time') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (mode === 'datetime') {
      return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    // Date only mode
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date to ISO string (YYYY-MM-DD for date mode, ISO string for datetime)
  const formatDateToISO = (date: Date): string => {
    if (mode === 'date') {
      // Return YYYY-MM-DD format
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    // For time and datetime, return full ISO string
    return date.toISOString();
  };

  const handleDateChange = (event: any, date?: Date) => {
    // On Android, we need to handle the picker dismissal
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && date) {
      setSelectedDate(date);
      
      if (mode === 'date') {
        // For date mode, return YYYY-MM-DD format
        const isoString = formatDateToISO(date);
        onChange(isoString);
      } else {
        // For time and datetime, return ISO string
        onChange(date.toISOString());
      }
    } else if (event.type === 'dismissed') {
      // User cancelled
      setShowPicker(false);
    }
  };

  const handlePress = () => {
    if (!disabled) {
      setSelectedDate(getDateValue());
      setShowPicker(true);
    }
  };

  const displayValue = value ? formatDate(getDateValue()) : '';
  const isEmpty = !value;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.pickerButton,
          disabled && styles.pickerButtonDisabled,
          error && styles.pickerButtonError,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            isEmpty && styles.pickerTextPlaceholder,
          ]}
        >
          {displayValue || placeholder}
        </Text>
        <Ionicons
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
          size={20}
          color={isEmpty ? '#9ca3af' : '#111827'}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* iOS Picker - Shows as modal overlay */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPicker(false)}
          >
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  style={styles.iosPickerButton}
                >
                  <Text style={styles.iosPickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>
                  {mode === 'time' ? 'Select Time' : mode === 'datetime' ? 'Select Date & Time' : 'Select Date'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const isoString = formatDateToISO(selectedDate);
                    onChange(isoString);
                    setShowPicker(false);
                  }}
                  style={styles.iosPickerButton}
                >
                  <Text style={[styles.iosPickerButtonText, styles.iosPickerButtonTextDone]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode={mode}
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.iosPicker}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Android Picker - Shows as native dialog */}
      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode={mode}
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  pickerButtonDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  pickerButtonError: {
    borderColor: '#ef4444',
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  pickerTextPlaceholder: {
    color: '#9ca3af',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  // iOS Picker Styles
  iosPickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  iosPickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  iosPickerButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  iosPickerButtonTextDone: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  iosPicker: {
    height: 200,
  },
});

export default DatePicker;


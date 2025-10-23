import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TaskDetailsFormProps, TaskAssignment, TaskStatus } from '../types';

const { width } = Dimensions.get('window');

const TASK_STATUSES: { label: string; value: TaskStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const TaskDetailsForm: React.FC<TaskDetailsFormProps> = ({
  visible,
  onClose,
  onSubmit,
  assignedUser,
  stage,
}) => {
  const [formData, setFormData] = useState<Partial<TaskAssignment>>({
    taskTitle: '',
    inTime: '',
    outTime: '',
    location: '',
    description: '',
    status: 'pending',
    attendees: [],
  });

  const [showInTimePicker, setShowInTimePicker] = useState(false);
  const [showOutTimePicker, setShowOutTimePicker] = useState(false);
  const [tempInTime, setTempInTime] = useState(new Date());
  const [tempOutTime, setTempOutTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && assignedUser) {
      setFormData({
        userId: assignedUser.id,
        userName: assignedUser.name,
        userRole: assignedUser.specialty || assignedUser.category,
        stageId: stage.id,
        stageName: stage.name,
        taskTitle: '',
        inTime: '',
        outTime: '',
        location: '',
        description: '',
        status: 'pending',
        attendees: [],
      });
    }
  }, [visible, assignedUser, stage]);

  const handleInputChange = (field: keyof TaskAssignment, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttendeeAdd = (attendeeId: string) => {
    if (!formData.attendees?.includes(attendeeId)) {
      setFormData(prev => ({
        ...prev,
        attendees: [...(prev.attendees || []), attendeeId],
      }));
    }
  };

  const handleAttendeeRemove = (attendeeId: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees?.filter(id => id !== attendeeId) || [],
    }));
  };

  const validateForm = () => {
    if (!formData.taskTitle?.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return false;
    }
    if (!formData.inTime) {
      Alert.alert('Error', 'Please select a start time');
      return false;
    }
    if (!formData.outTime) {
      Alert.alert('Error', 'Please select an end time');
      return false;
    }
    if (new Date(formData.inTime) >= new Date(formData.outTime)) {
      Alert.alert('Error', 'End time must be after start time');
      return false;
    }
    if (!formData.location?.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const taskData: Partial<TaskAssignment> = {
        ...formData,
        id: Date.now().toString(), // Generate temporary ID
        createdAt: new Date().toISOString(),
      };
      
      await onSubmit(taskData);
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Schedule Task</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Assigned User Info */}
          {assignedUser && (
            <View style={styles.userInfoCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitials}>
                  {assignedUser.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{assignedUser.name || 'Unknown'}</Text>
                <Text style={styles.userRole}>{assignedUser.specialty || assignedUser.category}</Text>
                <Text style={styles.stageName}>Stage: {stage.name}</Text>
              </View>
            </View>
          )}

          {/* Task Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.taskTitle || ''}
              onChangeText={(value) => handleInputChange('taskTitle', value)}
              placeholder="e.g., Casting Call for Lead Role"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Date & Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date & Time *</Text>
            
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowInTimePicker(true)}
                >
                  <Text style={styles.timeButtonText}>
                    {formData.inTime ? formatTime(new Date(formData.inTime)) : 'Select time'}
                  </Text>
                  <Ionicons name="time" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.timeInput}>
                <Text style={styles.timeLabel}>End Time</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowOutTimePicker(true)}
                >
                  <Text style={styles.timeButtonText}>
                    {formData.outTime ? formatTime(new Date(formData.outTime)) : 'Select time'}
                  </Text>
                  <Ionicons name="time" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            {formData.inTime && (
              <Text style={styles.dateText}>
                {formatDate(new Date(formData.inTime))}
              </Text>
            )}
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.location || ''}
              onChangeText={(value) => handleInputChange('location', value)}
              placeholder="Enter filming location"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description || ''}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Add task details, requirements, or notes..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusGrid}>
              {TASK_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOption,
                    formData.status === status.value && styles.statusOptionSelected,
                  ]}
                  onPress={() => handleInputChange('status', status.value)}
                >
                  <Text style={[
                    styles.statusText,
                    formData.status === status.value && styles.statusTextSelected,
                  ]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Attendees */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Attendees</Text>
            <Text style={styles.attendeesSubtext}>
              Add other team members who should attend this task
            </Text>
            
            {formData.attendees && formData.attendees.length > 0 && (
              <View style={styles.attendeesList}>
                {formData.attendees.map((attendeeId, index) => (
                  <View key={index} style={styles.attendeeChip}>
                    <Text style={styles.attendeeText}>Attendee {index + 1}</Text>
                    <TouchableOpacity
                      onPress={() => handleAttendeeRemove(attendeeId)}
                      style={styles.removeAttendeeButton}
                    >
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            <TouchableOpacity style={styles.addAttendeeButton}>
              <Ionicons name="person-add" size={20} color="#3b82f6" />
              <Text style={styles.addAttendeeText}>Add Attendee</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Creating...' : 'Create Task'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Pickers */}
        {showInTimePicker && (
          <DateTimePicker
            value={tempInTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowInTimePicker(false);
              if (selectedTime) {
                setTempInTime(selectedTime);
                const dateTime = new Date();
                dateTime.setHours(selectedTime.getHours());
                dateTime.setMinutes(selectedTime.getMinutes());
                handleInputChange('inTime', dateTime.toISOString());
              }
            }}
          />
        )}

        {showOutTimePicker && (
          <DateTimePicker
            value={tempOutTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowOutTimePicker(false);
              if (selectedTime) {
                setTempOutTime(selectedTime);
                const dateTime = new Date();
                dateTime.setHours(selectedTime.getHours());
                dateTime.setMinutes(selectedTime.getMinutes());
                handleInputChange('outTime', dateTime.toISOString());
              }
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 2,
  },
  stageName: {
    fontSize: 12,
    color: '#6b7280',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#000',
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  statusOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
  },
  statusTextSelected: {
    color: '#fff',
  },
  attendeesSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  attendeesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  attendeeText: {
    fontSize: 12,
    color: '#3b82f6',
  },
  removeAttendeeButton: {
    padding: 2,
  },
  addAttendeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  addAttendeeText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default TaskDetailsForm;

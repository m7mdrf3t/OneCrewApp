import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  stageName: string;
  onAddTask: (taskData: {
    title: string;
    assignee: string;
    initials: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
  }) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  stageName,
  onAddTask,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    assignee: '',
    initials: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    if (!formData.assignee.trim()) {
      Alert.alert('Error', 'Assignee name is required');
      return;
    }

    setIsLoading(true);
    try {
      // Generate initials from assignee name
      const initials = formData.initials.trim() || 
        formData.assignee
          .split(' ')
          .map(name => name.charAt(0).toUpperCase())
          .join('')
          .substring(0, 2);

      await onAddTask({
        title: formData.title.trim(),
        assignee: formData.assignee.trim(),
        initials,
        description: formData.description.trim(),
        priority: formData.priority,
      });

      // Reset form
      setFormData({
        title: '',
        assignee: '',
        initials: '',
        description: '',
        priority: 'medium',
      });

      onClose();
    } catch (error) {
      console.error('Failed to add task:', error);
      Alert.alert('Error', 'Failed to add task');
    } finally {
      setIsLoading(false);
    }
  };

  const priorityOptions = [
    { id: 'low', name: 'Low', color: '#10b981' },
    { id: 'medium', name: 'Medium', color: '#f59e0b' },
    { id: 'high', name: 'High', color: '#ef4444' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Task to {stageName}</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.saveButton}
            disabled={isLoading}
          >
            <Text style={styles.saveText}>
              {isLoading ? 'Adding...' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Task Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Task Title *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                placeholder="Enter task title"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Assignee */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assignee *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.assignee}
                onChangeText={(text) => handleInputChange('assignee', text)}
                placeholder="Enter assignee name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Initials */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initials (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.initials}
                onChangeText={(text) => handleInputChange('initials', text.toUpperCase())}
                placeholder="e.g., OH"
                placeholderTextColor="#9ca3af"
                maxLength={3}
              />
              <Text style={styles.helperText}>Leave empty to auto-generate from assignee name</Text>
            </View>

            {/* Priority */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityContainer}>
                {priorityOptions.map((priority) => (
                  <TouchableOpacity
                    key={priority.id}
                    style={[
                      styles.priorityOption,
                      formData.priority === priority.id && styles.priorityOptionSelected,
                      { borderColor: priority.color }
                    ]}
                    onPress={() => handleInputChange('priority', priority.id)}
                  >
                    <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
                    <Text
                      style={[
                        styles.priorityOptionText,
                        formData.priority === priority.id && styles.priorityOptionTextSelected,
                      ]}
                    >
                      {priority.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Enter task description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 16,
    paddingTop: 20,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#ef4444',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#f9fafb',
  },
  priorityOptionSelected: {
    backgroundColor: '#f0f9ff',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  priorityOptionTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
});

export default AddTaskModal;

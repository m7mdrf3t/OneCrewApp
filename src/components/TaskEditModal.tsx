import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface TaskEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (updatedTask: any) => void;
  task: any;
  projectId: string;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({
  visible,
  onClose,
  onSave,
  task,
  projectId,
}) => {
  const { updateTask, updateTaskStatus } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '', // UI field - maps to timeline_text in API
    status: 'pending',
  });

  useEffect(() => {
    if (visible && task) {
      setFormData({
        title: task.title || '',
        description: task.timeline_text || task.description || '',
        status: task.status || 'pending',
      });
    }
  }, [visible, task]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare updates - include title, timeline_text (from description field), and status
      const updates: any = {
        title: formData.title.trim(),
      };

      // Map description field to timeline_text (API expects timeline_text, not description)
      if (formData.description.trim() || task.timeline_text || task.description) {
        updates.timeline_text = formData.description.trim();
      }

      // Include status in the update
      updates.status = formData.status;

      // Determine the stage/type based on original task or title
      // If original title was a stage name (e.g., "development", "pre_production"), preserve it as type
      const stageNames = ['development', 'pre_production', 'production', 'post_production', 'distribution'];
      const originalTitle = task.title || '';
      const originalStage = stageNames.find(stage => originalTitle === stage);
      
      // If original title was a stage name, include it in updates to preserve stage categorization
      if (originalStage && !updates.type && !updates.task_type) {
        updates.type = originalStage;
        updates.task_type = originalStage;
      }

      // Call the API to update the task
      const response = await updateTask(task.id, updates);

      if (response.success) {
        // Use the actual updated task from the API response
        const updatedTaskFromApi = response.data || {};
        
        // Merge with existing task to preserve all fields (assignments, members, service, etc.)
        const mergedTask = {
          ...task,
          ...updatedTaskFromApi,
          // Ensure these fields are updated
          title: formData.title.trim(),
          timeline_text: formData.description.trim(),
          status: formData.status,
          // Preserve essential fields that are needed for filtering/display
          id: task.id, // Ensure ID is preserved
          project_id: task.project_id || projectId,
          assignments: updatedTaskFromApi.assignments || task.assignments,
          members: updatedTaskFromApi.members || task.members,
          service: updatedTaskFromApi.service || task.service,
          // Preserve stage/type fields so task doesn't disappear from stage view after title change
          // Use original stage if title was a stage name, otherwise preserve existing type
          type: updatedTaskFromApi.type || task.type || task.task_type || originalStage,
          task_type: updatedTaskFromApi.task_type || task.task_type || task.type || originalStage,
          stage: updatedTaskFromApi.stage || task.stage || originalStage,
          stage_id: updatedTaskFromApi.stage_id || task.stage_id,
          category: updatedTaskFromApi.category || task.category,
        };

        // Ensure description field is set for UI (maps from timeline_text)
        if (mergedTask.timeline_text && !mergedTask.description) {
          mergedTask.description = mergedTask.timeline_text;
        }

        onSave(mergedTask);
        onClose();
      } else {
        throw new Error(response.error || 'Failed to update task');
      }
    } catch (error: any) {
      console.error('Failed to update task:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to update task. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: '#6b7280' },
    { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
    { value: 'completed', label: 'Completed', color: '#10b981' },
    { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Task</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Task Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Task Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Enter task title"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Task Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Enter task description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Status Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusContainer}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.statusOption,
                      formData.status === status.value && styles.statusOptionSelected,
                      { borderColor: status.color }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, status: status.value }))}
                  >
                    <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
                    <Text style={[
                      styles.statusText,
                      formData.status === status.value && styles.statusTextSelected
                    ]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isLoading || !formData.title.trim()}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.saveButtonText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    maxHeight: 400,
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  statusOptionSelected: {
    backgroundColor: '#f3f4f6',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default TaskEditModal;

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CreateTaskModalProps, CreateTaskRequest, TaskStatus } from '../types';

const DEFAULT_STATUS: TaskStatus = 'pending';

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  projectMembers, // currently unused in this lightweight modal (kept for compatibility)
  editingTask,
  projectId, // currently unused in this lightweight modal (kept for compatibility)
}) => {
  const isEditing = Boolean(editingTask);

  const initialFormData = useMemo<CreateTaskRequest>(() => {
    if (editingTask) {
      return {
        title: editingTask.title || '',
        service: (editingTask as any).service || '',
        timeline_text: (editingTask as any).timeline_text || '',
        status: ((editingTask as any).status || DEFAULT_STATUS) as TaskStatus,
        sort_order: (editingTask as any).sort_order,
      };
    }
    return {
      title: '',
      service: '',
      timeline_text: '',
      status: DEFAULT_STATUS,
    };
  }, [editingTask]);

  const [formData, setFormData] = useState<CreateTaskRequest>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setFormData(initialFormData);
      setSubmitting(false);
    }
  }, [visible, initialFormData]);

  const setField = (field: keyof CreateTaskRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        ...formData,
        title: formData.title.trim(),
        service: formData.service?.trim() || undefined,
        timeline_text: formData.timeline_text?.trim() || undefined,
        status: formData.status || DEFAULT_STATUS,
      });
      onClose();
    } catch (e: any) {
      console.error('Failed to submit task:', e);
      Alert.alert('Error', e?.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton} disabled={submitting}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Edit Task' : 'New Task'}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Title *</Text>
          <TextInput
            value={formData.title}
            onChangeText={(v) => setField('title', v)}
            placeholder="Task title"
            style={styles.input}
            editable={!submitting}
          />

          <Text style={styles.label}>Service (optional)</Text>
          <TextInput
            value={formData.service || ''}
            onChangeText={(v) => setField('service', v)}
            placeholder="e.g. Director, Editor, Sound"
            style={styles.input}
            editable={!submitting}
          />

          <Text style={styles.label}>Timeline / Notes (optional)</Text>
          <TextInput
            value={formData.timeline_text || ''}
            onChangeText={(v) => setField('timeline_text', v)}
            placeholder="Add any notes or timeline details"
            style={[styles.input, styles.multiline]}
            editable={!submitting}
            multiline
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            {(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'] as TaskStatus[]).map((s) => {
              const selected = (formData.status || DEFAULT_STATUS) === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusPill, selected && styles.statusPillSelected]}
                  onPress={() => setField('status', s)}
                  disabled={submitting}
                >
                  <Text style={[styles.statusPillText, selected && styles.statusPillTextSelected]}>
                    {s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={submitting}
          >
            <Text style={styles.saveButtonText}>{submitting ? 'Saving...' : 'Save Task'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  statusPillSelected: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  statusPillText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusPillTextSelected: {
    color: '#ffffff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CreateTaskModal;



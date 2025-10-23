import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TaskTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (taskType: string) => void;
}

const TaskTypeModal: React.FC<TaskTypeModalProps> = ({
  visible,
  onClose,
  onSelectType,
}) => {
  const taskTypes = [
    { id: 'development', name: 'Development', icon: 'create' },
    { id: 'pre_production', name: 'Pre-production', icon: 'film' },
    { id: 'production', name: 'Production', icon: 'videocam' },
    { id: 'post_production', name: 'Post-production', icon: 'cut' },
    { id: 'distribution', name: 'Distribution', icon: 'share' },
  ];

  const handleTypeSelect = (taskType: string) => {
    onSelectType(taskType);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Create | Task</Text>
          </View>

          {/* Task Type List */}
          <View style={styles.typeList}>
            {taskTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={styles.typeItem}
                onPress={() => handleTypeSelect(type.id)}
              >
                <Ionicons name={type.icon as any} size={20} color="#000" style={styles.typeIcon} />
                <Text style={styles.typeText}>{type.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ))}
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
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  typeList: {
    paddingVertical: 8,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeIcon: {
    marginRight: 12,
  },
  typeText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
});

export default TaskTypeModal;

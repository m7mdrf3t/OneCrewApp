import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProjectTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (projectType: string) => void;
  currentType?: string;
}

const ProjectTypeModal: React.FC<ProjectTypeModalProps> = ({
  visible,
  onClose,
  onSelectType,
  currentType,
}) => {
  React.useEffect(() => {
    if (visible) {
      console.log('👁️ ProjectTypeModal is now visible, currentType:', currentType);
    }
  }, [visible, currentType]);

  const projectTypes = [
    { id: 'film', name: 'Film', icon: 'film' },
    { id: 'series', name: 'Series', icon: 'tv' },
    { id: 'commercial', name: 'Commercial', icon: 'megaphone' },
    { id: 'music_video', name: 'Music Video', icon: 'musical-notes' },
    { id: 'documentary', name: 'Documentary', icon: 'document-text' },
  ];

  const handleTypeSelect = (projectType: string) => {
    console.log('🎯 ProjectTypeModal: Type selected:', projectType);
    onSelectType(projectType);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <View 
          style={styles.container}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Select Project Type</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Project Type List */}
          <View style={styles.typeList}>
            {projectTypes.map((type) => {
              const isSelected = currentType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeItem,
                    isSelected && styles.typeItemSelected,
                  ]}
                  onPress={() => handleTypeSelect(type.id)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={20} 
                    color={isSelected ? '#fff' : '#000'} 
                    style={styles.typeIcon} 
                  />
                  <Text style={[
                    styles.typeText,
                    isSelected && styles.typeTextSelected,
                  ]}>
                    {type.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
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
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
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
  typeItemSelected: {
    backgroundColor: '#3b82f6',
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
  typeTextSelected: {
    color: '#fff',
  },
});

export default ProjectTypeModal;


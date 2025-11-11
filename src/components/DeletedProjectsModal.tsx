import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface DeletedProjectsModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore?: (projectId: string) => void;
}

const DeletedProjectsModal: React.FC<DeletedProjectsModalProps> = ({
  visible,
  onClose,
  onRestore,
}) => {
  const { api, getAllProjects } = useApi();
  const [deletedProjects, setDeletedProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadDeletedProjects();
    }
  }, [visible]);

  const loadDeletedProjects = async () => {
    try {
      setIsLoading(true);
      const allProjects = await getAllProjects();
      // Filter projects that are soft-deleted (assuming a deleted_at or is_deleted field)
      // For now, we'll use a status or check for deleted projects
      // This might need to be adjusted based on your backend implementation
      const deleted = allProjects.filter((project: any) => project.is_deleted || project.deleted_at);
      setDeletedProjects(deleted);
    } catch (error) {
      console.error('Failed to load deleted projects:', error);
      Alert.alert('Error', 'Failed to load deleted projects.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (project: any) => {
    try {
      // Restore the project by updating is_deleted to false
      await api.updateProject(project.id, { is_deleted: false, deleted_at: null });
      
      // Remove from deleted list
      setDeletedProjects(prev => prev.filter(p => p.id !== project.id));
      
      if (onRestore) {
        onRestore(project.id);
      }
      
      Alert.alert('Success', 'Project restored successfully.');
    } catch (error) {
      console.error('Failed to restore project:', error);
      Alert.alert('Error', 'Failed to restore project. Please try again.');
    }
  };

  const handlePermanentDelete = async (project: any) => {
    Alert.alert(
      'Delete Permanently',
      `Are you sure you want to permanently delete "${project.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProject(project.id);
              setDeletedProjects(prev => prev.filter(p => p.id !== project.id));
              Alert.alert('Success', 'Project permanently deleted.');
            } catch (error) {
              console.error('Failed to permanently delete project:', error);
              Alert.alert('Error', 'Failed to delete project. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>المشاريع المحذوفة</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : deletedProjects.length > 0 ? (
              deletedProjects.map((project) => (
                <View key={project.id} style={styles.projectItem}>
                  <View style={styles.projectIcon}>
                    <Ionicons name="folder" size={24} color="#a855f7" />
                  </View>
                  <Text style={styles.projectName}>{project.title}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.restoreButton}
                      onPress={() => handleRestore(project)}
                    >
                      <Ionicons name="refresh" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handlePermanentDelete(project)}
                    >
                      <Ionicons name="trash" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No deleted projects</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#71717a',
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  projectIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  restoreButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#71717a',
  },
});

export default DeletedProjectsModal;






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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  taskType: string;
  onTaskCreated: (task: any) => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  taskType,
  onTaskCreated,
}) => {
  const { getUsersDirect } = useApi();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<{[role: string]: any[]}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Mock roles for each task type
  const getRolesForTaskType = (type: string) => {
    const roleMap: {[key: string]: string[]} = {
      development: ['Writer', 'Director', 'Producer', 'Script Consultant'],
      pre_production: ['Casting Director', 'Actor', 'Location Scout', 'Production Designer', 'Costume Designer'],
      production: ['Director', 'Cinematographer', 'Actor', 'Sound Engineer', 'Gaffer', 'Grip'],
      post_production: ['Editor', 'Sound Designer', 'Colorist', 'VFX Artist', 'Composer'],
      distribution: ['Marketing Manager', 'Publicist', 'Distributor', 'Film Festival Coordinator'],
    };
    return roleMap[type] || [];
  };

  const availableRoles = getRolesForTaskType(taskType);

  useEffect(() => {
    if (visible) {
      loadUsers();
      // Reset form
      setFormData({ title: '', description: '' });
      setSelectedRoles({});
    }
  }, [visible]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await getUsersDirect();
      console.log('📋 Loaded users:', users);
      
      if (Array.isArray(users) && users.length > 0) {
        setAvailableUsers(users);
      } else {
        // Use mock users as fallback
        console.log('📋 Using mock users as fallback');
        setAvailableUsers([
          { id: '1', name: 'John Smith', specialty: 'Actor', category: 'Actor', skills: ['Acting', 'Dancing'] },
          { id: '2', name: 'Sarah Johnson', specialty: 'Director', category: 'Director', skills: ['Directing', 'Cinematography'] },
          { id: '3', name: 'Mike Wilson', specialty: 'Producer', category: 'Producer', skills: ['Producing', 'Management'] },
          { id: '4', name: 'Emma Davis', specialty: 'Editor', category: 'Editor', skills: ['Editing', 'Post-production'] },
          { id: '5', name: 'Alex Brown', specialty: 'Cinematographer', category: 'Cinematographer', skills: ['Cinematography', 'Lighting'] },
          { id: '6', name: 'Lisa Garcia', specialty: 'Writer', category: 'Writer', skills: ['Screenwriting', 'Script Writing'] },
          { id: '7', name: 'Tom Lee', specialty: 'Sound Engineer', category: 'Sound Engineer', skills: ['Sound Design', 'Audio Engineering'] },
          { id: '8', name: 'Anna White', specialty: 'Costume Designer', category: 'Costume Designer', skills: ['Costume Design', 'Fashion'] },
        ]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // Use mock users as fallback
      setAvailableUsers([
        { id: '1', name: 'John Smith', specialty: 'Actor', category: 'Actor', skills: ['Acting', 'Dancing'] },
        { id: '2', name: 'Sarah Johnson', specialty: 'Director', category: 'Director', skills: ['Directing', 'Cinematography'] },
        { id: '3', name: 'Mike Wilson', specialty: 'Producer', category: 'Producer', skills: ['Producing', 'Management'] },
        { id: '4', name: 'Emma Davis', specialty: 'Editor', category: 'Editor', skills: ['Editing', 'Post-production'] },
        { id: '5', name: 'Alex Brown', specialty: 'Cinematographer', category: 'Cinematographer', skills: ['Cinematography', 'Lighting'] },
        { id: '6', name: 'Lisa Garcia', specialty: 'Writer', category: 'Writer', skills: ['Screenwriting', 'Script Writing'] },
        { id: '7', name: 'Tom Lee', specialty: 'Sound Engineer', category: 'Sound Engineer', skills: ['Sound Design', 'Audio Engineering'] },
        { id: '8', name: 'Anna White', specialty: 'Costume Designer', category: 'Costume Designer', skills: ['Costume Design', 'Fashion'] },
      ]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRoles(prev => ({
      ...prev,
      [role]: prev[role] || []
    }));
  };

  const handleUserSelect = (role: string, user: any) => {
    setSelectedRoles(prev => ({
      ...prev,
      [role]: [...(prev[role] || []), user]
    }));
  };

  const handleRemoveUser = (role: string, userId: string) => {
    setSelectedRoles(prev => ({
      ...prev,
      [role]: (prev[role] || []).filter(user => user.id !== userId)
    }));
  };

  const getUsersForRole = (role: string) => {
    // Ensure availableUsers is an array before filtering
    if (!Array.isArray(availableUsers)) {
      console.warn('availableUsers is not an array:', availableUsers);
      return [];
    }
    
    // Filter users based on their specialty/category matching the role
    return availableUsers.filter(user => 
      user?.specialty?.toLowerCase().includes(role.toLowerCase()) ||
      user?.category?.toLowerCase().includes(role.toLowerCase()) ||
      user?.skills?.some((skill: string) => skill.toLowerCase().includes(role.toLowerCase()))
    );
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    const hasAssignments = Object.values(selectedRoles).some(users => users.length > 0);
    if (!hasAssignments) {
      Alert.alert('Error', 'Please assign at least one role and user');
      return;
    }

    setIsLoading(true);
    try {
      const task = {
        id: Date.now().toString(),
        type: taskType,
        title: formData.title.trim(),
        description: formData.description.trim(),
        roles: selectedRoles,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      onTaskCreated(task);
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      Alert.alert('Error', 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const getTaskTypeName = (type: string) => {
    const typeMap: {[key: string]: string} = {
      development: 'Development',
      pre_production: 'Pre-production',
      production: 'Production',
      post_production: 'Post-production',
      distribution: 'Distribution',
    };
    return typeMap[type] || type;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create {getTaskTypeName(taskType)} Task</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.saveButton}
            disabled={isLoading}
          >
            <Text style={styles.saveText}>
              {isLoading ? 'Creating...' : 'Create'}
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

            {/* Task Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
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

            {/* Role Assignments */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role Assignments *</Text>
              <Text style={styles.helperText}>Select roles and assign users to this task</Text>
              
              {availableRoles.map((role) => (
                <View key={role} style={styles.roleSection}>
                  <TouchableOpacity
                    style={styles.roleHeader}
                    onPress={() => handleRoleSelect(role)}
                  >
                    <Text style={styles.roleTitle}>{role}</Text>
                    <Ionicons 
                      name={selectedRoles[role] ? "chevron-down" : "chevron-forward"} 
                      size={16} 
                      color="#6b7280" 
                    />
                  </TouchableOpacity>

                  {selectedRoles[role] && (
                    <View style={styles.roleContent}>
                      {/* Selected Users */}
                      {selectedRoles[role].map((user) => (
                        <View key={user.id} style={styles.selectedUser}>
                          <View style={styles.userInfo}>
                            <View style={styles.userAvatar}>
                              <Text style={styles.userInitials}>
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                              </Text>
                            </View>
                            <View>
                              <Text style={styles.userName}>{user.name}</Text>
                              <Text style={styles.userSpecialty}>{user.specialty || user.category}</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveUser(role, user.id)}
                            style={styles.removeButton}
                          >
                            <Ionicons name="close" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Available Users */}
                      <View style={styles.availableUsers}>
                        <Text style={styles.availableUsersTitle}>Available Users:</Text>
                        {isLoadingUsers ? (
                          <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#3b82f6" />
                            <Text style={styles.loadingText}>Loading users...</Text>
                          </View>
                        ) : getUsersForRole(role).length > 0 ? (
                          getUsersForRole(role).map((user) => (
                          <TouchableOpacity
                            key={user.id}
                            style={styles.availableUser}
                            onPress={() => handleUserSelect(role, user)}
                            disabled={selectedRoles[role]?.some(u => u.id === user.id)}
                          >
                            <View style={styles.userAvatar}>
                              <Text style={styles.userInitials}>
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                              </Text>
                            </View>
                            <View style={styles.userDetails}>
                              <Text style={styles.userName}>{user.name}</Text>
                              <Text style={styles.userSpecialty}>{user.specialty || user.category}</Text>
                            </View>
                            {selectedRoles[role]?.some(u => u.id === user.id) && (
                              <Ionicons name="checkmark" size={16} color="#10b981" />
                            )}
                          </TouchableOpacity>
                        ))
                        ) : (
                          <Text style={styles.noUsersText}>No users available for this role</Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              ))}
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
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
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
  roleSection: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  roleContent: {
    padding: 16,
  },
  selectedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  userSpecialty: {
    fontSize: 12,
    color: '#6b7280',
  },
  removeButton: {
    padding: 4,
  },
  availableUsers: {
    marginTop: 12,
  },
  availableUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  availableUser: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginBottom: 4,
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  noUsersText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
});

export default CreateTaskModal;
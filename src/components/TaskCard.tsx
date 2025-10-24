import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface TaskCardProps {
  taskType: string;
  projectId: string;
  onTaskCreated: (task: any) => void;
  onCancel: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  task?: any; // For editing existing tasks
  isEditing?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  taskType, 
  projectId, 
  onTaskCreated, 
  onCancel, 
  isExpanded = false, 
  onToggleExpanded,
  task,
  isEditing = false 
}) => {
  const { getUsersDirect, getRoles, getUsersByRole, createTask, assignTaskService } = useApi();
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [currentService, setCurrentService] = useState<any>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [taskStatus, setTaskStatus] = useState('pending');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isExpandedLocal, setIsExpandedLocal] = useState(isExpanded);

  // Load services when component mounts
  useEffect(() => {
    loadServices();
  }, []);

  // Load members when service is selected
  useEffect(() => {
    if (currentService) {
      loadMembers();
    }
  }, [currentService]);

  const loadServices = async () => {
    setIsLoadingServices(true);
    try {
      console.log('🔍 Loading roles for task type:', taskType);
      const response = await getRoles();
      
      if (response.success && response.data) {
        console.log('🔍 All roles from API:', response.data.length);
        console.log('🔍 First few roles:', response.data.slice(0, 3));
        
        // Filter roles based on task type
        const filteredRoles = response.data.filter((role: any) => 
          isServiceRelevantForTaskType(role, taskType)
        );
        console.log('🔍 Filtered roles:', filteredRoles.length);
        setAvailableServices(filteredRoles);
        console.log('✅ Roles loaded:', filteredRoles.length);
      } else {
        // Fallback to mock data
        const mockServices = getMockServicesForTaskType(taskType);
        setAvailableServices(mockServices);
        console.log('📋 Using mock roles as fallback');
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
      // Fallback to mock data
      const mockServices = getMockServicesForTaskType(taskType);
      setAvailableServices(mockServices);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    try {
      console.log('🔍 Loading members for role:', currentService?.name);
      
      if (currentService) {
        // Use the new getUsersByRole endpoint
        const response = await getUsersByRole(currentService.name);
        
        if (response.success && response.data) {
          setAvailableMembers(response.data);
          console.log('✅ Members loaded by role:', response.data.length);
        } else {
          // Fallback to getUsersDirect with filtering
          const users = await getUsersDirect();
          if (Array.isArray(users) && users.length > 0) {
            const filteredUsers = users.filter((user: any) => 
              user.specialty?.toLowerCase().includes(currentService.name.toLowerCase()) ||
              user.category?.toLowerCase().includes(currentService.name.toLowerCase()) ||
              user.skills?.some((skill: string) => 
                skill.toLowerCase().includes(currentService.name.toLowerCase())
              )
            );
            setAvailableMembers(filteredUsers);
            console.log('✅ Members loaded via fallback:', filteredUsers.length);
          } else {
            // Final fallback to mock data
            const mockMembers = getMockMembers().filter(member => 
              member.specialty.toLowerCase().includes(currentService.name.toLowerCase())
            );
            setAvailableMembers(mockMembers);
            console.log('📋 Using mock members as final fallback');
          }
        }
      } else {
        // No service selected, show all users
        const users = await getUsersDirect();
        if (Array.isArray(users) && users.length > 0) {
          setAvailableMembers(users);
          console.log('✅ All members loaded:', users.length);
        } else {
          setAvailableMembers(getMockMembers());
          console.log('📋 Using mock members as fallback');
        }
      }
    } catch (error) {
      console.error('Failed to load members:', error);
      setAvailableMembers(getMockMembers());
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const isServiceRelevantForTaskType = (service: any, taskType: string) => {
    // For now, show all roles for all task types since we have a limited set
    // In the future, we can implement more sophisticated filtering based on role relevance
    console.log(`🔍 Checking role ${service.name} for task type ${taskType}:`, service);
    return true; // Show all roles for now
  };

  const getMockServicesForTaskType = (type: string) => {
    const serviceMap: {[key: string]: any[]} = {
      development: [
        { id: '1', name: 'Writer', category: 'Creative' },
        { id: '2', name: 'Author', category: 'Creative' },
        { id: '3', name: 'Producer', category: 'Production' },
        { id: '4', name: 'Task Admins', category: 'Management' },
      ],
      pre_production: [
        { id: '5', name: 'Director', category: 'Creative' },
        { id: '6', name: 'Casting Director', category: 'Production' },
        { id: '7', name: 'Location Manager', category: 'Production' },
        { id: '8', name: 'Production Designer', category: 'Creative' },
      ],
      production: [
        { id: '9', name: 'Cinematographer', category: 'Technical' },
        { id: '10', name: 'Sound Engineer', category: 'Technical' },
        { id: '11', name: 'Actor', category: 'Talent' },
        { id: '12', name: 'Stunt Coordinator', category: 'Technical' },
      ],
      post_production: [
        { id: '13', name: 'Editor', category: 'Technical' },
        { id: '14', name: 'Colorist', category: 'Technical' },
        { id: '15', name: 'Sound Designer', category: 'Technical' },
        { id: '16', name: 'VFX Artist', category: 'Technical' },
      ],
      distribution: [
        { id: '17', name: 'Marketing Manager', category: 'Marketing' },
        { id: '18', name: 'Distribution Coordinator', category: 'Business' },
        { id: '19', name: 'Publicist', category: 'Marketing' },
      ],
    };
    return serviceMap[type] || [];
  };

  const getMockMembers = () => [
    { id: '1', name: 'Aya Mahmoud', specialty: 'Character Actor', initials: 'AM' },
    { id: '2', name: 'Karim Adel', specialty: 'Voice Actor', initials: 'KA' },
    { id: '3', name: 'Salma Ibrahim', specialty: 'Theater Actress', initials: 'SI' },
    { id: '4', name: 'Omar Hassan', specialty: 'Stunt Coordinator', initials: 'OH' },
    { id: '5', name: 'Layla El-Masry', specialty: 'Creative Director', initials: 'LE' },
    { id: '6', name: 'Ahmed Zaki', specialty: 'Director', initials: 'AZ' },
  ];

  const handleServiceSelect = (service: any) => {
    setCurrentService(service);
    setSelectedService(service);
    setSelectedMembers([]); // Clear selected members when service changes
    setShowServiceModal(false);
  };

  const handleMemberSelect = (member: any) => {
    // Add member to the list if not already added
    if (!selectedMembers.find(m => m.id === member.id)) {
      setSelectedMembers([...selectedMembers, { ...member, service: currentService }]);
    }
    setShowMemberModal(false);
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== memberId));
  };

  const handleStatusSelect = (status: string) => {
    setTaskStatus(status);
    setShowStatusModal(false);
  };

  const handleToggleExpanded = () => {
    const newExpanded = !isExpandedLocal;
    setIsExpandedLocal(newExpanded);
    if (onToggleExpanded) {
      onToggleExpanded();
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      return;
    }

    setIsCreatingTask(true);
    try {
      console.log('🔍 Creating task with data:', {
        projectId,
        title: taskTitle.trim(),
        type: taskType,
        service: selectedService,
        members: selectedMembers,
        status: taskStatus
      });

      // Create the task via API
      // Use the stage name as the task title for categorization
      const stageName = taskType; // taskType is the stage name (e.g., "pre_production", "development")
      const taskData = {
        project_id: projectId,
        title: stageName, // Use stage name as title for categorization
        description: `Task for ${taskType} - ${selectedService?.name || 'No role assigned'}`,
        status: taskStatus as any, // Cast to any to avoid type issues
        priority: 'medium' as any,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      };

      const response = await createTask(projectId, taskData);
      
      if (response.success && response.data) {
        console.log('✅ Task created successfully:', response.data);
        
        // If we have a service and members, assign them to the task
        if (selectedService && selectedMembers.length > 0) {
          try {
            console.log('🔍 Assigning service and members to task:', {
              taskId: response.data.id,
              projectId,
              serviceRole: selectedService.name,
              userId: selectedMembers[0].id,
              selectedMembers: selectedMembers.map(m => ({ id: m.id, name: m.name }))
            });
            
            // Assign service to task
            const assignResponse = await assignTaskService(projectId, response.data.id, {
              service_role: selectedService.name,
              user_id: selectedMembers[0].id // Assign first member as primary
            });
            
            console.log('✅ Service assignment response:', assignResponse);
            console.log('✅ Service and members assigned successfully');
          } catch (assignError) {
            console.error('❌ Failed to assign service/members:', assignError);
            console.error('❌ Assign error details:', {
              error: assignError,
              taskId: response.data.id,
              projectId,
              serviceRole: selectedService.name,
              userId: selectedMembers[0].id
            });
            // Continue anyway - task is created
          }
        } else {
          console.log('⚠️ No service or members to assign:', {
            hasService: !!selectedService,
            hasMembers: selectedMembers.length > 0,
            selectedService: selectedService?.name,
            selectedMembers: selectedMembers.map(m => ({ id: m.id, name: m.name }))
          });
        }
        
        // Create the local task object for UI
        const newTask = {
          id: response.data.id || Date.now().toString(),
          type: taskType, // Keep type for backward compatibility
          title: stageName, // Use stage name as title for categorization
          service: selectedService,
          members: selectedMembers,
          status: taskStatus,
          createdAt: new Date().toISOString(),
          ...response.data
        };

        onTaskCreated(newTask);
      } else {
        console.error('❌ Failed to create task:', response.error);
        // Still call onTaskCreated for local state, but log the error
        const newTask = {
          id: Date.now().toString(),
          type: taskType,
          title: taskTitle.trim(),
          service: selectedService,
          members: selectedMembers,
          status: taskStatus,
          createdAt: new Date().toISOString(),
        };
        onTaskCreated(newTask);
      }
    } catch (error) {
      console.error('❌ Error creating task:', error);
      // Still call onTaskCreated for local state, but log the error
      const newTask = {
        id: Date.now().toString(),
        type: taskType,
        title: taskTitle.trim(),
        service: selectedService,
        members: selectedMembers,
        status: taskStatus,
        createdAt: new Date().toISOString(),
      };
      onTaskCreated(newTask);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const filteredServices = availableServices.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMembers = availableMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={styles.taskCard}>
      {/* Task Header - Always visible */}
      <TouchableOpacity 
        style={styles.taskHeader}
        onPress={handleToggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeaderLeft}>
          <Ionicons name="create" size={20} color="#fff" />
          <Text style={styles.taskTypeText}>
            Create Task for {taskType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
        <View style={styles.taskHeaderRight}>
          <TouchableOpacity 
            style={styles.statusBadge}
            onPress={(e) => {
              e.stopPropagation();
              setShowStatusModal(true);
            }}
          >
            <Text style={styles.statusText}>{taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1)}</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" style={styles.statusIcon} />
          </TouchableOpacity>
          <Ionicons 
            name={isExpandedLocal ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#fff" 
            style={styles.expandIcon} 
          />
        </View>
      </TouchableOpacity>

      {/* Expandable Content */}
      {isExpandedLocal && (
        <View style={styles.expandableContent}>

      {/* Task Title Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.titleInput}
          value={taskTitle}
          onChangeText={setTaskTitle}
          placeholder="Enter task description..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Service Assignment */}
      <TouchableOpacity
        style={styles.assignmentField}
        onPress={() => setShowServiceModal(true)}
      >
        <Ionicons name="briefcase" size={20} color="#000" />
        <Text style={styles.assignmentText}>
          {currentService ? currentService.name : 'Assign Role'}
        </Text>
        <Ionicons name="create" size={16} color="#000" />
      </TouchableOpacity>

      {/* Member Assignment */}
      <TouchableOpacity
        style={[styles.assignmentField, !currentService && styles.assignmentFieldDisabled]}
        onPress={() => currentService && setShowMemberModal(true)}
        disabled={!currentService}
      >
        <Ionicons name="person-add" size={20} color={currentService ? "#000" : "#9ca3af"} />
        <Text style={[styles.assignmentText, !currentService && styles.assignmentTextDisabled]}>
          {!currentService ? 'Select Role First' : 'Add Member'}
        </Text>
        {isLoadingMembers && (
          <ActivityIndicator size="small" color="#3b82f6" />
        )}
      </TouchableOpacity>

      {/* Selected Members List */}
      {selectedMembers.length > 0 && (
        <View style={styles.membersList}>
          {selectedMembers.map((member, index) => (
            <View key={member.id} style={styles.memberItem}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.service?.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeMemberButton}
                onPress={() => handleRemoveMember(member.id)}
              >
                <Ionicons name="close" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Requirements Helper Text */}
      {(!taskTitle.trim() || !currentService || selectedMembers.length === 0) && (
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsText}>
            Required: {!taskTitle.trim() && 'Task title, '}
            {!currentService && 'Role, '}
            {selectedMembers.length === 0 && 'At least one user'}
          </Text>
        </View>
      )}

      {/* Add More Button */}
      <TouchableOpacity 
        style={styles.addMoreButton}
        onPress={() => {
          // Reset selections to allow adding more roles/users
          setCurrentService(null);
          setSelectedService(null);
          setSelectedMembers([]);
          setTaskTitle('');
        }}
      >
        <Ionicons name="add" size={24} color="#000" />
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createButton, (!taskTitle.trim() || !currentService || selectedMembers.length === 0 || isCreatingTask) && styles.createButtonDisabled]}
          onPress={handleCreateTask}
          disabled={!taskTitle.trim() || !currentService || selectedMembers.length === 0 || isCreatingTask}
        >
          {isCreatingTask ? (
            <View style={styles.createButtonLoading}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.createButtonText}>Creating...</Text>
            </View>
          ) : (
            <Text style={[styles.createButtonText, (!taskTitle.trim() || !currentService || selectedMembers.length === 0) && styles.createButtonTextDisabled]}>Create Task</Text>
          )}
        </TouchableOpacity>
      </View>
        </View>
      )}

      {/* Service Selection Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            <ScrollView style={styles.serviceList}>
              {isLoadingServices ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading roles...</Text>
                </View>
              ) : (
                filteredServices.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={styles.serviceItem}
                    onPress={() => handleServiceSelect(service)}
                  >
                    <Text style={styles.serviceName}>{service.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Member Selection Modal */}
      <Modal
        visible={showMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select from My Team</Text>
              <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            <ScrollView style={styles.memberList}>
              {isLoadingMembers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading members...</Text>
                </View>
              ) : (
                filteredMembers.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.memberItem}
                    onPress={() => handleMemberSelect(member)}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberInitials}>{member.initials}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberSpecialty}>{member.specialty}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusItem, taskStatus === status && styles.statusItemSelected]}
                  onPress={() => handleStatusSelect(status)}
                >
                  <Text style={[styles.statusItemText, taskStatus === status && styles.statusItemTextSelected]}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </Text>
                  {taskStatus === status && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  taskHeader: {
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTypeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  taskHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusIcon: {
    marginLeft: 4,
  },
  headerIcon: {
    marginHorizontal: 8,
  },
  inputContainer: {
    padding: 16,
  },
  titleInput: {
    fontSize: 16,
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  assignmentField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  assignmentText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  assignmentFieldDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  assignmentTextDisabled: {
    color: '#9ca3af',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  addMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
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
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButtonTextDisabled: {
    color: '#9ca3af',
  },
  createButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementsContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  requirementsText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalContent: {
    maxHeight: 400,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
  serviceList: {
    maxHeight: 300,
  },
  memberList: {
    maxHeight: 300,
  },
  serviceItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberSpecialty: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
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
  // Members list styles
  membersList: {
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  memberRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  removeMemberButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#fef2f2',
  },
  // Status modal styles
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  statusItemText: {
    fontSize: 16,
    color: '#000',
  },
  statusItemTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  expandableContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  taskTitlePreview: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  expandIcon: {
    marginLeft: 8,
  },
});

export default TaskCard;
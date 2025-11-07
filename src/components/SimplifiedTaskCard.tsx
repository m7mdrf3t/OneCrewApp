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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import DatePicker from './DatePicker';

interface SimplifiedTaskCardProps {
  projectId: string;
  onTaskCreated: (task: any) => void;
  onDelete?: (taskId: string) => void;
  existingTask?: any; // For editing existing tasks
  isNewTask?: boolean; // Whether this is a new task being created
}

interface Assignment {
  id: string;
  service: any;
  user: any;
}

const SimplifiedTaskCard: React.FC<SimplifiedTaskCardProps> = ({
  projectId,
  onTaskCreated,
  onDelete,
  existingTask,
  isNewTask = false,
}) => {
  const { getRoles, getUsersByRole, createTask, assignTaskService, deleteTaskAssignment, updateTask, deleteTask } = useApi();
  
  const taskTypes = [
    { id: 'development', name: 'Development', icon: 'create' },
    { id: 'pre_production', name: 'Pre-production', icon: 'film' },
    { id: 'production', name: 'Production', icon: 'videocam' },
    { id: 'post_production', name: 'Post-production', icon: 'cut' },
    { id: 'distribution', name: 'Distribution', icon: 'share' },
  ];
  
  // Helper function to get task type from existing task
  const getTaskTypeFromTask = (task: any): string | null => {
    if (!task) return null;
    
    // Try direct type fields
    if (task.type) return task.type;
    if (task.task_type) return task.task_type;
    
    // Try to infer from title
    if (task.title) {
      const titleLower = task.title.toLowerCase().trim();
      const titleMatch = taskTypes.find(t => 
        t.name.toLowerCase() === titleLower ||
        t.id === titleLower.replace(/\s+/g, '_') ||
        t.id === titleLower
      );
      if (titleMatch) {
        console.log('📝 Inferred task type from title:', titleMatch.id, 'from title:', task.title);
        return titleMatch.id;
      }
    }
    
    return null;
  };
  
  // Initialize taskType from existingTask or maintain it
  const [taskType, setTaskType] = useState<string | null>(() => {
    const type = getTaskTypeFromTask(existingTask);
    console.log('📝 Initializing taskType:', type, 'from existingTask:', existingTask?.id);
    return type;
  });
  
  // Update taskType if existingTask changes and has a type
  useEffect(() => {
    if (existingTask) {
      const inferredType = getTaskTypeFromTask(existingTask);
      if (inferredType && inferredType !== taskType) {
        console.log('📝 Updating taskType from existingTask:', inferredType);
        setTaskType(inferredType);
      }
    }
  }, [existingTask?.id, existingTask?.type, existingTask?.task_type, existingTask?.title]);
  
  const [taskStatus, setTaskStatus] = useState<string>(existingTask?.status || 'pending');
  
  // Initialize task name and dates from existing task
  useEffect(() => {
    if (existingTask) {
      if (existingTask.title && !taskName) {
        setTaskName(existingTask.title);
      }
      if (existingTask.start_date) {
        const startDate = new Date(existingTask.start_date);
        setTaskStartDate(startDate.toISOString().split('T')[0]);
      }
      if (existingTask.due_date) {
        const dueDate = new Date(existingTask.due_date);
        setTaskEndDate(dueDate.toISOString().split('T')[0]);
      }
    }
  }, [existingTask?.id]);
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    if (existingTask?.assignments) {
      return existingTask.assignments.map((assignment: any) => ({
        id: assignment.id || Date.now().toString(),
        service: assignment.service || { name: assignment.service_role || 'Unknown' },
        user: assignment.user || { id: assignment.user_id, name: assignment.user?.name || 'Unknown' },
      }));
    }
    return [];
  });
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showEditTimingModal, setShowEditTimingModal] = useState(false);
  const [taskName, setTaskName] = useState<string>(existingTask?.title || existingTask?.description || '');
  const [taskStartDate, setTaskStartDate] = useState<string>('');
  const [taskEndDate, setTaskEndDate] = useState<string>('');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [savedTaskId, setSavedTaskId] = useState<string | null>(existingTask?.id || null);
  const [isExpanded, setIsExpanded] = useState(true); // Card is expanded by default

  useEffect(() => {
    if (taskType) {
      loadServices();
    }
  }, [taskType]);

  // Reload services when service modal opens
  useEffect(() => {
    if (showServiceModal && taskType) {
      // Always reload services when modal opens to ensure fresh data
      console.log('🔄 Service modal opened, reloading services...');
      loadServices();
    }
  }, [showServiceModal]);

  useEffect(() => {
    if (selectedService) {
      loadUsers();
    }
  }, [selectedService]);

  const loadServices = async (taskTypeToUse?: string | null) => {
    // Use provided taskType or fall back to state
    const typeToUse = taskTypeToUse || taskType;
    
    if (!typeToUse) {
      console.warn('Cannot load services: no task type selected');
      console.warn('   taskType state:', taskType);
      console.warn('   taskTypeToUse param:', taskTypeToUse);
      console.warn('   existingTask:', existingTask?.id);
      return;
    }
    
    setIsLoadingServices(true);
    try {
      console.log('Loading services for task type:', typeToUse);
      const response = await getRoles();
      if (response.success && response.data) {
        console.log('Services loaded from API:', response.data.length);
        setAvailableServices(response.data);
      } else {
        // Fallback to mock services
        console.log('Using mock services as fallback');
        const mockServices = getMockServicesForTaskType(typeToUse);
        setAvailableServices(mockServices);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      // Fallback to mock services
      const mockServices = getMockServicesForTaskType(typeToUse);
      setAvailableServices(mockServices);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const loadUsers = async () => {
    if (!selectedService) return;
    
    setIsLoadingUsers(true);
    try {
      const response = await getUsersByRole(selectedService.name);
      if (response.success && response.data) {
        setAvailableUsers(response.data);
      } else {
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setAvailableUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const getMockServicesForTaskType = (type: string) => {
    const serviceMap: {[key: string]: any[]} = {
      development: [
        { id: '1', name: 'Writer', category: 'Creative' },
        { id: '2', name: 'Director', category: 'Creative' },
        { id: '3', name: 'Producer', category: 'Production' },
      ],
      pre_production: [
        { id: '4', name: 'Casting Director', category: 'Production' },
        { id: '5', name: 'Location Manager', category: 'Production' },
        { id: '6', name: 'Production Designer', category: 'Creative' },
      ],
      production: [
        { id: '7', name: 'Cinematographer', category: 'Technical' },
        { id: '8', name: 'Sound Engineer', category: 'Technical' },
        { id: '9', name: 'Actor', category: 'Talent' },
      ],
      post_production: [
        { id: '10', name: 'Editor', category: 'Technical' },
        { id: '11', name: 'Colorist', category: 'Technical' },
        { id: '12', name: 'Sound Designer', category: 'Technical' },
      ],
      distribution: [
        { id: '13', name: 'Marketing Manager', category: 'Marketing' },
        { id: '14', name: 'Distribution Coordinator', category: 'Business' },
        { id: '15', name: 'Publicist', category: 'Marketing' },
      ],
    };
    return serviceMap[type] || [];
  };

  const handleTypeSelect = (type: string) => {
    console.log('📝 Task type selected:', type);
    setTaskType(type);
    setShowTypeModal(false);
    // Load services immediately when type is selected
    if (type) {
      loadServices();
    }
  };

  const handleServiceSelect = (service: any) => {
    setSelectedService(service);
    setShowServiceModal(false);
    setShowUserModal(true);
  };

  const handleUserSelect = async (user: any) => {
    const newAssignment: Assignment = {
      id: Date.now().toString(),
      service: selectedService,
      user: user,
    };
    const updatedAssignments = [...assignments, newAssignment];
    setAssignments(updatedAssignments);
    setSelectedService(null);
    setShowUserModal(false);
    
    // Auto-save when assignment is added
    await autoSaveTask(updatedAssignments);
  };

  const handleEditAssignment = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setSelectedService(assignment.service);
      setEditingAssignmentId(assignmentId);
      setShowServiceModal(true);
    }
  };

  const handleUpdateAssignment = (service: any, user: any) => {
    if (editingAssignmentId) {
      setAssignments(assignments.map(a => 
        a.id === editingAssignmentId 
          ? { ...a, service, user }
          : a
      ));
      setEditingAssignmentId(null);
    }
    setSelectedService(null);
    setShowServiceModal(false);
    setShowUserModal(false);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const taskId = savedTaskId || existingTask?.id;
    if (!taskId) {
      // If task doesn't exist yet, just remove from UI
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      return;
    }

    // Find the assignment to get its details
    const assignmentToRemove = assignments.find(a => a.id === assignmentId);
    if (!assignmentToRemove) {
      console.error('Assignment not found:', assignmentId);
      return;
    }

    try {
      // Check if this is a real assignment (has an ID from backend) or just a local one
      // If it's a local assignment (created but not saved), we can just remove it from UI
      // But if it has been saved to backend, we need to delete it
      
      // Check if this assignment has a backend ID (from task_assignments table)
      // The assignment object might have an 'id' field that's the actual database ID
      // We need to check if the assignment was loaded from backend or created locally
      
      // Check if assignmentId is a UUID (backend ID) or a timestamp string (local ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentId);
      const isLocalId = /^\d+$/.test(assignmentId); // Local IDs are usually timestamps (numbers)
      
      // Also check if assignment has a backend ID property
      const backendAssignmentId = assignmentToRemove.id && 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentToRemove.id)
        ? assignmentToRemove.id
        : null;
      
      // Use backend ID if available, otherwise use the assignmentId parameter
      const idToDelete = backendAssignmentId || (isUUID ? assignmentId : null);
      
      if (idToDelete) {
        // This is a backend assignment, delete it
        await deleteTaskAssignment(projectId, taskId, idToDelete);
        console.log('✅ Assignment deleted from backend:', idToDelete);
      } else {
        // This is a local assignment, just remove from UI
        console.log('📝 Removing local assignment (not saved to backend yet):', assignmentId);
      }
      
      // Remove from UI regardless
      const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
      setAssignments(updatedAssignments);
      
      // Update the task with the new assignments list
      if (existingTask || savedTaskId) {
        const updatedTask = {
          ...existingTask,
          id: taskId,
          type: taskType || existingTask?.type || existingTask?.task_type,
          task_type: taskType || existingTask?.task_type || existingTask?.type,
          assignments: updatedAssignments,
        };
        onTaskCreated(updatedTask);
      }
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      Alert.alert('Error', 'Failed to remove assignment. Please try again.');
    }
  };

  const handleStatusSelect = async (status: string) => {
    setTaskStatus(status);
    setShowStatusModal(false);
    
    // Auto-save status change
    if (existingTask || savedTaskId) {
      await saveStatusChange(status);
    }
  };

  const saveStatusChange = async (newStatus: string) => {
    const taskId = savedTaskId || existingTask?.id;
    if (!taskId) return;

    try {
      setIsCreating(true);
      const response = await updateTask(taskId, {
        status: newStatus as any,
      });
      
      if (response.success && response.data) {
        // Preserve all existing task data and merge with the update
        const updatedTask = {
          ...existingTask, // Preserve all existing fields
          ...response.data, // Override with API response
          id: taskId, // Ensure ID is preserved
          type: taskType || existingTask?.type || existingTask?.task_type,
          task_type: taskType || existingTask?.task_type || existingTask?.type,
          assignments: assignments || existingTask?.assignments || [],
          status: newStatus, // Ensure status is updated
        };
        console.log('✅ Saving updated task status:', updatedTask);
        onTaskCreated(updatedTask);
      }
    } catch (error) {
      console.error('Failed to save status change:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditName = () => {
    setShowEditMenu(false);
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    const taskId = savedTaskId || existingTask?.id;
    if (!taskId || !taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }

    try {
      setIsCreating(true);
      const response = await updateTask(taskId, {
        title: taskName.trim(),
        description: taskName.trim(),
      });
      
      if (response.success && response.data) {
        // Preserve all existing task data and merge with the update
        const updatedTask = {
          ...existingTask, // Preserve all existing fields
          ...response.data, // Override with API response
          id: taskId, // Ensure ID is preserved
          type: taskType || existingTask?.type || existingTask?.task_type,
          task_type: taskType || existingTask?.task_type || existingTask?.type,
          assignments: assignments || existingTask?.assignments || [],
          title: taskName.trim(), // Ensure title is updated
        };
        console.log('📝 Saving updated task name:', updatedTask);
        onTaskCreated(updatedTask);
        setShowEditNameModal(false);
      }
    } catch (error) {
      console.error('Failed to save name:', error);
      Alert.alert('Error', 'Failed to save task name');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTiming = () => {
    setShowEditMenu(false);
    setShowEditTimingModal(true);
  };

  const handleSaveTiming = async () => {
    const taskId = savedTaskId || existingTask?.id;
    if (!taskId) return;

    try {
      setIsCreating(true);
      const updates: any = {};
      
      if (taskStartDate) {
        updates.start_date = new Date(taskStartDate).toISOString();
      }
      if (taskEndDate) {
        updates.due_date = new Date(taskEndDate).toISOString();
      }
      
      const response = await updateTask(taskId, updates);
      
      if (response.success && response.data) {
        // Preserve all existing task data and merge with the update
        const updatedTask = {
          ...existingTask, // Preserve all existing fields
          ...response.data, // Override with API response
          id: taskId, // Ensure ID is preserved
          type: taskType || existingTask?.type || existingTask?.task_type,
          task_type: taskType || existingTask?.task_type || existingTask?.type,
          assignments: assignments || existingTask?.assignments || [],
        };
        console.log('📅 Saving updated task timing:', updatedTask);
        onTaskCreated(updatedTask);
        setShowEditTimingModal(false);
      }
    } catch (error) {
      console.error('Failed to save timing:', error);
      Alert.alert('Error', 'Failed to save task timing');
    } finally {
      setIsCreating(false);
    }
  };

  const autoSaveTask = async (assignmentsToSave: Assignment[]) => {
    if (!taskType) {
      return; // Don't save if no type selected yet
    }

    setIsCreating(true);
    try {
      const taskData = {
        project_id: projectId,
        title: taskTypes.find(t => t.id === taskType)?.name || taskType,
        description: `${taskType} task`,
        status: taskStatus as any,
        type: taskType,
        priority: 'medium' as any,
      };

      let currentTaskId = savedTaskId || existingTask?.id;

      if (currentTaskId) {
        // Task already exists, just add new assignments
        // Get current assignments to see what's new
        const currentAssignmentIds = (existingTask?.assignments || []).map((a: any) => a.id);
        const newAssignments = assignmentsToSave.filter(a => !currentAssignmentIds.includes(a.id));
        
        // Add new assignments
        for (const assignment of newAssignments) {
          try {
            await assignTaskService(projectId, currentTaskId, {
              service_role: assignment.service.name,
              user_id: assignment.user.id,
            });
          } catch (error) {
            console.error('Failed to assign service:', error);
          }
        }
        
        // Update task with latest data - ensure type is preserved
        const updatedTask = {
          id: currentTaskId,
          ...existingTask,
          type: taskType, // Ensure type is preserved
          task_type: taskType, // Also set task_type for compatibility
          assignments: assignmentsToSave,
        };
        onTaskCreated(updatedTask);
      } else {
        // Create new task if it doesn't exist yet
        const response = await createTask(projectId, taskData);
        if (response.success && response.data) {
          const newTaskId = response.data.id;
          setSavedTaskId(newTaskId);
          
          // Assign all services and users
          for (const assignment of assignmentsToSave) {
            try {
              await assignTaskService(projectId, newTaskId, {
                service_role: assignment.service.name,
                user_id: assignment.user.id,
              });
            } catch (error) {
              console.error('Failed to assign service:', error);
            }
          }
          
          // Refresh task to get assignments - ensure type is preserved
          const updatedTask = {
            ...response.data,
            type: taskType, // Ensure type is preserved
            task_type: taskType, // Also set task_type for compatibility
            assignments: assignmentsToSave,
          };
          onTaskCreated(updatedTask);
        }
      }
    } catch (error) {
      console.error('Failed to auto-save task:', error);
      // Don't show alert for auto-save, just log
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTask = () => {
    if (!existingTask) return;
    
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(existingTask.id);
              if (onDelete) {
                onDelete(existingTask.id);
              }
            } catch (error) {
              console.error('Failed to delete task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const getTaskTypeName = (type: string | null) => {
    if (!type) return 'Create Task';
    return taskTypes.find(t => t.id === type)?.name || type;
  };

  const getTaskTypeIcon = (type: string | null) => {
    if (!type) return 'add';
    return taskTypes.find(t => t.id === type)?.icon || 'create';
  };

  const filteredServices = availableServices.filter(service =>
    service.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(user =>
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If no task type selected and no existing task, show as button
  if (!taskType && !existingTask) {
    return (
      <>
        <TouchableOpacity
          style={styles.taskButton}
          onPress={() => setShowTypeModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.taskButtonText}>Create Task</Text>
        </TouchableOpacity>

        {/* Task Type Selection Modal */}
        <Modal
          visible={showTypeModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowTypeModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowTypeModal(false)}
          >
            <View style={styles.typeModalContainer}>
              <View style={styles.typeModalContent}>
                <Text style={styles.typeModalTitle}>Create Task</Text>
                {taskTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={styles.typeOption}
                    onPress={() => handleTypeSelect(type.id)}
                  >
                    <Ionicons name={type.icon as any} size={20} color="#000" />
                    <Text style={styles.typeOptionText}>{type.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  // Show as card when type is selected
  return (
    <View style={styles.taskCard}>
      {/* Header - Clickable to expand/collapse */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeaderLeft}>
          <Ionicons name={getTaskTypeIcon(taskType) as any} size={20} color="#fff" />
          <Text style={styles.cardHeaderText}>{getTaskTypeName(taskType)}</Text>
          {assignments.length > 0 && (
            <Text style={styles.assignmentCount}>({assignments.length})</Text>
          )}
        </View>
        <View style={styles.cardHeaderRight}>
          <TouchableOpacity
            style={styles.statusBadge}
            onPress={(e) => {
              e.stopPropagation(); // Prevent card toggle when clicking status
              setShowStatusModal(true);
            }}
          >
            <Text style={styles.statusBadgeText}>{taskStatus.charAt(0).toUpperCase() + taskStatus.slice(1)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent card toggle when clicking expand
              setIsExpanded(!isExpanded);
            }}
          >
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
          {(existingTask || savedTaskId) && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent card toggle when clicking menu
                setShowEditMenu(true);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Assignments List - Only show when expanded */}
      {isExpanded && (
        <View style={styles.assignmentsContainer}>
          {assignments.map((assignment) => (
            <View key={assignment.id} style={styles.assignmentRow}>
              <View style={styles.assignmentLeft}>
                <Ionicons name="briefcase" size={16} color="#000" />
                <Text style={styles.assignmentText}>{assignment.service?.name}</Text>
              </View>
              <View style={styles.assignmentRight}>
                <View style={styles.userBadge}>
                  <Text style={styles.userInitials}>
                    {(assignment.user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userName}>{assignment.user?.name || 'Unknown'}</Text>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditAssignment(assignment.id)}
                >
                  <Ionicons name="create" size={14} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveAssignment(assignment.id)}
                >
                  <Ionicons name="close" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add Service Button - Only show when expanded */}
          <TouchableOpacity
            style={styles.addServiceButton}
            onPress={async () => {
            console.log('➕ Add service button pressed');
            console.log('   Current taskType state:', taskType);
            console.log('   Existing task:', existingTask?.id);
            console.log('   Existing task type:', existingTask?.type, existingTask?.task_type);
            console.log('   Existing task title:', existingTask?.title);
            
            // Try to recover taskType if it's null
            let currentTaskType = taskType;
            if (!currentTaskType && existingTask) {
              currentTaskType = getTaskTypeFromTask(existingTask);
              if (currentTaskType) {
                console.log('   Recovered taskType from existingTask:', currentTaskType);
                setTaskType(currentTaskType);
              }
            }
            
            console.log('   Final taskType to use:', currentTaskType);
            console.log('   Current availableServices count:', availableServices.length);
            
            setSelectedService(null);
            setSearchTerm(''); // Clear search term
            
            // Always reload services when opening modal
            if (currentTaskType) {
              console.log('   Loading services before opening modal with type:', currentTaskType);
              try {
                await loadServices(currentTaskType); // Pass the recovered type
                console.log('   Services loaded, opening modal...');
                setShowServiceModal(true);
              } catch (error) {
                console.error('   Error loading services:', error);
                // Still open modal even if load fails
                setShowServiceModal(true);
              }
            } else {
              console.warn('   No task type available, cannot load services');
              Alert.alert(
                'Task Type Required',
                'Please select a task type first before adding services.',
                [{ text: 'OK' }]
              );
            }
          }}
          >
            <Ionicons name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      )}

      {/* Loading indicator when auto-saving */}
      {isCreating && (
        <View style={styles.autoSaveIndicator}>
          <ActivityIndicator size="small" color="#3b82f6" />
          <Text style={styles.autoSaveText}>Saving...</Text>
        </View>
      )}

      {/* Service Selection Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowServiceModal(false);
          setSearchTerm(''); // Clear search when closing
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service</Text>
              <TouchableOpacity onPress={() => {
                setShowServiceModal(false);
                setSearchTerm(''); // Clear search when closing
              }}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search services..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            <ScrollView style={styles.modalContent}>
              {isLoadingServices ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading services...</Text>
                </View>
              ) : filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={styles.modalItem}
                    onPress={() => handleServiceSelect(service)}
                  >
                    <Text style={styles.modalItemText}>{service.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No services available</Text>
                  {taskType && (
                    <Text style={styles.emptySubtext}>
                      Try refreshing or check if task type "{taskTypes.find(t => t.id === taskType)?.name}" has available services
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* User Selection Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select User</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search users..."
                placeholderTextColor="#9ca3af"
              />
            </View>
            <ScrollView style={styles.modalContent}>
              {isLoadingUsers ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                filteredUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.modalItem}
                    onPress={() => {
                      if (editingAssignmentId) {
                        handleUpdateAssignment(selectedService, user);
                      } else {
                        handleUserSelect(user);
                      }
                    }}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(user.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.modalItemText}>{user.name || 'Unknown'}</Text>
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
        transparent
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
                  style={[styles.modalItem, taskStatus === status && styles.modalItemSelected]}
                  onPress={() => handleStatusSelect(status)}
                >
                  <Text style={[styles.modalItemText, taskStatus === status && styles.modalItemTextSelected]}>
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

      {/* Edit Menu Modal */}
      <Modal
        visible={showEditMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowEditMenu(false)}
        >
          <View style={styles.editMenuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditName}
            >
              <Ionicons name="create" size={20} color="#000" />
              <Text style={styles.menuItemText}>Edit Name</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditTiming}
            >
              <Ionicons name="calendar" size={20} color="#000" />
              <Text style={styles.menuItemText}>Edit Timing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDelete]}
              onPress={() => {
                setShowEditMenu(false);
                handleDeleteTask();
              }}
            >
              <Ionicons name="trash" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.menuItemTextDelete]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Task Name</Text>
              <TouchableOpacity onPress={() => setShowEditNameModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Task Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={taskName}
                  onChangeText={setTaskName}
                  placeholder="Enter task name"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <TouchableOpacity
                style={[styles.saveButton, !taskName.trim() && styles.saveButtonDisabled]}
                onPress={handleSaveName}
                disabled={!taskName.trim() || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Timing Modal */}
      <Modal
        visible={showEditTimingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditTimingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Timing</Text>
              <TouchableOpacity onPress={() => setShowEditTimingModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <DatePicker
                  label="Start Date"
                  value={taskStartDate || null}
                  onChange={(date) => setTaskStartDate(date || '')}
                  placeholder="Select start date"
                  mode="date"
                  style={styles.datePicker}
                />
              </View>
              <View style={styles.inputGroup}>
                <DatePicker
                  label="End Date / Due Date"
                  value={taskEndDate || null}
                  onChange={(date) => setTaskEndDate(date || '')}
                  placeholder="Select end date"
                  mode="date"
                  minimumDate={taskStartDate ? new Date(taskStartDate) : undefined}
                  style={styles.datePicker}
                />
              </View>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveTiming}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dc2626',
    marginBottom: 16,
  },
  taskButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  taskCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  assignmentCount: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
    marginLeft: 8,
  },
  expandButton: {
    padding: 4,
    marginLeft: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 4,
  },
  assignmentsContainer: {
    padding: 16,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  assignmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assignmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  assignmentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    color: '#000',
    marginLeft: 4,
  },
  editButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  addServiceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  autoSaveText: {
    color: '#3b82f6',
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeModalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  typeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  typeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  typeOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
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
  modalContent: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#000',
  },
  modalItemTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  editMenuContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemDelete: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  menuItemTextDelete: {
    color: '#ef4444',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  datePicker: {
    marginBottom: 0,
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
});

export default SimplifiedTaskCard;


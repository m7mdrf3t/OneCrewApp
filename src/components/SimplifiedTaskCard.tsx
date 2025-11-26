import React, { useState, useEffect, useRef } from 'react';
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
import { Swipeable } from 'react-native-gesture-handler';
import { useApi } from '../contexts/ApiContext';
import DatePicker from './DatePicker';

interface SimplifiedTaskCardProps {
  projectId: string;
  project?: any; // Project object to check ownership
  onTaskCreated: (task: any) => void;
  onDelete?: (taskId: string) => void;
  onCancel?: () => void; // For canceling new task creation
  existingTask?: any; // For editing existing tasks
  isNewTask?: boolean; // Whether this is a new task being created
  selectedUser?: any; // User to automatically add to a task
}

interface Assignment {
  id: string;
  service: any;
  user: any;
  status?: 'pending' | 'accepted' | 'rejected';
}

const SimplifiedTaskCard: React.FC<SimplifiedTaskCardProps> = ({
  projectId,
  project,
  onTaskCreated,
  onDelete,
  onCancel,
  existingTask,
  isNewTask = false,
  selectedUser,
}) => {
  console.log('📋 SimplifiedTaskCard initialized:', {
    isNewTask,
    hasSelectedUser: !!selectedUser,
    selectedUser: selectedUser ? { id: selectedUser.id, name: selectedUser.name } : null,
    existingTaskId: existingTask?.id
  });
  
  const { user, getRoles, getUsersByRole, createTask, assignTaskService, deleteTaskAssignment, updateTaskAssignmentStatus, updateTask, deleteTask, getProjectTasks, getProjectById, getTaskAssignments } = useApi();
  
  // Check if current user is project owner
  const isProjectOwner = project?.created_by === user?.id;
  
  // Check if user is assigned to an assignment
  const isAssignedUser = (assignment: Assignment) => {
    return assignment.user?.id === user?.id || (assignment as any).user_id === user?.id;
  };
  
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
      const initialAssignments = existingTask.assignments.map((assignment: any) => {
        const status = assignment.status || 'pending';
        console.log(`📋 Initial state: Assignment ${assignment.id}: status="${status}" (from assignment.status="${assignment.status}")`);
        return {
          id: assignment.id || Date.now().toString(),
          service: assignment.service || { name: assignment.service_role || 'Unknown' },
          user: assignment.user || { id: assignment.user_id, name: assignment.user?.name || 'Unknown' },
          status: status, // CRITICAL: Preserve status from existingTask
        };
      });
      console.log('📋 Initial assignments state:', initialAssignments.map((a: Assignment) => ({ id: a.id, status: a.status })));
      return initialAssignments;
    }
    return [];
  });

  // Sync assignments when existingTask changes (e.g., after refresh from backend)
  useEffect(() => {
    console.log('🔄 useEffect triggered for assignment sync:', {
      taskId: existingTask?.id,
      hasAssignments: !!existingTask?.assignments,
      assignmentCount: existingTask?.assignments?.length || 0,
      rawAssignments: existingTask?.assignments?.map((a: any) => ({
        id: a.id,
        status: a.status || 'MISSING',
        service_role: a.service_role,
        user_id: a.user_id
      }))
    });

    if (existingTask?.assignments) {
      const syncedAssignments = existingTask.assignments.map((assignment: any) => {
        const status = assignment.status || 'pending';
        console.log(`📋 Extracting assignment ${assignment.id}: status="${status}" (from assignment.status="${assignment.status}")`);
        return {
          id: assignment.id || Date.now().toString(),
          service: assignment.service || { name: assignment.service_role || 'Unknown' },
          user: assignment.user || { id: assignment.user_id, name: assignment.user?.name || 'Unknown' },
          status: status, // CRITICAL: Preserve status from backend
        };
      });
      
      // Check if assignments have changed (by comparing IDs and statuses)
      const currentIds = assignments.map((a: Assignment) => a.id).sort().join(',');
      const newIds = syncedAssignments.map((a: Assignment) => a.id).sort().join(',');
      
      // Also check if statuses have changed for existing assignments
      const statusChanged = assignments.some((current: Assignment) => {
        const synced = syncedAssignments.find((s: Assignment) => s.id === current.id);
        return synced && synced.status !== current.status;
      });
      
      console.log('🔄 Assignment sync comparison:', {
        currentCount: assignments.length,
        newCount: syncedAssignments.length,
        currentIds,
        newIds,
        statusChanged,
        currentStatuses: assignments.map((a: Assignment) => `${a.id}:${a.status}`),
        newStatuses: syncedAssignments.map((a: Assignment) => `${a.id}:${a.status}`)
      });
      
      if (currentIds !== newIds || statusChanged) {
        console.log('✅ Syncing assignments from existingTask - UPDATING STATE');
        setAssignments(syncedAssignments);
      } else {
        console.log('⏭️ Skipping sync - no changes detected');
      }
    } else if (existingTask && assignments.length > 0) {
      // If existingTask has no assignments but we have local ones, clear them
      console.log('🔄 Clearing assignments - existingTask has none');
      setAssignments([]);
    }
  }, [existingTask?.id, existingTask?.assignments?.length, existingTask?.assignments?.map((a: any) => `${a.id}:${a.status || 'pending'}`).join(',') || '']);
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
  
  // Store selectedUser in state to persist it (from homepage shortcut)
  const [preSelectedUser, setPreSelectedUser] = useState<any>(selectedUser);
  // Also use a ref to persist across re-renders
  const preSelectedUserRef = useRef<any>(selectedUser);
  
  // Update preSelectedUser when selectedUser prop changes
  useEffect(() => {
    if (selectedUser) {
      console.log('👤 Received selectedUser prop:', selectedUser);
      console.log('👤 Setting preSelectedUser state:', { id: selectedUser.id, name: selectedUser.name });
      setPreSelectedUser(selectedUser);
      preSelectedUserRef.current = selectedUser; // Also update ref
    } else {
      console.log('👤 selectedUser prop is null/undefined, clearing preSelectedUser');
      setPreSelectedUser(null);
      preSelectedUserRef.current = null;
    }
  }, [selectedUser]);
  
  // Log preSelectedUser state whenever it changes
  useEffect(() => {
    console.log('👤 preSelectedUser state updated:', preSelectedUser ? { id: preSelectedUser.id, name: preSelectedUser.name } : null);
  }, [preSelectedUser]);
  const [isExpanded, setIsExpanded] = useState(true); // Card is expanded by default
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

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

  const handleServiceSelect = async (service: any) => {
    console.log('🔍 handleServiceSelect called with service:', service?.name);
    
    // Close service modal first
    setSelectedService(service);
    setShowServiceModal(false);
    
    // Check for pre-selected user using all available sources
    const userToAutoSelect = preSelectedUser || preSelectedUserRef.current || selectedUser;
    
    console.log('🔍 User check:', {
      hasPreSelectedUser: !!preSelectedUser,
      hasPreSelectedUserRef: !!preSelectedUserRef.current,
      hasSelectedUserProp: !!selectedUser,
      userToAutoSelect: userToAutoSelect ? { id: userToAutoSelect.id, name: userToAutoSelect.name } : null
    });
    
    if (userToAutoSelect) {
      console.log('✅ Direct assignment: Pre-selected user found, assigning immediately');
      // Modern approach: Direct assignment without showing modal
      // Pass service directly to avoid state timing issues
      try {
        await handleUserSelect(userToAutoSelect, service);
        // Show brief success feedback (optional - can be removed if too intrusive)
        // The UI update from handleUserSelect is sufficient feedback
      } catch (error) {
        console.error('❌ Direct assignment failed:', error);
        // If direct assignment fails, fall back to showing user modal
        setShowUserModal(true);
      }
    } else {
      console.log('👤 No pre-selected user, showing user selection modal');
      // No pre-selected user, show user selection modal
      setShowUserModal(true);
    }
  };

  const handleUserSelect = async (userToAssign: any, serviceOverride?: any) => {
    // Use serviceOverride if provided (for direct assignment), otherwise use selectedService state
    const serviceToUse = serviceOverride || selectedService;
    
    if (!serviceToUse) {
      console.error('❌ No service available for assignment');
      Alert.alert('Error', 'Please select a service first.');
      return;
    }
    // First, create the assignment via API to get the UUID immediately
    const taskId = savedTaskId || existingTask?.id;
    
    // Check if user is already assigned to this task with this service role
    const isAlreadyAssigned = assignments.some(a => 
      (a.user?.id === userToAssign.id || (a as any).user_id === userToAssign.id) &&
      (a.service?.name === serviceToUse?.name || (a as any).service_role === serviceToUse?.name)
    );
    
    if (isAlreadyAssigned) {
      Alert.alert(
        'Already Assigned',
        'This user is already assigned to this task with this service role.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (taskId) {
      // Task exists, create assignment immediately
      try {
        // Also check backend to make sure assignment doesn't exist there
        try {
          const allTasks = await getProjectTasks(projectId);
          const task = allTasks.find((t: any) => t.id === taskId);
          
          if (task?.assignments) {
            const backendAssignment = task.assignments.find((a: any) => {
              const userIdMatches = 
                a.user_id === userToAssign.id || 
                a.user?.id === userToAssign.id;
              const serviceRoleMatches = 
                a.service_role === serviceToUse?.name ||
                a.service_role?.toLowerCase() === serviceToUse?.name?.toLowerCase();
              return userIdMatches && serviceRoleMatches;
            });
            
              if (backendAssignment) {
                // Assignment exists in backend but not in UI - sync it
                console.log('⚠️ Assignment exists in backend but not in UI, syncing...', backendAssignment);
                const backendAssignmentAny = backendAssignment as any;
                const syncedAssignment: Assignment = {
                  id: backendAssignmentAny.id,
                  service: backendAssignmentAny.service || { name: backendAssignmentAny.service_role || 'Unknown' },
                  user: backendAssignmentAny.user || { id: backendAssignmentAny.user_id, name: backendAssignmentAny.user?.name || 'Unknown' },
                  status: backendAssignmentAny.status || 'pending',
                };
              setAssignments([...assignments, syncedAssignment]);
              
              if (existingTask) {
                const updatedTask = {
                  ...existingTask,
                  assignments: [...assignments, syncedAssignment],
                };
                onTaskCreated(updatedTask);
              }
              
              setSelectedService(null);
              setShowUserModal(false);
              Alert.alert(
                'Already Assigned',
                'This user is already assigned to this task. The assignment has been synced.',
                [{ text: 'OK' }]
              );
              return;
            }
          }
        } catch (checkError) {
          console.warn('⚠️ Could not check backend for existing assignments:', checkError);
          // Continue with assignment creation
        }
        
        const response = await assignTaskService(projectId, taskId, {
          service_role: serviceToUse?.name,
          user_id: userToAssign.id,
        });
        
        console.log('📋 assignTaskService response:', JSON.stringify(response, null, 2));
        
        // Get UUID from response (following the guide)
        // Response can be: array, single object, or {success: true, data: ...}
        let assignmentId: string;
        let assignmentStatus: 'pending' | 'accepted' | 'rejected' = 'pending';
        
        if (Array.isArray(response) && response.length > 0) {
          // Response is an array
          assignmentId = response[0].id; // UUID from API
          assignmentStatus = response[0].status || 'pending';
        } else if (response && typeof response === 'object' && 'id' in response) {
          // Response is a single assignment object
          assignmentId = response.id;
          assignmentStatus = response.status || 'pending';
        } else if (response?.data) {
          // Response has data property
          if (Array.isArray(response.data) && response.data.length > 0) {
            assignmentId = response.data[0].id;
            assignmentStatus = response.data[0].status || 'pending';
          } else if (response.data && typeof response.data === 'object' && 'id' in response.data) {
            assignmentId = response.data.id;
            assignmentStatus = response.data.status || 'pending';
          } else {
            console.error('❌ Unexpected response.data format:', response.data);
            throw new Error('Invalid response format from assignTaskService');
          }
        } else {
          console.error('❌ Unexpected response format:', response);
          // Don't throw error - assignment might have succeeded on backend
          // Instead, try to fetch the assignment from the task
          console.log('⚠️ Could not parse response, but assignment may have succeeded. Fetching task to verify...');
          
          // Fetch the task to get the newly created assignment
          try {
            const allTasks = await getProjectTasks(projectId);
            const task = allTasks.find((t: any) => t.id === taskId);
            if (task?.assignments) {
              const newAssignment = task.assignments.find((a: any) => 
                a.user_id === userToAssign.id && 
                a.service_role === serviceToUse?.name
              );
              if (newAssignment?.id) {
                assignmentId = newAssignment.id;
                assignmentStatus = newAssignment.status || 'pending';
                console.log('✅ Found assignment in task:', assignmentId);
              } else {
                throw new Error('Assignment created but could not find it in task');
              }
            } else {
              throw new Error('Could not fetch task to verify assignment');
            }
          } catch (fetchError: any) {
            console.error('❌ Failed to fetch task to verify assignment:', fetchError);
            // Still throw the original error
            throw new Error('Invalid response from assignTaskService and could not verify assignment');
          }
        }
        
        // Create assignment with UUID from API
    const newAssignment: Assignment = {
          id: assignmentId, // Use UUID from API, not timestamp!
      service: serviceToUse,
          user: userToAssign,
          status: assignmentStatus,
    };
        
    const updatedAssignments = [...assignments, newAssignment];
    setAssignments(updatedAssignments);
    setSelectedService(null);
    setShowUserModal(false);
    
    // Clear pre-selected user after successful assignment (so it doesn't auto-select again)
    if (preSelectedUser && (userToAssign?.id === preSelectedUser.id || userToAssign === preSelectedUser)) {
      console.log('✅ Clearing pre-selected user after successful assignment');
      setPreSelectedUser(null);
    }
    
        // Update task with new assignment (ensure status is included)
        if (existingTask) {
          const updatedTask = {
            ...existingTask,
            assignments: updatedAssignments.map((a: Assignment) => ({
              id: a.id,
              service: a.service,
              user: a.user,
              status: a.status || 'pending', // Ensure status is always included
            })),
          };
          onTaskCreated(updatedTask);
        }
      } catch (error: any) {
        console.error('❌ Failed to create assignment:', error);
        Alert.alert(
          'Error',
          `Failed to assign user: ${error.message || 'Unknown error'}. Please try again.`
        );
      }
    } else {
      // Task doesn't exist yet, use temporary ID (will be updated when task is created)
      const newAssignment: Assignment = {
        id: `temp-${Date.now()}`, // Temporary ID, will be replaced when task is created
        service: serviceToUse,
        user: userToAssign,
        status: 'pending', // New assignments start as pending
      };
      const updatedAssignments = [...assignments, newAssignment];
      setAssignments(updatedAssignments);
      setSelectedService(null);
      setShowUserModal(false);
      
      // Clear pre-selected user after successful assignment (so it doesn't auto-select again)
      if (preSelectedUser && (userToAssign?.id === preSelectedUser.id || userToAssign === preSelectedUser)) {
        console.log('✅ Clearing pre-selected user after successful assignment (new task)');
        setPreSelectedUser(null);
      }
      
      // Auto-save when assignment is added (will create task and then assignment)
    await autoSaveTask(updatedAssignments);
    }
  };

  const handleEditAssignment = (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (assignment) {
      // Check if assignment is accepted - don't allow editing accepted assignments
      if (assignment.status === 'accepted') {
        Alert.alert(
          'Cannot Edit',
          'Accepted assignments cannot be edited. Please remove the assignment and create a new one if needed.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setSelectedService(assignment.service);
      setEditingAssignmentId(assignmentId);
      setShowServiceModal(true);
    }
  };

  const handleUpdateAssignment = async (service: any, user: any) => {
    if (!editingAssignmentId) {
      setSelectedService(null);
      setShowServiceModal(false);
      setShowUserModal(false);
      return;
    }

    const taskId = savedTaskId || existingTask?.id;
    const assignmentToUpdate = assignments.find(a => a.id === editingAssignmentId);
    
    if (!assignmentToUpdate) {
      console.error('Assignment to update not found:', editingAssignmentId);
      setEditingAssignmentId(null);
      setSelectedService(null);
      setShowServiceModal(false);
      setShowUserModal(false);
      return;
    }

    try {
      // Check if assignment has a backend ID (UUID format)
      // Check both the editingAssignmentId and the actual assignment object's ID
      const assignmentIdToCheck = assignmentToUpdate.id || editingAssignmentId;
      const isBackendAssignment = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentIdToCheck);
      const isTimestampId = /^\d+$/.test(assignmentIdToCheck); // Timestamp IDs are numeric strings
      
      // Only try to delete if it's a valid backend UUID (not a timestamp)
      if (isBackendAssignment && !isTimestampId && taskId) {
        // Delete the old assignment from backend
        try {
          await deleteTaskAssignment(projectId, taskId, assignmentIdToCheck);
          console.log('✅ Old assignment deleted from backend:', assignmentIdToCheck);
        } catch (error: any) {
          console.error('⚠️ Failed to delete old assignment (may not exist in backend):', error.message || error);
          // Continue anyway - we'll create the new one
          // This is fine if the assignment was never saved to backend
        }
      } else if (isTimestampId) {
        console.log('📝 Assignment has timestamp ID, skipping delete (was never saved to backend):', assignmentIdToCheck);
      }

      // Create new assignment with updated user/service
      const newAssignment: Assignment = {
        id: Date.now().toString(), // New temporary ID
        service: service,
        user: user,
        status: 'pending', // New assignment starts as pending
      };

      // Update local state - replace old assignment with new one
      const updatedAssignments = assignments.map(a => 
        a.id === editingAssignmentId 
          ? newAssignment
          : a
      );
      setAssignments(updatedAssignments);
      setEditingAssignmentId(null);
      setSelectedService(null);
      setShowServiceModal(false);
      setShowUserModal(false);

      // Save the new assignment to backend if task exists
      if (taskId) {
        try {
          if (!service?.name || !user?.id) {
            throw new Error('Service and user are required');
          }
          
          const response = await assignTaskService(projectId, taskId, {
            service_role: service.name,
            user_id: user.id,
          });
          
          // Update the assignment with the backend ID and status from response
          if (response && Array.isArray(response) && response.length > 0) {
            const createdAssignment = response[0];
            const finalAssignments = updatedAssignments.map(a => 
              a.id === newAssignment.id 
                ? { ...a, id: createdAssignment.id || newAssignment.id, status: createdAssignment.status || 'pending' }
                : a
            );
            setAssignments(finalAssignments);
            
            // Update task with final assignments
            if (existingTask) {
              const updatedTask = {
                ...existingTask,
                id: taskId,
                type: taskType || existingTask?.type || existingTask?.task_type,
                task_type: taskType || existingTask?.task_type || existingTask?.type,
                assignments: finalAssignments,
              };
              onTaskCreated(updatedTask);
            }
          }
        } catch (error: any) {
          console.error('❌ Failed to create new assignment:', {
            error: error.message || error,
            service: service?.name,
            userId: user?.id
          });
          Alert.alert(
            'Update Failed',
            `Failed to update assignment. ${error.message || 'Please try again.'}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        // Task doesn't exist yet, just update local state
        // It will be saved when task is created
        if (existingTask) {
          const updatedTask = {
            ...existingTask,
            assignments: updatedAssignments.map((a: Assignment) => ({
              id: a.id,
              service: a.service,
              user: a.user,
              status: a.status || 'pending', // Ensure status is included
            })),
          };
          onTaskCreated(updatedTask);
        }
      }
    } catch (error) {
      console.error('Failed to update assignment:', error);
      Alert.alert('Error', 'Failed to update assignment. Please try again.');
      setEditingAssignmentId(null);
    setSelectedService(null);
    setShowServiceModal(false);
    setShowUserModal(false);
    }
  };

  // Helper function to check if ID is a valid UUID v4 (per guide)
  const isUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Helper function to check if ID is a timestamp (local ID)
  const isTimestamp = (id: string): boolean => {
    return /^\d+$/.test(id) && id.length >= 10;
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const taskId = savedTaskId || existingTask?.id;

    // Find the assignment to get its details
    const assignmentToRemove = assignments.find(a => a.id === assignmentId);
    if (!assignmentToRemove) {
      console.error('❌ Assignment not found:', assignmentId);
      Alert.alert('Error', 'Assignment not found');
      return;
    }

    // Show confirmation for accepted assignments (per guide)
    if (assignmentToRemove.status === 'accepted') {
      const userName = assignmentToRemove.user?.name || 'this user';
      Alert.alert(
        'Remove Assignment',
        `Are you sure you want to remove ${userName} from this task?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => performRemoveAssignment(assignmentId, taskId, assignmentToRemove)
          }
        ]
      );
      return;
    }

    // For pending/rejected assignments, proceed without confirmation
    await performRemoveAssignment(assignmentId, taskId, assignmentToRemove);
  };

  const performRemoveAssignment = async (
    assignmentId: string,
    taskId: string | null,
    assignmentToRemove: Assignment
  ) => {
    if (!taskId) {
      // If task doesn't exist yet, just remove from UI (optimistic update)
      console.log('📝 Task not saved yet, removing assignment from UI only:', assignmentId);
      const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
      setAssignments(updatedAssignments);
      
      // Update task if it exists locally
      if (existingTask) {
        const updatedTask = {
          ...existingTask,
          assignments: updatedAssignments,
        };
        onTaskCreated(updatedTask);
      }
      return;
    }

    console.log('🗑️ Attempting to remove assignment:', {
      assignmentId,
      assignment: assignmentToRemove,
      taskId,
      projectId
    });

    // Store original assignments for potential revert
    const originalAssignments = [...assignments];

    try {
      // Optimistic update - remove from UI immediately (per guide)
      const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
      setAssignments(updatedAssignments);
      
      // Check if assignmentId is a valid UUID v4 (per guide)
      if (!isUUID(assignmentId)) {
        // This is a local/timestamp ID - just remove from local state (per guide)
        if (isTimestamp(assignmentId)) {
          console.log('📝 Removing local assignment (timestamp ID):', assignmentId);
        } else {
          console.warn('⚠️ Assignment ID is not a UUID, removing from local state only:', assignmentId);
        }
        
        // Update task with optimistic update
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
        return;
      }

      // Valid UUID - remove from backend (per guide)
      console.log('🗑️ Deleting assignment from backend (UUID):', assignmentId);
      try {
        await deleteTaskAssignment(projectId, taskId, assignmentId);
        console.log('✅ Assignment successfully deleted from backend:', assignmentId);
        
        // Refresh task data from backend to ensure UI is in sync (per guide)
        try {
          console.log('🔄 Refreshing task data from backend after deletion...');
          const allTasks = await getProjectTasks(projectId);
          const refreshedTask = allTasks.find((t: any) => t.id === taskId);
          
          if (refreshedTask) {
            // Map refreshed assignments properly
            const refreshedAssignments = (refreshedTask.assignments || []).map((assignment: any) => ({
              id: assignment.id || Date.now().toString(),
              service: assignment.service || { name: assignment.service_role || 'Unknown' },
              user: assignment.user || { id: assignment.user_id, name: assignment.user?.name || 'Unknown' },
              status: assignment.status || 'pending',
            }));
            
            // Update with refreshed data
            setAssignments(refreshedAssignments);
            
            const updatedTask = {
              ...existingTask,
              ...refreshedTask,
              id: taskId,
              type: taskType || existingTask?.type || existingTask?.task_type || (refreshedTask as any).type,
              task_type: taskType || existingTask?.task_type || existingTask?.type || (refreshedTask as any).task_type,
              assignments: refreshedAssignments,
            };
            onTaskCreated(updatedTask);
            console.log('✅ Task data refreshed from backend');
          } else {
            // Task not found - keep optimistic update
            console.warn('⚠️ Task not found in refreshed data, keeping optimistic update');
          }
        } catch (refreshError) {
          console.error('⚠️ Failed to refresh task data:', refreshError);
          // Keep optimistic update even if refresh fails
        }
      } catch (deleteError: any) {
        // Revert optimistic update on error (per guide)
        console.error('❌ Failed to delete assignment from backend:', deleteError);
        setAssignments(originalAssignments);
        
        // Handle specific error cases (per guide)
        const errorMessage = deleteError.message || 'Unknown error';
        
        if (errorMessage.includes('400') || errorMessage.includes('Invalid UUID') || errorMessage.includes('UUID')) {
          // Invalid UUID format - might be a local ID, already removed from state
          console.warn('⚠️ Invalid UUID format, treating as local assignment');
          // Don't show error - we already removed it optimistically
          return;
        } else if (errorMessage.includes('404') || errorMessage.includes('Not Found') || errorMessage.includes('not found')) {
          // Assignment not found - might already be deleted, that's okay (per guide)
          console.warn('⚠️ Assignment not found on backend, already removed');
          // Don't revert - assignment is already gone
          return;
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden') || errorMessage.includes('permission')) {
          // No permission (per guide)
          Alert.alert(
            'Permission Denied',
            'You do not have permission to remove this assignment.',
            [{ text: 'OK' }]
          );
        } else {
          // Other errors
          Alert.alert(
            'Delete Failed',
            `Failed to delete assignment: ${errorMessage}. Please try again.`,
            [{ text: 'OK' }]
          );
        }
        
        // Revert task update
        if (existingTask || savedTaskId) {
          const revertedTask = {
            ...existingTask,
            id: taskId,
            type: taskType || existingTask?.type || existingTask?.task_type,
            task_type: taskType || existingTask?.task_type || existingTask?.type,
            assignments: originalAssignments,
          };
          onTaskCreated(revertedTask);
        }
        
        throw deleteError;
      }
    } catch (error: any) {
      console.error('❌ Failed to remove assignment:', {
        error: error.message || error,
        assignmentId,
        taskId,
        projectId,
        stack: error.stack
      });
      // Error already handled above
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
        
        // Add new assignments (will be created with 'pending' status by backend)
        for (const assignment of newAssignments) {
          try {
            if (!assignment.service?.name || !assignment.user?.id) {
              console.error('⚠️ Invalid assignment data:', assignment);
              continue;
            }
            
            const response = await assignTaskService(projectId, currentTaskId, {
              service_role: assignment.service.name,
              user_id: assignment.user.id,
            });
            
            // Update assignment status from response if available
            if (response && Array.isArray(response) && response.length > 0) {
              const createdAssignment = response[0];
              assignment.status = createdAssignment.status || 'pending';
              // Update assignment ID with backend ID if available
              if (createdAssignment.id) {
                assignment.id = createdAssignment.id;
              }
            } else {
              // Default to pending for new assignments
              assignment.status = 'pending';
            }
          } catch (error: any) {
            console.error('❌ Failed to assign service:', {
              error: error.message || error,
              assignment: {
                service: assignment.service?.name,
                userId: assignment.user?.id
              }
            });
            // Show user-friendly error
            Alert.alert(
              'Assignment Failed',
              `Failed to assign ${assignment.service?.name || 'service'} to ${assignment.user?.name || 'user'}. ${error.message || 'Please try again.'}`,
              [{ text: 'OK' }]
            );
          }
        }
        
        // Update the assignments state with the updated IDs from backend
        setAssignments(assignmentsToSave);
        
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
          
          // Assign all services and users (will be created with 'pending' status by backend)
          for (const assignment of assignmentsToSave) {
            try {
              if (!assignment.service?.name || !assignment.user?.id) {
                console.error('⚠️ Invalid assignment data:', assignment);
                continue;
              }
              
              const response = await assignTaskService(projectId, newTaskId, {
                service_role: assignment.service.name,
                user_id: assignment.user.id,
              });
              
              // Update assignment status from response if available
              if (response && Array.isArray(response) && response.length > 0) {
                const createdAssignment = response[0];
                assignment.status = createdAssignment.status || 'pending';
                // Update assignment ID with backend ID if available
                if (createdAssignment.id) {
                  assignment.id = createdAssignment.id;
                }
              } else {
                // Default to pending for new assignments
                assignment.status = 'pending';
              }
            } catch (error: any) {
              console.error('❌ Failed to assign service:', {
                error: error.message || error,
                assignment: {
                  service: assignment.service?.name,
                  userId: assignment.user?.id
                }
              });
              // Show user-friendly error
              Alert.alert(
                'Assignment Failed',
                `Failed to assign ${assignment.service?.name || 'service'} to ${assignment.user?.name || 'user'}. ${error.message || 'Please try again.'}`,
                [{ text: 'OK' }]
              );
            }
          }
          
          // Update the assignments state with the updated IDs from backend
          setAssignments(assignmentsToSave);
          
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

  // Filter users and ensure pre-selected user is at the top
  const preSelectedUserForList = preSelectedUser || preSelectedUserRef.current || selectedUser;
  const filteredUsers = (() => {
    const filtered = availableUsers.filter(user =>
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // If we have a pre-selected user and it's not in the filtered list, add it at the top
    if (preSelectedUserForList && showUserModal) {
      const isInList = filtered.some(u => u.id === preSelectedUserForList.id);
      if (!isInList) {
        return [preSelectedUserForList, ...filtered];
      } else {
        // Move pre-selected user to top
        const index = filtered.findIndex(u => u.id === preSelectedUserForList.id);
        if (index > 0) {
          const [preSelected] = filtered.splice(index, 1);
          return [preSelected, ...filtered];
        }
      }
    }
    return filtered;
  })();

  // If no task type selected and no existing task, show as button
  if (!taskType && !existingTask) {
    return (
      <>
        <View style={styles.taskButtonContainer}>
        <TouchableOpacity
          style={styles.taskButton}
          onPress={() => setShowTypeModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.taskButtonText}>Create Task</Text>
        </TouchableOpacity>
          {isNewTask && onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Ionicons name="close" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

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
                {isNewTask && onCancel && (
                  <TouchableOpacity
                    style={[styles.typeOption, styles.cancelOption]}
                    onPress={() => {
                      setShowTypeModal(false);
                      onCancel();
                    }}
                  >
                    <Ionicons name="close" size={20} color="#ef4444" />
                    <Text style={[styles.typeOptionText, styles.cancelOptionText]}>Cancel</Text>
                  </TouchableOpacity>
                )}
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
          <Ionicons name={getTaskTypeIcon(taskType) as any} size={18} color="#fff" />
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
              size={18} 
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
              <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Assignments List - Only show when expanded */}
      {isExpanded && (
        <View style={styles.assignmentsContainer}>
          {assignments.map((assignment) => {
            const assignmentStatus = assignment.status || 'pending'; // Default to pending (per guide)
            const isPending = assignmentStatus === 'pending';
            const canEdit = assignmentStatus !== 'accepted';
            
            // Render swipe actions
            const renderRightActions = () => (
              <View style={styles.swipeActionContainer}>
                {canEdit && (
                  <TouchableOpacity
                    style={[styles.swipeAction, styles.swipeActionEdit]}
                    onPress={() => {
                      swipeableRefs.current[assignment.id]?.close();
                      handleEditAssignment(assignment.id);
                    }}
                  >
                    <Ionicons name="create-outline" size={24} color="#fff" />
                    <Text style={styles.swipeActionText}>Edit</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.swipeAction, styles.swipeActionDelete]}
                  onPress={() => {
                    swipeableRefs.current[assignment.id]?.close();
                    handleRemoveAssignment(assignment.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={24} color="#fff" />
                  <Text style={styles.swipeActionText}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
            
            return (
              <Swipeable
                key={assignment.id}
                ref={(ref) => {
                  if (ref) {
                    swipeableRefs.current[assignment.id] = ref;
                  }
                }}
                renderRightActions={renderRightActions}
                overshootRight={false}
              >
                <View 
                  style={[
                    styles.assignmentRow,
                    isPending && styles.assignmentRowPending
                  ]}
                >
              <View style={styles.assignmentLeft}>
                    <Ionicons name="briefcase" size={14} color="#000" />
                <Text style={styles.assignmentText}>{assignment.service?.name}</Text>
              </View>
              <View style={styles.assignmentRight}>
                <View style={styles.userBadge}>
                  <Text style={styles.userInitials}>
                    {(assignment.user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                      onPress={() => {
                        // Allow editing if status is not 'accepted'
                        if (canEdit) {
                          handleEditAssignment(assignment.id);
                        } else {
                          Alert.alert(
                            'Cannot Edit',
                            'Accepted assignments cannot be edited. Please remove the assignment and create a new one if needed.',
                            [{ text: 'OK' }]
                          );
                        }
                      }}
                      disabled={!canEdit}
                      style={styles.userInfoContainer}
                    >
                      <Text style={[
                        styles.userName,
                        canEdit && styles.userNameEditable
                      ]}>
                        {assignment.user?.name || 'Unknown'}
                      </Text>
                      <Text style={styles.userRole}>
                        {assignment.service?.name || 'No role'}
                      </Text>
                    </TouchableOpacity>
                  
                  {isPending ? (
                    // Pending assignments: Only project owner can accept (pending → accepted) or cancel
                    // Anyone can edit pending assignments (change user)
                    isProjectOwner ? (
                      <>
                        <TouchableOpacity
                          style={styles.editIconButton}
                  onPress={() => handleEditAssignment(assignment.id)}
                >
                          <Ionicons name="create-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity
                          style={styles.acceptIconButton}
                          onPress={async () => {
                          try {
                            const taskId = savedTaskId || existingTask?.id;
                            if (!taskId) {
                              Alert.alert('Error', 'Task ID not found');
                              return;
                            }
                            
                            // Check if assignment has a valid backend UUID
                            const isTimestampId = /^\d+$/.test(assignment.id);
                            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignment.id);
                            
                            let assignmentIdToUpdate = assignment.id;
                            
                            if (isTimestampId) {
                              // Assignment has timestamp ID - it might already exist in backend (created by autoSaveTask)
                              // Try to create it first, but if it already exists, the error will tell us
                              try {
                                console.log('📝 Assignment has timestamp ID, attempting to create:', assignment.id);
                                const createResponse = await assignTaskService(projectId, taskId, {
                                  service_role: assignment.service?.name,
                                  user_id: assignment.user?.id,
                                });
                                
                                // Get the created assignment ID from response
                                if (createResponse && Array.isArray(createResponse) && createResponse.length > 0) {
                                  assignmentIdToUpdate = createResponse[0].id || assignment.id;
                                }
                              } catch (createError: any) {
                                // If assignment already exists, we need to find the existing assignment ID
                                if (createError.message?.includes('already assigned') || createError.message?.includes('already exists')) {
                                  console.log('⚠️ Assignment already exists, fetching tasks to find assignment ID');
                                  // Fetch all tasks for the project to find the assignment
                                  try {
                                    const allTasks = await getProjectTasks(projectId);
                                    const task = allTasks.find((t: any) => t.id === taskId);
                                    
                                    console.log('🔍 Looking for assignment:', {
                                      taskId,
                                      taskFound: !!task,
                                      assignmentsCount: task?.assignments?.length || 0,
                                      lookingFor: {
                                        userId: assignment.user?.id,
                                        serviceRole: assignment.service?.name,
                                        status: 'pending'
                                      }
                                    });
                                    
                                    if (task?.assignments) {
                                      // Log all assignments for debugging
                                      console.log('📋 All assignments in task:', task.assignments.map((a: any) => ({
                                        id: a.id,
                                        user_id: a.user_id,
                                        user_id_from_user: a.user?.id,
                                        service_role: a.service_role,
                                        status: a.status
                                      })));
                                      
                                      // Try multiple matching strategies
                                      const existingAssignment = task.assignments.find((a: any) => {
                                        // Match by user_id (direct or from user object)
                                        const userIdMatches = 
                                          a.user_id === assignment.user?.id || 
                                          a.user?.id === assignment.user?.id;
                                        
                                        // Match by service_role
                                        const serviceRoleMatches = 
                                          a.service_role === assignment.service?.name ||
                                          a.service_role?.toLowerCase() === assignment.service?.name?.toLowerCase();
                                        
                                        // Match by status (pending or no status)
                                        const statusMatches = 
                                          !a.status || 
                                          a.status === 'pending' || 
                                          a.status === null;
                                        
                                        const matches = userIdMatches && serviceRoleMatches && statusMatches;
                                        
                                        if (matches) {
                                          console.log('✅ Found matching assignment:', {
                                            id: a.id,
                                            user_id: a.user_id,
                                            service_role: a.service_role,
                                            status: a.status
                                          });
                                        }
                                        
                                        return matches;
                                      });
                                      
                                      if (existingAssignment?.id) {
                                        assignmentIdToUpdate = existingAssignment.id;
                                        console.log('✅ Found existing assignment ID:', assignmentIdToUpdate);
                                      } else {
                                        // If no exact match, try without status check (maybe it's already accepted?)
                                        const assignmentWithoutStatusCheck = task.assignments.find((a: any) => {
                                          const userIdMatches = 
                                            a.user_id === assignment.user?.id || 
                                            a.user?.id === assignment.user?.id;
                                          const serviceRoleMatches = 
                                            a.service_role === assignment.service?.name ||
                                            a.service_role?.toLowerCase() === assignment.service?.name?.toLowerCase();
                                          return userIdMatches && serviceRoleMatches;
                                        });
                                        
                                        if (assignmentWithoutStatusCheck?.id) {
                                          assignmentIdToUpdate = assignmentWithoutStatusCheck.id;
                                          console.log('✅ Found existing assignment ID (without status check):', assignmentIdToUpdate);
                                        } else {
                                          console.error('❌ Could not find matching assignment. Available assignments:', 
                                            task.assignments.map((a: any) => ({
                                              id: a.id,
                                              user_id: a.user_id,
                                              user_id_from_user: a.user?.id,
                                              service_role: a.service_role,
                                              status: a.status
                                            }))
                                          );
                                          throw new Error('Assignment exists but could not find its ID in task assignments');
                                        }
                                      }
                                    } else {
                                      throw new Error('Could not find task or assignments');
                                    }
                                  } catch (fetchError: any) {
                                    console.error('❌ Failed to fetch task to find assignment ID:', fetchError);
                                    throw new Error(`Assignment already exists but could not retrieve its ID: ${fetchError.message}`);
                                  }
                                } else {
                                  throw createError;
                                }
                              }
                            }
                            
                            // Now update the status using the correct assignment ID
                            const hasValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentIdToUpdate);
                            
                            if (hasValidUUID) {
                              try {
                                const updateResponse = await updateTaskAssignmentStatus(
                                  projectId, 
                                  taskId, 
                                  assignmentIdToUpdate, 
                                  'accepted'
                                );
                                
                                console.log('✅ updateTaskAssignmentStatus response:', JSON.stringify(updateResponse, null, 2));
                                
                                // Extract status from response - response.data contains the updated assignment with status
                                const updatedAssignment = updateResponse?.data;
                                const responseStatus = updatedAssignment?.status || 'accepted';
                                
                                console.log('✅ Extracted status from update response:', responseStatus);
                                
                                // Update local state with correct ID and status from response
                                setAssignments(assignments.map(a => 
                                  a.id === assignment.id 
                                    ? { ...a, id: assignmentIdToUpdate, status: responseStatus } 
                                    : a
                                ));
                                
                                // Refresh assignments using getTaskAssignments (includes status via select('*'))
                                if (existingTask) {
                                  try {
                                    const assignmentsResponse = await getTaskAssignments(projectId, taskId);
                                    if (assignmentsResponse.success && assignmentsResponse.data) {
                                      const fetchedAssignments = Array.isArray(assignmentsResponse.data) 
                                        ? assignmentsResponse.data 
                                        : (assignmentsResponse.data.assignments || []);
                                      
                                      // Map fetched assignments with status
                                      const assignmentsWithStatus = fetchedAssignments.map((a: any) => ({
                                        id: a.id,
                                        service: a.service || { name: a.service_role },
                                        user: a.user || { id: a.user_id, name: a.user?.name || 'Unknown' },
                                        status: a.status || 'pending', // Status included from getTaskAssignments
                                      }));
                                      
                                      const updatedTask = {
                                        ...existingTask,
                                        assignments: assignmentsWithStatus,
                                      };
                                      onTaskCreated(updatedTask);
                                    } else {
                                      // Fallback: use getProjectTasks if getTaskAssignments fails
                                      const allTasks = await getProjectTasks(projectId);
                                      const task = allTasks.find((t: any) => t.id === taskId);
                                      if (task) {
                                        const assignmentsWithStatus = (task.assignments || []).map((a: any) => ({
                                          id: a.id,
                                          service: a.service || { name: a.service_role },
                                          user: a.user || { id: a.user_id, name: a.user?.name || 'Unknown' },
                                          status: a.id === assignmentIdToUpdate ? responseStatus : (a.status || 'pending'),
                                        }));
                                        const updatedTask = {
                                          ...existingTask,
                                          ...task,
                                          assignments: assignmentsWithStatus,
                                        };
                                        onTaskCreated(updatedTask);
                                      }
                                    }
                                  } catch (refreshError) {
                                    console.warn('⚠️ Failed to refresh task after accepting:', refreshError);
                                  }
                                }
                              } catch (updateError: any) {
                                // Check if error is because assignment is already accepted
                                const errorMessage = updateError?.message || '';
                                if (errorMessage.includes('already') || errorMessage.includes('only change status from pending to accepted')) {
                                  // Assignment is already accepted on backend, just sync local state
                                  console.log('✅ Assignment is already accepted on backend, syncing local state');
                                  setAssignments(assignments.map(a => 
                                    a.id === assignment.id 
                                      ? { ...a, id: assignmentIdToUpdate, status: 'accepted' } 
                                      : a
                                  ));
                                  
                                  // Refresh assignments using getTaskAssignments (includes status)
                                  if (existingTask) {
                                    try {
                                      const assignmentsResponse = await getTaskAssignments(projectId, taskId);
                                      if (assignmentsResponse.success && assignmentsResponse.data) {
                                        const fetchedAssignments = Array.isArray(assignmentsResponse.data) 
                                          ? assignmentsResponse.data 
                                          : (assignmentsResponse.data.assignments || []);
                                        
                                        const assignmentsWithStatus = fetchedAssignments.map((a: any) => ({
                                          id: a.id,
                                          service: a.service || { name: a.service_role },
                                          user: a.user || { id: a.user_id, name: a.user?.name || 'Unknown' },
                                          status: a.status || 'pending', // Status included from getTaskAssignments
                                        }));
                                        
                                        const updatedTask = {
                                          ...existingTask,
                                          assignments: assignmentsWithStatus,
                                        };
                                        onTaskCreated(updatedTask);
                                      }
                                    } catch (refreshError) {
                                      console.warn('⚠️ Failed to refresh task:', refreshError);
                                    }
                                  }
                                  return; // Don't show error - it's already accepted
                                }
                                
                                // If update fails, try to verify if assignment was actually updated on backend
                                console.warn('⚠️ Update failed, verifying assignment status on backend...');
                                try {
                                  const allTasks = await getProjectTasks(projectId);
                                  const task = allTasks.find((t: any) => t.id === taskId);
                                  if (task?.assignments) {
                                    const backendAssignment = task.assignments.find((a: any) => a.id === assignmentIdToUpdate);
                                    if (backendAssignment?.status === 'accepted') {
                                      // Backend shows it's accepted, update local state
                                      console.log('✅ Assignment is accepted on backend, updating local state');
                                      setAssignments(assignments.map(a => 
                                        a.id === assignment.id 
                                          ? { ...a, id: assignmentIdToUpdate, status: 'accepted' } 
                                          : a
                                      ));
                                      
                                      // Update task - ensure assignments include status
                                      const assignmentsWithStatus = (task.assignments || []).map((a: any) => ({
                                        id: a.id,
                                        service: a.service || { name: a.service_role },
                                        user: a.user || { id: a.user_id, name: a.user?.name || 'Unknown' },
                                        status: a.status || 'pending', // CRITICAL: Include status
                                      }));
                                      const updatedTask = {
                                        ...existingTask,
                                        ...task,
                                        assignments: assignmentsWithStatus,
                                      };
                                      onTaskCreated(updatedTask);
                                      // Don't show error - it worked on backend
                                      return;
                                    }
                                  }
                                } catch (verifyError) {
                                  console.error('❌ Failed to verify assignment status:', verifyError);
                                }
                                // If verification fails or status doesn't match, throw the original error
                                throw updateError;
                              }
                            } else if (isUUID) {
                              // Assignment already has UUID, just update status
                              try {
                                await updateTaskAssignmentStatus(
                                  projectId, 
                                  taskId, 
                                  assignment.id, 
                                  'accepted'
                                );
                                
                                // Update local state
                                setAssignments(assignments.map(a => 
                                  a.id === assignment.id ? { ...a, status: 'accepted' } : a
                                ));
                                
                                // Refresh task to sync with backend
                                if (existingTask) {
                                  try {
                                    const allTasks = await getProjectTasks(projectId);
                                    const task = allTasks.find((t: any) => t.id === taskId);
                                    if (task) {
                                      // Ensure assignments include status from backend
                                      const assignmentsWithStatus = (task.assignments || []).map((a: any) => ({
                                        id: a.id,
                                        service: a.service || { name: a.service_role },
                                        user: a.user || { id: a.user_id, name: a.user?.name || 'Unknown' },
                                        status: a.status || 'pending', // CRITICAL: Include status
                                      }));
                                      const updatedTask = {
                                        ...existingTask,
                                        ...task,
                                        assignments: assignmentsWithStatus,
                                      };
                                      onTaskCreated(updatedTask);
                                    }
                                  } catch (refreshError) {
                                    console.warn('⚠️ Failed to refresh task after accepting:', refreshError);
                                  }
                                }
                              } catch (updateError: any) {
                                // Check if error is because assignment is already accepted
                                const errorMessage = updateError?.message || '';
                                if (errorMessage.includes('already') || errorMessage.includes('only change status from pending to accepted')) {
                                  // Assignment is already accepted on backend, just sync local state
                                  console.log('✅ Assignment is already accepted on backend, syncing local state');
                                  setAssignments(assignments.map(a => 
                                    a.id === assignment.id ? { ...a, status: 'accepted' } : a
                                  ));
                                  
                                  // Refresh task to sync
                                  if (existingTask) {
                                    try {
                                      const allTasks = await getProjectTasks(projectId);
                                      const task = allTasks.find((t: any) => t.id === taskId);
                                      if (task) {
                                        // Ensure assignments include status from backend
                                        const assignmentsWithStatus = (task.assignments || []).map((a: any) => ({
                                          id: a.id,
                                          service: a.service || { name: a.service_role },
                                          user: a.user || { id: a.user_id, name: a.user?.name || 'Unknown' },
                                          status: a.status || 'pending', // CRITICAL: Include status
                                        }));
                                        const updatedTask = {
                                          ...existingTask,
                                          ...task,
                                          assignments: assignmentsWithStatus,
                                        };
                                        onTaskCreated(updatedTask);
                                      }
                                    } catch (refreshError) {
                                      console.warn('⚠️ Failed to refresh task:', refreshError);
                                    }
                                  }
                                  return; // Don't show error - it's already accepted
                                }
                                
                                // If update fails, try to verify if assignment was actually updated on backend
                                console.warn('⚠️ Update failed, verifying assignment status on backend...');
                                try {
                                  const allTasks = await getProjectTasks(projectId);
                                  const task = allTasks.find((t: any) => t.id === taskId);
                                  if (task?.assignments) {
                                    const backendAssignment = task.assignments.find((a: any) => a.id === assignment.id);
                                    if (backendAssignment?.status === 'accepted') {
                                      // Backend shows it's accepted, update local state
                                      console.log('✅ Assignment is accepted on backend, updating local state');
                                      setAssignments(assignments.map(a => 
                                        a.id === assignment.id ? { ...a, status: 'accepted' } : a
                                      ));
                                      
                                      // Update task - ensure assignments include status
                                      const assignmentsWithStatus = (task.assignments || []).map((a: any) => ({
                                        id: a.id,
                                        service: a.service || { name: a.service_role },
                                        user: a.user || { id: a.user_id, name: a.user?.name || 'Unknown' },
                                        status: a.status || 'pending', // CRITICAL: Include status
                                      }));
                                      const updatedTask = {
                                        ...existingTask,
                                        ...task,
                                        assignments: assignmentsWithStatus,
                                      };
                                      onTaskCreated(updatedTask);
                                      // Don't show error - it worked on backend
                                      return;
                                    }
                                  }
                                } catch (verifyError) {
                                  console.error('❌ Failed to verify assignment status:', verifyError);
                                }
                                // If verification fails or status doesn't match, throw the original error
                                throw updateError;
                              }
                            } else {
                              throw new Error('Invalid assignment ID format');
                            }
                            
                            // Refresh task to get updated assignments
                            if (existingTask) {
                              const updatedAssignments = assignments.map((a: Assignment) => 
                                a.id === assignment.id ? { ...a, status: 'accepted' as const } : a
                              );
                              const updatedTask = {
                                ...existingTask,
                                assignments: updatedAssignments.map((a: Assignment) => ({
                                  id: a.id,
                                  service: a.service,
                                  user: a.user,
                                  status: (a.status || 'pending') as 'pending' | 'accepted' | 'rejected',
                                })),
                              };
                              onTaskCreated(updatedTask);
                            }
                          } catch (error: any) {
                            console.error('❌ Failed to accept assignment:', error);
                            const errorMessage = error.message || 'Unknown error';
                            // Check if it's a backend 500 error
                            if (errorMessage.includes('500') || errorMessage.includes('Failed to update task assignment status')) {
                              Alert.alert(
                                'Server Error',
                                'The server encountered an error while updating the assignment status. The assignment may have been updated successfully. Please refresh the page to verify.',
                                [
                                  { text: 'OK' },
                                  { 
                                    text: 'Refresh', 
                                    onPress: async () => {
                                      // Try to refresh task data
                                      try {
                                        const allTasks = await getProjectTasks(projectId);
                                        const task = allTasks.find((t: any) => t.id === (savedTaskId || existingTask?.id));
                                        if (task) {
                                          const updatedTask = {
                                            ...existingTask,
                                            ...task,
                                            assignments: task.assignments || [],
                                          };
                                          onTaskCreated(updatedTask);
                                        }
                                      } catch (refreshError) {
                                        console.error('❌ Failed to refresh task:', refreshError);
                                      }
                                    }
                                  }
                                ]
                              );
                            } else {
                              Alert.alert('Error', `Failed to accept assignment. ${errorMessage}`);
                            }
                          }
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeIconButton}
                  onPress={() => handleRemoveAssignment(assignment.id)}
                >
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
                      </>
                    ) : (
                      // Pending assignment - waiting for project owner to accept
                      // Anyone can edit pending assignments (change user)
                      // Project owner can also cancel
                      <>
                        <TouchableOpacity
                          style={styles.editIconButton}
                          onPress={() => handleEditAssignment(assignment.id)}
                        >
                          <Ionicons name="create-outline" size={18} color="#6b7280" />
                        </TouchableOpacity>
                        {isProjectOwner ? (
                          <TouchableOpacity
                            style={styles.removeIconButton}
                            onPress={() => handleRemoveAssignment(assignment.id)}
                          >
                            <Ionicons name="close-circle" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.pendingText}>Pending</Text>
                        )}
                      </>
                    )
                  ) : assignmentStatus === 'accepted' ? (
                    // Accepted assignments: Show accepted status, no action buttons for assigned user
                    isAssignedUser(assignment) ? (
                      <>
                        <Text style={styles.acceptedText}>Accepted</Text>
                        {/* No accept button - assignment is already accepted */}
                        <TouchableOpacity
                          style={styles.rejectIconButton}
                          onPress={async () => {
                            try {
                              const taskId = savedTaskId || existingTask?.id;
                              
                              if (!taskId) {
                                Alert.alert('Error', 'Task ID not found');
                                return;
                              }
                              
                              // Assignment exists in backend, update status to rejected
                              await updateTaskAssignmentStatus(
                                projectId, 
                                taskId, 
                                assignment.id, 
                                'rejected'
                              );
                              
                              // Remove from UI
                              setAssignments(assignments.filter(a => a.id !== assignment.id));
                              
                              // Update task
                              if (existingTask) {
                                const updatedTask = {
                                  ...existingTask,
                                  assignments: assignments.filter(a => a.id !== assignment.id),
                                };
                                onTaskCreated(updatedTask);
                              }
                            } catch (error: any) {
                              console.error('❌ Failed to reject assignment:', error);
                              const errorMessage = error.message || 'Unknown error';
                              if (errorMessage.includes('500') || errorMessage.includes('Failed to update task assignment status')) {
                                Alert.alert(
                                  'Server Error',
                                  'The server encountered an error while updating the assignment status. This may be a temporary issue. Please try again or contact support if the problem persists.',
                                  [{ text: 'OK' }]
                                );
                              } else {
                                Alert.alert('Error', `Failed to reject assignment. ${errorMessage}`);
                              }
                            }
                          }}
                        >
                          <Ionicons name="close-circle" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      // Accepted assignment - not assigned to current user
                      // Project owner can still remove it
                      <>
                        <Text style={styles.acceptedText}>Accepted</Text>
                        {isProjectOwner && (
                          <TouchableOpacity
                            style={styles.removeIconButton}
                            onPress={() => handleRemoveAssignment(assignment.id)}
                          >
                            <Ionicons name="close-circle" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </>
                    )
                  ) : (
                    // Other statuses (rejected, etc.) - show remove for project owner
                    isProjectOwner ? (
                      <TouchableOpacity
                        style={styles.removeIconButton}
                        onPress={() => handleRemoveAssignment(assignment.id)}
                      >
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    ) : null
                  )}
              </View>
            </View>
              </Swipeable>
            );
          })}

          {/* Add Service Button - Only show when expanded */}
          <TouchableOpacity
            style={styles.addServiceButton}
            onPress={async () => {
            console.log('➕ Add service button pressed');
            
            // Check for pre-selected user first (from homepage shortcut)
            const userToAutoAssign = preSelectedUser || preSelectedUserRef.current || selectedUser;
            
            if (userToAutoAssign) {
              console.log('✅ Pre-selected user found, assigning instantly with their role');
              
              // Get user's role from their profile
              const userRole = userToAutoAssign.primary_role || userToAutoAssign.specialty || userToAutoAssign.role;
              
              if (!userRole) {
                Alert.alert(
                  'No Role Found',
                  'This user does not have a role assigned. Please assign a role to their profile first.',
                  [{ text: 'OK' }]
                );
                return;
              }
              
              // Create service object from user's role
              const serviceFromRole = {
                id: userRole.toLowerCase().replace(/\s+/g, '_'),
                name: userRole,
                category: 'Other'
              };
              
              console.log('🎯 Assigning user with role:', {
                userId: userToAutoAssign.id,
                userName: userToAutoAssign.name,
                role: userRole,
                service: serviceFromRole
              });
              
              // Directly assign without showing any modals
              try {
                await handleUserSelect(userToAutoAssign, serviceFromRole);
                console.log('✅ User assigned successfully');
              } catch (error: any) {
                console.error('❌ Failed to assign user:', error);
                Alert.alert(
                  'Assignment Failed',
                  error?.message || 'Failed to assign user. Please try again.',
                  [{ text: 'OK' }]
                );
              }
              return; // Exit early - no modals needed
            }
            
            // No pre-selected user - show normal service selection flow
            console.log('👤 No pre-selected user, showing service selection modal');
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
                    onPress={() => {
                      console.log('🎯 Service tapped in modal:', service.name, service.id);
                      console.log('🎯 About to call handleServiceSelect with:', { id: service.id, name: service.name });
                      handleServiceSelect(service);
                    }}
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
            {/* Show pre-selected user indicator if available */}
            {(preSelectedUser || preSelectedUserRef.current || selectedUser) && (
              <View style={styles.preSelectedUserBanner}>
                <Ionicons name="person" size={16} color="#3b82f6" />
                <Text style={styles.preSelectedUserBannerText}>
                  Quick assign: {(preSelectedUser || preSelectedUserRef.current || selectedUser)?.name}
                </Text>
              </View>
            )}
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
                filteredUsers.map((user) => {
                  const isPreSelected = preSelectedUserForList && user.id === preSelectedUserForList.id;
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.modalItem, isPreSelected && styles.preSelectedUserItem]}
                    onPress={() => {
                      if (editingAssignmentId) {
                        handleUpdateAssignment(selectedService, user);
                      } else {
                        handleUserSelect(user, selectedService);
                      }
                    }}
                    >
                      <View style={[styles.userAvatar, isPreSelected && styles.preSelectedUserAvatar]}>
                        <Text style={styles.userAvatarText}>
                          {(user.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.modalItemText, isPreSelected && styles.preSelectedUserText]}>
                        {user.name || 'Unknown'}
                      </Text>
                      {isPreSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#3b82f6" style={{ marginLeft: 'auto' }} />
                      )}
                    </TouchableOpacity>
                  );
                })
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
  taskButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  taskButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  taskButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  cancelButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
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
    gap: 6,
  },
  statusBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
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
    padding: 8,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  assignmentRowPending: {
    backgroundColor: '#fffbeb', // Very light yellow background
    borderLeftWidth: 2,
    borderLeftColor: '#fbbf24', // Lighter amber border
  },
  assignmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assignmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  assignmentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 6,
  },
  userRole: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 1,
  },
  swipeActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    paddingHorizontal: 12,
  },
  swipeActionEdit: {
    backgroundColor: '#3b82f6',
  },
  swipeActionDelete: {
    backgroundColor: '#ef4444',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  userBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  editButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  acceptIconButton: {
    padding: 2,
    marginLeft: 2,
  },
  rejectIconButton: {
    padding: 2,
    marginLeft: 2,
  },
  removeIconButton: {
    padding: 2,
    marginLeft: 2,
  },
  editIconButton: {
    padding: 2,
    marginLeft: 2,
  },
  userNameEditable: {
    textDecorationLine: 'underline',
  },
  pendingText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
    marginLeft: 4,
  },
  acceptedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
    marginLeft: 4,
  },
  addServiceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    marginTop: 6,
    marginHorizontal: 8,
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
  cancelOption: {
    borderTopWidth: 2,
    borderTopColor: '#fee2e2',
    marginTop: 8,
  },
  cancelOptionText: {
    color: '#ef4444',
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
  },
  preSelectedUserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  preSelectedUserBannerText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 8,
  },
  preSelectedUserItem: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  preSelectedUserAvatar: {
    backgroundColor: '#3b82f6',
  },
  preSelectedUserText: {
    color: '#3b82f6',
    fontWeight: '600',
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
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SimplifiedTaskCard;


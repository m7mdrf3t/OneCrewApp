import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ProjectDetailPageProps, TaskWithAssignments, ProjectMember } from '../types';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
import { RootStackScreenProps } from '../navigation/types';
import CreateTaskModal from '../components/CreateTaskModal';
import ProjectDashboard from '../components/ProjectDashboard';
import ProjectDetailsModal from '../components/ProjectDetailsModal';

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  project: projectProp,
  onBack: onBackProp,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onAssignTask,
  onUpdateTaskStatus,
}) => {
  // Get route params if available (React Navigation)
  const route = useRoute<RootStackScreenProps<'projectDetail'>['route']>();
  const navigation = useNavigation();
  const { goBack } = useAppNavigation();
  
  // Get project from route params or prop
  const project = projectProp || route.params?.project;
  
  // Early return if project is not available
  if (!project) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBackProp || goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Project</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Project not found</Text>
        </View>
      </View>
    );
  }
  
  const { user, updateProject, getProjectById } = useApi();
  const [tasks, setTasks] = useState<TaskWithAssignments[]>(project?.tasks || []);
  const [members, setMembers] = useState<ProjectMember[]>(project?.members || []);
  const [currentProject, setCurrentProject] = useState(project);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  
  // Use props if provided, otherwise use navigation hooks
  const handleBack = onBackProp || goBack;
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  // Update currentProject when project prop changes
  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    }
  }, [project]);

  const getUserAccessLevel = () => {
    if (!user || !project) return 'viewer';
    
    // Check if user is the owner (created_by field)
    if (project.created_by === user.id) return 'owner';
    
    // Check if user is a member
    if (members.some((member: any) => member.user_id === user.id)) {
      return 'member';
    }
    
    return 'viewer';
  };

  const accessLevel = getUserAccessLevel();
  const canEdit = accessLevel === 'owner' || accessLevel === 'member';
  const canManage = accessLevel === 'owner';

  const handleRefresh = async () => {
    if (!project?.id) return;
    
    setRefreshing(true);
    try {
      // Refresh project data from API
      const refreshedProject = await getProjectById(project.id);
      setCurrentProject(refreshedProject);
      
      // Update route params if using React Navigation
      // Only update params if navigation is available and supports setParams
      try {
        if (navigation && route.params && typeof (navigation as any).setParams === 'function') {
          const nav = navigation as any;
          // Check if route is focused before updating params
          if (nav.isFocused && nav.isFocused()) {
            nav.setParams({ project: refreshedProject });
          } else if (!nav.isFocused) {
            // If isFocused doesn't exist, try to set params anyway (for some navigators)
            nav.setParams({ project: refreshedProject });
          }
        }
      } catch (error) {
        // Silently fail if navigation is not available or doesn't support setParams
        console.warn('Could not update navigation params:', error);
      }
    } catch (error) {
      console.error('Failed to refresh project:', error);
      Alert.alert('Error', 'Failed to refresh project data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      const createdTask = await onCreateTask(taskData);
      setShowCreateTask(false);
      // Refresh tasks list
      handleRefresh();
      return createdTask; // Return the created task for assignment
    } catch (error) {
      Alert.alert('Error', 'Failed to create task');
      throw error; // Re-throw to let CreateTaskModal handle it
    }
  };

  const handleDeleteTask = async (taskId: string) => {
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
              await onDeleteTask(taskId);
              setTasks(tasks.filter(task => task.id !== taskId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'on_hold':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'in_progress':
        return 'play-circle';
      case 'on_hold':
        return 'pause-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  const getAccessLevelColor = (accessLevel: string) => {
    switch (accessLevel) {
      case 'owner':
        return '#10b981'; // Green
      case 'member':
        return '#3b82f6'; // Blue
      case 'viewer':
        return '#6b7280'; // Gray
      default:
        return '#6b7280';
    }
  };

  const getAccessLevelText = (accessLevel: string) => {
    switch (accessLevel) {
      case 'owner':
        return 'OWNER';
      case 'member':
        return 'MEMBER';
      case 'viewer':
        return 'VIEWER';
      default:
        return 'VIEWER';
    }
  };

  // Get selectedUser and addUserToTask from route params if available
  const routeParams = route.params as any;
  const selectedUser = routeParams?.selectedUser;
  const addUserToTask = routeParams?.addUserToTask || false;

  const handleEditProjectDetails = () => {
    setShowEditProjectModal(true);
  };

  const handleSaveProject = async (updatedProject: any) => {
    try {
      console.log('💾 Saving project updates:', updatedProject);
      const response = await updateProject(updatedProject.id, updatedProject);
      
      if (response.success) {
        // Update local project state
        const refreshedProject = await getProjectById(updatedProject.id);
        setCurrentProject(refreshedProject);
        
        // Update route params if using React Navigation
        // Only update params if navigation is available and supports setParams
        try {
          if (navigation && route.params && typeof (navigation as any).setParams === 'function') {
            const nav = navigation as any;
            // Check if route is focused before updating params
            if (nav.isFocused && nav.isFocused()) {
              nav.setParams({ project: refreshedProject });
            } else if (!nav.isFocused) {
              // If isFocused doesn't exist, try to set params anyway (for some navigators)
              nav.setParams({ project: refreshedProject });
            }
          }
        } catch (error) {
          // Silently fail if navigation is not available or doesn't support setParams
          console.warn('Could not update navigation params:', error);
        }
        
        Alert.alert('Success', 'Project details updated successfully');
      } else {
        throw new Error(response.error || 'Failed to update project');
      }
    } catch (error: any) {
      console.error('❌ Failed to save project:', error);
      Alert.alert('Error', error.message || 'Failed to update project details');
      throw error; // Re-throw to let modal handle it
    }
  };

  // Use ProjectDashboard component to render the project details
  return (
    <>
      <ProjectDashboard
        project={currentProject || project}
        onBack={handleBack}
        onEditProjectDetails={handleEditProjectDetails}
        onRefreshProject={handleRefresh}
        selectedUser={selectedUser}
        addUserToTask={addUserToTask}
      />
      
      {/* Edit Project Details Modal */}
      <ProjectDetailsModal
        visible={showEditProjectModal}
        onClose={() => setShowEditProjectModal(false)}
        project={currentProject || project}
        onSave={handleSaveProject}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    padding: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  projectInfo: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  projectBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  accessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  accessText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  projectDescription: {
    fontSize: 16,
    color: '#71717a',
    marginBottom: 16,
    lineHeight: 22,
  },
  projectMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#71717a',
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    minWidth: 40,
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  sectionCount: {
    fontSize: 14,
    color: '#71717a',
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 'auto',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 12,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  memberInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 14,
    color: '#000',
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  taskService: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
  },
  taskTimeline: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 8,
  },
  assignedUsers: {
    marginBottom: 8,
  },
  assignedLabel: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 4,
  },
  assignedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  assignedInitial: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  assignedName: {
    fontSize: 12,
    color: '#000',
    marginRight: 4,
  },
  assignedRole: {
    fontSize: 12,
    color: '#71717a',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    color: '#71717a',
    marginLeft: 4,
  },
  emptyTasks: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#71717a',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ProjectDetailPage;

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
  
  const { user, getProjectById } = useApi();
  const [tasks, setTasks] = useState<TaskWithAssignments[]>(project?.tasks || []);
  const [members, setMembers] = useState<ProjectMember[]>(project?.members || []);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

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
  
  // Use props if provided, otherwise use navigation hooks
  const handleBack = onBackProp || goBack;

  const accessLevel = getUserAccessLevel();
  const canEdit = accessLevel === 'owner' || accessLevel === 'member';
  const canManage = accessLevel === 'owner';

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh project data would be handled by parent component
      // For now, we'll just simulate a refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to refresh project:', error);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {project?.title || 'Untitled Project'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Project Info */}
        <View style={styles.projectInfo}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectTitle}>
              {project.title || 'Untitled Project'}
            </Text>
            <View style={styles.projectBadges}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
                <Text style={styles.statusText}>{project.status.replace('_', ' ').toUpperCase()}</Text>
              </View>
              <View style={[styles.accessBadge, { backgroundColor: getAccessLevelColor(accessLevel) }]}>
                <Text style={styles.accessText}>{getAccessLevelText(accessLevel)}</Text>
              </View>
            </View>
          </View>

          {project.description && (
            <Text style={styles.projectDescription}>{project.description}</Text>
          )}

          <View style={styles.projectMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="trending-up" size={16} color="#71717a" />
              <Text style={styles.metaText}>{project.progress}% Complete</Text>
            </View>
            {project.start_date && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={16} color="#71717a" />
                <Text style={styles.metaText}>
                  {new Date(project.start_date).toLocaleDateString()}
                </Text>
              </View>
            )}
            {project.type && (
              <View style={styles.metaItem}>
                <Ionicons name="film" size={16} color="#71717a" />
                <Text style={styles.metaText}>{project.type}</Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${project.progress}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{project.progress}%</Text>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            <Text style={styles.sectionCount}>({members.length})</Text>
          </View>
          <View style={styles.membersList}>
            {members.length > 0 ? (
              members.map((member, index) => (
                <View key={member.user_id} style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>
                      {member.user_id.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberName}>Member {index + 1}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No team members yet</Text>
            )}
          </View>
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            <Text style={styles.sectionCount}>({tasks.length})</Text>
            {canManage && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowCreateTask(true)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Task</Text>
              </TouchableOpacity>
            )}
          </View>

          {tasks.length > 0 ? (
            <View style={styles.tasksList}>
              {tasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={[styles.taskStatus, { backgroundColor: getStatusColor(task.status) }]}>
                      <Ionicons
                        name={getStatusIcon(task.status)}
                        size={12}
                        color="#fff"
                      />
                      <Text style={styles.taskStatusText}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {task.service && (
                    <Text style={styles.taskService}>Service: {task.service}</Text>
                  )}

                  {task.timeline_text && (
                    <Text style={styles.taskTimeline}>{task.timeline_text}</Text>
                  )}

                  {task.assigned_users && task.assigned_users.length > 0 && (
                    <View style={styles.assignedUsers}>
                      <Text style={styles.assignedLabel}>Assigned to:</Text>
                      {task.assigned_users.map((assignment, index) => (
                        <View key={index} style={styles.assignedUser}>
                          <View style={styles.assignedAvatar}>
                            <Text style={styles.assignedInitial}>
                              {assignment.user.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.assignedName}>{assignment.user.name}</Text>
                          <Text style={styles.assignedRole}>({assignment.service_role})</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {canManage && (
                    <View style={styles.taskActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {/* Edit task */}}
                      >
                        <Ionicons name="create" size={16} color="#3b82f6" />
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          Alert.alert(
                            'Delete Task',
                            `Are you sure you want to delete "${task.title}"?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    console.log('🗑️ Attempting to delete task:', task.id);
                                    console.log('🔍 Task details:', {
                                      id: task.id,
                                      title: task.title,
                                      projectId: project.id,
                                      userId: user?.id,
                                      userRole: getUserAccessLevel()
                                    });
                                    await onDeleteTask(task.id);
                                    setTasks(tasks.filter(t => t.id !== task.id));
                                    console.log('✅ Task deleted successfully');
                                  } catch (error) {
                                    console.error('❌ Delete task error:', error);
                                    Alert.alert(
                                      'Delete Failed',
                                      `Unable to delete task "${task.title}". This appears to be a backend permission issue. As the project owner, you should be able to delete any task. Please try again or contact support.`,
                                      [{ text: 'OK' }]
                                    );
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash" size={16} color="#ef4444" />
                        <Text style={styles.actionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTasks}>
              <Ionicons name="list" size={48} color="#d4d4d8" />
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubtext}>
                {canManage ? 'Add your first task to get started' : 'Tasks will appear here when added'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Task Modal */}
    <CreateTaskModal
      visible={showCreateTask}
      onClose={() => setShowCreateTask(false)}
      onSubmit={handleCreateTask}
      projectMembers={members}
      editingTask={undefined}
      projectId={project.id}
    />
    </View>
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

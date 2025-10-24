import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TaskTypeModal from './TaskTypeModal';
import TaskCard from './TaskCard';
import { useApi } from '../contexts/ApiContext';

interface ProjectDashboardProps {
  project: any;
  onBack: () => void;
  onEditProjectDetails: () => void;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project,
  onBack,
  onEditProjectDetails,
}) => {
  const { getProjectById, getProjectTasks, getTaskAssignments } = useApi();
  const [selectedTab, setSelectedTab] = useState('details');
  const [showTaskTypeModal, setShowTaskTypeModal] = useState(false);
  const [showTaskCard, setShowTaskCard] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  // Load tasks when component mounts
  useEffect(() => {
    loadTasks(true); // Replace existing tasks on initial load
  }, [project.id]);

  const loadTasks = async (replaceExisting = false) => {
    if (!project.id) return;
    
    setIsLoadingTasks(true);
    try {
      console.log('📋 Loading tasks for project:', project.id);
      
      // First try to get tasks from project data
      let projectTasks: any[] = [];
      
      try {
        const projectData = await getProjectById(project.id);
        console.log('✅ Project data loaded:', projectData);
        projectTasks = projectData.tasks || [];
        console.log('📋 Found tasks in project data:', projectTasks.length);
      } catch (projectError) {
        console.warn('⚠️ Failed to load project data, trying direct task loading:', projectError);
      }
      
      // If no tasks found in project data, try direct task loading
      if (projectTasks.length === 0) {
        try {
          console.log('📋 Trying direct task loading...');
          const directTasks = await getProjectTasks(project.id);
          projectTasks = directTasks || [];
          console.log('📋 Found tasks via direct loading:', projectTasks.length);
        } catch (taskError) {
          console.error('❌ Failed to load tasks directly:', taskError);
        }
      }
      
        console.log('📋 Final tasks to set:', projectTasks.length);
        console.log('📋 Task details:', projectTasks.map(t => ({ 
          id: t.id, 
          title: t.title, 
          type: t.type, 
          status: t.status,
          service: t.service,
          members: t.members,
          assignments: t.assignments,
          service_role: t.service_role,
          user_id: t.user_id
        })));
        
        // Log full task structure for debugging
        if (projectTasks.length > 0) {
          console.log('📋 Full first task structure:', JSON.stringify(projectTasks[0], null, 2));
        }
        
        // Transform tasks to include service and member data
        const transformedTasks = await Promise.all(projectTasks.map(async (task) => {
          console.log('🔍 Transforming task:', task.id, 'Raw task data:', JSON.stringify(task, null, 2));
          console.log('🔍 Task type fields:', {
            type: task.type,
            task_type: task.task_type,
            category: task.category,
            stage: task.stage,
            stage_id: task.stage_id
          });
          
          // Extract service information
          let service = null;
          if (task.service_role) {
            service = { name: task.service_role };
          } else if (task.assignments && task.assignments.length > 0 && task.assignments[0].service_role) {
            service = { name: task.assignments[0].service_role };
          } else if (task.service) {
            service = task.service;
          }
          
          // Extract member information - skip assignments endpoint due to permission issues
          // Use data already available from the main task endpoint
          let members = [];
          console.log('🔍 Skipping assignments endpoint due to permission restrictions');
          console.log('🔍 Available task data for members:', {
            assignments: task.assignments,
            user_id: task.user_id,
            users: task.users,
            user: task.user,
            members: task.members
          });
          
          // Fallback to existing data if assignments endpoint failed
          if (members.length === 0) {
            if (task.assignments && Array.isArray(task.assignments)) {
              members = task.assignments.map((assignment: any) => ({
                id: assignment.user_id,
                name: assignment.users?.name || assignment.user?.name || assignment.user_name || `User ${assignment.user_id.substring(0, 8)}`,
                user: assignment.users || assignment.user,
                service_role: assignment.service_role,
                image_url: assignment.users?.image_url || assignment.user?.image_url,
                primary_role: assignment.users?.primary_role || assignment.user?.primary_role
              }));
            } else if (task.user_id) {
              members = [{
                id: task.user_id,
                name: task.users?.name || task.user?.name || task.user_name || `User ${task.user_id.substring(0, 8)}`,
                user: task.users || task.user,
                service_role: task.service_role,
                image_url: task.users?.image_url || task.user?.image_url,
                primary_role: task.users?.primary_role || task.user?.primary_role
              }];
            } else if (task.members && Array.isArray(task.members)) {
              members = task.members;
            }
          }
          
          const transformedTask = {
            ...task,
            service,
            members,
            // Keep original fields for debugging
            service_role: task.service_role,
            user_id: task.user_id,
            assignments: task.assignments
          };
          
          console.log('🔍 Transformed task:', task.id, 'Service:', service, 'Members:', members);
          return transformedTask;
        }));
        
        console.log('📋 Transformed tasks:', transformedTasks.length);
        
        // Try to fetch user details for tasks that have user_ids but no names
        const tasksNeedingUserDetails = transformedTasks.filter(task => 
          task.members && task.members.some((member: any) => 
            member.name.includes('User ') && member.id
          )
        );
        
        if (tasksNeedingUserDetails.length > 0) {
          console.log('🔍 Fetching user details for tasks:', tasksNeedingUserDetails.length);
          // For now, we'll keep the user ID-based names, but in the future we could fetch actual user details
        }
      
      if (replaceExisting) {
        // Replace all tasks (used on initial load)
        setTasks(transformedTasks);
        console.log('✅ Tasks replaced in state');
      } else {
        // Merge with existing tasks (used for refresh)
        setTasks(prev => {
          const existingTaskIds = new Set(prev.map(t => t.id));
          const newTasks = transformedTasks.filter(t => !existingTaskIds.has(t.id));
          const merged = [...prev, ...newTasks];
          console.log('✅ Tasks merged in state, total:', merged.length);
          return merged;
        });
      }
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      if (replaceExisting) {
        setTasks([]);
      }
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleTabPress = (tab: string) => {
    if (tab === 'details') {
      onEditProjectDetails();
    } else {
      Alert.alert('Coming Soon', `${tab} feature will be available soon!`);
    }
  };

  const handleCreateTask = (stageId?: string) => {
    if (stageId) {
      setSelectedStage(stageId);
      setSelectedTaskType(stageId); // Use stage as task type
      setShowTaskCard(true);
    } else {
      setShowTaskTypeModal(true);
    }
  };

  const handleCreateTaskForStage = (stageId: string) => {
    return () => handleCreateTask(stageId);
  };

  const handleTaskTypeSelected = (taskType: string) => {
    setSelectedTaskType(taskType);
    setSelectedStage(taskType); // Set stage as well
    setShowTaskCard(true);
  };

  const handleTaskCreated = (task: any) => {
    // Add the new task to local state immediately for UI responsiveness
    setTasks(prev => [...prev, task]);
    setShowTaskCard(false);
    setSelectedTaskType('');
    
    // Don't reload from backend immediately - keep the local state
    // The task will persist in the UI with all the service information
    console.log('✅ Task added to local state, not reloading from backend');
  };

  const handleTaskCancel = () => {
    setShowTaskCard(false);
    setSelectedTaskType('');
  };

  const handleEditTask = (task: any) => {
    console.log('🔍 Editing task:', task);
    // TODO: Implement task editing
    Alert.alert('Edit Task', 'Task editing will be implemented soon!');
  };

  const handleDeleteTask = (task: any) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ Deleting task:', task.id);
            // Remove from local state
            setTasks(prev => prev.filter(t => t.id !== task.id));
            // TODO: Call API to delete from backend
          }
        }
      ]
    );
  };

  const handleToggleStageExpanded = (stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const getStageTasks = (stageId: string) => {
    console.log('🔍 Getting tasks for stage:', stageId);
    console.log('🔍 All tasks:', tasks);
    console.log('🔍 Task titles:', tasks.map(t => ({ 
      id: t.id, 
      title: t.title,
      type: t.type, 
      task_type: t.task_type,
      category: t.category,
      stage: t.stage,
      stage_id: t.stage_id
    })));
    
    const stageTasks = tasks.filter(task => {
      // Use task title as the primary categorization method
      // Fallback to type field for backward compatibility
      const taskTitle = task.title || '';
      const taskType = task.type || task.task_type || task.category || task.stage || task.stage_id || '';
      
      // Check if task title matches stage ID (e.g., "pre_production", "development")
      const matchesByTitle = taskTitle === stageId;
      const matchesByType = taskType === stageId;
      
      console.log(`🔍 Task ${task.id}: title="${taskTitle}" type="${taskType}" stage="${stageId}" - title match: ${matchesByTitle}, type match: ${matchesByType}`);
      
      return matchesByTitle || matchesByType;
    });
    
    console.log('🔍 Filtered tasks for stage', stageId, ':', stageTasks.length);
    return stageTasks;
  };

  const getStagesWithTasks = () => {
    const stages = [
      { id: 'development', name: 'Development', icon: 'create', color: '#6b7280' },
      { id: 'pre_production', name: 'Pre-production', icon: 'film', color: '#10b981' },
      { id: 'production', name: 'Production', icon: 'videocam', color: '#3b82f6' },
      { id: 'post_production', name: 'Post-production', icon: 'cut', color: '#8b5cf6' },
      { id: 'distribution', name: 'Distribution', icon: 'share', color: '#f59e0b' },
    ];

    // Only return stages that have tasks
    return stages.filter(stage => getStageTasks(stage.id).length > 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{project?.title || 'Project 1'}</Text>
        <TouchableOpacity 
          onPress={() => loadTasks(true)} 
          style={styles.refreshButton}
          disabled={isLoadingTasks}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={isLoadingTasks ? "#9ca3af" : "#000"} 
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Action Buttons Row */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.projectDetailsButton]}
            onPress={() => handleTabPress('details')}
          >
            <Ionicons name="document-text" size={24} color="#fff" />
            <Text style={styles.buttonText}>Project details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.adminRulesButton]}
            onPress={() => handleTabPress('admin')}
          >
            <Ionicons name="settings" size={24} color="#fff" />
            <Text style={styles.buttonText}>Admin Rules</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shootingTableButton]}
            onPress={() => handleTabPress('shooting')}
          >
            <Ionicons name="calendar" size={24} color="#fff" />
            <Text style={styles.buttonText}>Shooting Table</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.budgetButton]}
            onPress={() => handleTabPress('budget')}
          >
            <Ionicons name="wallet" size={24} color="#fff" />
            <Text style={styles.buttonText}>Project Budget</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.castSelectionButton]}
            onPress={() => handleTabPress('cast')}
          >
            <Ionicons name="link" size={24} color="#fff" />
            <Text style={styles.buttonText}>Cast Selection</Text>
          </TouchableOpacity>
        </View>

        {/* Project Stages - Only show stages with tasks */}
        {getStagesWithTasks().length > 0 ? (
          <View style={styles.stagesSection}>
            <Text style={styles.sectionTitle}>Project Stages</Text>
            {getStagesWithTasks().map((stage) => {
              const stageTasks = getStageTasks(stage.id);
              const isExpanded = expandedStages.has(stage.id);
              
              return (
                <View key={stage.id} style={styles.stageContainer}>
                  {/* Stage Header - Clickable to expand/collapse */}
                  <TouchableOpacity 
                    style={[styles.stageHeader, { backgroundColor: stage.color }]}
                    onPress={() => handleToggleStageExpanded(stage.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stageHeaderLeft}>
                      <Ionicons name={stage.icon as any} size={20} color="#fff" />
                      <Text style={styles.stageName}>{stage.name}</Text>
                    </View>
                    <View style={styles.stageHeaderRight}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>{stageTasks.length} TASK{stageTasks.length !== 1 ? 'S' : ''}</Text>
                      </View>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#fff" 
                        style={styles.stageExpandIcon} 
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Stage Content - Show tasks when expanded */}
                  {isExpanded && (
                    <View style={styles.stageContent}>
                      {isLoadingTasks ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#3b82f6" />
                          <Text style={styles.loadingText}>Loading tasks...</Text>
                        </View>
                      ) : stageTasks.length > 0 ? (
                        stageTasks.map((task) => (
                          <View key={task.id} style={styles.taskCard}>
                            <View style={styles.taskHeader}>
                              <Text style={styles.taskTitle}>
                                {task.description || task.title || 'Task'}
                              </Text>
                              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                                <Text style={styles.statusBadgeText}>{task.status?.toUpperCase() || 'PENDING'}</Text>
                              </View>
                            </View>
                            
                            {/* Service Assignment */}
                            {task.service && (
                              <View style={styles.assignmentInfo}>
                                <Ionicons name="briefcase" size={16} color="#6b7280" />
                                <Text style={styles.assignmentText}>Role: {task.service.name}</Text>
                              </View>
                            )}
                            
                            {/* Member Assignment - Show all assigned members */}
                            {task.members && task.members.length > 0 ? (
                              <View style={styles.assignmentInfo}>
                                <Ionicons name="people" size={16} color="#6b7280" />
                                <Text style={styles.assignmentText}>
                                  Users: {task.members.map((member: any) => {
                                    const name = member.name || member.user?.name || 'Unknown';
                                    const role = member.service_role || member.primary_role;
                                    return role ? `${name} (${role})` : name;
                                  }).join(', ')}
                                </Text>
                              </View>
                            ) : task.member && (
                              <View style={styles.assignmentInfo}>
                                <Ionicons name="person" size={16} color="#6b7280" />
                                <Text style={styles.assignmentText}>
                                  User: {(() => {
                                    const name = task.member.name || task.member.user?.name || 'Unknown';
                                    const role = task.member.service_role || task.member.primary_role;
                                    return role ? `${name} (${role})` : name;
                                  })()}
                                </Text>
                              </View>
                            )}
                            
                            
                            {/* Task Actions */}
                            <View style={styles.taskActions}>
                              <TouchableOpacity 
                                style={styles.taskActionButton}
                                onPress={() => handleEditTask(task)}
                              >
                                <Ionicons name="create" size={16} color="#3b82f6" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={styles.taskActionButton}
                                onPress={() => handleDeleteTask(task)}
                              >
                                <Ionicons name="trash" size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.noTasksContainer}>
                          <Text style={styles.noTasksText}>No tasks yet</Text>
                        </View>
                      )}
                      
                      {/* Add Task Button for this stage */}
                      <TouchableOpacity
                        style={styles.addTaskButton}
                        onPress={handleCreateTaskForStage(stage.id)}
                      >
                        <Ionicons name="add" size={20} color="#6b7280" />
                        <Text style={styles.addTaskButtonText}>Add Task</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          /* Fallback: Show all tasks if no stages have tasks */
          tasks.length > 0 && (
            <View style={styles.stagesSection}>
              <Text style={styles.sectionTitle}>All Tasks</Text>
              <View style={styles.stageContainer}>
                <View style={[styles.stageHeader, { backgroundColor: '#6b7280' }]}>
                  <View style={styles.stageHeaderLeft}>
                    <Ionicons name="list" size={20} color="#fff" />
                    <Text style={styles.stageName}>All Tasks ({tasks.length})</Text>
                  </View>
                </View>
                <View style={styles.stageContent}>
                  {isLoadingTasks ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text style={styles.loadingText}>Loading tasks...</Text>
                    </View>
                  ) : tasks.length > 0 ? (
                    tasks.map((task) => (
                      <View key={task.id} style={styles.taskCard}>
                        <View style={styles.taskHeader}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                            <Text style={styles.statusBadgeText}>{task.status?.toUpperCase() || 'PENDING'}</Text>
                          </View>
                        </View>
                        
                        {/* Service Assignment */}
                        {task.service && (
                          <View style={styles.assignmentInfo}>
                            <Ionicons name="briefcase" size={16} color="#6b7280" />
                            <Text style={styles.assignmentText}>Role: {task.service.name}</Text>
                          </View>
                        )}
                        
                        {/* Member Assignment - Show all assigned members */}
                        {task.members && task.members.length > 0 ? (
                          <View style={styles.assignmentInfo}>
                            <Ionicons name="people" size={16} color="#6b7280" />
                            <Text style={styles.assignmentText}>
                              Users: {task.members.map((member: any) => {
                                const name = member.name || member.user?.name || 'Unknown';
                                const role = member.service_role || member.primary_role;
                                return role ? `${name} (${role})` : name;
                              }).join(', ')}
                            </Text>
                          </View>
                        ) : task.member && (
                          <View style={styles.assignmentInfo}>
                            <Ionicons name="person" size={16} color="#6b7280" />
                            <Text style={styles.assignmentText}>
                              User: {(() => {
                                const name = task.member.name || task.member.user?.name || 'Unknown';
                                const role = task.member.service_role || task.member.primary_role;
                                return role ? `${name} (${role})` : name;
                              })()}
                            </Text>
                          </View>
                        )}
                        
                        
                        {/* Task Actions */}
                        <View style={styles.taskActions}>
                          <TouchableOpacity 
                            style={styles.taskActionButton}
                            onPress={() => handleEditTask(task)}
                          >
                            <Ionicons name="create" size={16} color="#3b82f6" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.taskActionButton}
                            onPress={() => handleDeleteTask(task)}
                          >
                            <Ionicons name="trash" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noTasksContainer}>
                      <Text style={styles.noTasksText}>No tasks yet</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )
        )}

        {/* Show Task Card if creating a new task */}
        {showTaskCard && (
          <View style={styles.taskCardContainer}>
            <TaskCard
              taskType={selectedTaskType}
              projectId={project.id}
              onTaskCreated={handleTaskCreated}
              onCancel={handleTaskCancel}
            />
          </View>
        )}

        {/* Create Task Button - Only show if not currently creating a task */}
        {!showTaskCard && (
          <TouchableOpacity
            style={styles.createTaskButton}
            onPress={() => handleCreateTask()}
          >
            <Text style={styles.createTaskText}>Create Task</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Task Type Modal */}
      <TaskTypeModal
        visible={showTaskTypeModal}
        onClose={() => setShowTaskTypeModal(false)}
        onSelectType={handleTaskTypeSelected}
      />
    </SafeAreaView>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  projectDetailsButton: {
    backgroundColor: '#6b7280',
  },
  adminRulesButton: {
    backgroundColor: '#f59e0b',
  },
  shootingTableButton: {
    backgroundColor: '#3b82f6',
  },
  budgetButton: {
    backgroundColor: '#10b981',
  },
  castSelectionButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 10,
  },
  createTaskButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  createTaskText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stagesSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  stageContainer: {
    marginBottom: 16,
  },
  stageHeader: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stageName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  stageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stageMenuIcon: {
    marginHorizontal: 4,
  },
  stageContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    flex: 1,
  },
  assignmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  taskCardContainer: {
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  noTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noTasksText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  taskActionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  addTaskButtonText: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  stageExpandIcon: {
    marginLeft: 8,
  },
  debugInfo: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    marginTop: 8,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
});

export default ProjectDashboard;
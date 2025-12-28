import React, { useState, useEffect, useMemo } from 'react';
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
import TaskEditModal from './TaskEditModal';
import SimplifiedTaskCard from './SimplifiedTaskCard';
import { useApi } from '../contexts/ApiContext';
import { spacing, semanticSpacing } from '../constants/spacing';

interface ProjectDashboardProps {
  project: any;
  onBack: () => void;
  onEditProjectDetails: () => void;
  onRefreshProject?: () => void;
  selectedUser?: any; // User to automatically add to a task
  addUserToTask?: boolean; // Flag to indicate if user should be added to task
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  project,
  onBack,
  onEditProjectDetails,
  onRefreshProject,
  selectedUser,
  addUserToTask,
}) => {
  console.log('📊 ProjectDashboard initialized:', {
    hasSelectedUser: !!selectedUser,
    selectedUser: selectedUser ? { id: selectedUser.id, name: selectedUser.name } : null,
    addUserToTask,
    projectId: project?.id
  });
  
  const { getProjectById, getProjectTasks, getTaskAssignments, fetchCompleteUserProfile, getUsersDirect, updateTask, deleteTask } = useApi();
  const [selectedTab, setSelectedTab] = useState('details');
  const [showTaskTypeModal, setShowTaskTypeModal] = useState(false);
  const [showTaskCard, setShowTaskCard] = useState(false);
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [newTaskCards, setNewTaskCards] = useState<any[]>([]); // Track new task cards being created

  // Load tasks when component mounts
  useEffect(() => {
    // Run both in parallel for better performance
    Promise.all([
      loadProjectData(),
      loadTasks(true)
    ]).catch(error => {
      console.error('Failed to load project data:', error);
    });
  }, [project.id]);

  // Automatically create a new task card when addUserToTask is true and selectedUser is provided
  useEffect(() => {
    if (addUserToTask && selectedUser && newTaskCards.length === 0) {
      console.log('🎯 Auto-creating task card for selected user:', {
        userId: selectedUser.id,
        userName: selectedUser.name,
        addUserToTask
      });
      // Create a new task card automatically
      setNewTaskCards([{ id: Date.now() }]);
    }
  }, [addUserToTask, selectedUser]);

  const loadProjectData = async () => {
    try {
      // Only refresh if we need the latest data, otherwise use the project prop
      // The project data is already loaded in App.tsx before navigation
      if (onRefreshProject) {
        const latestData = await getProjectById(project.id);
        onRefreshProject(); // Let parent handle the update
      }
    } catch (error) {
      console.error('❌ Failed to load latest project data:', error);
    }
  };

  const loadTasks = async (replaceExisting = false) => {
    if (!project.id) return;
    
    setIsLoadingTasks(true);
    try {
      
      // Use getProjectTasks() to get tasks with full assignment.user structure
      // This endpoint: GET /api/projects/{projectId}/tasks returns assignments with full user objects
      let projectTasks: any[] = [];
      
      try {
        // Use the dedicated tasks endpoint which has the updated structure with assignment.user
        projectTasks = await getProjectTasks(project.id);
        
        // Log summary only (reduced logging for performance)
        if (projectTasks.length > 0 && projectTasks[0].assignments?.length > 0) {
          console.log(`📋 Loaded ${projectTasks.length} tasks with assignments`);
        }

        
      } catch (taskError) {
        console.error(' Failed to load tasks:', taskError);
        // Fallback: try getting tasks from project data if dedicated endpoint fails
        try {
          const projectData = await getProjectById(project.id);
          projectTasks = projectData.tasks || [];
          console.log(' Using tasks from getProjectById (fallback)');
        } catch (projectError) {
          console.error(' Failed to load tasks from project data:', projectError);
        }
      }
        
      // Transform tasks to include service and member data
      // OPTIMIZATION: Use assignments already in task data first, only fetch if missing
      // This avoids N+1 query problem - getProjectTasks already includes assignments
      let transformedTasks = await Promise.all(projectTasks.map(async (task) => {
          // First, try to use assignments that are already in the task object
          let assignmentsWithStatus: any[] = task.assignments || [];
          
          // Only fetch if assignments are missing, incomplete, or don't have status
          const needsStatusCheck = assignmentsWithStatus.length > 0 && 
            assignmentsWithStatus.some((a: any) => !a.status);
          
          if (assignmentsWithStatus.length === 0 || needsStatusCheck) {
            try {
              const assignmentsResponse = await getTaskAssignments(project.id, task.id);
              if (assignmentsResponse.success && assignmentsResponse.data) {
                const fetchedAssignments = Array.isArray(assignmentsResponse.data) 
                  ? assignmentsResponse.data 
                  : (assignmentsResponse.data.assignments || []);
                
                // If we had assignments but they were missing status, merge them
                if (needsStatusCheck && assignmentsWithStatus.length > 0) {
                  // Merge by ID, preferring fetched data for status
                  const fetchedMap = new Map(fetchedAssignments.map((a: any) => [a.id, a]));
                  assignmentsWithStatus = assignmentsWithStatus.map((a: any) => {
                    const fetched = fetchedMap.get(a.id);
                    return fetched ? { ...a, ...fetched } : a;
                  });
                } else {
                  assignmentsWithStatus = fetchedAssignments;
                }
                
                if (fetchedAssignments.length > 0) {
                  console.log(`✅ Fetched ${fetchedAssignments.length} assignments with status for task ${task.id}`);
                }
              } else {
                // Keep existing assignments if fetch fails
                console.log(`⚠️ getTaskAssignments failed for task ${task.id}, using existing assignments`);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to fetch assignments for task ${task.id}:`, error);
              // Keep existing assignments on error
            }
          } else {
            // Assignments already exist with status - no need to fetch
            console.log(`✅ Using existing assignments for task ${task.id} (${assignmentsWithStatus.length} assignments)`);
          }

          // Extract service information
          let service = null;
          if (task.service_role) {
            service = { name: task.service_role };
          } else if (assignmentsWithStatus.length > 0 && assignmentsWithStatus[0].service_role) {
            service = { name: assignmentsWithStatus[0].service_role };
          } else if (task.service) {
            service = task.service;
          }
          
          // Extract member information from assignments
          let members = [];
          
          // Extract member information from assignments
          // Based on library types, TaskAssignment has an optional user object
          if (members.length === 0) {
            if (assignmentsWithStatus && Array.isArray(assignmentsWithStatus)) {
              // Backend now returns assignment.user with full details
              members = assignmentsWithStatus.map((assignment: any) => {
                const userId = assignment.user_id || assignment.user?.id;
                
                // Helper function to validate if a name is a placeholder
                const isPlaceholderName = (name: string | null | undefined): boolean => {
                  if (!name) return true;
                  const nameTrimmed = name.trim();
                  return nameTrimmed.startsWith('User ') && nameTrimmed.length > 10;
                };
                
                // Priority 1: assignment.user (backend standard structure - NEW)
                let userName = null;
                let userObj = null;
                
                if (assignment.user && assignment.user.name) {
                  userName = assignment.user.name;
                  userObj = assignment.user;
                }
                // Priority 2: assignment.users (legacy/alternative structure)
                else if (assignment.users && assignment.users.name) {
                  userName = assignment.users.name;
                  userObj = assignment.users;
                }
                // Priority 3: assignment.user_name (direct field)
                else if (assignment.user_name) {
                  userName = assignment.user_name;
                }
                // Priority 4: User object exists but name is missing
                else if (assignment.user && assignment.user.id) {
                  userName = null;
                  userObj = assignment.user;
                }
                // Fallback: No user data
                else if (userId) {
                  userName = null;
                }
                
                // Determine final name and fetch flag
                const finalName = userName || `User ${userId?.substring(0, 8) || 'Unknown'}`;
                const shouldFetch = !userName || isPlaceholderName(finalName);
                
                return {
                  id: userId,
                  name: finalName,
                  user: userObj || assignment.user || assignment.users,
                  service_role: assignment.service_role,
                  image_url: userObj?.image_url || assignment.user?.image_url || assignment.users?.image_url,
                  primary_role: userObj?.primary_role || assignment.user?.primary_role || assignment.users?.primary_role,
                  needsUserFetch: shouldFetch
                };
              });
            } else if (task.user_id) {
              members = [{
                id: task.user_id,
                name: task.user?.name || task.users?.name || task.user_name || `User ${task.user_id.substring(0, 8)}`,
                user: task.user || task.users,
                service_role: task.service_role,
                image_url: task.user?.image_url || task.users?.image_url,
                primary_role: task.user?.primary_role || task.users?.primary_role,
                needsUserFetch: !task.user?.name && !task.users?.name && task.user_id
              }];
            } else if (task.members && Array.isArray(task.members)) {
              // If task.members already has the data, use it but ensure proper structure
              members = task.members.map((member: any) => ({
                ...member,
                name: member.name || member.user?.name || (member.id ? `User ${member.id.substring(0, 8)}` : 'Unknown'),
                needsUserFetch: !member.name && !member.user?.name && member.id
              }));
            }
          }
          
          // CRITICAL: Use assignments fetched via getTaskAssignments (includes status)
          // Map assignments to ensure proper structure with status
          const finalAssignments = assignmentsWithStatus.map((assignment: any) => {
            const status = assignment.status || 'pending';
            return {
              ...assignment,
              status: status, // Status is included from getTaskAssignments (select('*'))
            };
          });

          return {
            ...task,
            service,
            members,
            service_role: task.service_role,
            user_id: task.user_id,
            assignments: finalAssignments // Use assignments with status from getTaskAssignments
          };
        }));
        
        // OPTIMIZATION: Show tasks immediately, fetch user names in background
        // This prevents blocking the UI while user names are being fetched
        if (replaceExisting) {
          // Replace all tasks (used on initial load) - show immediately
          setTasks(transformedTasks);
        } else {
          // Merge with existing tasks (used for refresh)
          setTasks(prev => {
            const existingTaskIds = new Set(prev.map(t => t.id));
            const newTasks = transformedTasks.filter(t => !existingTaskIds.has(t.id));
            return [...prev, ...newTasks];
          });
        }
        
        // Fetch user details in background (non-blocking)
        // Only fetch if name is missing or it's clearly a placeholder
        const isPlaceholderName = (name: string | null | undefined): boolean => {
          if (!name) return true;
          const nameTrimmed = name.trim();
          return nameTrimmed.startsWith('User ') && nameTrimmed.length > 10;
        };
        
        // Collect unique user IDs that need names (only if truly missing)
        const userIdsToFetch = new Set<string>();
        transformedTasks.forEach(task => {
          task.members?.forEach((member: any) => {
            if (member.id) {
              const currentName = member.name || member.user?.name;
              const isPlaceholder = isPlaceholderName(currentName);
              const hasNoName = !currentName;
              // Only fetch if name is truly missing - most assignments already have user.name
              if (hasNoName || (isPlaceholder && !member.user?.name)) {
                userIdsToFetch.add(member.id);
              }
            }
          });
        });
        
        // Fetch user names in background (non-blocking, updates UI as they arrive)
        if (userIdsToFetch.size > 0) {
          // Don't await - let it run in background
          Promise.all(Array.from(userIdsToFetch).slice(0, 10).map(async (userId) => {
            try {
              // Only fetch if we don't already have the user data
              const userProfile = await fetchCompleteUserProfile(userId);
              if (userProfile?.name && !isPlaceholderName(userProfile.name)) {
                // Update tasks with fetched user name
                setTasks(prevTasks => prevTasks.map(task => {
                  if (!task.members) return task;
                  const updatedMembers = task.members.map((member: any) => {
                    if (member.id === userId) {
                      return {
                        ...member,
                        name: userProfile.name,
                        user: userProfile,
                        image_url: userProfile.image_url || userProfile.about?.image_url || member.image_url,
                        primary_role: userProfile.primary_role || member.primary_role,
                      };
                    }
                    return member;
                  });
                  return { ...task, members: updatedMembers };
                }));
              }
            } catch (error) {
              // Silently fail - placeholder name is fine
            }
          })).catch(() => {
            // Ignore errors - UI already shows placeholder names
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
  };

  const handleTaskCancel = () => {
    setShowTaskCard(false);
    setSelectedTaskType('');
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setShowTaskEditModal(true);
  };

  const handleTaskUpdated = (updatedTask: any) => {
    // Update the task in local state
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setShowTaskEditModal(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = async (task: any) => {
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
              // Call API to delete from backend
              await deleteTask(task.id);
              // Remove from local state on success
              setTasks(prev => prev.filter(t => t.id !== task.id));
            } catch (error: any) {
              Alert.alert(
                'Delete Failed',
                error?.message || 'Failed to delete task. Please try again.',
                [{ text: 'OK' }]
              );
            }
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

  // Memoize stage tasks to avoid recalculating on every render
  const stageTasksMap = useMemo(() => {
    const map = new Map<string, any[]>();
    const stages = ['development', 'pre_production', 'production', 'post_production', 'distribution'];
    
    stages.forEach(stageId => {
      const stageTasks = tasks.filter(task => {
        const taskTitle = task.title || '';
        const taskType = task.type || task.task_type || task.category || task.stage || task.stage_id || '';
        return taskTitle === stageId || taskType === stageId;
      });
      map.set(stageId, stageTasks);
    });
    
    return map;
  }, [tasks]);

  const getStageTasks = (stageId: string) => {
    return stageTasksMap.get(stageId) || [];
  };

  // Memoize stages with tasks to avoid recalculating on every render
  const stagesWithTasks = useMemo(() => {
    const stages = [
      { id: 'development', name: 'Development', icon: 'create', color: '#6b7280' },
      { id: 'pre_production', name: 'Pre-production', icon: 'film', color: '#10b981' },
      { id: 'production', name: 'Production', icon: 'videocam', color: '#3b82f6' },
      { id: 'post_production', name: 'Post-production', icon: 'cut', color: '#8b5cf6' },
      { id: 'distribution', name: 'Distribution', icon: 'share', color: '#f59e0b' },
    ];

    // Only return stages that have tasks
    return stages.filter(stage => (stageTasksMap.get(stage.id) || []).length > 0);
  }, [stageTasksMap]);

  const getStagesWithTasks = () => stagesWithTasks;

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
          onPress={() => {
            loadTasks(true);
            if (onRefreshProject) {
              onRefreshProject();
            }
          }} 
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
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.adminRulesButton]}
            onPress={() => handleTabPress('admin')}
          >
            <Ionicons name="settings" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shootingTableButton]}
            onPress={() => handleTabPress('shooting')}
          >
            <Ionicons name="calendar" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.budgetButton]}
            onPress={() => handleTabPress('budget')}
          >
            <Ionicons name="wallet" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.castSelectionButton]}
            onPress={() => handleTabPress('cast')}
          >
            <Ionicons name="link" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Project Stages - Group tasks by stage */}
        {getStagesWithTasks().length > 0 ? (
          <View style={styles.stagesSection}>
            {getStagesWithTasks().map((stage) => {
              const stageTasks = getStageTasks(stage.id);
              const isExpanded = expandedStages.has(stage.id);
              
              return (
                <View key={stage.id} style={styles.stageContainer}>
                  {/* Stage Header - Clickable to expand/collapse */}
                  <TouchableOpacity 
                    style={[styles.stageHeader, { backgroundColor: '#000' }]}
                    onPress={() => handleToggleStageExpanded(stage.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stageHeaderLeft}>
                      <Ionicons name="checkbox" size={20} color="#fff" />
                      <Text style={styles.stageName}>{stage.name} ({stageTasks.length})</Text>
                    </View>
                    <View style={styles.stageHeaderRight}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>Pending</Text>
                      </View>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#fff" 
                        style={styles.stageExpandIcon} 
                      />
                      <TouchableOpacity
                        style={styles.stageMenuIcon}
                        onPress={(e) => {
                          e.stopPropagation();
                          // Handle stage menu
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                      </TouchableOpacity>
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
                        stageTasks.map((task) => {
          // Transform task data to match SimplifiedTaskCard format
          const assignments = (task.assignments || []).map((assignment: any) => {
            const status = assignment.status || 'pending';
            return {
              id: assignment.id || Date.now().toString(),
              service: assignment.service || { name: assignment.service_role },
              user: assignment.user || { id: assignment.user_id, name: assignment.user?.name || 'Unknown' },
                              status: status,
            };
          });

          const taskType = task.type || task.task_type || task.title?.toLowerCase()?.replace(/\s+/g, '_');
          
                          return (
                            <SimplifiedTaskCard
                              key={task.id}
                              projectId={project.id}
                              project={project}
                              existingTask={{
                                ...task,
                                type: taskType,
                                task_type: taskType,
                                assignments,
                              }}
                              selectedUser={addUserToTask ? selectedUser : undefined}
                              onTaskCreated={(updatedTask) => {
                                const taskWithType = {
                                  ...task,
                                  ...updatedTask,
                                  type: updatedTask.type || taskType || task.type || task.task_type,
                                  task_type: updatedTask.task_type || taskType || task.task_type || task.type,
                                  id: updatedTask.id || task.id,
                                  assignments: updatedTask.assignments || task.assignments,
                                };
                                setTasks(prev => prev.map(t => t.id === taskWithType.id ? taskWithType : t));
                              }}
                              onDelete={(taskId) => {
                                setTasks(prev => prev.filter(t => t.id !== taskId));
                              }}
                            />
                          );
                        })
                      ) : (
                        <View style={styles.noTasksContainer}>
                          <Text style={styles.noTasksText}>No tasks yet</Text>
                        </View>
                      )}
                      
                      {/* Add Task Button for this stage */}
                      <TouchableOpacity
                        style={styles.addTaskButton}
                        onPress={() => {
                          // Add a new task card for this stage
                          if (newTaskCards.length === 0) {
                            setNewTaskCards(prev => [...prev, { id: Date.now(), stageId: stage.id }]);
                          }
                        }}
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
              {tasks.map((task) => {
                const assignments = (task.assignments || []).map((assignment: any) => {
                  const status = assignment.status || 'pending';
                  
                  // Extract company with proper name handling
                  let company = null;
                  if (assignment.company) {
                    company = {
                      ...assignment.company,
                      id: assignment.company.id || assignment.company_id,
                      name: assignment.company.name || 'Unknown Company',
                    };
                  } else if (assignment.company_id) {
                    company = { id: assignment.company_id, name: 'Unknown Company' };
                  }
                  
                  return {
                    id: assignment.id || Date.now().toString(),
                    service: assignment.service || { name: assignment.service_role },
                    user: assignment.user || (assignment.user_id ? { id: assignment.user_id, name: assignment.user?.name || 'Unknown' } : null),
                    company: company,
                    status: status,
                  };
                });

                const taskType = task.type || task.task_type || task.title?.toLowerCase()?.replace(/\s+/g, '_');

          return (
            <SimplifiedTaskCard
              key={task.id}
              projectId={project.id}
              project={project}
              existingTask={{
                ...task,
                      type: taskType,
                      task_type: taskType,
                assignments,
              }}
              selectedUser={addUserToTask ? selectedUser : undefined}
              onTaskCreated={(updatedTask) => {
                const taskWithType = {
                        ...task,
                        ...updatedTask,
                  type: updatedTask.type || taskType || task.type || task.task_type,
                  task_type: updatedTask.task_type || taskType || task.task_type || task.type,
                        id: updatedTask.id || task.id,
                  assignments: updatedTask.assignments || task.assignments,
                };
                      setTasks(prev => prev.map(t => t.id === taskWithType.id ? taskWithType : t));
              }}
              onDelete={(taskId) => {
                setTasks(prev => prev.filter(t => t.id !== taskId));
              }}
            />
          );
        })}
            </View>
          )
        )}

        {/* Show new task cards being created - grouped by stage */}
        {getStagesWithTasks().map((stage) => {
          const stageNewTaskCards = newTaskCards.filter(card => card.stageId === stage.id);
          if (stageNewTaskCards.length === 0) return null;
          
          const isExpanded = expandedStages.has(stage.id);
          if (!isExpanded) return null;
          
          return (
            <View key={`new-tasks-${stage.id}`} style={styles.stageContent}>
              {stageNewTaskCards.map((taskCard) => (
          <SimplifiedTaskCard
            key={`new-task-${taskCard.id}`}
            projectId={project.id}
            project={project}
            isNewTask={true}
            selectedUser={addUserToTask ? selectedUser : undefined}
                  existingTask={{
                    type: stage.id,
                    task_type: stage.id,
                  }}
                  onTaskCreated={(newTask) => {
                    setTasks(prev => [...prev, newTask]);
                    setNewTaskCards(prev => prev.filter((card) => card.id !== taskCard.id));
                  }}
                  onCancel={() => {
                    setNewTaskCards(prev => prev.filter((card) => card.id !== taskCard.id));
                  }}
                />
              ))}
            </View>
          );
        })}
        
        {/* Show new task cards for stages without tasks */}
        {newTaskCards.filter(card => !card.stageId || getStagesWithTasks().findIndex(s => s.id === card.stageId) === -1).map((taskCard) => (
          <SimplifiedTaskCard
            key={`new-task-${taskCard.id}`}
            projectId={project.id}
            project={project}
            isNewTask={true}
            selectedUser={addUserToTask ? selectedUser : undefined}
            onTaskCreated={(newTask) => {
              setTasks(prev => [...prev, newTask]);
              setNewTaskCards(prev => prev.filter((card) => card.id !== taskCard.id));
            }}
            onCancel={() => {
              setNewTaskCards(prev => prev.filter((card) => card.id !== taskCard.id));
            }}
          />
        ))}

      </ScrollView>

      {/* Big Create Task Button at Bottom - Fixed Position */}
      <TouchableOpacity
        style={[styles.bigCreateTaskButton, newTaskCards.length > 0 && styles.bigCreateTaskButtonDisabled]}
        onPress={() => {
          // Only allow one empty task card at a time
          if (newTaskCards.length === 0) {
            setNewTaskCards(prev => [...prev, { id: Date.now() }]);
          }
        }}
        disabled={newTaskCards.length > 0}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Task Type Modal */}
      <TaskTypeModal
        visible={showTaskTypeModal}
        onClose={() => setShowTaskTypeModal(false)}
        onSelectType={handleTaskTypeSelected}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        visible={showTaskEditModal}
        onClose={() => {
          setShowTaskEditModal(false);
          setSelectedTask(null);
        }}
        onSave={handleTaskUpdated}
        task={selectedTask}
        projectId={project.id}
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
    paddingHorizontal: semanticSpacing.headerPadding,
    paddingTop: semanticSpacing.headerPaddingVertical,
    paddingBottom: 0, // No bottom padding - buttonsRow will handle spacing
  },
  backButton: {
    padding: semanticSpacing.buttonPadding,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: semanticSpacing.sectionGap,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingTop: 0, // No top padding - header already has spacing
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingBottom: semanticSpacing.containerPadding,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm, // Small top margin (8px) for spacing from header
    marginBottom: semanticSpacing.sectionGap, // Reduced from sectionGapLarge to sectionGap (16 → 12)
    paddingHorizontal: spacing.xs,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  projectDetailsButton: {
    backgroundColor: '#3b82f6', // Blue for Project details
  },
  adminRulesButton: {
    backgroundColor: '#6b7280', // Gray
  },
  shootingTableButton: {
    backgroundColor: '#6b7280', // Gray
  },
  budgetButton: {
    backgroundColor: '#6b7280', // Gray
  },
  castSelectionButton: {
    backgroundColor: '#6b7280', // Gray
  },
  buttonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 10,
  },
  createTaskButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: semanticSpacing.sectionGapLarge,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    marginBottom: semanticSpacing.sectionGapLarge,
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
  bigCreateTaskButton: {
    position: 'absolute',
    bottom: semanticSpacing.sectionGapLarge,
    right: semanticSpacing.sectionGapLarge,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  bigCreateTaskButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  stagesSection: {
    marginTop: semanticSpacing.sectionGapLarge,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: semanticSpacing.sectionGapLarge,
  },
  stageContainer: {
    marginBottom: semanticSpacing.sectionGapLarge,
  },
  stageHeader: {
    borderRadius: 8,
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: semanticSpacing.headerPaddingVertical,
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
    marginLeft: semanticSpacing.containerPadding,
  },
  stageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: semanticSpacing.containerPadding,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: semanticSpacing.buttonPadding,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stageMenuIcon: {
    marginHorizontal: spacing.xs,
  },
  stageContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: spacing.xs,
    padding: semanticSpacing.containerPadding,
  },
  taskCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: semanticSpacing.containerPadding,
    marginBottom: semanticSpacing.cardMargin,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: semanticSpacing.containerPadding,
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
    marginBottom: semanticSpacing.buttonPadding,
  },
  assignmentText: {
    marginLeft: semanticSpacing.buttonPadding,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  taskCardContainer: {
    marginBottom: semanticSpacing.sectionGapLarge,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginLeft: semanticSpacing.buttonPadding,
    fontSize: 14,
    color: '#6b7280',
  },
  noTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  noTasksText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  refreshButton: {
    padding: semanticSpacing.buttonPadding,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: semanticSpacing.buttonPadding,
    gap: semanticSpacing.buttonPadding,
  },
  taskActionButton: {
    padding: semanticSpacing.tightPadding,
    borderRadius: spacing.xs,
    backgroundColor: '#f3f4f6',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: semanticSpacing.containerPadding,
    marginTop: semanticSpacing.buttonPadding,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    minHeight: 48,
  },
  addTaskButtonText: {
    marginLeft: semanticSpacing.buttonPadding,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  stageExpandIcon: {
    marginLeft: semanticSpacing.buttonPadding,
  },
  debugInfo: {
    backgroundColor: '#f3f4f6',
    padding: semanticSpacing.buttonPadding,
    marginTop: semanticSpacing.buttonPadding,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
});

export default ProjectDashboard;
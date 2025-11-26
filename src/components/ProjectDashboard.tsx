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
    loadProjectData(); // Load latest project data
    loadTasks(true); // Replace existing tasks on initial load
  }, [project.id]);

  const loadProjectData = async () => {
    try {
      await getProjectById(project.id);
      // Note: We can't update the project prop directly, but we can use this data for display
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
        
        // Log raw assignment structure from API
        if (projectTasks.length > 0 && projectTasks[0].assignments?.length > 0) {
          console.log('📋 TASK ASSIGNMENTS (FROM GET /api/projects/{id}/tasks):');
          projectTasks[0].assignments.forEach((assignment: any, idx: number) => {
            // Log FULL assignment object to see all available fields
            console.log(`  Assignment ${idx + 1} FULL OBJECT:`, JSON.stringify(assignment, null, 2));
            console.log(`  Assignment ${idx + 1} SUMMARY:`, {
              id: assignment.id,
              user_id: assignment.user_id,
              hasUser: !!assignment.user,
              userName: assignment.user?.name || 'MISSING',
              user_id_from_user: assignment.user?.id,
              service_role: assignment.service_role,
              status: assignment.status || 'MISSING STATUS', // CRITICAL: Log status from backend
              allKeys: Object.keys(assignment), // Show all available keys
            });
          });
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
      // CRITICAL: Use getTaskAssignments() to get assignments with status
      let transformedTasks = await Promise.all(projectTasks.map(async (task) => {
          // Fetch assignments with status using getTaskAssignments (includes status via select('*'))
          let assignmentsWithStatus: any[] = [];
          try {
            const assignmentsResponse = await getTaskAssignments(project.id, task.id);
            if (assignmentsResponse.success && assignmentsResponse.data) {
              assignmentsWithStatus = Array.isArray(assignmentsResponse.data) 
                ? assignmentsResponse.data 
                : (assignmentsResponse.data.assignments || []);
              console.log(`✅ Fetched ${assignmentsWithStatus.length} assignments with status for task ${task.id}`);
            } else {
              // Fallback to assignments from task if getTaskAssignments fails
              assignmentsWithStatus = task.assignments || [];
              console.log(`⚠️ getTaskAssignments failed for task ${task.id}, using fallback`);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to fetch assignments for task ${task.id}:`, error);
            // Fallback to assignments from task
            assignmentsWithStatus = task.assignments || [];
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
                  console.log(`✅ Task ${task.id} → Assignment ${assignment.id || 'unknown'}: Found name "${userName}" from assignment.user`);
                }
                // Priority 2: assignment.users (legacy/alternative structure)
                else if (assignment.users && assignment.users.name) {
                  userName = assignment.users.name;
                  userObj = assignment.users;
                  console.log(`✅ Task ${task.id} → Assignment ${assignment.id || 'unknown'}: Found name "${userName}" from assignment.users`);
                }
                // Priority 3: assignment.user_name (direct field)
                else if (assignment.user_name) {
                  userName = assignment.user_name;
                  console.log(`✅ Task ${task.id} → Assignment ${assignment.id || 'unknown'}: Found name "${userName}" from assignment.user_name`);
                }
                // Priority 4: User object exists but name is missing
                else if (assignment.user && assignment.user.id) {
                  userName = null;
                  userObj = assignment.user;
                  console.log(`⚠️ Task ${task.id} → Assignment ${assignment.id || 'unknown'}: User object exists but no name for ${userId}`);
                }
                // Fallback: No user data
                else if (userId) {
                  userName = null;
                  console.log(`⚠️ Task ${task.id} → Assignment ${assignment.id || 'unknown'}: No user data found for ${userId}`);
                }
                
                // Determine final name and fetch flag
                const finalName = userName || `User ${userId?.substring(0, 8) || 'Unknown'}`;
                const shouldFetch = !userName || isPlaceholderName(finalName);
                
                if (shouldFetch && userId) {
                  console.log(`🔍 Task ${task.id} → Will fetch user ${userId} (current: "${finalName}")`);
                }
                
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
            console.log(`📋 Task ${task.id} → Assignment ${assignment.id}: status="${status}" (from getTaskAssignments)`);
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
        
        // Fetch user details for tasks that have user_ids but no proper names
        // Only fetch if name is missing or it's clearly a placeholder (starts with "User " + ID)
        const isPlaceholderName = (name: string | null | undefined): boolean => {
          if (!name) return true;
          const nameTrimmed = name.trim();
          return nameTrimmed.startsWith('User ') && nameTrimmed.length > 10; // "User " + 8+ chars
        };
        
        // Filter tasks that need user fetching - only for missing names or placeholder names
        const tasksNeedingUserDetails = transformedTasks.filter(task => 
          task.members && task.members.some((member: any) => {
            if (!member.id) return false;
            
            const currentName = member.name || member.user?.name;
            const isPlaceholder = isPlaceholderName(currentName);
            const hasNoName = !currentName;
            return member.needsUserFetch || isPlaceholder || hasNoName;
          })
        );
        
        if (tasksNeedingUserDetails.length > 0) {
          // Collect all unique user IDs that need names
          const userIdsToFetch = new Set<string>();
          tasksNeedingUserDetails.forEach(task => {
            task.members?.forEach((member: any) => {
              if (member.id) {
                const currentName = member.name || member.user?.name;
                const isPlaceholder = isPlaceholderName(currentName);
                const hasNoName = !currentName;
                const shouldFetch = member.needsUserFetch || isPlaceholder || hasNoName;
                
                if (shouldFetch) {
                  userIdsToFetch.add(member.id);
                }
              }
            });
          });
          
          if (userIdsToFetch.size > 0) {
            console.log(`🔍 Fetching ${userIdsToFetch.size} user names:`, Array.from(userIdsToFetch).map(id => id.substring(0, 8)).join(', '));
          }
          
          // Fetch user details for all missing users
          const userDetailsMap = new Map<string, any>();
          await Promise.all(Array.from(userIdsToFetch).map(async (userId) => {
            try {
              // Try to fetch complete user profile
              const userProfile = await fetchCompleteUserProfile(userId);
              if (userProfile && userProfile.name && !isPlaceholderName(userProfile.name)) {
                userDetailsMap.set(userId, userProfile);
                console.log(`✅ Fetched name for ${userId.substring(0, 8)}: "${userProfile.name}"`);
              }
            } catch (error) {
              // Try alternative method - get all users and find the one we need
              try {
                const usersResponse = await getUsersDirect({ limit: 1000 });
                if (usersResponse && usersResponse.data) {
                  const users = Array.isArray(usersResponse.data) ? usersResponse.data : usersResponse.data.data || [];
                  const foundUser = users.find((u: any) => u.id === userId);
                  if (foundUser && foundUser.name && !isPlaceholderName(foundUser.name)) {
                    userDetailsMap.set(userId, foundUser);
                    console.log(`✅ Found name for ${userId.substring(0, 8)}: "${foundUser.name}"`);
                  }
                }
              } catch (altError) {
                // Silently fail - will use placeholder name
              }
            }
          }));
          
          // Update member names with fetched user details
          // IMPORTANT: Create new task objects to ensure React detects the change
          let updatedTasks = transformedTasks.map(task => {
            if (task.members && task.members.length > 0) {
              const updatedMembers = task.members.map((member: any) => {
                if (member.id && userDetailsMap.has(member.id)) {
                  const userDetails = userDetailsMap.get(member.id);
                  // Validate the fetched name - only reject if it's clearly a placeholder
                  const fetchedName = userDetails.name;
                  const nameIsValid = fetchedName && !isPlaceholderName(fetchedName);
                  
                  if (nameIsValid) {
                    console.log(`✅ Updated ${member.id.substring(0, 8)}: "${member.name}" → "${fetchedName}"`);
                    return {
                      ...member,
                      name: fetchedName,
                      user: userDetails || member.user,
                      image_url: userDetails.image_url || userDetails.about?.image_url || member.image_url,
                      primary_role: userDetails.primary_role || member.primary_role,
                      needsUserFetch: false // Clear the flag since we fetched it
                    };
                  } else {
                    // Keep existing name if it's not a placeholder, otherwise use fetched or fallback
                    const fallbackName = !isPlaceholderName(member.name) ? member.name : (fetchedName || `User ${member.id.substring(0, 8)}`);
                    return {
                      ...member,
                      name: fallbackName,
                      user: userDetails || member.user,
                      image_url: userDetails.image_url || userDetails.about?.image_url || member.image_url,
                      primary_role: userDetails.primary_role || member.primary_role
                    };
                  }
                }
                return member;
              });
              
              // Return new task object with updated members
              return {
                ...task,
                members: updatedMembers
              };
            }
            return task;
          });
          
          if (userDetailsMap.size > 0) {
            console.log(`✅ Updated ${userDetailsMap.size} user name(s) in tasks`);
          }
          
          // Use updated tasks for state
          transformedTasks = updatedTasks;
        }
      
      if (replaceExisting) {
        // Replace all tasks (used on initial load)
        setTasks(transformedTasks);
      } else {
        // Merge with existing tasks (used for refresh)
        setTasks(prev => {
          const existingTaskIds = new Set(prev.map(t => t.id));
          const newTasks = transformedTasks.filter(t => !existingTaskIds.has(t.id));
          return [...prev, ...newTasks];
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

  const getStageTasks = (stageId: string) => {
    const stageTasks = tasks.filter(task => {
      // Use task title as the primary categorization method
      // Fallback to type field for backward compatibility
      const taskTitle = task.title || '';
      const taskType = task.type || task.task_type || task.category || task.stage || task.stage_id || '';
      
      // Check if task title matches stage ID (e.g., "pre_production", "development")
      const matchesByTitle = taskTitle === stageId;
      const matchesByType = taskType === stageId;
      
      return matchesByTitle || matchesByType;
    });
    
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

        {/* All tasks displayed as SimplifiedTaskCard components - no separate list */}

        {/* Show all tasks as SimplifiedTaskCard components */}
        {tasks.map((task) => {
          // Transform task data to match SimplifiedTaskCard format
          // CRITICAL: Preserve status from task.assignments (which should already have status from loadTasks)
          const assignments = (task.assignments || []).map((assignment: any) => {
            const status = assignment.status || 'pending';
            console.log(`📋 Task ${task.id} → Assignment ${assignment.id}: status="${status}"`);
            return {
              id: assignment.id || Date.now().toString(),
              service: assignment.service || { name: assignment.service_role },
              user: assignment.user || { id: assignment.user_id, name: assignment.user?.name || 'Unknown' },
              status: status, // CRITICAL: Preserve status from backend
            };
          });

          // Ensure task type is preserved - try multiple fields
          const taskType = task.type || task.task_type || task.title?.toLowerCase()?.replace(/\s+/g, '_');
          
          console.log('📋 Rendering task card:', {
            id: task.id,
            title: task.title,
            type: task.type,
            task_type: task.task_type,
            inferredType: taskType
          });

          return (
            <SimplifiedTaskCard
              key={task.id}
              projectId={project.id}
              project={project}
              existingTask={{
                ...task,
                type: taskType, // Ensure type is set
                task_type: taskType, // Also set task_type for compatibility
                assignments,
              }}
              selectedUser={addUserToTask ? selectedUser : undefined}
              onTaskCreated={(updatedTask) => {
                console.log('📋 Received updated task in ProjectDashboard:', updatedTask);
                // Preserve type when updating and ensure all fields are maintained
                // CRITICAL: Preserve assignments with status from updatedTask
                const taskWithType = {
                  ...task, // Preserve original task data
                  ...updatedTask, // Override with updated data
                  type: updatedTask.type || taskType || task.type || task.task_type,
                  task_type: updatedTask.task_type || taskType || task.task_type || task.type,
                  id: updatedTask.id || task.id, // Ensure ID is always present
                  // Preserve assignments with status - don't re-transform and lose status
                  assignments: updatedTask.assignments || task.assignments,
                };
                console.log('📋 Updating task in list:', taskWithType);
                console.log('📋 Assignments with status:', taskWithType.assignments?.map((a: any) => ({ id: a.id, status: a.status })));
                setTasks(prev => {
                  const updated = prev.map(t => t.id === taskWithType.id ? taskWithType : t);
                  console.log('📋 Tasks after update:', updated.map(t => ({ id: t.id, title: t.title, type: t.type })));
                  return updated;
                });
              }}
              onDelete={(taskId) => {
                setTasks(prev => prev.filter(t => t.id !== taskId));
              }}
            />
          );
        })}

        {/* Show new task cards being created */}
        {newTaskCards.map((taskCard, index) => (
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
    padding: semanticSpacing.headerPadding,
    paddingTop: semanticSpacing.headerPaddingVertical, // Reduced from 12 to 8
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
    padding: semanticSpacing.containerPadding,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
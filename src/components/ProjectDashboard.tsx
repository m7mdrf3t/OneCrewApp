import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TaskTypeModal from './TaskTypeModal';
import TaskCard from './TaskCard';

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
  const [selectedTab, setSelectedTab] = useState('details');
  const [showTaskTypeModal, setShowTaskTypeModal] = useState(false);
  const [showTaskCard, setShowTaskCard] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);

  const handleTabPress = (tab: string) => {
    if (tab === 'details') {
      onEditProjectDetails();
    } else {
      Alert.alert('Coming Soon', `${tab} feature will be available soon!`);
    }
  };

  const handleCreateTask = () => {
    setShowTaskTypeModal(true);
  };

  const handleTaskTypeSelected = (taskType: string) => {
    setSelectedTaskType(taskType);
    setShowTaskCard(true);
  };

  const handleTaskCreated = (task: any) => {
    setTasks(prev => [...prev, task]);
    setShowTaskCard(false);
    setSelectedTaskType('');
  };

  const handleTaskCancel = () => {
    setShowTaskCard(false);
    setSelectedTaskType('');
  };

  const getStageTasks = (stageId: string) => {
    return tasks.filter(task => task.type === stageId);
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
        <View style={styles.headerSpacer} />
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
        {getStagesWithTasks().length > 0 && (
          <View style={styles.stagesSection}>
            <Text style={styles.sectionTitle}>Project Stages</Text>
            {getStagesWithTasks().map((stage) => {
              const stageTasks = getStageTasks(stage.id);
              
              return (
                <View key={stage.id} style={styles.stageContainer}>
                  {/* Stage Header */}
                  <View style={[styles.stageHeader, { backgroundColor: stage.color }]}>
                    <View style={styles.stageHeaderLeft}>
                      <Ionicons name={stage.icon as any} size={20} color="#fff" />
                      <Text style={styles.stageName}>{stage.name}</Text>
                    </View>
                    <View style={styles.stageHeaderRight}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>{stageTasks.length} TASK{stageTasks.length !== 1 ? 'S' : ''}</Text>
                      </View>
                      <Ionicons name="ellipsis-vertical" size={20} color="#fff" style={styles.stageMenuIcon} />
                      <Ionicons name="chatbubble" size={20} color="#fff" />
                    </View>
                  </View>

                  {/* Stage Content - Show tasks */}
                  <View style={styles.stageContent}>
                    {stageTasks.map((task) => (
                      <View key={task.id} style={styles.taskCard}>
                        <View style={styles.taskHeader}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                            <Text style={styles.statusBadgeText}>{task.status.toUpperCase()}</Text>
                          </View>
                        </View>
                        
                        {/* Service Assignment */}
                        {task.service && (
                          <View style={styles.assignmentInfo}>
                            <Ionicons name="briefcase" size={16} color="#6b7280" />
                            <Text style={styles.assignmentText}>{task.service.name}</Text>
                          </View>
                        )}
                        
                        {/* Member Assignment */}
                        {task.member && (
                          <View style={styles.assignmentInfo}>
                            <Ionicons name="person" size={16} color="#6b7280" />
                            <Text style={styles.assignmentText}>{task.member.name}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
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
            onPress={handleCreateTask}
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
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
    marginTop: 24,
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
});

export default ProjectDashboard;
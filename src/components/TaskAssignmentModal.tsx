import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskAssignmentModalProps, UITaskAssignment } from '../types';
import { useApi } from '../contexts/ApiContext';
import { TASK_TO_SERVICE_SUGGESTIONS } from '../data/mockData';
import SearchModal from './SearchModal';
import TaskDetailsForm from './TaskDetailsForm';
import { spacing, semanticSpacing } from '../constants/spacing';

const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  visible,
  onClose,
  stage,
  onAssign,
}) => {
  const { user } = useApi();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showTaskDetailsForm, setShowTaskDetailsForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentAssignments, setCurrentAssignments] = useState<UITaskAssignment[]>([]);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setShowSearchModal(true);
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setShowSearchModal(false);
    setShowTaskDetailsForm(true);
  };

  const handleTaskSubmit = async (taskData: Partial<UITaskAssignment>) => {
    try {
      const assignment: UITaskAssignment = {
        id: taskData.id || Date.now().toString(),
        task_id: taskData.id || Date.now().toString(),
        user_id: taskData.userId || selectedUser.id,
        service_role: taskData.userRole || selectedUser.specialty || selectedUser.category,
        assigned_at: taskData.createdAt || new Date().toISOString(),
        assigned_by: user?.id || '', // Add required field from v2.2.0
        // UI-specific fields
        userId: taskData.userId || selectedUser.id,
        userName: taskData.userName || selectedUser.name,
        userRole: taskData.userRole || selectedUser.specialty || selectedUser.category,
        stageId: stage.id,
        stageName: stage.name,
        taskTitle: taskData.taskTitle || '',
        inTime: taskData.inTime || '',
        outTime: taskData.outTime || '',
        location: taskData.location || '',
        description: taskData.description || '',
        status: taskData.status || 'pending',
        attendees: taskData.attendees || [],
        createdAt: taskData.createdAt || new Date().toISOString(),
      };

      await onAssign(assignment);
      setCurrentAssignments(prev => [...prev, assignment]);
      setShowTaskDetailsForm(false);
      setSelectedUser(null);
      setSelectedRole('');
    } catch (error) {
      console.error('Failed to assign task:', error);
      Alert.alert('Error', 'Failed to assign task. Please try again.');
    }
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    Alert.alert(
      'Remove Assignment',
      'Are you sure you want to remove this assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCurrentAssignments(prev => 
              prev.filter(assignment => assignment.id !== assignmentId)
            );
          },
        },
      ]
    );
  };

  const getSuggestedRoles = () => {
    return TASK_TO_SERVICE_SUGGESTIONS[stage.id as keyof typeof TASK_TO_SERVICE_SUGGESTIONS] || [];
  };

  const getRoleAssignments = (role: string) => {
    return currentAssignments.filter(assignment => 
      (assignment.userRole || '').toLowerCase().includes(role.toLowerCase())
    );
  };

  const renderRoleSection = (role: string, service: string) => {
    const assignments = getRoleAssignments(role);
    
    return (
      <View key={role} style={styles.roleSection}>
        <View style={styles.roleHeader}>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>{role}</Text>
            <Text style={styles.roleService}>{service}</Text>
          </View>
          <TouchableOpacity
            style={styles.addRoleButton}
            onPress={() => handleRoleSelect(role)}
          >
            <Ionicons name="add" size={20} color="#3b82f6" />
            <Text style={styles.addRoleText}>Add {role}</Text>
          </TouchableOpacity>
        </View>

        {assignments.length > 0 && (
          <View style={styles.assignmentsList}>
            {assignments.map((assignment) => (
              <View key={assignment.id} style={styles.assignmentCard}>
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentTitle}>{assignment.taskTitle}</Text>
                  <Text style={styles.assignmentUser}>{assignment.userName}</Text>
                  <Text style={styles.assignmentTime}>
                    {(assignment.inTime ? new Date(assignment.inTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    }) : '--')} - {(assignment.outTime ? new Date(assignment.outTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    }) : '--')}
                  </Text>
                  <Text style={styles.assignmentLocation}>{assignment.location}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeAssignmentButton}
                  onPress={() => handleRemoveAssignment(assignment.id)}
                >
                  <Ionicons name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Assign Roles - {stage.name}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Stage Info */}
            <View style={styles.stageInfoCard}>
              <Text style={styles.stageName}>{stage.name}</Text>
              <Text style={styles.stageDescription}>{stage.description}</Text>
              {stage.startDate && stage.endDate && (
                <Text style={styles.stageTimeline}>
                  {new Date(stage.startDate).toLocaleDateString()} - {new Date(stage.endDate).toLocaleDateString()}
                </Text>
              )}
            </View>

            {/* Suggested Roles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Suggested Roles</Text>
              <Text style={styles.sectionSubtitle}>
                Click on a role to search for and assign talent
              </Text>
              
              {getSuggestedRoles().map(({ role, service }) => 
                renderRoleSection(role, service)
              )}
            </View>

            {/* Custom Role */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Role</Text>
              <TouchableOpacity
                style={styles.customRoleButton}
                onPress={() => {
                  // Handle custom role selection
                  Alert.alert('Custom Role', 'Custom role selection coming soon!');
                }}
              >
                <Ionicons name="add-circle" size={24} color="#3b82f6" />
                <Text style={styles.customRoleText}>Add Custom Role</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            {currentAssignments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assignment Summary</Text>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryText}>
                    {currentAssignments.length} assignment{currentAssignments.length !== 1 ? 's' : ''} created
                  </Text>
                  <Text style={styles.summarySubtext}>
                    All assignments are ready for scheduling
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={onClose}
            >
              <Text style={styles.doneButtonText}>
                {currentAssignments.length > 0 ? 'Done' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleUserSelect}
        preFilterRole={selectedRole}
      />

      {/* Task Details Form */}
      <TaskDetailsForm
        visible={showTaskDetailsForm}
        onClose={() => setShowTaskDetailsForm(false)}
        onSubmit={handleTaskSubmit}
        assignedUser={selectedUser}
        stage={stage}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  stageInfoCard: {
    backgroundColor: '#f8fafc',
    padding: semanticSpacing.containerPaddingLarge,
    borderRadius: spacing.sm,
    marginVertical: semanticSpacing.containerPaddingLarge,
  },
  stageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  stageDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  stageTimeline: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  roleSection: {
    marginBottom: 16,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  roleService: {
    fontSize: 12,
    color: '#6b7280',
  },
  addRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: semanticSpacing.containerPadding,
    paddingVertical: spacing.sm,
    borderRadius: semanticSpacing.tightPadding,
    gap: semanticSpacing.tightGap,
  },
  addRoleText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  assignmentsList: {
    marginTop: 8,
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: semanticSpacing.containerPadding,
    borderRadius: semanticSpacing.tightPadding,
    marginBottom: spacing.sm,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  assignmentUser: {
    fontSize: 12,
    color: '#3b82f6',
    marginBottom: 2,
  },
  assignmentTime: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  assignmentLocation: {
    fontSize: 11,
    color: '#6b7280',
  },
  removeAssignmentButton: {
    padding: spacing.xs,
  },
  customRoleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: spacing.sm,
    paddingVertical: semanticSpacing.containerPaddingLarge,
    gap: spacing.sm,
  },
  customRoleText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#f0fdf4',
    padding: semanticSpacing.containerPaddingLarge,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#16a34a',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  doneButton: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default TaskAssignmentModal;

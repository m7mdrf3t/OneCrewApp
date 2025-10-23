import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { CreateTaskRequest, TaskStatus, ProjectMember } from '../types';
import CreateTaskModal from '../components/CreateTaskModal';

interface NewProjectPageProps {
  onBack: () => void;
  onProjectCreated: (project: any) => void;
}

const NewProjectPage: React.FC<NewProjectPageProps> = ({
  onBack,
  onProjectCreated,
}) => {
  const { createProject, createTask } = useApi();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  // Project form state
  const [projectData, setProjectData] = useState({
    title: '',
    description: '',
    type: '',
    start_date: '',
    end_date: '',
    delivery_date: '',
    one_day_shoot: false,
    budget: '',
    location: '',
  });
  
  // Tasks state
  const [tasks, setTasks] = useState<CreateTaskRequest[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  
  // Form errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!projectData.title.trim()) {
      newErrors.title = 'Project title is required';
    }

    if (!projectData.type.trim()) {
      newErrors.type = 'Project type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateProject = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Create the project first
      const projectResponse = await createProject({
        title: projectData.title.trim(),
        description: projectData.description.trim() || undefined,
        type: projectData.type.trim(),
        start_date: projectData.start_date || undefined,
        end_date: projectData.end_date || undefined,
        delivery_date: projectData.delivery_date || undefined,
        one_day_shoot: projectData.one_day_shoot,
        budget: projectData.budget ? parseFloat(projectData.budget) : undefined,
        location: projectData.location.trim() || undefined,
        status: 'planning',
        progress: 0,
      });

      if (projectResponse && projectResponse.id) {
        // Create tasks for the project
        for (const task of tasks) {
          try {
            await createTask(projectResponse.id, task);
          } catch (error) {
            console.error('Failed to create task:', error);
          }
        }

        Alert.alert(
          'Success!',
          'Project created successfully with all tasks.',
          [
            {
              text: 'OK',
              onPress: () => {
                onProjectCreated(projectResponse);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (taskData: CreateTaskRequest) => {
    if (editingTask) {
      // Update existing task
      setTasks(tasks.map(task => 
        task === editingTask ? { ...taskData, sort_order: task.sort_order } : task
      ));
      setEditingTask(null);
    } else {
      // Add new task
      const newTask = {
        ...taskData,
        sort_order: tasks.length + 1,
      };
      setTasks([...tasks, newTask]);
    }
    setShowCreateTask(false);
  };

  const handleEditTask = (task: CreateTaskRequest) => {
    setEditingTask(task);
    setShowCreateTask(true);
  };

  const handleDeleteTask = (taskToDelete: CreateTaskRequest) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTasks(tasks.filter(task => task !== taskToDelete));
          },
        },
      ]
    );
  };

  const projectTypes = [
    'Feature Film',
    'Short Film',
    'Documentary',
    'Commercial',
    'Music Video',
    'Web Series',
    'TV Show',
    'Corporate Video',
    'Event Coverage',
    'Other',
  ];

  const getStatusColor = (status: TaskStatus) => {
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Create New Project</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Project Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          
          {/* Project Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="Enter project title"
              placeholderTextColor="#9ca3af"
              value={projectData.title}
              onChangeText={(text) => {
                setProjectData(prev => ({ ...prev, title: text }));
                if (errors.title) {
                  setErrors(prev => ({ ...prev, title: '' }));
                }
              }}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Project Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your project"
              placeholderTextColor="#9ca3af"
              value={projectData.description}
              onChangeText={(text) => setProjectData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Project Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Type *</Text>
            <View style={styles.typeContainer}>
              {projectTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    projectData.type === type && styles.typeOptionSelected
                  ]}
                  onPress={() => setProjectData(prev => ({ ...prev, type }))}
                >
                  <Text style={[
                    styles.typeOptionText,
                    projectData.type === type && styles.typeOptionTextSelected
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
          </View>

          {/* Dates */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                value={projectData.start_date}
                onChangeText={(text) => setProjectData(prev => ({ ...prev, start_date: text }))}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                value={projectData.end_date}
                onChangeText={(text) => setProjectData(prev => ({ ...prev, end_date: text }))}
              />
            </View>
          </View>

          {/* Additional Details */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Budget</Text>
              <TextInput
                style={styles.input}
                placeholder="$0"
                placeholderTextColor="#9ca3af"
                value={projectData.budget}
                onChangeText={(text) => setProjectData(prev => ({ ...prev, budget: text }))}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="City, State"
                placeholderTextColor="#9ca3af"
                value={projectData.location}
                onChangeText={(text) => setProjectData(prev => ({ ...prev, location: text }))}
              />
            </View>
          </View>

          {/* One Day Shoot Toggle */}
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.toggleContainer}
              onPress={() => setProjectData(prev => ({ ...prev, one_day_shoot: !prev.one_day_shoot }))}
            >
              <View style={[styles.toggle, projectData.one_day_shoot && styles.toggleActive]}>
                <View style={[styles.toggleThumb, projectData.one_day_shoot && styles.toggleThumbActive]} />
              </View>
              <Text style={styles.toggleLabel}>One Day Shoot</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => setShowCreateTask(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addTaskButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>

          {tasks.length > 0 ? (
            <View style={styles.tasksList}>
              {tasks.map((task, index) => (
                <View key={index} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <View style={[styles.taskStatus, { backgroundColor: getStatusColor(task.status || 'pending') }]}>
                      <Text style={styles.taskStatusText}>
                        {(task.status || 'pending').replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  {task.service && (
                    <Text style={styles.taskService}>Service: {task.service}</Text>
                  )}
                  
                  {task.timeline_text && (
                    <Text style={styles.taskTimeline}>{task.timeline_text}</Text>
                  )}

                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditTask(task)}
                    >
                      <Ionicons name="create" size={16} color="#3b82f6" />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteTask(task)}
                    >
                      <Ionicons name="trash" size={16} color="#ef4444" />
                      <Text style={styles.actionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTasks}>
              <Ionicons name="list" size={48} color="#d4d4d8" />
              <Text style={styles.emptyText}>No tasks added yet</Text>
              <Text style={styles.emptySubtext}>Add tasks to organize your project workflow</Text>
            </View>
          )}
        </View>

        {/* Create Project Button */}
        <View style={styles.createButtonContainer}>
          <TouchableOpacity
            style={[styles.createButton, isLoading && styles.createButtonDisabled]}
            onPress={handleCreateProject}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.createButtonText}>Creating Project...</Text>
            ) : (
              <Text style={styles.createButtonText}>Create Project</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={showCreateTask}
        onClose={() => {
          setShowCreateTask(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateTask}
        projectMembers={[]} // Empty for new projects
        editingTask={editingTask}
        projectId="new-project"
      />
    </KeyboardAvoidingView>
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
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#71717a',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d4d4d8',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  toggleLabel: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addTaskButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
  createButtonContainer: {
    paddingVertical: 24,
  },
  createButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewProjectPage;

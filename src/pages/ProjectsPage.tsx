import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import { ProjectsPageProps } from '../types';
import { useApi } from '../contexts/ApiContext';

const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onProjectSelect,
  onAddNewProject,
  onAddNewProjectEasy,
  searchQuery,
  onSearchChange,
  onBack,
  myTeam,
  onProfileSelect,
  onNavigateToProjectDetail,
  onRefresh,
  onNavigateToSignup,
  onNavigateToLogin,
}) => {
  const { getAllProjects, getProjectById, user, api, isGuest } = useApi();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed loading progress and task loading states - now only loading basic project info

  // Removed retryWithBackoff function - no longer needed for basic project loading

  useEffect(() => {
    if (!isGuest) {
      loadProjects();
    }
  }, [isGuest]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('📋 Loading basic project list...');
      
      const userProjects = await getAllProjects();
      
      // Filter to only show projects where user is owner or member (not just viewer)
      const filteredProjects = userProjects.filter(project => {
        const accessLevel = getUserAccessLevel(project);
        return accessLevel === 'owner' || accessLevel === 'member';
      });

      console.log(`✅ Loaded ${filteredProjects.length} projects (basic info only)`);
      
      // Only load basic project information - no tasks or detailed data
      const basicProjects = filteredProjects.map(project => ({
        ...project,
        // Add empty tasks array for UI consistency
        tasks: [],
        // Add a flag to indicate this is basic data
        isBasicData: true,
      }));

      setProjects(basicProjects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
      Alert.alert('Error', 'Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectPress = (project: any) => {
    if (onNavigateToProjectDetail) {
      onNavigateToProjectDetail(project);
    } else {
      onProjectSelect(project);
    }
  };

  const handleDeleteProject = async (project: any) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting project:', project.id);
              await api.deleteProject(project.id);
              
              // Remove project from local state
              setProjects(prev => prev.filter(p => p.id !== project.id));
              
              console.log('✅ Project deleted successfully');
            } catch (error) {
              console.error('❌ Failed to delete project:', error);
              Alert.alert(
                'Delete Failed',
                'Failed to delete project. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'planning':
        return '#f59e0b';
      case 'on_hold':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getUserAccessLevel = (project: any) => {
    if (!user) return 'viewer';
    
    // Check if user is the owner (created_by field)
    if (project.created_by === user.id) return 'owner';
    
    // Check if user is a member
    if (project.members && project.members.some((member: any) => member.user_id === user.id)) {
      return 'member';
    }
    
    return 'viewer';
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Projects</Text>
          <TouchableOpacity onPress={onRefresh || loadProjects} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>
            Loading projects...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Projects</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh || loadProjects}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Guest user empty state
  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Projects</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.guestEmptyState}>
          <Ionicons name="folder-open" size={80} color="#9ca3af" />
          <Text style={styles.guestTitle}>Sign in to view and manage your projects</Text>
          <Text style={styles.guestSubtitle}>Create, organize, and collaborate on your film projects</Text>
          <View style={styles.guestButtonContainer}>
            <TouchableOpacity style={styles.guestButton} onPress={onNavigateToSignup}>
              <Text style={styles.guestButtonText}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.guestButton, styles.guestButtonSecondary]} onPress={onNavigateToLogin}>
              <Text style={[styles.guestButtonText, styles.guestButtonTextSecondary]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Projects</Text>
        <TouchableOpacity onPress={onRefresh || loadProjects} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      {/* Backend Error Banner */}
      {/* Removed error banner - no longer loading tasks upfront */}

      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
        />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.projectsContainer}>
          <TouchableOpacity style={styles.addButton} onPress={onAddNewProject}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>New Project</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButtonEasy} onPress={onAddNewProjectEasy}>
            <Ionicons name="flash" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Quick Project</Text>
          </TouchableOpacity>
          
          {projects.length > 0 ? (
            projects.map((project) => {
              const accessLevel = getUserAccessLevel(project);
              return (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => handleProjectPress(project)}
                >
                  <View style={styles.projectHeader}>
                    <Text style={styles.projectTitle}>{project.title}</Text>
                    <View style={styles.projectHeaderRight}>
                      <View style={styles.projectBadges}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
                          <Text style={styles.statusBadgeText}>
                            {project.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                          </Text>
                        </View>
                        <View style={[styles.accessBadge, { backgroundColor: getAccessLevelColor(accessLevel) }]}>
                          <Text style={styles.accessBadgeText}>
                            {getAccessLevelText(accessLevel)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => handleDeleteProject(project)}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color="#71717a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {project.description && (
                    <Text style={styles.projectDescription} numberOfLines={2}>
                      {project.description}
                    </Text>
                  )}
                  
                  <View style={styles.projectDetails}>
                    <View style={styles.projectInfo}>
                      {project.type && (
                        <View style={styles.projectInfoItem}>
                          <Ionicons name="film" size={16} color="#71717a" />
                          <Text style={styles.projectInfoText}>{project.type}</Text>
                        </View>
                      )}
                      {project.location && (
                        <View style={styles.projectInfoItem}>
                          <Ionicons name="location" size={16} color="#71717a" />
                          <Text style={styles.projectInfoText}>{project.location}</Text>
                        </View>
                      )}
                      {project.owner && (
                        <View style={styles.projectInfoItem}>
                          <Ionicons name="person" size={16} color="#71717a" />
                          <Text style={styles.projectInfoText}>by {project.owner.name}</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.projectProgress}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { width: `${project.progress || 0}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>{project.progress || 0}%</Text>
                    </View>
                  </View>
                  
                  {/* Quick Info Section */}
                  <View style={styles.quickInfoSection}>
                    <View style={styles.quickInfoItem}>
                      <Ionicons name="list" size={16} color="#71717a" />
                      <Text style={styles.quickInfoText}>Tap to view details & tasks</Text>
                    </View>
                    {project.isBasicData && (
                      <View style={styles.quickInfoItem}>
                        <Ionicons name="flash" size={16} color="#10b981" />
                        <Text style={styles.quickInfoText}>Fast loading enabled</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.projectFooter}>
                    <View style={styles.projectDates}>
                      {project.start_date && (
                        <Text style={styles.dateText}>
                          Start: {formatDate(project.start_date)}
                        </Text>
                      )}
                      {project.end_date && (
                        <Text style={styles.dateText}>
                          End: {formatDate(project.end_date)}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#71717a" />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open" size={64} color="#d4d4d8" />
              <Text style={styles.emptyTitle}>No Projects Yet</Text>
              <Text style={styles.emptyDescription}>
                Create your first project to get started with organizing your work.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  refreshButton: {
    padding: 4,
    marginLeft: 12,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d8',
  },
  content: {
    flex: 1,
  },
  projectsContainer: {
    padding: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addButtonEasy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#71717a',
    marginTop: 16,
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
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  projectHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  menuButton: {
    padding: 4,
    borderRadius: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  accessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  accessBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  projectDescription: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 12,
    lineHeight: 20,
  },
  projectDetails: {
    marginBottom: 12,
  },
  projectInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  projectInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  projectInfoText: {
    fontSize: 12,
    color: '#71717a',
    marginLeft: 4,
  },
  projectProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    minWidth: 32,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  projectDates: {
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#71717a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  tasksSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  tasksHeader: {
    marginBottom: 8,
  },
  tasksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  tasksList: {
    gap: 6,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskInfo: {
    flex: 1,
    marginRight: 8,
  },
  taskItemTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },
  taskItemService: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  taskItemStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskItemStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
  moreTasksText: {
    fontSize: 11,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  noTasksContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  noTasksText: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  noTasksSubtext: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBannerText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  quickInfoSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 6,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickInfoText: {
    fontSize: 13,
    color: '#6b7280',
  },
  headerSpacer: {
    width: 24,
  },
  guestEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  guestButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  guestButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  guestButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000',
  },
  guestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButtonTextSecondary: {
    color: '#000',
  },
});

export default ProjectsPage;

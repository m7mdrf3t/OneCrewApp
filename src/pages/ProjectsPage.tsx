import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import { ProjectsPageProps } from '../types';
import { useApi } from '../contexts/ApiContext';
import ProjectMenuPopup from '../components/ProjectMenuPopup';
import DeletedProjectsModal from '../components/DeletedProjectsModal';

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
  onProjectCreated,
}) => {
  const { getAllProjects, getProjectById, user, api, isGuest } = useApi();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [showDeletedProjects, setShowDeletedProjects] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | undefined>();
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
      console.log('👤 Current user ID:', user?.id);
      
      const userProjects = await getAllProjects();
      console.log(`📦 Received ${userProjects.length} projects from API`);
      
      // Debug: Log project details to understand structure
      userProjects.forEach((project, index) => {
        console.log(`📋 Project ${index + 1}:`, {
          id: project.id,
          title: project.title,
          created_by: project.created_by,
          members_count: project.members?.length || 0,
          members: project.members?.map((m: any) => ({
            user_id: m.user_id || m.id,
            role: m.role,
          })),
        });
      });
      
      // Filter to only show projects where user is owner or member (not just viewer)
      // Also exclude soft-deleted projects
      const filteredProjects = userProjects.filter(project => {
        const accessLevel = getUserAccessLevel(project);
        const isActive = !project.is_deleted && !project.deleted_at;
        const shouldShow = (accessLevel === 'owner' || accessLevel === 'member') && isActive;
        
        if (!shouldShow) {
          console.log(`🚫 Filtered out project ${project.id} - accessLevel: ${accessLevel}, isActive: ${isActive}`);
        } else {
          console.log(`✅ Including project ${project.id} - accessLevel: ${accessLevel}`);
        }
        
        return shouldShow;
      });

      console.log(`✅ Loaded ${filteredProjects.length} filtered projects (basic info only)`);
      
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

  // Method to add project immediately without reload
  const addProjectToList = React.useCallback((newProject: any) => {
    setProjects(prev => [
      {
        ...newProject,
        tasks: [],
        isBasicData: true,
      },
      ...prev,
    ]);
  }, []);

  // Expose addProjectToList to parent component via callback
  useEffect(() => {
    if (onProjectCreated && typeof onProjectCreated === 'function') {
      onProjectCreated(addProjectToList);
    }
  }, [onProjectCreated, addProjectToList]);

  const handleProjectPress = (project: any) => {
    if (onNavigateToProjectDetail) {
      onNavigateToProjectDetail(project);
    } else {
      onProjectSelect(project);
    }
  };

  const handleMenuPress = (project: any, event?: any) => {
    setSelectedProject(project);
    setShowMenuPopup(true);
    // Menu will appear on the right side by default
    setMenuAnchor({ x: 20, y: 200 });
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    Alert.alert(
      'Move to Recycle Bin',
      `Are you sure you want to move "${selectedProject.title}" to the recycle bin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Bin',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Moving project to recycle bin:', selectedProject.id);
              // Soft delete - move to recycle bin
              await api.updateProject(selectedProject.id, {
                is_deleted: true,
                deleted_at: new Date().toISOString(),
              });
              
              // Remove project from local state
              setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              
              console.log('✅ Project moved to recycle bin');
              setSelectedProject(null);
            } catch (error: any) {
              console.error('❌ Failed to move project to recycle bin:', error);
              
              // Check if it's a permission error
              const errorMessage = error?.message || String(error) || '';
              let alertMessage = 'Failed to move project to recycle bin. Please try again.';
              
              if (errorMessage.includes('Access denied') || errorMessage.includes('permission') || errorMessage.includes('canEditProjectDetails')) {
                const accessLevel = getUserAccessLevel(selectedProject);
                if (accessLevel === 'viewer') {
                  alertMessage = 'You do not have permission to delete this project. Only project owners and members can delete projects.';
                } else {
                  alertMessage = 'You do not have permission to delete this project. The backend requires additional permissions that your account does not have.';
                }
              }
              
              Alert.alert(
                'Delete Failed',
                alertMessage,
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleEditName = () => {
    if (!selectedProject) return;
    Alert.prompt(
      'Edit Project Name',
      'Enter the new name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newName) => {
            if (newName && newName.trim()) {
              try {
                const result = await api.updateProject(selectedProject.id, { title: newName.trim() });
                setProjects(prev => prev.map(p => 
                  p.id === selectedProject.id ? { ...p, title: newName.trim() } : p
                ));
              } catch (error) {
                Alert.alert('Error', 'Failed to update project name.');
              }
            }
          },
        },
      ],
      'plain-text',
      selectedProject.title
    );
  };

  const handleProjectType = () => {
    if (!selectedProject) return;
    Alert.alert('Project Type', 'This feature will be implemented soon.');
  };

  const handleCoverPhoto = () => {
    if (!selectedProject) return;
    Alert.alert('Cover Photo', 'This feature will be implemented soon.');
  };

  const handleSave = () => {
    if (!selectedProject) return;
    Alert.alert('Save', 'Project saved successfully.');
  };

  const handleRestoreProject = (projectId: string) => {
    // Reload projects to include restored project
    loadProjects();
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
    if (!user) {
      console.log('🚫 No user found');
      return 'viewer';
    }
    
    // Check if user is the owner (created_by field)
    if (project.created_by === user.id) {
      console.log(`✅ User ${user.id} is OWNER of project ${project.id}`);
      return 'owner';
    }
    
    // Check if user is a member - try multiple possible field structures
    const members = project.members || project.project_members || [];
    const isMember = members.some((member: any) => {
      const memberUserId = member.user_id || member.user?.id || member.id;
      const matches = memberUserId === user.id;
      if (matches) {
        console.log(`✅ User ${user.id} is MEMBER of project ${project.id} with role: ${member.role || 'member'}`);
      }
      return matches;
    });
    
    if (isMember) {
      return 'member';
    }
    
    console.log(`🚫 User ${user.id} is VIEWER of project ${project.id} (not owner or member)`);
    console.log(`   Project members:`, members.map((m: any) => ({
      user_id: m.user_id || m.user?.id || m.id,
      role: m.role,
    })));
    
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
          {projects.length > 0 ? (
            projects.map((project) => {
              const accessLevel = getUserAccessLevel(project);
              const isOwner = accessLevel === 'owner';
              const isMember = accessLevel === 'member';
              return (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projectCard,
                    isOwner && styles.projectCardOwner,
                    isMember && styles.projectCardMember,
                  ]}
                  onPress={() => handleProjectPress(project)}
                >
                  <View style={styles.projectHeader}>
                    <Text style={[
                      styles.projectTitle,
                      isMember && styles.projectTitleMember,
                    ]}>{project.title}</Text>
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
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMenuPress(project);
                        }}
                      >
                        <Ionicons 
                          name="ellipsis-horizontal" 
                          size={20} 
                          color={isMember ? "#fff" : "#a1a1aa"} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {project.description && (
                    <Text style={[
                      styles.projectDescription,
                      isMember && styles.projectDescriptionMember,
                    ]} numberOfLines={2}>
                      {project.description}
                    </Text>
                  )}
                  
                  <View style={styles.projectDetails}>
                    <View style={styles.projectInfo}>
                      {project.type && (
                        <View style={styles.projectInfoItem}>
                          <Ionicons name="film" size={16} color={isMember ? "#fff" : "#a1a1aa"} />
                          <Text style={[
                            styles.projectInfoText,
                            isMember && styles.projectInfoTextMember,
                          ]}>{project.type}</Text>
                        </View>
                      )}
                      {project.location && (
                        <View style={styles.projectInfoItem}>
                          <Ionicons name="location" size={16} color={isMember ? "#fff" : "#a1a1aa"} />
                          <Text style={[
                            styles.projectInfoText,
                            isMember && styles.projectInfoTextMember,
                          ]}>{project.location}</Text>
                        </View>
                      )}
                      {project.owner && (
                        <View style={styles.projectInfoItem}>
                          <Ionicons name="person" size={16} color={isMember ? "#fff" : "#a1a1aa"} />
                          <Text style={[
                            styles.projectInfoText,
                            isMember && styles.projectInfoTextMember,
                          ]}>by {project.owner.name}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={[
                    styles.projectFooter,
                    isMember && styles.projectFooterMember,
                  ]}>
                    <View style={styles.projectDates}>
                      {project.start_date && (
                        <Text style={[
                          styles.dateText,
                          isMember && styles.dateTextMember,
                        ]}>
                          Start: {formatDate(project.start_date)}
                        </Text>
                      )}
                      {project.end_date && (
                        <Text style={[
                          styles.dateText,
                          isMember && styles.dateTextMember,
                        ]}>
                          End: {formatDate(project.end_date)}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={isMember ? "#fff" : "#a1a1aa"} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open" size={64} color="#d4d4d8" />
              <Text style={styles.emptyTitle}>No Projects Yet</Text>
              <Text style={styles.emptyDescription}>
                Start by creating a new dream project.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={onAddNewProject}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Trash Button */}
      <TouchableOpacity 
        style={styles.trashButton} 
        onPress={() => setShowDeletedProjects(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={22} color="#71717a" />
        {/* Badge could be added here if needed */}
      </TouchableOpacity>

      {/* Menu Popup */}
      <ProjectMenuPopup
        visible={showMenuPopup}
        onClose={() => {
          setShowMenuPopup(false);
          setSelectedProject(null);
        }}
        onEditName={handleEditName}
        onProjectType={handleProjectType}
        onCoverPhoto={handleCoverPhoto}
        onSave={handleSave}
        onDelete={handleDeleteProject}
        anchorPosition={menuAnchor}
        canEdit={selectedProject ? (getUserAccessLevel(selectedProject) === 'owner' || getUserAccessLevel(selectedProject) === 'member') : false}
      />

      {/* Deleted Projects Modal */}
      <DeletedProjectsModal
        visible={showDeletedProjects}
        onClose={() => setShowDeletedProjects(false)}
        onRestore={handleRestoreProject}
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  trashButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  projectCardOwner: {
    backgroundColor: '#000',
    borderColor: '#333333',
  },
  projectCardMember: {
    backgroundColor: '#f97316', // Orange color
    borderColor: '#ea580c', // Darker orange for border
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
    color: '#fff',
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
    color: '#d4d4d8',
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
    color: '#a1a1aa',
    marginLeft: 4,
  },
  projectTitleMember: {
    color: '#fff',
  },
  projectDescriptionMember: {
    color: '#fff',
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  projectFooterMember: {
    borderTopColor: '#ea580c',
  },
  projectInfoTextMember: {
    color: '#fff',
  },
  dateTextMember: {
    color: '#fff',
  },
  projectDates: {
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: '#71717a',
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

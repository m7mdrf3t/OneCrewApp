import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProjectsPageProps } from '../types';
import { useApi } from '../contexts/ApiContext';
import ProjectMenuPopup from '../components/ProjectMenuPopup';
import DeletedProjectsModal from '../components/DeletedProjectsModal';
import ProjectTypeModal from '../components/ProjectTypeModal';
import { spacing, semanticSpacing } from '../constants/spacing';
import MediaPickerService from '../services/MediaPickerService';

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
  const { getAllProjects, getProjectById, user, api, isGuest, getProjectTasks, uploadFile, updateProject } = useApi();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [showDeletedProjects, setShowDeletedProjects] = useState(false);
  const [showProjectTypeModal, setShowProjectTypeModal] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | undefined>();
  const openingModalRef = useRef(false);
  
  // Project categories
  const [ownerProjects, setOwnerProjects] = useState<any[]>([]);
  const [memberProjects, setMemberProjects] = useState<any[]>([]);
  const [pendingProjects, setPendingProjects] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'owner' | 'member' | 'pending'>('owner');
  
  // Removed loading progress and task loading states - now only loading basic project info

  // Removed retryWithBackoff function - no longer needed for basic project loading

  useEffect(() => {
    if (!isGuest) {
      loadProjects();
    }
  }, [isGuest]);

  // Check if a project has pending task assignments for the current user
  const hasPendingAssignments = React.useCallback(async (project: any): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      // Get all tasks for this project
      const tasks = await getProjectTasks(project.id);
      
      // Check if any task has a pending assignment for the current user
      for (const task of tasks) {
        const assignments = task.assignments || [];
        const hasPending = assignments.some((assignment: any) => {
          const assignmentUserId = assignment.user_id || assignment.user?.id;
          const assignmentStatus = assignment.status || 'pending';
          return assignmentUserId === user.id && assignmentStatus === 'pending';
        });
        
        if (hasPending) {
          console.log(`⏳ Project ${project.id} has pending assignments for user ${user.id}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn(`⚠️ Failed to check pending assignments for project ${project.id}:`, error);
      return false;
    }
  }, [user, getProjectTasks]);

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

      // Categorize projects: owner, member/admin, and pending
      const owner: any[] = [];
      const member: any[] = [];
      const pending: any[] = [];
      
      // First, separate owner projects (they can't have pending assignments)
      const memberProjectsToCheck: any[] = [];
      
      for (const project of basicProjects) {
        const accessLevel = getUserAccessLevel(project);
        
        if (accessLevel === 'owner') {
          owner.push(project);
        } else if (accessLevel === 'member') {
          memberProjectsToCheck.push(project);
        }
      }
      
      // Check pending assignments for member projects in parallel
      const pendingChecks = await Promise.all(
        memberProjectsToCheck.map(async (project) => {
          const hasPending = await hasPendingAssignments(project);
          return { project, hasPending };
        })
      );
      
      // Categorize member projects based on pending status
      pendingChecks.forEach(({ project, hasPending }) => {
        if (hasPending) {
          pending.push(project);
        } else {
          member.push(project);
        }
      });
      
      setOwnerProjects(owner);
      setMemberProjects(member);
      setPendingProjects(pending);
      setProjects(basicProjects); // Keep for backward compatibility
      
      console.log(`📊 Categorized projects: ${owner.length} owner, ${member.length} member, ${pending.length} pending`);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
      Alert.alert('Error', 'Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Method to add project immediately without reload
  const addProjectToList = React.useCallback(async (newProject: any) => {
    const projectWithData = {
      ...newProject,
      tasks: [],
      isBasicData: true,
    };
    
    setProjects(prev => [projectWithData, ...prev]);
    
    // Also add to appropriate category
    const accessLevel = getUserAccessLevel(projectWithData);
    if (accessLevel === 'owner') {
      setOwnerProjects(prev => [projectWithData, ...prev]);
    } else if (accessLevel === 'member') {
      // Check if it has pending assignments
      const hasPending = await hasPendingAssignments(projectWithData);
      if (hasPending) {
        setPendingProjects(prev => [projectWithData, ...prev]);
      } else {
        setMemberProjects(prev => [projectWithData, ...prev]);
      }
    }
  }, [hasPendingAssignments]);

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
              } as any);
              
              // Remove project from all categories
              setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              setOwnerProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              setMemberProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              setPendingProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              
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
          onPress: async (newName?: string) => {
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
    console.log('📋 handleProjectType called, selectedProject:', selectedProject?.id);
    if (!selectedProject) {
      console.warn('⚠️ No project selected');
      return;
    }
    // Set flag to prevent clearing selectedProject in menu's onClose
    openingModalRef.current = true;
    console.log('✅ Opening project type modal for project:', selectedProject.id);
    setShowProjectTypeModal(true);
  };

  const handleProjectTypeSelect = async (projectType: string) => {
    console.log('🎯 handleProjectTypeSelect called with type:', projectType);
    console.log('📋 selectedProject:', selectedProject?.id);
    
    if (!selectedProject) {
      console.warn('⚠️ No project selected in handleProjectTypeSelect');
      return;
    }

    try {
      console.log('🔄 Updating project type:', {
        projectId: selectedProject.id,
        newType: projectType,
        currentType: selectedProject.type,
      });

      // Update project via API using the hook's updateProject function
      const response = await updateProject(selectedProject.id, {
        type: projectType,
      });

      console.log('✅ Project type update response:', response);

      // Update local state in all project arrays
      const updateProjectInArray = (project: any) => 
        project.id === selectedProject.id 
          ? { ...project, type: projectType }
          : project;

      setProjects(prev => prev.map(updateProjectInArray));
      setOwnerProjects(prev => prev.map(updateProjectInArray));
      setMemberProjects(prev => prev.map(updateProjectInArray));
      setPendingProjects(prev => prev.map(updateProjectInArray));

      // Update selected project
      setSelectedProject(prev => prev ? { ...prev, type: projectType } : null);

      Alert.alert('Success', 'Project type updated successfully!');
    } catch (error: any) {
      console.error('❌ Failed to update project type:', error);
      const errorMessage = error?.message || String(error) || '';
      let alertMessage = 'Failed to update project type. Please try again.';
      
      if (errorMessage.includes('Access denied') || errorMessage.includes('permission')) {
        alertMessage = 'You do not have permission to update this project type.';
      }
      
      Alert.alert('Error', alertMessage);
    }
  };

  const handleCoverPhoto = async () => {
    if (!selectedProject) return;
    
    try {
      const mediaPicker = MediaPickerService.getInstance();
      const result = await mediaPicker.pickImage({
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 9], // Standard cover image aspect ratio
        maxWidth: 1920,
        maxHeight: 1080,
      });

      if (result) {
        // Validate file size (max 10MB)
        if (result.fileSize && !mediaPicker.validateFileSize(result.fileSize, 10)) {
          Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
          return;
        }

        // Show loading alert
        Alert.alert('Uploading', 'Please wait while we upload your cover image...');

        try {
          // Upload the file
          const uploadResult = await uploadFile({
            uri: result.uri,
            type: 'image/jpeg',
            name: result.fileName || `project_cover_${Date.now()}.jpg`,
          });

          const imageUrl = uploadResult?.data?.url || uploadResult?.url;
          if (!imageUrl) {
            throw new Error('Upload failed - no URL returned');
          }

          // Update the project with the new cover image
          const updateResult = await api.updateProject(selectedProject.id, {
            cover_image_url: imageUrl,
          });

          if (updateResult.success || updateResult.data) {
            // Update local state
            const updatedProject = { ...selectedProject, cover_image_url: imageUrl };
            setProjects(prev => prev.map(p => 
              p.id === selectedProject.id ? updatedProject : p
            ));
            setOwnerProjects(prev => prev.map(p => 
              p.id === selectedProject.id ? updatedProject : p
            ));
            setMemberProjects(prev => prev.map(p => 
              p.id === selectedProject.id ? updatedProject : p
            ));
            setPendingProjects(prev => prev.map(p => 
              p.id === selectedProject.id ? updatedProject : p
            ));

            Alert.alert('Success', 'Cover image updated successfully!');
            setSelectedProject(null);
          } else {
            throw new Error(updateResult.error || 'Failed to update project');
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Failed', uploadError.message || 'Failed to upload cover image. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', error.message || 'Failed to pick image. Please try again.');
    }
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

  // Check if user can edit a project (owner or admin member only)
  const canEditProject = (project: any): boolean => {
    if (!user) return false;
    
    // Owner can always edit
    if (project.created_by === user.id) {
      return true;
    }
    
    // Check if user is a member with admin role
    const members = project.members || project.project_members || [];
    const userMember = members.find((member: any) => {
      const memberUserId = member.user_id || member.user?.id || member.id;
      return memberUserId === user.id;
    });
    
    // Only admin members can edit (not regular members)
    if (userMember && userMember.role === 'admin') {
      return true;
    }
    
    return false;
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
        <Text style={styles.title}>Projects</Text>
      </View>
      {/* Backend Error Banner */}
      {/* Removed error banner - no longer loading tasks upfront */}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'owner' && styles.tabActive]}
          onPress={() => setActiveTab('owner')}
        >
          <Text style={[styles.tabText, activeTab === 'owner' && styles.tabTextActive]}>
            My Projects ({ownerProjects.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'member' && styles.tabActive]}
          onPress={() => setActiveTab('member')}
        >
          <Text style={[styles.tabText, activeTab === 'member' && styles.tabTextActive]}>
            Member ({memberProjects.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingProjects.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.projectsContainer}>
          {(() => {
            // Get projects for active tab
            let projectsToShow: any[] = [];
            if (activeTab === 'owner') {
              projectsToShow = ownerProjects;
            } else if (activeTab === 'member') {
              projectsToShow = memberProjects;
            } else if (activeTab === 'pending') {
              projectsToShow = pendingProjects;
            }

            if (projectsToShow.length === 0) {
              return (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open" size={64} color="#d4d4d8" />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'owner' && 'No Projects Yet'}
                    {activeTab === 'member' && 'No Member Projects'}
                    {activeTab === 'pending' && 'No Pending Assignments'}
                  </Text>
                  <Text style={styles.emptyDescription}>
                    {activeTab === 'owner' && 'Start by creating a new dream project.'}
                    {activeTab === 'member' && 'You are not a member of any projects yet.'}
                    {activeTab === 'pending' && 'You have no pending task assignments.'}
                  </Text>
                </View>
              );
            }

            return projectsToShow.map((project) => {
                const accessLevel = getUserAccessLevel(project);
                const isOwner = accessLevel === 'owner';
                const isMember = accessLevel === 'member';
                const isPending = activeTab === 'pending';
                const canEdit = canEditProject(project);
                
                // Determine card style based on tab
                let cardStyle: StyleProp<ViewStyle> = styles.projectCard;
                let titleStyle: StyleProp<TextStyle> = styles.projectTitle;
                let descriptionStyle: StyleProp<TextStyle> = styles.projectDescription;
                let infoTextStyle: StyleProp<TextStyle> = styles.projectInfoText;
                let footerStyle: StyleProp<ViewStyle> = styles.projectFooter;
                let dateTextStyle: StyleProp<TextStyle> = styles.dateText;
                let iconColor = "#a1a1aa";
                let menuIconColor = "#a1a1aa";
                
                if (isOwner) {
                  cardStyle = [styles.projectCard, styles.projectCardOwner];
                } else if (isPending) {
                  cardStyle = [styles.projectCard, styles.projectCardPending];
                  titleStyle = styles.projectTitlePending;
                  descriptionStyle = styles.projectDescriptionPending;
                  infoTextStyle = styles.projectInfoTextPending;
                  footerStyle = styles.projectFooterPending;
                  dateTextStyle = styles.dateTextPending;
                  iconColor = "#fff";
                  menuIconColor = "#fff";
                } else if (isMember) {
                  cardStyle = [styles.projectCard, styles.projectCardMember];
                  titleStyle = [styles.projectTitle, styles.projectTitleMember];
                  descriptionStyle = [styles.projectDescription, styles.projectDescriptionMember];
                  infoTextStyle = [styles.projectInfoText, styles.projectInfoTextMember];
                  footerStyle = [styles.projectFooter, styles.projectFooterMember];
                  dateTextStyle = [styles.dateText, styles.dateTextMember];
                  iconColor = "#fff";
                  menuIconColor = "#fff";
                }
                
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={[cardStyle, project.cover_image_url && styles.projectCardWithImage]}
                    onPress={() => handleProjectPress(project)}
                  >
                    {/* Cover Image Background with 60% opacity */}
                    {project.cover_image_url && (
                      <>
                        <Image 
                          source={{ uri: project.cover_image_url }} 
                          style={styles.coverImageBackgroundImage}
                          resizeMode="cover"
                        />
                        <View style={styles.coverImageOverlay} />
                      </>
                    )}
                    
                    {/* Content Overlay */}
                    <View style={styles.projectCardContent}>
                      <View style={styles.projectHeader}>
                        <Text style={titleStyle}>{project.title}</Text>
                        <View style={styles.projectHeaderRight}>
                          <View style={styles.projectBadges}>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
                              <Text style={styles.statusBadgeText}>
                                {project.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                              </Text>
                            </View>
                            {isPending ? (
                              <View style={[styles.pendingBadge, { backgroundColor: '#f59e0b' }]}>
                                <Text style={styles.pendingBadgeText}>PENDING</Text>
                              </View>
                            ) : (
                              <View style={[styles.accessBadge, { backgroundColor: getAccessLevelColor(accessLevel) }]}>
                                <Text style={styles.accessBadgeText}>
                                  {getAccessLevelText(accessLevel)}
                                </Text>
                              </View>
                            )}
                          </View>
                          {/* Only show menu button if user can edit (owner or admin) */}
                          {canEdit && (
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
                                color={menuIconColor} 
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      
                      {project.description && (
                        <Text style={descriptionStyle} numberOfLines={2}>
                          {project.description}
                        </Text>
                      )}
                      
                      <View style={styles.projectDetails}>
                        <View style={styles.projectInfo}>
                          {project.type && (
                            <View style={styles.projectInfoItem}>
                              <Ionicons name="film" size={16} color={iconColor} />
                              <Text style={infoTextStyle}>{project.type}</Text>
                            </View>
                          )}
                          {project.location && (
                            <View style={styles.projectInfoItem}>
                              <Ionicons name="location" size={16} color={iconColor} />
                              <Text style={infoTextStyle}>{project.location}</Text>
                            </View>
                          )}
                          {project.owner && (
                            <View style={styles.projectInfoItem}>
                              <Ionicons name="person" size={16} color={iconColor} />
                              <Text style={infoTextStyle}>by {project.owner.name}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={footerStyle}>
                        <View style={styles.projectDates}>
                          {project.start_date && (
                            <Text style={dateTextStyle}>
                              Start: {formatDate(project.start_date)}
                            </Text>
                          )}
                          {project.end_date && (
                            <Text style={dateTextStyle}>
                              End: {formatDate(project.end_date)}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={iconColor} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              });
          })()}
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
          // Only clear selectedProject if we're not opening a modal
          // The modals (type, cover photo, etc.) need the selectedProject
          if (!openingModalRef.current) {
            setSelectedProject(null);
          }
          openingModalRef.current = false;
        }}
        onEditName={handleEditName}
        onProjectType={handleProjectType}
        onCoverPhoto={handleCoverPhoto}
        onSave={handleSave}
        onDelete={handleDeleteProject}
        anchorPosition={menuAnchor}
        canEdit={selectedProject ? canEditProject(selectedProject) : false}
      />

      {/* Deleted Projects Modal */}
      <DeletedProjectsModal
        visible={showDeletedProjects}
        onClose={() => setShowDeletedProjects(false)}
        onRestore={handleRestoreProject}
      />

      {/* Project Type Modal */}
      <ProjectTypeModal
        visible={showProjectTypeModal}
        onClose={() => {
          console.log('🔒 Closing project type modal');
          setShowProjectTypeModal(false);
          openingModalRef.current = false;
          // Clear selectedProject when modal closes
          setSelectedProject(null);
        }}
        onSelectType={handleProjectTypeSelect}
        currentType={selectedProject?.type}
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
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: semanticSpacing.containerPaddingLarge,
    paddingTop: semanticSpacing.containerPaddingLarge + 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  backButton: {
    position: 'absolute',
    left: semanticSpacing.containerPaddingLarge,
    padding: 8,
  },
  refreshButton: {
    position: 'absolute',
    right: semanticSpacing.containerPaddingLarge,
    padding: 8,
  },
  content: {
    flex: 1,
  },
  projectsContainer: {
    padding: semanticSpacing.containerPadding,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
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
    bottom: spacing.xl,
    left: spacing.xl,
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
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: 16,
    color: '#71717a',
    marginTop: semanticSpacing.containerPaddingLarge,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: semanticSpacing.containerPaddingLarge,
    marginBottom: spacing.xxl,
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
  projectCardWithImage: {
    position: 'relative',
    overflow: 'hidden',
  },
  coverImageBackgroundImage: {
    position: 'absolute',
    top: 0, // Negative padding to cover card padding
    left: 0, // Negative padding to cover card padding
    right: 6, // Negative padding to cover card padding
    bottom: 6, // Negative padding to cover card padding
    width: '140%',
    height: '140%',
    zIndex: 0,
    borderRadius: 12, // Match card border radius
  },
  coverImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // 40% black overlay = 60% image visible
    borderRadius: 12, // Match card border radius
    zIndex: 0,
  },
  projectCardContent: {
    position: 'relative',
    zIndex: 1,
    minHeight: 150, // Ensure content has minimum height
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  projectCardPending: {
    backgroundColor: '#f59e0b', // Orange/amber for pending
    borderColor: '#d97706', // Darker orange for border
  },
  projectTitlePending: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  projectDescriptionPending: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    lineHeight: 20,
  },
  projectInfoTextPending: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  projectFooterPending: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#d97706',
  },
  dateTextPending: {
    fontSize: 11,
    color: '#fff',
    marginBottom: 2,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ProjectsPage;

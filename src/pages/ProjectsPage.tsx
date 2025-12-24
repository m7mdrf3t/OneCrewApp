import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ProjectsPageProps } from '../types';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
import ProjectMenuPopup from '../components/ProjectMenuPopup';
import DeletedProjectsModal from '../components/DeletedProjectsModal';
import ProjectTypeModal from '../components/ProjectTypeModal';
import { spacing, semanticSpacing } from '../constants/spacing';
import MediaPickerService from '../services/MediaPickerService';
import SkeletonProjectCard from '../components/SkeletonProjectCard';

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
  const navigation = useNavigation();
  const { navigateTo, goBack } = useAppNavigation();
  const { getAllProjects, getProjectById, user, api, isGuest, checkPendingAssignments, uploadFile, updateProject, createProject } = useApi();
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
  // Uses lightweight backend endpoint for optimal performance
  const hasPendingAssignments = React.useCallback(async (project: any): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      // Use lightweight endpoint - no need to load all tasks
      const result = await checkPendingAssignments(project.id, user.id);
      if (result.hasPending) {
        console.log(`⏳ Project ${project.id} has ${result.count || 0} pending assignments for user ${user.id}`);
      }
      return result.hasPending || false;
    } catch (error) {
      console.warn(`⚠️ Failed to check pending assignments for project ${project.id}:`, error);
      return false;
    }
  }, [user, checkPendingAssignments]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('📋 Loading projects with server-side filtering...');
      console.log('👤 Current user ID:', user?.id);
      
      // Fetch owner and member projects in parallel using server-side filtering
      const [ownerProjects, memberProjects] = await Promise.all([
        getAllProjects({ role: 'owner', status: 'active', minimal: true }),
        getAllProjects({ role: 'member', status: 'active', minimal: true })
      ]);
      
      console.log(`📦 Received ${ownerProjects.length} owner projects and ${memberProjects.length} member projects from API`);
      
      // Debug: If no projects returned, this might be a backend filtering issue
      if (ownerProjects.length === 0 && memberProjects.length === 0) {
        console.warn('⚠️ WARNING: Backend returned 0 projects!');
        console.warn('   This could mean:');
        console.warn('   1. All projects are incorrectly marked as deleted');
        console.warn('   2. Backend getMyProjects() filter is too aggressive');
        console.warn('   3. User actually has no projects');
        console.warn('   4. Backend bug in soft delete filtering');
        console.warn('   Please check backend logs and database to verify project status');
      }
      
      // Ensure tasks is empty array for UI consistency (minimal endpoint doesn't include tasks)
      const ownerWithTasks = ownerProjects.map(project => ({
        ...project,
        tasks: project.tasks || [],
        isBasicData: true,
      }));
      
      const memberWithTasks = memberProjects.map(project => ({
        ...project,
        tasks: project.tasks || [],
        isBasicData: true,
      }));
      
      // ✅ Show UI immediately - don't wait for pending checks
      setOwnerProjects(ownerWithTasks);
      setMemberProjects(memberWithTasks);
      setPendingProjects([]); // Will be populated after background check
      setProjects([...ownerWithTasks, ...memberWithTasks]); // Keep for backward compatibility
      setIsLoading(false); // UI is ready!
      
      console.log(`📊 Loaded projects: ${ownerWithTasks.length} owner, ${memberWithTasks.length} member (pending checks in background)`);
      
      // Check pending assignments in background (non-blocking)
      if (memberWithTasks.length > 0) {
        checkPendingAssignmentsInBackground(memberWithTasks);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
      Alert.alert('Error', 'Failed to load projects. Please try again.');
      setIsLoading(false);
    }
  };

  // Check pending assignments in background after initial UI render
  // This allows the UI to appear immediately while pending checks happen asynchronously
  const checkPendingAssignmentsInBackground = async (memberProjects: any[]) => {
    if (!user?.id || memberProjects.length === 0) return;
    
    try {
      console.log(`🔄 Checking pending assignments for ${memberProjects.length} member projects in background...`);
      
      // Check pending assignments in parallel using lightweight endpoint
      const pendingChecks = await Promise.all(
        memberProjects.map(async (project) => {
          try {
            const hasPending = await hasPendingAssignments(project);
            return { project, hasPending };
          } catch (error) {
            console.warn(`⚠️ Failed to check pending for project ${project.id}:`, error);
            return { project, hasPending: false };
          }
        })
      );
      
      // Categorize member projects based on pending status
      const pending: any[] = [];
      const member: any[] = [];
      
      pendingChecks.forEach(({ project, hasPending }) => {
        if (hasPending) {
          pending.push(project);
        } else {
          member.push(project);
        }
      });
      
      // Update state after checks complete
      setMemberProjects(member);
      setPendingProjects(pending);
      
      console.log(`✅ Background pending check complete: ${member.length} member, ${pending.length} pending`);
    } catch (error) {
      console.error('❌ Failed to check pending assignments in background:', error);
      // Don't show error to user - just keep projects in member tab
    }
  };

  // Method to add project immediately without reload
  const addProjectToList = React.useCallback(async (newProject: any) => {
    // Unwrap response if it's wrapped in data property
    const project = newProject?.data || newProject;
    
    // Ensure created_by is set to current user (since they're creating it)
    const projectWithData = {
      ...project,
      created_by: project.created_by || user?.id,
      tasks: project.tasks || [],
      members: project.members || [],
      isBasicData: true,
    };
    
    console.log('📦 Adding project to list:', projectWithData.id, projectWithData.title);
    
    // Add to main projects list
    setProjects(prev => {
      // Check if project already exists to avoid duplicates
      const exists = prev.find(p => p.id === projectWithData.id);
      if (exists) {
        console.log('⚠️ Project already exists in list, skipping');
        return prev;
      }
      return [projectWithData, ...prev];
    });
    
    // Since the current user is creating it, it should be an owner project
    // Add to ownerProjects immediately
    setOwnerProjects(prev => {
      const exists = prev.find(p => p.id === projectWithData.id);
      if (exists) {
        return prev;
      }
      return [projectWithData, ...prev];
    });
    
    console.log('✅ Project added to ownerProjects list');
  }, [user]);

  // Expose addProjectToList to parent component via callback
  useEffect(() => {
    if (onProjectCreated && typeof onProjectCreated === 'function') {
      onProjectCreated(addProjectToList);
    }
  }, [onProjectCreated, addProjectToList]);

  // Generate next project number by checking existing projects
  const getNextProjectNumber = useCallback(() => {
    const allProjects = [...ownerProjects, ...memberProjects, ...pendingProjects];
    const projectNamePattern = /^Project\s+(\d+)$/i;
    let maxNumber = 0;
    
    allProjects.forEach((project) => {
      const match = project.title?.match(projectNamePattern);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    });
    
    return maxNumber + 1;
  }, [ownerProjects, memberProjects, pendingProjects]);

  // Direct project creation function
  const handleCreateProjectDirect = useCallback(async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a project');
        return;
      }

      if (isGuest) {
        Alert.alert('Error', 'Guest users cannot create projects. Please sign in.');
        return;
      }

      const projectNumber = getNextProjectNumber();
      const projectTitle = `Project ${projectNumber}`;

      console.log('👤 Creating project directly for user:', user.id, user.name);
      console.log('📋 Project title:', projectTitle);

      // Create project with minimal parameters
      const projectRequest = {
        title: projectTitle,
        type: 'film',
        status: 'planning',
      };

      console.log('📋 Creating project with data:', projectRequest);

      // Create the project using the API
      const response = await createProject(projectRequest);
      console.log('✅ Project created successfully:', response);
      
      // Unwrap response if needed
      const createdProject = response?.data || response;
      
      // Ensure created_by is set
      if (!createdProject.created_by && user?.id) {
        createdProject.created_by = user.id;
      }

      // Add project immediately to the list
      await addProjectToList(createdProject);
      
      // Switch to owner tab to show the newly created project
      setActiveTab('owner');
      
      console.log('📋 Project added to UI, should be visible now');

      // Show success message
      Alert.alert('Success', `Project "${projectTitle}" created successfully!`);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      const errorMessage = error?.message || 'Failed to create project. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  }, [user, isGuest, getNextProjectNumber, createProject, addProjectToList]);

  // Use props if provided, otherwise use navigation hooks
  const handleBack = onBack || goBack;
  const handleRefresh = onRefresh || loadProjects;
  // Always use direct project creation (no modal)
  const handleAddNewProject = handleCreateProjectDirect;
  const handleAddNewProjectEasy = onAddNewProjectEasy || (() => navigateTo('newProjectEasy'));
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const currentSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
  const handleSearchChange = onSearchChange || setLocalSearchQuery;
  const handleNavigateToSignup = onNavigateToSignup || (() => navigateTo('signup'));
  const handleNavigateToLogin = onNavigateToLogin || (() => navigateTo('login'));

  const handleProjectPress = (project: any) => {
    if (onNavigateToProjectDetail) {
      onNavigateToProjectDetail(project);
    } else if (onProjectSelect) {
      onProjectSelect(project);
    } else {
      // Fallback: use navigation when no props provided
      navigateTo('projectDetail', { project });
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
              
              // Soft delete - backend now properly supports is_deleted and deleted_at fields
              const deletePayload = {
                is_deleted: true,
                deleted_at: new Date().toISOString(),
              };
              
              console.log('📤 Sending delete payload:', deletePayload);
              const response = await api.updateProject(selectedProject.id, deletePayload as any);
              
              // Check if backend returned success
              if (!response?.success) {
                throw new Error(response?.error || 'Backend returned unsuccessful response');
              }
              
              // Verify deletion was applied (backend should now return these fields)
              const updatedProject = response?.data as any;
              const wasDeleted = updatedProject?.is_deleted === true || updatedProject?.deleted_at !== null;
              
              if (!wasDeleted) {
                // Log warning but proceed - backend may have deleted it but not returned fields
                console.warn('⚠️ Backend response does not show deleted fields, but deletion may have succeeded');
                console.log('Response data:', updatedProject);
              }
              
              // Remove project from all categories
              // Backend's getMyProjects() will automatically exclude deleted projects on next load
              setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              setOwnerProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              setMemberProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              setPendingProjects(prev => prev.filter(p => p.id !== selectedProject.id));
              
              console.log('✅ Project moved to recycle bin successfully');
              setSelectedProject(null);
              
              // Show success message
              Alert.alert('Success', 'Project moved to recycle bin successfully.');
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
      setSelectedProject((prev: any) => prev ? { ...prev, type: projectType } : null);

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
      return 'viewer';
    }
    
    // Check if user is the owner (created_by field)
    if (project.created_by === user.id) {
      return 'owner';
    }
    
    // Check if user is a member - try multiple possible field structures
    const members = project.members || project.project_members || [];
    const isMember = members.some((member: any) => {
      const memberUserId = member.user_id || member.user?.id || member.id;
      return memberUserId === user.id;
    });
    
    if (isMember) {
      return 'member';
    }
    
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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Projects</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.skeletonContainer}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonProjectCard key={index} isDark={false} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Projects</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
            <TouchableOpacity style={styles.guestButton} onPress={handleNavigateToSignup}>
              <Text style={styles.guestButtonText}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.guestButton, styles.guestButtonSecondary]} onPress={handleNavigateToLogin}>
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
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Projects</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#000" />
        </TouchableOpacity>
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
        onPress={handleAddNewProject}
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
  skeletonContainer: {
    padding: 16,
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


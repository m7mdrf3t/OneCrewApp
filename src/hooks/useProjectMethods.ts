import { User } from 'onecrew-api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rateLimiter } from '../utils/rateLimiter';
import performanceMonitor from '../services/PerformanceMonitor';
import {
  TaskWithAssignments,
  ProjectWithDetails,
  ProjectMember,
  CreateTaskRequest,
  UpdateTaskRequest,
  AssignTaskServiceRequest,
  UpdateTaskStatusRequest,
} from '../types';
import OneCrewApi, { AssignTaskServiceRequest as ApiAssignTaskServiceRequest } from 'onecrew-api-client';

interface UseProjectMethodsParams {
  api: any;
  user: User | null;
  getAccessToken: () => string;
}

export function useProjectMethods({
  api,
  user,
  getAccessToken,
}: UseProjectMethodsParams) {
  const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
  const createProject = async (projectData: any) => {
    try {
      const response = await api.createProject(projectData);
      return response;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  };

  const updateProject = async (projectId: string, updates: any) => {
    try {
      const response = await api.updateProject(projectId, updates);
      if (response.success && response.data) {
        return response;
      } else {
        throw new Error(response.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  };

  const getProjects = async (filters?: {
    minimal?: boolean;
    created_by?: string;
    member_id?: string;
    role?: 'owner' | 'member' | 'viewer';
    status?: 'active' | 'deleted';
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get Projects',
      `${baseUrl}/api/projects`,
      'GET',
      async () => {
        try {
          // Use minimal=true by default for backward compatibility, but allow override
          const params = {
            minimal: filters?.minimal !== undefined ? filters.minimal : true,
            ...(filters?.created_by && { created_by: filters.created_by }),
            ...(filters?.member_id && { member_id: filters.member_id }),
            ...(filters?.role && { role: filters.role }),
            ...(filters?.status && { status: filters.status }),
            ...(filters?.search && { search: filters.search }),
            ...(filters?.type && { type: filters.type }),
            ...(filters?.page && { page: filters.page }),
            ...(filters?.limit && { limit: filters.limit }),
          };
          
          const response = await api.getProjects(params as any);
          if (response.success && response.data) {
            // Handle both array and paginated response
            return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
          } else {
            throw new Error(response.error || 'Failed to fetch projects');
          }
        } catch (error) {
          console.error('Failed to get projects:', error);
          throw error;
        }
      }
    );
  };

  const getMyProjects = async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    include_deleted?: boolean;
    minimal?: boolean;
    role?: 'owner' | 'member' | 'viewer';
    access_level?: 'owner' | 'member' | 'viewer';
    is_owner?: boolean;
    search?: string;
    type?: string;
    sort_by?: 'created_at' | 'updated_at' | 'title';
    sort?: string;
    order?: 'asc' | 'desc';
    fields?: string[];
  }): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get My Projects',
      `${baseUrl}/api/projects/my`,
      'GET',
      async () => {
        try {
          const response = await api.getMyProjects(params);
          
          if (response.success && response.data) {
            let projects: any[] = [];
            
            // Handle paginated response structure
            if (Array.isArray(response.data)) {
              projects = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              projects = response.data.data;
            } else if ((response.data as any).items && Array.isArray((response.data as any).items)) {
              projects = (response.data as any).items;
            } else {
              console.warn('   Unexpected response structure from getMyProjects:', Object.keys(response.data));
              return [];
            }
            
            // Map project_members to members for consistency
            projects = projects.map((project: any) => ({
              ...project,
              members: project.project_members || project.members || [],
            }));
            
            return projects;
          } else {
            console.warn('   Backend returned unsuccessful response or no data');
            return [];
          }
        } catch (error) {
          console.error('  Failed to get my projects:', error);
          return [];
        }
      }
    );
  };

  const getAllProjects = async (filters?: {
    minimal?: boolean;
    role?: 'owner' | 'member' | 'viewer';
    is_owner?: boolean;
    status?: 'active' | 'deleted';
    search?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get All Projects',
      `${baseUrl}/api/projects/all`,
      'GET',
      async () => {
        try {
          // Backend now includes project_members in the response, eliminating N+1 queries
          // No need to enrich each project with separate API calls
          let projects: any[] = [];
          try {
            // Use minimal=true by default for backward compatibility, but allow override
            // Apply server-side filtering parameters
            const params: any = {
              minimal: filters?.minimal !== undefined ? filters.minimal : true,
              ...(filters?.role && { role: filters.role }),
              ...(filters?.is_owner !== undefined && { is_owner: filters.is_owner }),
              ...(filters?.status && { status: filters.status }),
              ...(filters?.search && { search: filters.search }),
              ...(filters?.type && { type: filters.type }),
              ...(filters?.page && { page: filters.page }),
              ...(filters?.limit && { limit: filters.limit }),
            };
            
            // Use minimal=true to get lightweight project data (no tasks, minimal member info)
            // This significantly reduces network payload and improves performance
            const myProjectsResponse = await api.getMyProjects(params);
            
            console.log('📥 getMyProjects (minimal) response received:', {
              success: myProjectsResponse.success,
              hasData: !!myProjectsResponse.data,
              dataType: Array.isArray(myProjectsResponse.data) ? 'array' : typeof myProjectsResponse.data,
            });
            
            if (myProjectsResponse.success && myProjectsResponse.data) {
              // Handle paginated response structure: response.data.data is the array
              if (Array.isArray(myProjectsResponse.data)) {
                projects = myProjectsResponse.data;
                console.log(`📦 Found ${projects.length} projects in array response`);
              } else if (myProjectsResponse.data.data && Array.isArray(myProjectsResponse.data.data)) {
                projects = myProjectsResponse.data.data;
                console.log(`📦 Found ${projects.length} projects in paginated response (data.data)`);
              } else if ((myProjectsResponse.data as any).items && Array.isArray((myProjectsResponse.data as any).items)) {
                projects = (myProjectsResponse.data as any).items;
                console.log(`📦 Found ${projects.length} projects in items response`);
              } else {
                console.warn('   Unexpected response structure:', Object.keys(myProjectsResponse.data));
              }
              
              // Backend now returns minimal data (no tasks, lightweight members)
              // Map project_members/users to members for backward compatibility
              projects = projects.map((project: any) => {
                // Log raw project structure to understand what minimal endpoint returns
                if (projects.indexOf(project) === 0) {
                  console.log('🔍 Raw project from minimal endpoint:', {
                    id: project.id,
                    title: project.title,
                    has_project_members: !!project.project_members,
                    has_members: !!project.members,
                    has_users: !!project.users,
                    users_type: Array.isArray(project.users) ? 'array' : typeof project.users,
                    users_length: Array.isArray(project.users) ? project.users.length : 'N/A',
                    project_keys: Object.keys(project),
                  });
                }
                
                // Minimal endpoint may return members in different field names
                // Check: project_members, members, or users (for minimal endpoint)
                let members = project.project_members || project.members || [];
                
                // If members is empty but users exists, check if it's the members array
                // (minimal endpoint might use 'users' field for members)
                if (members.length === 0 && project.users && Array.isArray(project.users)) {
                  // Check if users array contains member objects (with role, user_id)
                  const firstUser = project.users[0];
                  if (firstUser && (firstUser.role || firstUser.user_id)) {
                    members = project.users;
                    console.log(`    Found members in 'users' field for project ${project.id}:`, members.length);
                  }
                }
                
                return {
                  ...project,
                  members,
                  // Ensure tasks is empty array for UI consistency (minimal endpoint doesn't include tasks)
                  tasks: [],
                };
              });
              
              console.log(`    Loaded ${projects.length} projects (minimal data from backend)`);
              
              // Debug: Log first project structure (should be lightweight)
              if (projects.length > 0) {
                console.log('📋 Sample project structure (minimal):', {
                  id: projects[0].id,
                  title: projects[0].title,
                  is_deleted: projects[0].is_deleted,
                  deleted_at: projects[0].deleted_at,
                  created_by: projects[0].created_by,
                  members_count: projects[0].members?.length || 0,
                  has_tasks: projects[0].tasks?.length > 0,
                  member_keys: projects[0].members?.[0] ? Object.keys(projects[0].members[0]) : [],
                });
              } else {
                console.warn('   No projects returned from backend - this might indicate:');
                console.warn('   1. All projects are soft-deleted');
                console.warn('   2. Backend filtering is too aggressive');
                console.warn('   3. User has no projects');
                console.warn('   4. Backend bug in getMyProjects()');
              }
            } else {
              console.warn('   Backend returned unsuccessful response or no data');
              console.log('Response summary:', {
                success: myProjectsResponse.success,
                hasData: !!myProjectsResponse.data,
                error: (myProjectsResponse as any).error,
              });
            }
          } catch (err) {
            console.error('  Failed to get my projects:', err);
            throw err;
          }
          
          return projects;
        } catch (error) {
          console.error('  Failed to get all user projects:', error);
          throw error;
        }
      }
    );
  };

  /**
   * Get owner projects for the current user (optimized endpoint).
   * Uses the onecrew-api-client's getMyOwnerProjects() method for server-side filtering.
   */
  const getMyOwnerProjects = async (filters?: {
    minimal?: boolean;
    search?: string;
    type?: string;
    status?: 'active' | 'deleted';
    page?: number;
    limit?: number;
  }): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get My Owner Projects',
      `${baseUrl}/api/projects/my/owner`,
      'GET',
      async () => {
        try {
          // Use minimal=true by default for backward compatibility
          const params: any = {
            minimal: filters?.minimal !== undefined ? filters.minimal : true,
            ...(filters?.search && { search: filters.search }),
            ...(filters?.type && { type: filters.type }),
            ...(filters?.status && { status: filters.status }),
            ...(filters?.page && { page: filters.page }),
            ...(filters?.limit && { limit: filters.limit }),
          };

          // Use getMyProjects with is_owner: true for server-side filtering
          // Note: getMyOwnerProjects may not be available in all API client versions
          const response = await api.getMyProjects({ ...params, is_owner: true } as any);
          
          if (response.success && response.data) {
            // Handle both array and paginated response
            let projects: any[] = [];
            if (Array.isArray(response.data)) {
              projects = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              projects = response.data.data;
            } else if ((response.data as any).items && Array.isArray((response.data as any).items)) {
              projects = (response.data as any).items;
            }
            
            // Normalize members field for backward compatibility
            projects = projects.map((project: any) => {
              let members = project.project_members || project.members || [];
              if (members.length === 0 && project.users && Array.isArray(project.users)) {
                const firstUser = project.users[0];
                if (firstUser && (firstUser.role || firstUser.user_id)) {
                  members = project.users;
                }
              }
              
              return {
                ...project,
                members,
                tasks: [],
              };
            });
            
            return projects;
          } else {
            throw new Error(response.error || 'Failed to fetch owner projects');
          }
        } catch (error) {
          console.error('Failed to get owner projects:', error);
          throw error;
        }
      }
    );
  };

  /**
   * Get deleted (soft-deleted) projects for the current user.
   * Uses the onecrew-api-client's getDeletedProjects() method.
   */
  const getDeletedProjects = async (): Promise<any[]> => {
    return performanceMonitor.trackApiCall(
      'Get Deleted Projects',
      `${baseUrl}/api/projects/deleted`,
      'GET',
      async () => {
        try {
          // Use the API client's getDeletedProjects method
          const response = await api.getDeletedProjects();
          
          if (response.success && response.data) {
            let projects: any[] = [];
            
            // Handle paginated response structure
            if (Array.isArray(response.data)) {
              projects = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              projects = response.data.data;
            } else if ((response.data as any).items && Array.isArray((response.data as any).items)) {
              projects = (response.data as any).items;
            } else {
              console.warn('   Unexpected response structure from getDeletedProjects:', Object.keys(response.data));
              return [];
            }
            
            console.log(`    Loaded ${projects.length} deleted projects using API client`);
            
            // Map project_members to members for consistency
            projects = projects.map((project: any) => ({
              ...project,
              members: project.project_members || project.members || [],
            }));
            
            return projects;
          } else {
            console.warn('   Backend returned unsuccessful response or no data');
            console.log('Response:', response);
            return [];
          }
        } catch (error) {
          console.error('  Failed to get deleted projects:', error);
          // Return empty array instead of throwing - recycle bin can show empty state
          return [];
        }
      }
    );
  };

  const getProjectTasks = async (projectId: string): Promise<TaskWithAssignments[]> => {
    try {
      const response = await api.getProjectTasks(projectId);
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to get project tasks');
      }
    } catch (error) {
      console.error('Failed to get project tasks:', error);
      throw error;
    }
  };

  const getProjectById = async (projectId: string): Promise<ProjectWithDetails> => {
    return performanceMonitor.trackApiCall(
      'Get Project By ID',
      `${baseUrl}/api/projects/${projectId}`,
      'GET',
      async () => {
        try {
          const response = await api.getProjectById(projectId);
      
          if (response.success && response.data) {
            // getProjectById should return a single project object, not an array
            return response.data;
          } else {
            const errorMessage = response.error || 'Failed to get project details';
            // Provide more context for access denied errors
            if (errorMessage.includes('Access denied') || errorMessage.includes('not a member')) {
              throw new Error(`Access denied: You do not have permission to view project ${projectId}. You must be the project owner or a member.`);
            }
            throw new Error(errorMessage);
          }
        } catch (error: any) {
          // Log error with more context
          if (error?.message?.includes('Access denied') || error?.message?.includes('403')) {
            console.error(`  Access denied for project ${projectId}:`, error.message);
          } else {
            console.error(`  Failed to get project details for ${projectId}:`, error);
          }
          throw error;
        }
      }
    );
  };

  const getProjectStats = async (projectId: string) => {
    try {
      console.log('📊 Getting project stats:', projectId);
      const response = await api.getProjectStats(projectId);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to get project stats');
    } catch (error: any) {
      console.error('  Failed to get project stats:', error);
      throw error;
    }
  };

  const restoreProject = async (projectId: string) => {
    try {
      console.log('♻️ Restoring project:', projectId);
      const response = await api.restoreProject(projectId);
      
      if (response.success && response.data) {
        // Invalidate related caches
        await rateLimiter.clearCacheByPattern(`project-${projectId}`);
        await rateLimiter.clearCacheByPattern('projects');
        await rateLimiter.clearCacheByPattern('deleted-projects');
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to restore project');
    } catch (error: any) {
      console.error('  Failed to restore project:', error);
      throw error;
    }
  };

  const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      const response = await api.getProjectMembers(projectId);
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to get project members');
      }
    } catch (error) {
      console.error('Failed to get project members:', error);
      throw error;
    }
  };

  const getProjectMembersWithRoles = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      const response = await api.getProjectMembersWithRoles(projectId);
      if (response.success && response.data) {
        // Handle both array and paginated response
        return Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else {
        throw new Error(response.error || 'Failed to get project members with roles');
      }
    } catch (error) {
      console.error('Failed to get project members with roles:', error);
      throw error;
    }
  };

  const getProjectRoles = async (projectId: string) => {
    try {
      const response = await api.getProjectRoles(projectId);
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to get project roles');
    } catch (error: any) {
      console.error('  Failed to get project roles:', error);
      throw error;
    }
  };

  /**
   * Check if a project has pending task assignments for a specific user.
   * This is optimized to use a lightweight endpoint if available, otherwise falls back
   * to checking tasks (less efficient but works with current backend).
   * 
   * @param projectId - The project ID to check
   * @param userId - The user ID to check pending assignments for
   * @returns Object with hasPending boolean and optional count
   */
  const checkPendingAssignments = async (
    projectId: string, 
    userId: string
  ): Promise<{ hasPending: boolean; count?: number }> => {
    return performanceMonitor.trackApiCall(
      'Check Pending Assignments',
      `${baseUrl}/api/projects/${projectId}/pending-assignments`,
      'GET',
      async () => {
        try {
          // Try lightweight endpoint first (if backend supports it)
          try {
            const token = await AsyncStorage.getItem('accessToken');
            const response = await fetch(
              `${baseUrl}/api/projects/${projectId}/pending-assignments?userId=${userId}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.hasPending !== undefined) {
                console.log(`    Using lightweight endpoint for pending check: ${projectId}`);
                return {
                  hasPending: data.hasPending || false,
                  count: data.count,
                };
              }
            }
          } catch (lightweightError) {
            // Endpoint doesn't exist yet, fall back to checking tasks
            console.log(`   Lightweight endpoint not available, using fallback for project ${projectId}`);
          }

          // Fallback: Check tasks (less efficient but works with current backend)
          // This will be replaced once backend implements the lightweight endpoint
          const tasks = await getProjectTasks(projectId);
          let pendingCount = 0;

          for (const task of tasks) {
            const assignments = task.assignments || [];
            const hasPending = assignments.some((assignment: any) => {
              const assignmentUserId = assignment.user_id || assignment.user?.id;
              const assignmentStatus = assignment.status || 'pending';
              return assignmentUserId === userId && assignmentStatus === 'pending';
            });
            
            if (hasPending) {
              pendingCount++;
            }
          }

          return {
            hasPending: pendingCount > 0,
            count: pendingCount,
          };
        } catch (error) {
          console.error(`Failed to check pending assignments for project ${projectId}:`, error);
          // Return false on error to prevent blocking UI
          return { hasPending: false, count: 0 };
        }
      }
    );
  };

  const createTask = async (projectId: string, taskData: CreateTaskRequest) => {
    try {
      const response = await api.createTask(projectId, taskData);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      } else {
        console.error('  Failed to create task:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to create task'
        };
      }
    } catch (error) {
      console.error('  Error creating task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task'
      };
    }
  };

  const updateTask = async (taskId: string, updates: UpdateTaskRequest) => {
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/projects/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Return in the format expected by components
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('  Failed to update task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/projects/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('  Failed to delete task:', error);
      throw error;
    }
  };

  const assignTaskService = async (projectId: string, taskId: string, assignment: AssignTaskServiceRequest | ApiAssignTaskServiceRequest) => {
    try {
      console.log('📋 Assigning task service:', {
        projectId,
        taskId,
        service_role: assignment.service_role,
        user_id: assignment.user_id,
        company_id: assignment.company_id
      });
      
      // Validate required fields
      // Either user_id OR company_id must be provided (not both)
      if (!assignment.user_id && !assignment.company_id) {
        throw new Error('Either user_id or company_id is required for task assignment');
      }
      if (!assignment.service_role) {
        throw new Error('service_role is required for task assignment');
      }
      
      // Build clean assignment object - remove undefined values and ensure XOR condition
      // Joi's .xor() requires exactly one of user_id or company_id, and undefined values break it
      const apiAssignment: any = {
        service_role: assignment.service_role as any,
      };
      
      // Only include user_id OR company_id (not both, and not undefined)
      if (assignment.company_id) {
        // Company assignment - only send company_id
        apiAssignment.company_id = assignment.company_id;
      } else if (assignment.user_id) {
        // User assignment - only send user_id
        apiAssignment.user_id = assignment.user_id;
      }
      
      // Log what we're sending
      console.log('📤 Sending assignment request:', {
        service_role: apiAssignment.service_role,
        user_id: apiAssignment.user_id || 'NOT INCLUDED',
        company_id: apiAssignment.company_id || 'NOT INCLUDED',
      });
      
      const response = await api.assignTaskService(projectId, taskId, apiAssignment);
      
      if (response.success && response.data) {
        console.log('    Task assignment successful:', response.data);
        // Handle both array and single object response
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data && typeof response.data === 'object' && 'id' in response.data) {
          // Single assignment object - return as array with one element
          return [response.data];
        } else if ((response.data as any).data) {
          // Nested data property
          const nestedData = (response.data as any).data;
          return Array.isArray(nestedData) ? nestedData : [nestedData];
        } else {
          // Fallback: return empty array (shouldn't happen)
          console.warn('   Unexpected response.data format:', response.data);
          return [];
        }
      } else {
        const errorMessage = response.error || 'Failed to assign task service';
        console.error('  Assignment failed:', {
          error: errorMessage,
          response: response,
          assignment: apiAssignment
        });
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('  Failed to assign task service:', {
        error: error.message || error,
        errorDetails: error.response || error.data || error,
        projectId,
        taskId,
        assignment
      });
      
      // Provide more helpful error message
      if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        throw new Error('Server error: Unable to assign task service. Please try again or contact support.');
      }
      
      throw error;
    }
  };

  const deleteTaskAssignment = async (projectId: string, taskId: string, assignmentId: string) => {
    try {
      console.log('🗑️ Deleting task assignment:', {
        projectId,
        taskId,
        assignmentId,
        url: `${baseUrl}/api/projects/${projectId}/tasks/${taskId}/assignments/${assignmentId}`
      });
      
      // Validate UUID format (per guide)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assignmentId)) {
        throw new Error(`Invalid UUID format: ${assignmentId}`);
      }
      
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      const response = await fetch(`${baseUrl}/api/projects/${projectId}/tasks/${taskId}/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      console.log('📥 Delete assignment response:', {
        status: response.status,
        ok: response.ok,
        data
      });
      
      // Handle specific HTTP status codes (per guide)
      if (response.status === 400) {
        const errorMessage = data.error || data.message || 'Invalid request';
        if (errorMessage.includes('UUID') || errorMessage.includes('Invalid')) {
          throw new Error(`Invalid UUID: ${errorMessage}`);
        }
        throw new Error(errorMessage);
      } else if (response.status === 403) {
        throw new Error('You do not have permission to remove this assignment');
      } else if (response.status === 404) {
        // Assignment not found - might already be deleted (per guide)
        console.warn('   Assignment not found (404), may already be deleted');
        return {
          success: true,
          data: null,
          message: 'Assignment not found (may already be deleted)'
        };
      } else if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('  HTTP Error deleting assignment:', {
          status: response.status,
          error: errorMessage,
          data
        });
        throw new Error(errorMessage);
      }
      
      if (!data.success) {
        const errorMessage = data.error || data.message || 'Failed to delete assignment';
        console.error('  API Error deleting assignment:', {
          error: errorMessage,
          data
        });
        throw new Error(errorMessage);
      }
      
      console.log('    Assignment successfully deleted from backend');
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('  Failed to delete task assignment:', {
        error: error.message || error,
        projectId,
        taskId,
        assignmentId,
        stack: error.stack
      });
      throw error;
    }
  };

  const updateTaskAssignmentStatus = async (
    projectId: string, 
    taskId: string, 
    assignmentId: string, 
    status: 'accepted' | 'rejected'
  ) => {
    try {
      console.log('📋 Updating task assignment status:', { 
        projectId, 
        taskId, 
        assignmentId, 
        status 
      });
      const accessToken = getAccessToken();
      
      const url = `${baseUrl}/api/projects/${projectId}/tasks/${taskId}/assignments/${assignmentId}`;
      console.log('🌐 Making request to:', url);
      console.log('📤 Request body:', JSON.stringify({ status }));
      console.log('📤 Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken?.substring(0, 20)}...`
      });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      console.log('    Response received:', JSON.stringify(data).substring(0, 200));
      
      if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('  HTTP Error:', response.status, errorMessage);
        console.error('  Full error response:', JSON.stringify(data));
        throw new Error(errorMessage);
      }
      
      if (!data.success) {
        const errorMessage = data.error || data.message || 'Failed to update assignment status';
        console.error('  API Error:', errorMessage);
        console.error('  Full error response:', JSON.stringify(data));
        throw new Error(errorMessage);
      }
      
      console.log('    Task assignment status updated successfully');
      return {
        success: true,
        data: data.data || data
      };
    } catch (error: any) {
      console.error('  Failed to update assignment status:', {
        error: error.message || error,
        projectId,
        taskId,
        assignmentId,
        status,
        stack: error.stack
      });
      throw error;
    }
  };

  const updateTaskStatus = async (taskId: string, status: UpdateTaskStatusRequest) => {
    try {
      const accessToken = getAccessToken();
      const response = await fetch(`${baseUrl}/api/projects/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(typeof status === 'object' ? status : { status }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('  Failed to update task status:', error);
      throw error;
    }
  };

  const unassignTaskService = async (projectId: string, taskId: string, assignmentId: string) => {
    try {
      console.log('📋 Unassigning task service:', projectId, taskId, assignmentId);
      const response = await api.unassignTaskService(projectId, taskId, assignmentId);
      
      if (response.success) {
        // Invalidate related caches
        await rateLimiter.clearCacheByPattern(`project-${projectId}`);
        await rateLimiter.clearCacheByPattern(`task-${taskId}`);
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to unassign task service');
    } catch (error: any) {
      console.error('  Failed to unassign task service:', error);
      throw error;
    }
  };

  const getTaskById = async (taskId: string) => {
    try {
      console.log('📋 Getting task by ID:', taskId);
      const response = await api.getTaskById(taskId);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error(response.error || 'Failed to get task');
    } catch (error: any) {
      console.error('  Failed to get task:', error);
      throw error;
    }
  };

  const getTaskAssignments = async (projectId: string, taskId: string) => {
    try {
      console.log('📋 Getting task assignments:', projectId, taskId);
      const response = await api.getTaskAssignments(projectId, taskId);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Failed to get task assignments');
      }
    } catch (error) {
      console.error('Failed to get task assignments:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get task assignments'
      };
    }
  };

  // Profile Switching Methods

  return {
    createProject,
    updateProject,
    getProjects,
    getMyProjects,
    getAllProjects,
    getMyOwnerProjects,
    getDeletedProjects,
    getProjectTasks,
    getProjectById,
    getProjectStats,
    restoreProject,
    getProjectMembers,
    getProjectMembersWithRoles,
    getProjectRoles,
    checkPendingAssignments,
    createTask,
    updateTask,
    deleteTask,
    assignTaskService,
    deleteTaskAssignment,
    updateTaskAssignmentStatus,
    updateTaskStatus,
    unassignTaskService,
    getTaskById,
    getTaskAssignments,
  };
}

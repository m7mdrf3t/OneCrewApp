import { ApiClient } from '../core/ApiClient';
import { AuthService } from './AuthService';
import {
  User,
  Project,
  CreateProjectRequest,
  Team,
  CreateTeamRequest,
  JoinTeamRequest,
  Conversation,
  Message,
  SendMessageRequest,
  SearchParams,
  SearchSuggestion,
  UploadResponse,
  PaginatedResponse,
  ApiResponse
} from '../types';

export class OneCrewApi {
  public auth: AuthService;
  private apiClient: ApiClient;

  constructor(baseUrl: string, timeout?: number, retries?: number) {
    this.apiClient = new ApiClient(baseUrl, timeout, retries);
    this.auth = new AuthService(this.apiClient);
  }

  // Initialize the API client
  async initialize(): Promise<void> {
    await this.auth.initialize();
  }

  // User Management
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    role?: string;
  }): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/users?${queryString}` : '/api/users';
    
    return this.apiClient.get<PaginatedResponse<User>>(endpoint);
  }

  async getUserById(userId: string): Promise<ApiResponse<User>> {
    return this.apiClient.post<User>('/api/users/get-by-id', { id: userId });
  }

  async updateUserProfile(updates: Partial<User>): Promise<ApiResponse<User>> {
    return this.apiClient.put<User>('/api/users/profile', updates);
  }

  async deleteUser(): Promise<ApiResponse<void>> {
    return this.apiClient.delete<void>('/api/users/profile');
  }

  // Project Management
  async getProjects(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    type?: string;
  }): Promise<PaginatedResponse<Project>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/projects?${queryString}` : '/api/projects';
    
    return this.apiClient.get<PaginatedResponse<Project>>(endpoint);
  }

  async getProjectById(projectId: string): Promise<ApiResponse<Project>> {
    return this.apiClient.get<Project>(`/api/projects/${projectId}`);
  }

  async createProject(projectData: CreateProjectRequest): Promise<ApiResponse<Project>> {
    return this.apiClient.post<Project>('/api/projects', projectData);
  }

  async updateProject(projectId: string, updates: Partial<CreateProjectRequest>): Promise<ApiResponse<Project>> {
    return this.apiClient.put<Project>(`/api/projects/${projectId}`, updates);
  }

  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete<void>(`/api/projects/${projectId}`);
  }

  async joinProject(projectId: string, role?: string): Promise<ApiResponse<void>> {
    return this.apiClient.post<void>(`/api/projects/${projectId}/join`, { role });
  }

  async leaveProject(projectId: string): Promise<ApiResponse<void>> {
    return this.apiClient.post<void>(`/api/projects/${projectId}/leave`);
  }

  // Team Management
  async getTeams(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Team>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/teams?${queryString}` : '/api/teams';
    
    return this.apiClient.get<PaginatedResponse<Team>>(endpoint);
  }

  async getTeamById(teamId: string): Promise<ApiResponse<Team>> {
    return this.apiClient.get<Team>(`/api/teams/${teamId}`);
  }

  async createTeam(teamData: CreateTeamRequest): Promise<ApiResponse<Team>> {
    return this.apiClient.post<Team>('/api/teams', teamData);
  }

  async updateTeam(teamId: string, updates: Partial<CreateTeamRequest>): Promise<ApiResponse<Team>> {
    return this.apiClient.put<Team>(`/api/teams/${teamId}`, updates);
  }

  async deleteTeam(teamId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete<void>(`/api/teams/${teamId}`);
  }

  async joinTeam(teamData: JoinTeamRequest): Promise<ApiResponse<void>> {
    return this.apiClient.post<void>('/api/teams/join', teamData);
  }

  async leaveTeam(teamId: string): Promise<ApiResponse<void>> {
    return this.apiClient.post<void>(`/api/teams/${teamId}/leave`);
  }

  // Communication
  async getConversations(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Conversation>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/communication/conversations?${queryString}` : '/api/communication/conversations';
    
    return this.apiClient.get<PaginatedResponse<Conversation>>(endpoint);
  }

  async getConversationById(conversationId: string): Promise<ApiResponse<Conversation>> {
    return this.apiClient.get<Conversation>(`/api/communication/conversations/${conversationId}`);
  }

  async createConversation(participantIds: string[], name?: string): Promise<ApiResponse<Conversation>> {
    return this.apiClient.post<Conversation>('/api/communication/conversations', {
      participant_ids: participantIds,
      name
    });
  }

  async getMessages(conversationId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Message>> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString 
      ? `/api/communication/conversations/${conversationId}/messages?${queryString}`
      : `/api/communication/conversations/${conversationId}/messages`;
    
    return this.apiClient.get<PaginatedResponse<Message>>(endpoint);
  }

  async sendMessage(conversationId: string, messageData: SendMessageRequest): Promise<ApiResponse<Message>> {
    return this.apiClient.post<Message>(`/api/communication/conversations/${conversationId}/messages`, messageData);
  }

  // Search
  async searchUsers(params: SearchParams): Promise<PaginatedResponse<User>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => queryParams.append(key, item.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    return this.apiClient.get<PaginatedResponse<User>>(`/api/search/users?${queryParams.toString()}`);
  }

  async searchProjects(params: SearchParams): Promise<PaginatedResponse<Project>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => queryParams.append(key, item.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    return this.apiClient.get<PaginatedResponse<Project>>(`/api/search/projects?${queryParams.toString()}`);
  }

  async searchTeams(params: SearchParams): Promise<PaginatedResponse<Team>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => queryParams.append(key, item.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    return this.apiClient.get<PaginatedResponse<Team>>(`/api/search/teams?${queryParams.toString()}`);
  }

  async globalSearch(query: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    users: User[];
    projects: Project[];
    teams: Team[];
  }>> {
    const queryParams = new URLSearchParams({ q: query });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return this.apiClient.get(`/api/search/global?${queryParams.toString()}`);
  }

  async getSearchSuggestions(query: string): Promise<ApiResponse<SearchSuggestion[]>> {
    return this.apiClient.get<SearchSuggestion[]>(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
  }

  // Upload
  async uploadFile(file: {
    uri: string;
    type: string;
    name: string;
  }): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    return this.apiClient.post<UploadResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.apiClient.get('/health');
  }
}

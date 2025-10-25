// Type definitions for One Crew app

export interface User {
  name: string;
}

export interface NavigationState {
  name: string;
  data?: any;
}

export interface TabBarProps {
  active: string;
  onChange: (tab: string) => void;
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onOpenFilter?: () => void;
}

export interface SectionCardProps {
  section: {
    key: string;
    title: string;
    items: Array<{ label: string; users?: number }>;
    userCount?: number;
  };
  onClick: () => void;
}

export interface ServiceCardProps {
  item: {
    label: string;
    users?: number;
  };
  onSelect: () => void;
}

export interface ProfileCardProps {
  profile: any;
  onSelect: () => void;
  onAddToTeam?: () => void;
  onAssignToProject?: () => void;
  onStartChat?: () => void;
  myTeam?: any[];
}

export interface ProjectCardProps {
  project: any;
  onSelect: () => void;
}

export interface HomePageProps {
  onServiceSelect: (serviceData: any, sectionKey: string) => void;
  onOpenFilter: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleTheme: () => void;
  theme: string;
  onNavigate: (pageName: string, data?: any) => void;
  user: User;
  onOpenMainMenu: () => void;
}

export interface ProjectsPageProps {
  onProjectSelect: (project: any) => void;
  onAddNewProject: () => void;
  onAddNewProjectEasy: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBack: () => void;
  myTeam: any[];
  onProfileSelect: (profile: any) => void;
  onNavigateToProjectDetail?: (project: any) => void;
  onRefresh?: () => void;
  onNavigateToSignup?: () => void;
  onNavigateToLogin?: () => void;
}

export interface ProfileDetailPageProps {
  profile: any;
  onBack: () => void;
  onAssignToProject: (profile: any) => void;
  onAddToTeam: (profile: any) => void;
  myTeam: any[];
  onStartChat: (profile: any) => void;
  onMediaSelect: (media: any) => void;
  isCurrentUser?: boolean;
}

// Task Management Types (from onecrew-api-client v1.5.0)
export interface Task {
  id: string;
  project_id: string;
  title: string;
  service?: string;
  timeline_text?: string;
  status: TaskStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'on_hold' | 'in_progress' | 'completed' | 'cancelled';
export type ProjectStatus = 'planning' | 'in_production' | 'completed' | 'on_hold' | 'cancelled';

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  service_role: string;
  assigned_at: string;
}

export interface TaskWithAssignments extends Task {
  assignments: TaskAssignment[];
  assigned_users: Array<{
    user_id: string;
    service_role: string;
    user: { name: string; image_url?: string };
  }>;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  added_at: string;
  last_activity?: string;
}

export interface ProjectWithDetails {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  delivery_date?: string;
  one_day_shoot: boolean;
  status: 'planning' | 'in_production' | 'completed' | 'on_hold' | 'cancelled';
  progress: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
  tasks: TaskWithAssignments[];
  created_by_user?: {
    name: string;
    image_url?: string;
  };
}

// Guest Session Types
export interface GuestSessionData {
  sessionId: string;
  expiresAt: string;
  isActive: boolean;
}

export interface ConvertGuestToUserRequest {
  sessionId: string;
  userData: {
    name: string;
    email: string;
    password: string;
    category: 'crew' | 'talent' | 'company';
    primary_role?: string;
  };
}

// Task Management Props
export interface ProjectDetailPageProps {
  project: ProjectWithDetails;
  onBack: () => void;
  onCreateTask: (taskData: CreateTaskRequest) => Promise<void>;
  onUpdateTask: (taskId: string, updates: UpdateTaskRequest) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAssignTask: (projectId: string, taskId: string, assignment: AssignTaskServiceRequest) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: UpdateTaskStatusRequest) => Promise<void>;
}

export interface TaskCardProps {
  task: TaskWithAssignments;
  onEdit: (task: TaskWithAssignments) => void;
  onDelete: (taskId: string) => void;
  onAssign: (task: TaskWithAssignments) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  canEdit: boolean;
}

export interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (taskData: CreateTaskRequest) => Promise<void>;
  projectMembers: ProjectMember[];
  editingTask?: TaskWithAssignments;
  projectId: string;
}

export interface CreateTaskRequest {
  title: string;
  service?: string;
  timeline_text?: string;
  status?: TaskStatus;
  sort_order?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  service?: string;
  timeline_text?: string;
  status?: TaskStatus;
  sort_order?: number;
}

export interface AssignTaskServiceRequest {
  user_id: string;
  service_role: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

// Project Creation Types
export interface ProjectStage {
  id: string;
  name: string;
  description: string;
  order: number;
  startDate?: string;
  endDate?: string;
  isSelected: boolean;
}

export interface ProjectType {
  id: string;
  name: string;
  description: string;
}

export interface ProjectCreationData {
  title: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  budget?: number;
  status: ProjectStatus;
  stages: ProjectStage[];
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  service_role: string;
  assigned_at: string;
  // Additional UI-specific fields
  userId?: string;
  userName?: string;
  userRole?: string;
  stageId?: string;
  stageName?: string;
  taskTitle?: string;
  inTime?: string;
  outTime?: string;
  location?: string;
  description?: string;
  status?: TaskStatus;
  attendees?: string[];
  createdAt?: string;
}

export interface ProjectDashboardData {
  project: ProjectCreationData;
  assignments: TaskAssignment[];
  stages: ProjectStage[];
  messages: any[];
  legalServices: any[];
}

// Modal Props
export interface ProjectCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectCreationData) => Promise<void>;
}

export interface TaskAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  stage: ProjectStage;
  onAssign: (assignment: TaskAssignment) => Promise<void>;
}

export interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: any) => void;
  preFilterRole?: string;
  preFilterService?: string;
}

export interface TaskDetailsFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (taskData: Partial<TaskAssignment>) => Promise<void>;
  assignedUser?: any;
  stage: ProjectStage;
}

export interface ProjectDashboardProps {
  project: ProjectDashboardData;
  onUpdateProject: (data: ProjectDashboardData) => void;
  onBack: () => void;
}

// Portfolio and Social Media Types
export interface UserPortfolio {
  id: string;
  user_id: string;
  kind: 'image' | 'video';
  url: string;
  caption?: string;
  sort_order: number;
  created_at: string;
}

export interface SocialMediaLink {
  platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website' | 'other';
  url: string;
  username?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  image_url?: string;
  category: 'crew' | 'talent' | 'company';
  primary_role?: string;
  location?: string;
  portfolio: UserPortfolio[];
  social_links: SocialMediaLink[];
  skills: string[];
  abilities: string[];
  languages: string[];
  created_at: string;
  updated_at: string;
}

export interface PortfolioItemProps {
  item: UserPortfolio;
  onEdit: (item: UserPortfolio) => void;
  onDelete: (itemId: string) => void;
  canEdit: boolean;
}

export interface PortfolioModalProps {
  visible: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<UserPortfolio, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onEditItem: (itemId: string, updates: Partial<UserPortfolio>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  portfolio: UserPortfolio[];
}

export interface SocialLinksModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (links: SocialMediaLink[]) => Promise<void>;
  socialLinks: SocialMediaLink[];
}

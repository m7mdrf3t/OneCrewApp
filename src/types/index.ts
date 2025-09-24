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
  projects: any[];
  onProjectSelect: (project: any) => void;
  onAddNewProject: () => void;
  onAddNewProjectEasy: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBack: () => void;
  myTeam: any[];
  onProfileSelect: (profile: any) => void;
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

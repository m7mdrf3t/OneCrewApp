import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define all route names
export type RootStackParamList = {
  // Main tabs
  spot: undefined;
  home: undefined;
  projects: undefined;
  wall: undefined;
  
  // Auth screens
  login: undefined;
  signup: undefined;
  'forgot-password': undefined;
  'verify-otp': { email: string; mode: 'password-reset' | 'email-verification' };
  'reset-password': { token: string; email: string };
  onboarding: undefined;
  
  // Profile screens
  profile: { profile: any };
  myProfile: { user: any } | undefined;
  profileCompletion: { user: any };
  companyProfile: { companyId: string };
  companyRegistration: undefined;
  
  // Service screens
  details: { serviceData: any };
  academyDetail: { serviceData: any };
  legalDetail: { serviceData: any };
  sectionServices: { sectionKey: string };
  directory: undefined;
  serviceDetail: { serviceId: string };
  
  // Project screens
  projectDetail: { project: any };
  newProject: undefined;
  newProjectEasy: undefined;
  
  // Chat screens
  chat: { conversationId?: string; participant?: any; courseData?: any };
  conversations: undefined;
  
  // Other screens
  settings: undefined;
  changePassword: undefined;
  accountDeletion: undefined;
  privacyPolicy: undefined;
  support: undefined;
  agenda: undefined;
  allAgenda: undefined;
  bookingRequests: undefined;
  weeklySchedule: undefined;
  performanceTest: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}



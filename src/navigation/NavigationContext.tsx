import React, { createContext, useContext, useRef } from 'react';
import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import { RootStackParamList } from './types';

interface NavigationContextType {
  navigate: <T extends keyof RootStackParamList>(
    name: T,
    params?: RootStackParamList[T]
  ) => void;
  replace: <T extends keyof RootStackParamList>(
    name: T,
    params?: RootStackParamList[T]
  ) => void;
  goBack: () => void;
  navigateTo: (pageName: string, data?: any) => void; // Legacy function for compatibility
  replaceTo: (pageName: string, data?: any) => void; // Replace instead of navigate (for profile switching)
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Navigation ref that will be set by NavigationContainer
export const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigateTo = (pageName: string, data?: any) => {
    // Map legacy page names to React Navigation routes
    const routeMap: Record<string, keyof RootStackParamList> = {
      'spot': 'spot',
      'home': 'home',
      'projects': 'projects',
      'wall': 'wall',
      'profile': 'profile',
      'myProfile': 'myProfile',
      'profileCompletion': 'profileCompletion',
      'companyProfile': 'companyProfile',
      'companyRegistration': 'companyRegistration',
      'projectDetail': 'projectDetail',
      'newProject': 'newProject',
      'newProjectEasy': 'newProjectEasy',
      'details': 'details',
      'academyDetail': 'academyDetail',
      'legalDetail': 'legalDetail',
      'sectionServices': 'sectionServices',
      'directory': 'directory',
      'chat': 'chat',
      'conversations': 'conversations',
      'settings': 'settings',
      'changePassword': 'changePassword',
      'accountDeletion': 'accountDeletion',
      'privacyPolicy': 'privacyPolicy',
      'support': 'support',
      'agenda': 'agenda',
      'allAgenda': 'allAgenda',
      'bookingRequests': 'bookingRequests',
      'weeklySchedule': 'weeklySchedule',
      'performanceTest': 'performanceTest',
      'coursesManagement': 'coursesManagement',
      'courseEdit': 'courseEdit',
      'courseDetail': 'courseDetail',
      'publicCourses': 'publicCourses',
      'companyEdit': 'companyEdit',
      'companyMembersManagement': 'companyMembersManagement',
      'newsDetail': 'newsDetail',
    };

    const routeName = routeMap[pageName] as keyof RootStackParamList;
    if (routeName) {
      // Transform data to match route params
      let params: any = undefined;
      
      if (data) {
        // Handle different data formats
        if (pageName === 'profile' || pageName === 'myProfile') {
          params = { profile: data, user: data };
        } else if (pageName === 'projectDetail') {
          // Handle both { project } and direct project object
          // Preserve all properties including selectedUser and addUserToTask
          const project = data?.project || data;
          params = {
            project,
            selectedUser: data?.selectedUser,
            addUserToTask: data?.addUserToTask || false,
          };
        } else if (pageName === 'companyProfile') {
          // Preserve readOnly flag when navigating to company profile
          const companyId = typeof data === 'string' ? data : (data?.companyId || data?.id || data);
          params = { 
            companyId,
            readOnly: data?.readOnly ?? false
          };
        } else if (pageName === 'chat') {
          params = data;
        } else if (pageName === 'sectionServices') {
          params = { sectionKey: data?.key || data };
        } else if (pageName === 'details' || pageName === 'academyDetail' || pageName === 'legalDetail') {
          params = { serviceData: data };
        } else if (pageName === 'courseDetail' || pageName === 'courseEdit' || pageName === 'coursesManagement') {
          params = data;
        } else if (pageName === 'newsDetail') {
          params = { slug: data?.slug || data, post: data?.post || data };
        } else {
          params = data;
        }
      }
      
      navigationRef.current?.navigate(routeName, params as any);
    } else {
      console.warn(`Unknown route: ${pageName}`);
    }
  };

  const navigate = <T extends keyof RootStackParamList>(
    name: T,
    params?: RootStackParamList[T]
  ) => {
    navigationRef.current?.navigate(name, params);
  };

  const replace = <T extends keyof RootStackParamList>(
    name: T,
    params?: RootStackParamList[T]
  ) => {
    if (navigationRef.current) {
      try {
        // Check if isReady method exists (React Navigation v6+)
        if (typeof navigationRef.current.isReady === 'function' && !navigationRef.current.isReady()) {
          return;
        }
        navigationRef.current.dispatch(
          StackActions.replace(name, params)
        );
      } catch (error) {
        console.warn('Failed to replace route, falling back to navigate:', error);
        // Fallback to navigate if replace fails
        navigationRef.current.navigate(name, params);
      }
    }
  };

  const replaceTo = (pageName: string, data?: any) => {
    // Map legacy page names to React Navigation routes
    const routeMap: Record<string, keyof RootStackParamList> = {
      'spot': 'spot',
      'home': 'home',
      'projects': 'projects',
      'wall': 'wall',
      'profile': 'profile',
      'myProfile': 'myProfile',
      'profileCompletion': 'profileCompletion',
      'companyProfile': 'companyProfile',
      'companyRegistration': 'companyRegistration',
      'projectDetail': 'projectDetail',
      'newProject': 'newProject',
      'newProjectEasy': 'newProjectEasy',
      'details': 'details',
      'academyDetail': 'academyDetail',
      'legalDetail': 'legalDetail',
      'sectionServices': 'sectionServices',
      'directory': 'directory',
      'chat': 'chat',
      'conversations': 'conversations',
      'settings': 'settings',
      'changePassword': 'changePassword',
      'accountDeletion': 'accountDeletion',
      'privacyPolicy': 'privacyPolicy',
      'support': 'support',
      'agenda': 'agenda',
      'allAgenda': 'allAgenda',
      'bookingRequests': 'bookingRequests',
      'weeklySchedule': 'weeklySchedule',
      'performanceTest': 'performanceTest',
      'coursesManagement': 'coursesManagement',
      'courseEdit': 'courseEdit',
      'courseDetail': 'courseDetail',
      'publicCourses': 'publicCourses',
      'companyEdit': 'companyEdit',
      'companyMembersManagement': 'companyMembersManagement',
      'newsDetail': 'newsDetail',
    };

    const routeName = routeMap[pageName] as keyof RootStackParamList;
    if (routeName) {
      // Transform data to match route params
      let params: any = undefined;
      
      if (data) {
        // Handle different data formats
        if (pageName === 'profile' || pageName === 'myProfile') {
          params = { profile: data, user: data };
        } else if (pageName === 'projectDetail') {
          // Handle both { project } and direct project object
          // Preserve all properties including selectedUser and addUserToTask
          const project = data?.project || data;
          params = {
            project,
            selectedUser: data?.selectedUser,
            addUserToTask: data?.addUserToTask || false,
          };
        } else if (pageName === 'companyProfile') {
          // Preserve readOnly flag when navigating to company profile
          const companyId = typeof data === 'string' ? data : (data?.companyId || data?.id || data);
          params = { 
            companyId,
            readOnly: data?.readOnly ?? false
          };
        } else if (pageName === 'chat') {
          params = data;
        } else if (pageName === 'sectionServices') {
          params = { sectionKey: data?.key || data };
        } else if (pageName === 'details' || pageName === 'academyDetail' || pageName === 'legalDetail') {
          params = { serviceData: data };
        } else if (pageName === 'courseDetail' || pageName === 'courseEdit' || pageName === 'coursesManagement') {
          params = data;
        } else if (pageName === 'newsDetail') {
          params = { slug: data?.slug || data, post: data?.post || data };
        } else {
          params = data;
        }
      }
      
      if (navigationRef.current) {
        try {
          // Check if isReady method exists (React Navigation v6+)
          if (typeof navigationRef.current.isReady === 'function' && !navigationRef.current.isReady()) {
            return;
          }
          navigationRef.current.dispatch(
            StackActions.replace(routeName, params as any)
          );
        } catch (error) {
          console.warn('Failed to replace route, falling back to navigate:', error);
          // Fallback to navigate if replace fails
          navigationRef.current.navigate(routeName, params as any);
        }
      }
    } else {
      console.warn(`Unknown route: ${pageName}`);
    }
  };

  const goBack = () => {
    navigationRef.current?.goBack();
  };

  const value: NavigationContextType = {
    navigate,
    replace,
    goBack,
    navigateTo,
    replaceTo,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useAppNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within NavigationProvider');
  }
  return context;
};


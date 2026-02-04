import React, { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useGlobalModals } from '../contexts/GlobalModalsContext';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
import NotificationModal from './NotificationModal';
import AccountSwitcherModal from './AccountSwitcherModal';
import UserMenuModal from './UserMenuModal';
import MyTeamModal from './MyTeamModal';
import InvitationListModal from './InvitationListModal';

const GlobalModals: React.FC = () => {
  const {
    showNotificationModal,
    setShowNotificationModal,
    showAccountSwitcher,
    setShowAccountSwitcher,
    showUserMenu,
    setShowUserMenu,
    showMyTeam,
    setShowMyTeam,
    showInvitationListModal,
    setShowInvitationListModal,
  } = useGlobalModals();

  const { logout, isGuest, currentProfileType, user } = useApi();
  const { navigateTo: navTo } = useAppNavigation();
  
  // Track pending invitation modal open
  const pendingInvitationOpen = React.useRef<boolean>(false);

  // Debug: Log when showMyTeam changes in GlobalModals
  useEffect(() => {
    console.log('🔵 [GlobalModals] showMyTeam changed to:', showMyTeam);
  }, [showMyTeam]);

  // Debug: Log when invitation modal state changes
  useEffect(() => {
    console.log('📧 [GlobalModals] showInvitationListModal changed to:', showInvitationListModal);
  }, [showInvitationListModal]);

  // Handle notification modal dismissal
  const handleNotificationModalDismiss = React.useCallback(() => {
    console.log('📧 [GlobalModals] Notification modal dismissed, pendingInvitationOpen:', pendingInvitationOpen.current);
    if (pendingInvitationOpen.current && user) {
      console.log('📧 [GlobalModals] Opening invitation modal after notification modal dismissed');
      pendingInvitationOpen.current = false;
      setTimeout(() => {
        setShowInvitationListModal(true);
      }, 100);
    }
  }, [user, setShowInvitationListModal]);

  const handleNotificationPress = React.useCallback((notification: any) => {
    console.log('🔔 [GlobalModals] ========== NOTIFICATION PRESSED ==========');
    console.log('🔔 [GlobalModals] Notification ID:', notification.id);
    console.log('🔔 [GlobalModals] Notification Type:', notification.type);
    console.log('🔔 [GlobalModals] Notification Title:', notification.title);
    console.log('🔔 [GlobalModals] Notification Message:', notification.message);
    console.log('🔔 [GlobalModals] Is Company Invitation?', notification.type === 'company_invitation');
    console.log('🔔 [GlobalModals] Notification Data:', JSON.stringify(notification.data, null, 2));
    console.log('🔔 [GlobalModals] Full Notification Object:', JSON.stringify(notification, null, 2));
    console.log('🔔 [GlobalModals] Current User ID:', user?.id);
    console.log('🔔 [GlobalModals] Current User:', user ? 'EXISTS' : 'NULL');
    console.log('🔔 [GlobalModals] Current showInvitationListModal:', showInvitationListModal);
    console.log('🔔 [GlobalModals] ===========================================');
    
    // Handle notification press - navigate to relevant page or open modals
    if (notification.type === 'company_invitation') {
      console.log('✅ [GlobalModals] ✅ COMPANY INVITATION DETECTED ✅');
      console.log('📧 [GlobalModals] Processing company invitation...');
      
      if (!user) {
        console.error('❌ [GlobalModals] No user found, cannot open invitation modal');
        console.warn('📧 [GlobalModals] User is null/undefined');
        return;
      }
      
      console.log('✅ [GlobalModals] User exists:', user.id);
      console.log('✅ [GlobalModals] User email:', user.email);
      
      // Set flag to open invitation modal after notification modal dismisses
      pendingInvitationOpen.current = true;
      console.log('📧 [GlobalModals] Set pendingInvitationOpen.current = true');
      console.log('📧 [GlobalModals] pendingInvitationOpen ref value:', pendingInvitationOpen.current);
      
      // Close notification modal - onDismiss will handle opening invitation modal
      console.log('📧 [GlobalModals] Closing notification modal...');
      setShowNotificationModal(false);
      console.log('📧 [GlobalModals] Notification modal closing... (setShowNotificationModal(false) called)');
    } else {
      console.log('ℹ️ [GlobalModals] Not a company invitation, type is:', notification.type);
      console.log('ℹ️ [GlobalModals] Handling other notification type...');
      pendingInvitationOpen.current = false;
      setShowNotificationModal(false);
      if (notification.data?.project_id) {
        console.log('📁 [GlobalModals] Navigating to project:', notification.data.project_id);
        navTo('projectDetail', { id: notification.data.project_id });
      } else if (notification.data?.conversation_id) {
        console.log('💬 [GlobalModals] Navigating to chat:', notification.data.conversation_id);
        navTo('chat', { conversationId: notification.data.conversation_id });
      } else if (notification.type === 'news_post' || notification.data?.newsPostId || notification.data?.slug) {
        const slug = notification.data?.slug ?? (typeof notification.link_url === 'string' && notification.link_url.startsWith('/news/')
          ? notification.link_url.replace(/^\/news\/?/, '').split('?')[0]
          : null);
        if (slug) {
          console.log('📰 [GlobalModals] Navigating to news post:', slug);
          navTo('newsDetail', { slug });
        } else {
          console.log('ℹ️ [GlobalModals] No specific action for notification type:', notification.type);
        }
      } else {
        console.log('ℹ️ [GlobalModals] No specific action for notification type:', notification.type);
      }
    }
  }, [user, showInvitationListModal, setShowNotificationModal, navTo]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      console.log('🚪 Logging out from GlobalModals...');
      await logout();
      console.log('✅ Logout successful');
      // Navigate to login screen after logout
      navTo('login');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Still navigate to login even if logout fails
      navTo('login');
    }
  };

  // Debug: Log when handleNotificationPress is created
  useEffect(() => {
    console.log('🔔 [GlobalModals] handleNotificationPress function created/updated');
    console.log('🔔 [GlobalModals] handleNotificationPress type:', typeof handleNotificationPress);
  }, [handleNotificationPress]);

  return (
    <>
      {/* Notification Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => {
          console.log('🔔 [GlobalModals] Notification modal onClose called');
          pendingInvitationOpen.current = false;
          setShowNotificationModal(false);
        }}
        onNotificationPress={(notification) => {
          console.log('🔔 [GlobalModals] ========== CALLBACK RECEIVED ==========');
          console.log('🔔 [GlobalModals] onNotificationPress prop called directly in JSX');
          console.log('🔔 [GlobalModals] Notification received in prop:', notification?.type);
          console.log('🔔 [GlobalModals] Notification object:', notification);
          console.log('🔔 [GlobalModals] handleNotificationPress function:', typeof handleNotificationPress);
          try {
            console.log('🔔 [GlobalModals] About to call handleNotificationPress...');
            handleNotificationPress(notification);
            console.log('🔔 [GlobalModals] handleNotificationPress called successfully');
          } catch (error) {
            console.error('❌ [GlobalModals] ERROR calling handleNotificationPress:', error);
            console.error('❌ [GlobalModals] Error stack:', error instanceof Error ? error.stack : 'No stack');
          }
          console.log('🔔 [GlobalModals] ===========================================');
        }}
        onModalDismiss={handleNotificationModalDismiss}
      />

      {/* Account Switcher Modal */}
      <AccountSwitcherModal
        visible={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
        onCreateCompany={() => {
          setShowAccountSwitcher(false);
          navTo('companyRegistration');
        }}
      />

      {/* User Menu Modal */}
      <UserMenuModal
        visible={showUserMenu}
        onClose={() => setShowUserMenu(false)}
        onMyTeam={() => {
          console.log('🔵 [GlobalModals] onMyTeam called');
          console.log('🔵 [GlobalModals] showMyTeam before:', showMyTeam);
          setShowUserMenu(false);
          setShowMyTeam(true);
          console.log('🔵 [GlobalModals] setShowMyTeam(true) called');
        }}
        onSettings={() => {
          setShowUserMenu(false);
          navTo('settings');
        }}
        onProfileEdit={() => {
          setShowUserMenu(false);
          // Navigate to profile completion - need user data
          // This will be handled by individual pages that have user context
        }}
        onCreateCompany={() => {
          setShowUserMenu(false);
          navTo('companyRegistration');
        }}
        onHelpSupport={() => {
          setShowUserMenu(false);
          navTo('support');
        }}
        onLogout={handleLogout}
        theme="light"
        isGuest={isGuest}
        currentProfileType={currentProfileType}
        onSignUp={() => {
          setShowUserMenu(false);
          navTo('signup');
        }}
        onSignIn={() => {
          setShowUserMenu(false);
          navTo('login');
        }}
      />

      {/* My Team Modal */}
      <MyTeamModal
        visible={showMyTeam}
        onClose={() => {
          console.log('🔵 [GlobalModals] MyTeamModal onClose called');
          setShowMyTeam(false);
        }}
      />

      {/* Invitation List Modal */}
      <InvitationListModal
        visible={showInvitationListModal && !!user}
        onClose={() => {
          console.log('📧 [GlobalModals] Closing invitation modal');
          setShowInvitationListModal(false);
        }}
        userId={user?.id || ''}
        onInvitationResponded={() => {
          // Optionally refresh notifications or other data
          console.log('📧 [GlobalModals] Invitation responded');
        }}
      />
    </>
  );
};

export default GlobalModals;


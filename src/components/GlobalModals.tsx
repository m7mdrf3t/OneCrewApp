import React from 'react';
import { useGlobalModals } from '../contexts/GlobalModalsContext';
import { useApi } from '../contexts/ApiContext';
import { useAppNavigation } from '../navigation/NavigationContext';
import NotificationModal from './NotificationModal';
import AccountSwitcherModal from './AccountSwitcherModal';
import UserMenuModal from './UserMenuModal';

const GlobalModals: React.FC = () => {
  const {
    showNotificationModal,
    setShowNotificationModal,
    showAccountSwitcher,
    setShowAccountSwitcher,
    showUserMenu,
    setShowUserMenu,
  } = useGlobalModals();

  const { logout, isGuest } = useApi();
  const { navigateTo: navTo } = useAppNavigation();

  const handleNotificationPress = (notification: any) => {
    setShowNotificationModal(false);
    // Handle notification press - navigate to relevant page
    if (notification.data?.project_id) {
      navTo('projectDetail', { id: notification.data.project_id });
    } else if (notification.data?.conversation_id) {
      navTo('chat', { conversationId: notification.data.conversation_id });
    }
  };

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

  return (
    <>
      {/* Notification Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onNotificationPress={handleNotificationPress}
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
          setShowUserMenu(false);
          // Navigate to team page or show team modal
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
        onHelpSupport={() => {
          setShowUserMenu(false);
          navTo('support');
        }}
        onLogout={handleLogout}
        theme="light"
        isGuest={isGuest}
        onSignUp={() => {
          setShowUserMenu(false);
          navTo('signup');
        }}
        onSignIn={() => {
          setShowUserMenu(false);
          navTo('login');
        }}
      />
    </>
  );
};

export default GlobalModals;


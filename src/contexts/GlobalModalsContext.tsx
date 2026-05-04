import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';

interface GlobalModalsContextType {
  showNotificationModal: boolean;
  setShowNotificationModal: (show: boolean) => void;
  showAccountSwitcher: boolean;
  setShowAccountSwitcher: (show: boolean) => void;
  showUserMenu: boolean;
  setShowUserMenu: (show: boolean) => void;
  showMyTeam: boolean;
  setShowMyTeam: (show: boolean) => void;
  showInvitationListModal: boolean;
  setShowInvitationListModal: (show: boolean) => void;
}

const GlobalModalsContext = createContext<GlobalModalsContextType | undefined>(undefined);
type GlobalModalsActions = Pick<
  GlobalModalsContextType,
  'setShowNotificationModal' | 'setShowAccountSwitcher' | 'setShowUserMenu' | 'setShowMyTeam' | 'setShowInvitationListModal'
>;
const GlobalModalsActionsContext = createContext<GlobalModalsActions | undefined>(undefined);

export const GlobalModalsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMyTeam, setShowMyTeam] = useState(false);
  const [showInvitationListModal, setShowInvitationListModal] = useState(false);

  // Debug: Log when showMyTeam changes
  React.useEffect(() => {
    console.log('🟡 [GlobalModalsContext] showMyTeam state changed to:', showMyTeam);
  }, [showMyTeam]);

  const actions = useMemo(
    () => ({
      setShowNotificationModal,
      setShowAccountSwitcher,
      setShowUserMenu,
      setShowMyTeam,
      setShowInvitationListModal,
    }),
    []
  );

  const value = useMemo(
    () => ({
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
    }),
    [
      showNotificationModal,
      showAccountSwitcher,
      showUserMenu,
      showMyTeam,
      showInvitationListModal,
      actions,
    ]
  );

  return (
    <GlobalModalsActionsContext.Provider value={actions}>
      <GlobalModalsContext.Provider value={value}>{children}</GlobalModalsContext.Provider>
    </GlobalModalsActionsContext.Provider>
  );
};

export const useGlobalModals = () => {
  const context = useContext(GlobalModalsContext);
  if (!context) {
    throw new Error('useGlobalModals must be used within GlobalModalsProvider');
  }
  return context;
};

export const useGlobalModalActions = () => {
  const context = useContext(GlobalModalsActionsContext);
  if (!context) {
    throw new Error('useGlobalModalActions must be used within GlobalModalsProvider');
  }
  return context;
};
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalModalsContextType {
  showNotificationModal: boolean;
  setShowNotificationModal: (show: boolean) => void;
  showAccountSwitcher: boolean;
  setShowAccountSwitcher: (show: boolean) => void;
  showUserMenu: boolean;
  setShowUserMenu: (show: boolean) => void;
}

const GlobalModalsContext = createContext<GlobalModalsContextType | undefined>(undefined);

export const GlobalModalsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <GlobalModalsContext.Provider
      value={{
        showNotificationModal,
        setShowNotificationModal,
        showAccountSwitcher,
        setShowAccountSwitcher,
        showUserMenu,
        setShowUserMenu,
      }}
    >
      {children}
    </GlobalModalsContext.Provider>
  );
};

export const useGlobalModals = () => {
  const context = useContext(GlobalModalsContext);
  if (!context) {
    throw new Error('useGlobalModals must be used within GlobalModalsProvider');
  }
  return context;
};


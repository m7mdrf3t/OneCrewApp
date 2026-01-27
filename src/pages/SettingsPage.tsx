import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareAppInvite } from '../utils/shareAppInvite';
import { useAppNavigation } from '../navigation/NavigationContext';
import { ProfileSwitchTest } from '../utils/ProfileSwitchTest';

interface SettingsPageProps {
  onBack: () => void;
  onNavigate?: (pageName: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isGuest?: boolean;
  onSignUp?: () => void;
  onSignIn?: () => void;
}

interface SettingsItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
  danger?: boolean;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  onBack, 
  onNavigate: onNavigateProp, 
  theme = 'light', 
  onToggleTheme,
  isGuest = false,
  onSignUp,
  onSignIn,
}) => {
  const { navigateTo } = useAppNavigation();
  // Use prop if provided (for backward compatibility), otherwise use hook
  const onNavigate = onNavigateProp || navigateTo;
  
  const isDark = theme === 'dark';
  const [showProfileTest, setShowProfileTest] = useState(false);

  const handleInviteFriend = async () => {
    await shareAppInvite();
  };

  const settingsSections: { title?: string; items: SettingsItem[] }[] = [
    {
      title: 'Account',
      items: [
        ...(isGuest ? [
          {
            id: 'signUp',
            title: 'Sign Up',
            icon: 'person-add' as keyof typeof Ionicons.glyphMap,
            action: () => onSignUp?.(),
            showArrow: true,
          },
          {
            id: 'signIn',
            title: 'Sign In',
            icon: 'log-in' as keyof typeof Ionicons.glyphMap,
            action: () => onSignIn?.(),
            showArrow: true,
          },
        ] : [
          {
            id: 'changePassword',
            title: 'Change Password',
            icon: 'lock-closed' as keyof typeof Ionicons.glyphMap,
            action: () => onNavigate('changePassword'),
            showArrow: true,
          },
          {
            id: 'deleteAccount',
            title: 'Delete Account',
            icon: 'trash' as keyof typeof Ionicons.glyphMap,
            action: () => onNavigate('accountDeletion'),
            showArrow: true,
            danger: true,
          },
        ]) as SettingsItem[],
      ],
    },
    {
      title: 'Share',
      items: [
        {
          id: 'inviteFriend',
          title: 'Invite a friend',
          icon: 'share-social',
          action: handleInviteFriend,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'theme',
          title: isDark ? 'Dark Mode' : 'Light Mode',
          icon: isDark ? 'moon' : 'sunny',
          action: () => {},
          rightComponent: onToggleTheme ? (
            <Switch
              value={isDark}
              onValueChange={onToggleTheme}
              trackColor={{ false: '#d4d4d8', true: '#000' }}
              thumbColor={isDark ? '#fff' : '#f4f4f5'}
              ios_backgroundColor="#d4d4d8"
            />
          ) : undefined,
        },
      ],
    },
    {
      title: 'Legal & Support',
      items: [
        {
          id: 'privacyPolicy',
          title: 'Privacy Policy',
          icon: 'shield',
          action: () => onNavigate('privacyPolicy'),
          showArrow: true,
        },
        {
          id: 'support',
          title: 'Support',
          icon: 'help-circle',
          action: () => onNavigate('support'),
          showArrow: true,
        },
      ],
    },
  ];

  // Add developer tools section in dev mode
  if (__DEV__) {
    settingsSections.push({
      title: 'Developer',
      items: [
        {
          id: 'performanceTest',
          title: 'Performance Monitor',
          icon: 'speedometer',
          action: () => onNavigate('performanceTest'),
          showArrow: true,
        },
        {
          id: 'profileSwitchTest',
          title: 'Profile Switching Test',
          icon: 'swap-horizontal',
          action: () => setShowProfileTest(true),
          showArrow: true,
        },
      ],
    });
  }

  const renderSettingsItem = (item: SettingsItem) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.settingsItem,
          { 
            backgroundColor: isDark ? '#1a1a1a' : '#fff',
            borderColor: isDark ? '#1f2937' : '#e5e7eb'
          },
          item.danger && styles.dangerItem
        ]}
        onPress={item.action}
      >
        <View style={styles.settingsItemLeft}>
          <Ionicons 
            name={item.icon} 
            size={22} 
            color={item.danger ? '#ef4444' : (isDark ? '#fff' : '#000')} 
            style={styles.settingsIcon}
          />
          <Text style={[
            styles.settingsItemText,
            { color: item.danger ? '#ef4444' : (isDark ? '#fff' : '#000') }
          ]}>
            {item.title}
          </Text>
        </View>
        <View style={styles.settingsItemRight}>
          {item.rightComponent || (item.showArrow && (
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={isDark ? '#9ca3af' : '#71717a'} 
            />
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#000' : '#fff', borderBottomColor: isDark ? '#1f2937' : '#000' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={[styles.scrollView, { backgroundColor: isDark ? '#000' : '#f4f4f5' }]}
        contentContainerStyle={styles.scrollContent}
      >
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            {section.title && (
              <Text style={[styles.sectionTitle, { color: isDark ? '#9ca3af' : '#71717a' }]}>
                {section.title}
              </Text>
            )}
            <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
              {section.items.map((item, itemIndex) => (
                <View key={item.id}>
                  {renderSettingsItem(item)}
                  {itemIndex < section.items.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      
      {/* Profile Switching Test Modal - Dev Only */}
      {__DEV__ && (
        <Modal
          visible={showProfileTest}
          animationType="slide"
          onRequestClose={() => setShowProfileTest(false)}
        >
          <ProfileSwitchTest onClose={() => setShowProfileTest(false)} />
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  dangerItem: {
    // Additional styling for danger items if needed
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    marginRight: 12,
  },
  settingsItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  settingsItemRight: {
    marginLeft: 12,
  },
  separator: {
    height: 1,
    marginLeft: 52, // Align with text after icon
  },
});

export default SettingsPage;

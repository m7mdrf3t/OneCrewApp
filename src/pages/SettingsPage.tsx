import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareAppInvite } from '../utils/shareAppInvite';
import { createPlatformStyles } from '../utils/platformStyles';
import { settingsPageCommonStyles } from './SettingsPage.styles.common';
import { settingsPageIosStyles } from './SettingsPage.styles.ios';
import { settingsPageAndroidStyles } from './SettingsPage.styles.android';
import { useAppNavigation } from '../navigation/NavigationContext';

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
    </View>
  );
};

// Create platform-specific styles
const styles = createPlatformStyles({
  common: settingsPageCommonStyles,
  ios: settingsPageIosStyles,
  android: settingsPageAndroidStyles,
});

export default SettingsPage;

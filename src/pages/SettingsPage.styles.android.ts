/**
 * SettingsPage Android Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { settingsPageCommonStyles } from './SettingsPage.styles.common';

export const settingsPageAndroidStyles = StyleSheet.create({
  container: {
    ...settingsPageCommonStyles.container,
    backgroundColor: '#f5f5f5', // Material Design background
  } as ViewStyle,
  
  header: {
    ...settingsPageCommonStyles.header,
    borderBottomWidth: 1, // Material Design uses 1px
    elevation: 2, // Material elevation
  } as ViewStyle,
  
  backButton: {
    ...settingsPageCommonStyles.backButton,
  } as ViewStyle,
  
  title: {
    ...settingsPageCommonStyles.title,
  } as TextStyle,
  
  placeholder: {
    ...settingsPageCommonStyles.placeholder,
  } as ViewStyle,
  
  scrollView: {
    ...settingsPageCommonStyles.scrollView,
  } as ViewStyle,
  
  scrollContent: {
    ...settingsPageCommonStyles.scrollContent,
  } as ViewStyle,
  
  section: {
    ...settingsPageCommonStyles.section,
  } as ViewStyle,
  
  sectionTitle: {
    ...settingsPageCommonStyles.sectionTitle,
  } as TextStyle,
  
  sectionContent: {
    ...settingsPageCommonStyles.sectionContent,
    borderRadius: 8, // Material Design prefers 8px
    elevation: 1, // Material elevation
  } as ViewStyle,
  
  settingsItem: {
    ...settingsPageCommonStyles.settingsItem,
  } as ViewStyle,
  
  dangerItem: {
    ...settingsPageCommonStyles.dangerItem,
  } as ViewStyle,
  
  settingsItemLeft: {
    ...settingsPageCommonStyles.settingsItemLeft,
  } as ViewStyle,
  
  settingsIcon: {
    ...settingsPageCommonStyles.settingsIcon,
  } as ViewStyle,
  
  settingsItemText: {
    ...settingsPageCommonStyles.settingsItemText,
  } as TextStyle,
  
  settingsItemRight: {
    ...settingsPageCommonStyles.settingsItemRight,
  } as ViewStyle,
  
  separator: {
    ...settingsPageCommonStyles.separator,
    backgroundColor: '#e5e7eb',
  } as ViewStyle,
});


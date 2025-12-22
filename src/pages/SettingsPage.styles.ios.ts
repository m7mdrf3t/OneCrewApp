/**
 * SettingsPage iOS Styles
 */
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { settingsPageCommonStyles } from './SettingsPage.styles.common';

export const settingsPageIosStyles = StyleSheet.create({
  container: {
    ...settingsPageCommonStyles.container,
    backgroundColor: '#f2f2f7', // iOS system background
  } as ViewStyle,
  
  header: {
    ...settingsPageCommonStyles.header,
    borderBottomWidth: 0.5, // iOS uses thinner borders
    borderBottomColor: '#e5e7eb',
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
    borderRadius: 16, // iOS prefers 16px
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


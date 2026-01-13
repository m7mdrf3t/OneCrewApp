/**
 * SettingsPage Common Styles
 */
import { ViewStyle, TextStyle } from 'react-native';
import { semanticSpacing } from '../constants/spacing';

export const settingsPageCommonStyles = {
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  } as ViewStyle,
  
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  } as ViewStyle,
  
  backButton: {
    padding: 4,
    marginRight: 12,
  } as ViewStyle,
  
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#000',
  } as TextStyle,
  
  placeholder: {
    width: 32,
  } as ViewStyle,
  
  scrollView: {
    flex: 1,
  } as ViewStyle,
  
  scrollContent: {
    padding: 24,
  } as ViewStyle,
  
  section: {
    marginBottom: 24,
  } as ViewStyle,
  
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#71717a',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  } as TextStyle,
  
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden' as const,
  } as ViewStyle,
  
  settingsItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  } as ViewStyle,
  
  dangerItem: {
    // Additional styling for danger items if needed
  } as ViewStyle,
  
  settingsItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  } as ViewStyle,
  
  settingsIcon: {
    marginRight: 12,
  } as ViewStyle,
  
  settingsItemText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#000',
    flex: 1,
  } as TextStyle,
  
  settingsItemRight: {
    marginLeft: 12,
  } as ViewStyle,
  
  separator: {
    height: 1,
    marginLeft: 52, // Align with text after icon
  } as ViewStyle,
};


# Platform-Specific Styling Guide

This guide explains how to use the platform-specific styling system in the OneCrew app.

## Overview

The app uses separate style files for iOS and Android to ensure each platform follows its design guidelines:
- **iOS**: Follows Human Interface Guidelines (HIG)
- **Android**: Follows Material Design guidelines

## Architecture

### File Structure

```
src/
  styles/
    styles.common.ts    # Shared styles between platforms
    styles.ios.ts       # iOS-specific styles
    styles.android.ts   # Android-specific styles
  utils/
    platformStyles.ts   # Utility for creating platform-specific styles
  components/
    ComponentName.tsx
    ComponentName.styles.common.ts
    ComponentName.styles.ios.ts
    ComponentName.styles.android.ts
```

## Usage

### Basic Usage

1. **Create common styles** (`ComponentName.styles.common.ts`):
```typescript
import { ViewStyle, TextStyle } from 'react-native';

export const componentCommonStyles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
  } as ViewStyle,
  
  title: {
    fontSize: 16,
    color: '#000',
  } as TextStyle,
};
```

2. **Create iOS styles** (`ComponentName.styles.ios.ts`):
```typescript
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { componentCommonStyles } from './ComponentName.styles.common';

export const componentIosStyles = StyleSheet.create({
  container: {
    ...componentCommonStyles.container,
    backgroundColor: '#f2f2f7', // iOS system background
    borderRadius: 16, // iOS prefers 16px radius
  } as ViewStyle,
  
  title: {
    ...componentCommonStyles.title,
  } as TextStyle,
});
```

3. **Create Android styles** (`ComponentName.styles.android.ts`):
```typescript
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { componentCommonStyles } from './ComponentName.styles.common';

export const componentAndroidStyles = StyleSheet.create({
  container: {
    ...componentCommonStyles.container,
    backgroundColor: '#ffffff', // Material Design background
    borderRadius: 8, // Material Design prefers 8px radius
    elevation: 2, // Material elevation
  } as ViewStyle,
  
  title: {
    ...componentCommonStyles.title,
  } as TextStyle,
});
```

4. **Use in component** (`ComponentName.tsx`):
```typescript
import { createPlatformStyles } from '../utils/platformStyles';
import { componentCommonStyles } from './ComponentName.styles.common';
import { componentIosStyles } from './ComponentName.styles.ios';
import { componentAndroidStyles } from './ComponentName.styles.android';

const styles = createPlatformStyles({
  common: componentCommonStyles,
  ios: componentIosStyles,
  android: componentAndroidStyles,
});

const ComponentName = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
};
```

## Platform Differences

### Colors

**iOS:**
- Uses SF Colors (system colors)
- Background: `#f2f2f7` (system background)
- Text: `#000000` (label color)

**Android:**
- Uses Material Design colors
- Background: `#ffffff` (surface color)
- Text: `#212121` (text primary)

### Border Radius

**iOS:**
- Cards: `16px`
- Buttons: `12px`
- Inputs: `10px`

**Android:**
- Cards: `8px`
- Buttons: `4px`
- Inputs: `4px`

### Shadows

**iOS:**
- Uses `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`
- No `elevation` property

**Android:**
- Uses `elevation` for Material Design
- Also includes shadow properties for compatibility

### Typography

**iOS:**
- Uses SF Pro (system font)
- Font family: `'System'`

**Android:**
- Uses Roboto
- Font families: `'Roboto'`, `'Roboto-Medium'`, `'Roboto-Bold'`

## Best Practices

1. **Always start with common styles** - Define shared styles first, then override with platform-specific styles
2. **Use semantic spacing** - Import from `src/constants/spacing` for consistent spacing
3. **Follow platform guidelines** - iOS HIG for iOS, Material Design for Android
4. **Test on both platforms** - Always verify styles look correct on both iOS and Android
5. **Keep styles organized** - Group related styles together in the same file

## Examples

See these components for reference:
- `App.tsx` - Main app container
- `src/components/TabBar.tsx` - Bottom navigation bar
- `src/pages/LoginPage.tsx` - Authentication page

## Migration

To migrate an existing component:

1. Extract styles to `.styles.common.ts`
2. Create `.styles.ios.ts` with iOS-specific overrides
3. Create `.styles.android.ts` with Android-specific overrides
4. Update component to use `createPlatformStyles()`
5. Test on both platforms


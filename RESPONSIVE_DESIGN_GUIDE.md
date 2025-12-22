# Responsive Design Guide

This guide explains how to use the responsive design utilities in the OneCrew app.

## Overview

The app includes comprehensive responsive design utilities to handle different screen sizes, device types, and orientations across iOS and Android devices.

## Breakpoints

The app uses the following breakpoint system:

- **xs**: < 375px (Extra small phones)
- **sm**: 375px - 414px (Small phones)
- **md**: 415px - 767px (Medium phones)
- **lg**: 768px - 1023px (Tablets)
- **xl**: 1024px - 1439px (Large tablets)
- **xxl**: 1440px+ (Extra large tablets/desktops)

## Device Types

- **phone**: Width ≤ 767px
- **tablet**: Width 768px - 1439px
- **foldable**: Unusual aspect ratios (can be phone or tablet sized)

## Usage

### useResponsive Hook

The main hook for responsive design:

```typescript
import { useResponsive } from '../hooks/useResponsive';

const MyComponent = () => {
  const {
    breakpoint,
    deviceType,
    isPhone,
    isTablet,
    isFoldable,
    isLandscape,
    isPortrait,
    spacingMultiplier,
    width,
    height,
    selectValue,
    matches,
    atLeast,
    atMost,
  } = useResponsive();

  // Use breakpoint
  if (breakpoint === 'lg') {
    // Tablet-specific code
  }

  // Use device type
  const padding = isTablet ? 24 : 16;

  // Select responsive value
  const fontSize = selectValue({
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
  });

  return (
    <View style={{ padding, fontSize }}>
      {/* Content */}
    </View>
  );
};
```

### Dimension Utilities

Scale sizes based on screen dimensions:

```typescript
import { scale, verticalScale, moderateScale, scaleFont } from '../utils/dimensions';

const MyComponent = () => {
  // Scale based on width (for padding, margin, width)
  const padding = scale(16);
  
  // Scale based on height (for height-specific elements)
  const height = verticalScale(100);
  
  // Moderate scaling (balanced, prevents elements from becoming too large)
  const iconSize = moderateScale(24);
  
  // Scale font size
  const fontSize = scaleFont(16);

  return (
    <View style={{ padding, height }}>
      <Text style={{ fontSize }}>Scaled Text</Text>
    </View>
  );
};
```

### Responsive Value Selection

Select different values based on breakpoint:

```typescript
import { selectResponsiveValue } from '../utils/responsive';

const padding = selectResponsiveValue({
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28
}, 16); // Default value if no match
```

### Breakpoint Checks

```typescript
import { matchesBreakpoint, isAtLeastBreakpoint, isAtMostBreakpoint } from '../utils/responsive';

// Check if current breakpoint matches
if (matchesBreakpoint('md', 'lg')) {
  // Medium or large breakpoint
}

// Check if at least breakpoint
if (isAtLeastBreakpoint('lg')) {
  // Large breakpoint or larger (lg, xl, xxl)
}

// Check if at most breakpoint
if (isAtMostBreakpoint('md')) {
  // Medium breakpoint or smaller (xs, sm, md)
}
```

## Examples

### Responsive Padding

```typescript
import { useResponsive } from '../hooks/useResponsive';

const MyComponent = () => {
  const { selectValue } = useResponsive();
  
  const padding = selectValue({
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  });

  return (
    <View style={{ padding }}>
      {/* Content */}
    </View>
  );
};
```

### Device-Specific Layout

```typescript
import { useResponsive } from '../hooks/useResponsive';

const MyComponent = () => {
  const { isTablet, isLandscape } = useResponsive();
  
  const flexDirection = isTablet && isLandscape ? 'row' : 'column';
  const columns = isTablet ? 2 : 1;

  return (
    <View style={{ flexDirection }}>
      {/* Content */}
    </View>
  );
};
```

### Responsive Typography

```typescript
import { useResponsive } from '../hooks/useResponsive';
import { scaleFont } from '../utils/dimensions';

const MyComponent = () => {
  const { selectValue } = useResponsive();
  
  const fontSize = selectValue({
    xs: scaleFont(14),
    sm: scaleFont(16),
    md: scaleFont(18),
    lg: scaleFont(20),
    xl: scaleFont(24),
  });

  return (
    <Text style={{ fontSize }}>
      Responsive Text
    </Text>
  );
};
```

### Spacing Multiplier

```typescript
import { useResponsive } from '../hooks/useResponsive';
import { spacing } from '../constants/spacing';

const MyComponent = () => {
  const { spacingMultiplier } = useResponsive();
  
  // Apply multiplier for tablets
  const padding = spacing.md * spacingMultiplier;

  return (
    <View style={{ padding }}>
      {/* Content */}
    </View>
  );
};
```

## Best Practices

1. **Use breakpoints, not fixed sizes** - Always use responsive utilities instead of fixed pixel values
2. **Test on multiple devices** - Test on small phones, large phones, and tablets
3. **Handle orientation changes** - Use `isLandscape` and `isPortrait` for orientation-specific layouts
4. **Consider foldables** - Use `isFoldable` to handle unusual aspect ratios
5. **Use spacing multipliers** - Apply spacing multipliers for tablets to improve readability
6. **Scale fonts appropriately** - Use `scaleFont()` for text to ensure readability on all devices

## Common Patterns

### Responsive Grid

```typescript
const { selectValue } = useResponsive();
const columns = selectValue({ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 });
```

### Responsive Modal Width

```typescript
const { selectValue, width } = useResponsive();
const modalWidth = selectValue({
  xs: width * 0.9,
  sm: width * 0.85,
  md: 400,
  lg: 500,
  xl: 600,
});
```

### Responsive Image Sizes

```typescript
const { selectValue } = useResponsive();
const imageSize = selectValue({
  xs: 80,
  sm: 100,
  md: 120,
  lg: 150,
  xl: 180,
});
```


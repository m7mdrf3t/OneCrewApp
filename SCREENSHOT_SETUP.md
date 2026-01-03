# Quick Setup: Screenshot Helper

This guide will help you quickly set up the screenshot helper component to navigate through screens for app store screenshots.

## Step 1: Add Screenshot Helper to App.tsx

Add the ScreenshotHelper component to your `App.tsx` file. It will only appear in development mode.

### Option A: Simple Integration (Recommended)

Add this import at the top of `App.tsx`:

```typescript
import ScreenshotHelper from './src/components/ScreenshotHelper';
```

Then, inside the `AppContent` component's return statement (around line 1475), add the helper just before the closing `</View>` tag:

```typescript
{/* Screenshot Helper - Only visible in development */}
<ScreenshotHelper onNavigate={navigateTo} />
```

### Option B: Conditional Display

If you want more control, you can wrap it in a condition:

```typescript
{__DEV__ && (
  <ScreenshotHelper onNavigate={navigateTo} />
)}
```

## Step 2: Run Your App

```bash
npm start
# Then press 'i' for iOS or 'a' for Android
```

## Step 3: Use the Helper

1. Look for the blue camera button floating in the bottom-right corner
2. Tap it to open the screenshot helper menu
3. Select a screen from the list to navigate to it
4. Take your screenshot using the device/simulator screenshot function
5. Repeat for all screens

## Step 4: Remove Before Production

**IMPORTANT**: Remove the ScreenshotHelper component before building for production:

1. Remove the import statement
2. Remove the `<ScreenshotHelper />` component
3. Or ensure `__DEV__` is false in production builds (it should be automatically)

## Quick Screenshot Checklist

Use this while taking screenshots:

### Must-Have Screenshots
- [ ] Login screen
- [ ] Home/Spot tab (main discovery)
- [ ] Projects tab
- [ ] Profile page
- [ ] Project detail page
- [ ] Service/Directory page
- [ ] Chat/Conversations

### Nice-to-Have Screenshots
- [ ] Sign up screen
- [ ] Settings page
- [ ] Company profile
- [ ] Course detail
- [ ] News detail

## Tips

1. **Use Simulator/Emulator**: Easier to capture and organize screenshots
2. **Consistent User**: Use the same test account for all screenshots
3. **Clean State**: Make sure screens show real content, not empty states
4. **Remove Debug Info**: Hide any development overlays before capturing
5. **Multiple Sizes**: Capture for all required device sizes (iOS: 6.7", 6.5", 5.5", iPad)

## Troubleshooting

### Helper doesn't appear
- Make sure you're in development mode (`__DEV__` is true)
- Check that the component is added correctly
- Restart the app

### Navigation doesn't work
- Some screens require data - you may need to navigate manually
- Check console for any errors
- Ensure `onNavigate` prop is correctly passed

### Screenshot quality
- Use simulator/emulator for consistent quality
- Ensure device is set to correct resolution
- Use native screenshot tools (Cmd+S on Mac)

---

**Remember**: Remove the ScreenshotHelper before submitting to app stores!
























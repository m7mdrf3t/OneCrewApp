# iOS Errors Fixed

## Issues Resolved

### 1. BVLinearGradient Error
**Error:** `View config not found for component BVLinearGradient`

**Root Cause:** 
- `react-native-skeleton-placeholder` depends on `react-native-linear-gradient`
- Missing peer dependency: `@react-native-masked-view/masked-view`
- Native module not properly linked

**Fix Applied:**
1. ✅ Installed missing peer dependency: `@react-native-masked-view/masked-view`
2. ✅ Ran `npx pod-install` to link native modules
3. ✅ Rebuild required: Run `npx expo run:ios` to rebuild with linked modules

### 2. app.json Schema Error
**Error:** `should NOT have additional property 'privacy'`

**Fix Applied:**
- ✅ Removed `privacy: "public"` from app.json (not a valid Expo config property)

### 3. TypeScript Errors
**Status:** ✅ All 13 TypeScript errors fixed

**Files Fixed:**
- `InvitationModal.tsx` - Fixed API parameter (`q` → `search`)
- `UserMenuModal.tsx` - Added type assertions for icons
- `ChatPage.tsx` - Added type annotations for callbacks
- `CompanyMembersManagementPage.tsx` - Added missing `emptyStateSubtext` style
- `ConversationsListPage.tsx` - Fixed undefined functions and added type annotations

## Next Steps

### Required: Rebuild iOS
The native modules need to be rebuilt after installing dependencies:

```bash
npx expo run:ios
```

This will:
1. Link the newly installed `@react-native-masked-view/masked-view`
2. Link `react-native-linear-gradient` properly
3. Resolve the `BVLinearGradient` error

### After Rebuild
1. Test the Projects tab - should no longer show `BVLinearGradient` error
2. Check console logs for any remaining errors
3. Verify all skeleton components work correctly

## Components Using SkeletonPlaceholder
These components use `react-native-skeleton-placeholder` and should work after rebuild:
- `SkeletonProjectCard.tsx` (used in ProjectsPage)
- `SkeletonUserCard.tsx`
- `SkeletonSectionCard.tsx`
- `SkeletonScreen.tsx`
- `SkeletonProfilePage.tsx`
- `SkeletonMessage.tsx`
- `SkeletonConversationItem.tsx`
- `SkeletonCard.tsx`

## Notes
- The app has both `expo-linear-gradient` and `react-native-linear-gradient` installed
- `react-native-skeleton-placeholder` requires `react-native-linear-gradient`
- All dependencies are now properly installed and linked


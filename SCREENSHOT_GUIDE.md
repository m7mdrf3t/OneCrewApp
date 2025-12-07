# 📸 App Store Screenshot Guide

This guide will help you capture screenshots from your OneCrew app for App Store and Google Play Store submissions.

## 📋 Required Screenshots

### iOS App Store Requirements
- **iPhone 6.7"** (iPhone 14 Pro Max, 15 Pro Max): 1290 x 2796 pixels
- **iPhone 6.5"** (iPhone 11 Pro Max, XS Max): 1242 x 2688 pixels  
- **iPhone 5.5"** (iPhone 8 Plus): 1242 x 2208 pixels
- **iPad Pro 12.9"** (if supporting iPad): 2048 x 2732 pixels

### Google Play Store Requirements
- **Phone**: At least 2 screenshots (min 320px, max 3840px width)
- **Tablet**: At least 2 screenshots (min 320px, max 3840px width)
- **7-inch tablet**: 1024 x 600 pixels
- **10-inch tablet**: 1280 x 800 pixels

## 🎯 Key Screens to Capture

### 1. Authentication & Onboarding
- [ ] **Login Screen** - Shows sign in options
- [ ] **Sign Up Screen** - Registration form
- [ ] **Onboarding Screen** - First-time user experience

### 2. Main Navigation Tabs
- [ ] **Spot Tab** - Discovery/home screen
- [ ] **Home Tab** - Service categories and directory
- [ ] **Projects Tab** - Project management dashboard

### 3. Core Features
- [ ] **Profile Detail Page** - User/company profile view
- [ ] **Project Detail Page** - Project dashboard with tasks
- [ ] **Directory/Services Page** - Browse services and professionals
- [ ] **Service Detail Page** - Individual service provider view
- [ ] **Chat/Conversations** - Messaging interface
- [ ] **Settings Page** - App settings

### 4. Additional Features (if applicable)
- [ ] **Company Profile** - Company page view
- [ ] **Course Detail** - Academy/course information
- [ ] **News Detail** - News/article view

## 📱 Method 1: iOS Simulator (Recommended for iOS)

### Step 1: Start iOS Simulator
```bash
# Start Expo development server
npm start

# In another terminal, run iOS simulator
npm run ios
```

### Step 2: Choose Device Size
1. In Simulator menu: **Device > Manage Devices**
2. Select appropriate device:
   - **iPhone 15 Pro Max** (6.7") for largest screenshots
   - **iPhone 14 Pro Max** (6.7") 
   - **iPhone 8 Plus** (5.5") for smaller screenshots
   - **iPad Pro 12.9"** (if supporting iPad)

### Step 3: Navigate to Screen
- Use the app navigation to reach each screen
- Ensure content is loaded and visible
- Remove any debug overlays or development tools

### Step 4: Take Screenshot
- **Method A**: `Cmd + S` (saves to Desktop)
- **Method B**: `Device > Screenshot` from menu
- **Method C**: `xcrun simctl io booted screenshot screenshot.png`

### Step 5: Organize Screenshots
Create folders:
```
screenshots/
├── ios/
│   ├── 6.7-inch/
│   ├── 6.5-inch/
│   ├── 5.5-inch/
│   └── ipad-12.9/
└── android/
    ├── phone/
    └── tablet/
```

## 🤖 Method 2: Android Emulator (For Android)

### Step 1: Start Android Emulator
```bash
# Start Expo development server
npm start

# In another terminal, run Android emulator
npm run android
```

### Step 2: Choose Device Size
1. In Android Studio: **Tools > Device Manager**
2. Create/select appropriate device:
   - **Pixel 7 Pro** (6.7") for phone screenshots
   - **Pixel Tablet** (10") for tablet screenshots

### Step 3: Take Screenshot
- **Method A**: `Cmd + S` (Mac) or `Ctrl + S` (Windows/Linux)
- **Method B**: Click camera icon in emulator toolbar
- **Method C**: `adb shell screencap -p /sdcard/screenshot.png`

## 📲 Method 3: Physical Device (Most Accurate)

### iOS Device
1. Navigate to screen in app
2. Press **Side Button + Volume Up** (iPhone X and later)
3. Or **Home Button + Power Button** (older iPhones)
4. Screenshots saved to Photos app
5. Transfer to Mac via AirDrop or Photos sync

### Android Device
1. Navigate to screen in app
2. Press **Power + Volume Down** buttons simultaneously
3. Screenshots saved to Gallery
4. Transfer to computer via USB or cloud storage

## 🛠️ Method 4: Using Fastlane Snapshot (Automated)

Fastlane Snapshot can automate screenshot capture. Install and configure:

```bash
# Install Fastlane
sudo gem install fastlane

# Install snapshot
fastlane add_plugin snapshot

# Run screenshots (requires UI test setup)
fastlane snapshot
```

## 📝 Screenshot Checklist

Use this checklist to ensure you capture all necessary screens:

### Authentication Flow
- [ ] Login screen
- [ ] Sign up screen
- [ ] Onboarding (if applicable)

### Main App Screens
- [ ] Spot/Discovery tab
- [ ] Home/Directory tab
- [ ] Projects tab
- [ ] Profile page (user)
- [ ] Profile page (company)
- [ ] Project detail/dashboard
- [ ] Service detail page
- [ ] Chat/Conversations list
- [ ] Chat conversation view
- [ ] Settings page

### Feature Screens (if applicable)
- [ ] Course detail page
- [ ] News detail page
- [ ] Company registration
- [ ] Project creation

## ✨ Screenshot Best Practices

1. **Remove Development Elements**
   - Hide debug menus
   - Remove console logs overlay
   - Hide development tools

2. **Use Real Content**
   - Use actual user data (or anonymized)
   - Avoid placeholder text
   - Show realistic scenarios

3. **Consistent State**
   - Same user across screenshots
   - Consistent theme (light/dark)
   - Similar data density

4. **Quality**
   - High resolution (at least required sizes)
   - No blur or compression artifacts
   - Proper aspect ratios

5. **Content Guidelines**
   - No personal information visible
   - No copyrighted content
   - Professional appearance

## 🔧 Quick Navigation Script

See `screenshot-helper.tsx` for a helper component that can quickly navigate through screens for screenshot capture.

## 📦 Organizing Screenshots

After capturing, organize by:
1. Platform (iOS/Android)
2. Device size
3. Screen name

Example structure:
```
screenshots/
├── ios-6.7-inch/
│   ├── 01-login.png
│   ├── 02-home.png
│   ├── 03-projects.png
│   └── ...
└── android-phone/
    ├── 01-login.png
    ├── 02-home.png
    └── ...
```

## 🚀 Next Steps

1. Capture all required screenshots
2. Resize to exact required dimensions (if needed)
3. Optimize file sizes (but maintain quality)
4. Upload to App Store Connect / Google Play Console
5. Add captions/descriptions for each screenshot

## 📚 Additional Resources

- [Apple App Store Screenshot Guidelines](https://developer.apple.com/app-store/product-page/)
- [Google Play Screenshot Guidelines](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Fastlane Snapshot Documentation](https://docs.fastlane.tools/actions/snapshot/)

---

**Note**: Make sure to test your app thoroughly before taking screenshots. Screenshots should represent the actual user experience accurately.


# 🚀 How to Share One Crew App with Your Team

## **Method 1: Expo Go (Recommended - Easiest)**

### For You (Developer):
1. Run: `npm start`
2. Share the QR code that appears in your terminal
3. Keep your computer running (or use Expo's cloud service)

### For Your Teammates:
1. **Install Expo Go**:
   - iOS: App Store → Search "Expo Go"
   - Android: Google Play → Search "Expo Go"

2. **Scan the QR Code**:
   - Android: Open Expo Go → Scan QR code
   - iOS: Open Camera app → Point at QR code

3. **App loads instantly!** 🎉

---

## **Method 2: Web Version (No App Installation)**

### For You:
1. Run: `npm run web`
2. Share the localhost URL (e.g., `http://localhost:19006`)
3. Or use: `npx expo start --web` for a public URL

### For Your Teammates:
1. Open the shared URL in any web browser
2. Works on desktop, mobile, tablet
3. No app installation required!

---

## **Method 3: Expo Development Build (Professional)**

### For You:
1. Run: `npx expo build:android` or `npx expo build:ios`
2. Share the generated APK/IPA file
3. Or publish to Expo: `npx expo publish`

### For Your Teammates:
1. Install the APK/IPA file on their devices
2. Or install from Expo's published link

---

## **Method 4: GitHub Repository (For Developers)**

### For You:
1. Push code to GitHub
2. Share repository link
3. Include setup instructions

### For Your Teammates:
1. Clone repository: `git clone [your-repo-url]`
2. Install dependencies: `npm install`
3. Run: `npm start`

---

## **Quick Start Commands**

```bash
# Start development server
npm start

# Open in web browser
npm run web

# Open on iOS simulator
npm run ios

# Open on Android emulator
npm run android

# Publish to Expo (requires Expo account)
npx expo publish
```

---

## **Troubleshooting**

### If QR code doesn't work:
- Make sure you're on the same WiFi network
- Try using the tunnel option: `npx expo start --tunnel`

### If web version doesn't load:
- Check if port 19006 is available
- Try: `npx expo start --web --port 3000`

### If teammates can't access:
- Use tunnel mode: `npx expo start --tunnel`
- Or publish to Expo: `npx expo publish`

---

## **Best Practices**

1. **For Quick Demos**: Use web version (`npm run web`)
2. **For Mobile Testing**: Use Expo Go with QR code
3. **For Production**: Build and distribute APK/IPA
4. **For Development**: Share GitHub repository

---

## **Need Help?**

- Check Expo documentation: https://docs.expo.dev
- Expo Go troubleshooting: https://docs.expo.dev/get-started/installation
- Web development: https://docs.expo.dev/workflow/web

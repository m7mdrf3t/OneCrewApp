# 🌐 Share One Crew App Online

## Option 1: Expo Snack (Online Code Sharing)

1. Go to https://snack.expo.dev
2. Create a new snack
3. Copy the main App.tsx content
4. Share the snack URL with your team

## Option 2: GitHub Repository

1. Push your code to GitHub:
```bash
git remote add origin https://github.com/yourusername/one-crew-app.git
git push -u origin master
```

2. Share the GitHub URL
3. Teammates can clone and run:
```bash
git clone https://github.com/yourusername/one-crew-app.git
cd one-crew-app
npm install
npm start
```

## Option 3: Expo Publish (Cloud Sharing)

```bash
npx expo publish
```

This creates a shareable URL that works with Expo Go app.

## Option 4: Web Deployment

Deploy to Vercel, Netlify, or GitHub Pages for a permanent web URL.

---

## 🎯 **Recommended Sharing Method**

**For immediate sharing**: Use the web version (`npm start` then share localhost URL)

**For mobile testing**: Use Expo Go with QR code

**For permanent sharing**: Push to GitHub and share repository

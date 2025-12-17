import Constants from 'expo-constants';
import { Alert, Linking, Platform, Share } from 'react-native';

const IOS_APP_STORE_URL = 'https://apps.apple.com/app/cool-steps/id6756064436';
const DEFAULT_ANDROID_PACKAGE = 'com.minaezzat.onesteps';

function getAppName() {
  return (
    Constants.expoConfig?.name ||
    // Older manifests / edge cases
    (Constants as any).manifest?.name ||
    'this app'
  );
}

function getAndroidPackageName() {
  return Constants.expoConfig?.android?.package || DEFAULT_ANDROID_PACKAGE;
}

export function getStoreUrl() {
  if (Platform.OS === 'android') {
    return `https://play.google.com/store/apps/details?id=${getAndroidPackageName()}`;
  }
  return IOS_APP_STORE_URL;
}

export async function shareAppInvite() {
  const appName = getAppName();
  const storeUrl = getStoreUrl();
  const message = `Join me on ${appName}!`;

  try {
    // Web: Share API support varies; fall back to opening the store URL.
    if (Platform.OS === 'web') {
      const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
      if (nav?.share) {
        await nav.share({ title: appName, text: `${message} ${storeUrl}`, url: storeUrl });
        return;
      }

      try {
        await Linking.openURL(storeUrl);
      } catch {
        Alert.alert('Invite link', storeUrl);
      }
      return;
    }

    // iOS will combine `message` + `url` when copying/sharing; avoid duplicating the link.
    const content =
      Platform.OS === 'ios'
        ? { message, url: storeUrl }
        : { message: `${message} Download it here: ${storeUrl}` };

    await Share.share(content);
  } catch {
    // Fallback: at least open the store, so the user sees *something* happen.
    try {
      await Linking.openURL(storeUrl);
    } catch {
      Alert.alert('Unable to share', 'Please try again.');
    }
  }
}



import Expo
import React
import ReactAppDependencyProvider
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Initialize Firebase with comprehensive logging
    print("🔥 [Firebase] Starting Firebase initialization...")
    
    // Check if GoogleService-Info.plist exists
    if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
      print("✅ [Firebase] GoogleService-Info.plist found at: \(path)")
    } else {
      print("❌ [Firebase] GoogleService-Info.plist NOT FOUND in bundle!")
      print("❌ [Firebase] This will cause Firebase initialization to fail!")
    }
    
    FirebaseApp.configure()
    if let firebaseApp = FirebaseApp.app() {
      print("✅ [Firebase] Firebase initialized successfully")
      print("🔥 [Firebase] Project ID: \(firebaseApp.options.projectID ?? "unknown")")
      print("🔥 [Firebase] Bundle ID: \(firebaseApp.options.bundleID)")
      print("🔥 [Firebase] API Key: \(firebaseApp.options.apiKey?.prefix(10) ?? "unknown")...")
      
      // Verify Firebase is ready for messaging
      _ = Messaging.messaging()
      print("✅ [Firebase] Messaging instance created")
    } else {
      print("❌ [Firebase] Firebase configured but app instance is nil")
      print("❌ [Firebase] This indicates a configuration problem!")
    }
    
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    // Set up notification delegate
    print("📱 [Notifications] Setting up notification delegate...")
    UNUserNotificationCenter.current().delegate = self
    print("✅ [Notifications] Notification delegate set")
    
    // Check current authorization status first
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      print("📱 [Notifications] Current authorization status: \(settings.authorizationStatus.rawValue)")
      
      if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
        // Already authorized, register immediately
        print("✅ [Notifications] Permissions already granted, registering for remote notifications...")
        DispatchQueue.main.async {
          application.registerForRemoteNotifications()
        }
      } else {
        // Request notification permissions
        print("📱 [Notifications] Requesting notification permissions...")
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(
          options: authOptions,
          completionHandler: { granted, error in
            if let error = error {
              print("❌ [Notifications] Error requesting notification permissions: \(error.localizedDescription)")
            } else {
              print("✅ [Notifications] Notification permissions granted: \(granted)")
              if granted {
                print("📱 [Notifications] Registering for remote notifications...")
                DispatchQueue.main.async {
                  application.registerForRemoteNotifications()
                }
              } else {
                print("⚠️ [Notifications] Notification permissions denied by user")
              }
            }
          }
        )
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  // Handle APNs token registration
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    print("📱 [APNs] APNs device token received: \(deviceToken.map { String(format: "%02.2hhx", $0) }.joined())")
    
    // Forward APNs token to Firebase
    Messaging.messaging().apnsToken = deviceToken
    print("✅ [APNs] APNs token forwarded to Firebase successfully")
    
    // Try to get FCM token to verify Firebase is working
    Messaging.messaging().token { token, error in
      if let error = error {
        print("⚠️ [FCM] Could not get FCM token: \(error.localizedDescription)")
      } else if let token = token {
        print("✅ [FCM] FCM token available: \(token.prefix(20))...")
      } else {
        print("⚠️ [FCM] FCM token is nil")
      }
    }
  }
  
  // Handle APNs token registration failure
  public override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("❌ [APNs] Failed to register for remote notifications: \(error.localizedDescription)")
    if let nsError = error as NSError? {
      print("❌ [APNs] Error domain: \(nsError.domain), code: \(nsError.code)")
    }
  }
  
  // Handle notification received in foreground
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let userInfo = notification.request.content.userInfo
    print("📨 [Notifications] Notification received in foreground")
    print("📨 [Notifications] Title: \(notification.request.content.title)")
    print("📨 [Notifications] Body: \(notification.request.content.body)")
    print("📨 [Notifications] UserInfo: \(userInfo)")
    
    // Show notification even when app is in foreground
    if #available(iOS 14.0, *) {
      completionHandler([[.banner, .sound, .badge]])
    } else {
      completionHandler([[.alert, .sound, .badge]])
    }
  }
  
  // Handle notification tap
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    print("👆 [Notifications] Notification tapped")
    print("👆 [Notifications] Title: \(response.notification.request.content.title)")
    print("👆 [Notifications] Body: \(response.notification.request.content.body)")
    print("👆 [Notifications] UserInfo: \(userInfo)")
    completionHandler()
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

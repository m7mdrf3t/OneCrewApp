/**
 * Test script to send push notifications between devices
 * 
 * This script helps you test push notifications by sending
 * notifications from one device to another using Firebase Cloud Messaging.
 * 
 * Prerequisites:
 * 1. Get FCM tokens from both devices (check console logs in your app)
 * 2. Get Firebase project ID and access token
 * 
 * Usage:
 *   node test-send-notification.js
 * 
 * Or use Firebase Console (easier - no setup needed):
 *   https://console.firebase.google.com/ → Cloud Messaging → Send test message
 */

// ============================================
// CONFIGURATION - Update these values
// ============================================

// FCM tokens from your devices (get from console logs)
const DEVICE_1_TOKEN = 'YOUR_DEVICE_1_FCM_TOKEN_HERE';
const DEVICE_2_TOKEN = 'YOUR_DEVICE_2_FCM_TOKEN_HERE';

// Firebase project configuration
// Get these from Firebase Console → Project Settings
const FIREBASE_PROJECT_ID = 'YOUR_PROJECT_ID_HERE';

// For access token, you can:
// 1. Use Firebase Console directly (easiest - no token needed)
// 2. Generate access token using: gcloud auth print-access-token
// 3. Use Firebase Admin SDK (for production)
const FIREBASE_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE'; // Optional if using Firebase Console

// ============================================
// SEND NOTIFICATION FUNCTION
// ============================================

async function sendNotification(toToken, title, body, data = {}) {
  const url = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;
  
  const payload = {
    message: {
      token: toToken,
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        // Convert all data values to strings (Firebase requirement)
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)])
        ),
      },
    },
  };

  try {
    console.log(`📤 Sending notification to token: ${toToken.substring(0, 20)}...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREBASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Notification sent successfully!');
      console.log('   Response:', JSON.stringify(result, null, 2));
      return result;
    } else {
      console.error('❌ Failed to send notification');
      console.error('   Status:', response.status);
      console.error('   Error:', JSON.stringify(result, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
    throw error;
  }
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testDevice1ToDevice2() {
  console.log('\n🧪 TEST 1: Sending from Device 1 to Device 2\n');
  
  if (DEVICE_2_TOKEN === 'YOUR_DEVICE_2_FCM_TOKEN_HERE') {
    console.error('❌ Please update DEVICE_2_TOKEN in the script');
    return;
  }
  
  await sendNotification(
    DEVICE_2_TOKEN,
    'Test from Device 1',
    'This is a test notification sent from Device 1',
    {
      type: 'test',
      sender: 'device_1',
      timestamp: new Date().toISOString(),
    }
  );
}

async function testDevice2ToDevice1() {
  console.log('\n🧪 TEST 2: Sending from Device 2 to Device 1\n');
  
  if (DEVICE_1_TOKEN === 'YOUR_DEVICE_1_FCM_TOKEN_HERE') {
    console.error('❌ Please update DEVICE_1_TOKEN in the script');
    return;
  }
  
  await sendNotification(
    DEVICE_1_TOKEN,
    'Test from Device 2',
    'This is a test notification sent from Device 2',
    {
      type: 'test',
      sender: 'device_2',
      timestamp: new Date().toISOString(),
    }
  );
}

async function testBothDirections() {
  console.log('\n🧪 TESTING BOTH DIRECTIONS\n');
  console.log('='.repeat(50));
  
  await testDevice1ToDevice2();
  
  // Wait 2 seconds between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testDevice2ToDevice1();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Testing complete!');
  console.log('\n📱 Check both devices for notifications.');
  console.log('   - If app is in foreground: notification banner appears');
  console.log('   - If app is in background: notification in notification center');
  console.log('   - If app is closed: notification in notification center');
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('\n🚀 Push Notification Test Script');
  console.log('='.repeat(50));
  
  // Check if tokens are configured
  if (DEVICE_1_TOKEN === 'YOUR_DEVICE_1_FCM_TOKEN_HERE' || 
      DEVICE_2_TOKEN === 'YOUR_DEVICE_2_FCM_TOKEN_HERE') {
    console.error('\n❌ ERROR: Please configure FCM tokens in the script');
    console.error('\nTo get FCM tokens:');
    console.error('1. Run your app on both devices');
    console.error('2. Log in to the app');
    console.error('3. Check console logs for: 🔑 YOUR FCM TOKEN FOR TESTING:');
    console.error('4. Copy the tokens and update DEVICE_1_TOKEN and DEVICE_2_TOKEN in this script\n');
    process.exit(1);
  }
  
  if (FIREBASE_PROJECT_ID === 'YOUR_PROJECT_ID_HERE') {
    console.error('\n❌ ERROR: Please configure FIREBASE_PROJECT_ID in the script');
    console.error('\nTo get project ID:');
    console.error('1. Go to Firebase Console: https://console.firebase.google.com/');
    console.error('2. Select your project');
    console.error('3. Go to Project Settings');
    console.error('4. Copy the Project ID\n');
    process.exit(1);
  }
  
  if (FIREBASE_ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN_HERE') {
    console.warn('\n⚠️  WARNING: FIREBASE_ACCESS_TOKEN not configured');
    console.warn('   This script requires an access token to send notifications.');
    console.warn('   Alternatively, use Firebase Console directly:');
    console.warn('   https://console.firebase.google.com/ → Cloud Messaging → Send test message\n');
    process.exit(1);
  }
  
  // Run tests
  await testBothDirections();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  sendNotification,
  testDevice1ToDevice2,
  testDevice2ToDevice1,
  testBothDirections,
};









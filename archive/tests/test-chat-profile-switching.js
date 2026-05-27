/**
 * Test Script for Chat Profile Switching
 * 
 * This script tests the chat functionality when switching between company profiles
 * and sending messages to users from different companies.
 * 
 * Usage: node test-chat-profile-switching.js
 * 
 * The script will:
 * 1. Monitor terminal logs for StreamChat connection errors
 * 2. Test profile switching scenarios
 * 3. Verify chat functionality after profile switches
 * 
 * Note: This is a monitoring script. Actual testing should be done manually in the app
 * while this script monitors the terminal output for errors.
 */

const fs = require('fs');
const path = require('path');

// Terminal log file path
const TERMINAL_LOG = path.join(__dirname, '.cursor/projects/Users-aghone01-Documents-CS-OneCrewApp/terminals/6.txt');

// Error patterns to monitor
const ERROR_PATTERNS = [
  /Both secret and user tokens are not set/,
  /Error loading channel list/,
  /Property 'useStreamChatReady' doesn't exist/,
  /StreamChat client not connected/,
  /Failed to watch channel/,
  /Client connection timeout/,
  /tokens are not set/,
  /connectUser wasn't called/,
  /disconnect was called/,
];

// Success patterns to verify
const SUCCESS_PATTERNS = [
  /StreamChat: User connected successfully/,
  /Client is ready \(from provider\)/,
  /Channel watched successfully/,
  /Conversation created successfully/,
  /Message sent successfully/,
];

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Switch to Company Profile',
    steps: [
      '1. Open app and ensure logged in',
      '2. Switch to a company profile',
      '3. Verify StreamChat connects (check logs for "User connected successfully")',
      '4. Navigate to Messages tab',
      '5. Verify no "Error loading channel list" appears',
    ],
  },
  {
    name: 'Open Chat from Company Profile',
    steps: [
      '1. From company profile, navigate to a user profile',
      '2. Tap "Start Chat" or message button',
      '3. Verify chat opens without "tokens not set" error',
      '4. Verify channel loads successfully',
    ],
  },
  {
    name: 'Switch Between Companies',
    steps: [
      '1. Switch to Company A profile',
      '2. Wait for connection (check logs)',
      '3. Switch to Company B profile',
      '4. Verify reconnection happens (check logs)',
      '5. Open chat with a user',
      '6. Verify chat works correctly',
    ],
  },
  {
    name: 'Send Message After Profile Switch',
    steps: [
      '1. Switch to a company profile',
      '2. Open chat with a user',
      '3. Wait for chat to fully load',
      '4. Send a test message',
      '5. Verify message sends successfully',
      '6. Verify no errors in logs',
    ],
  },
  {
    name: 'Multiple Profile Switches',
    steps: [
      '1. Switch: User → Company A → Company B → User',
      '2. After each switch, verify connection in logs',
      '3. After final switch, open chat',
      '4. Verify chat works correctly',
    ],
  },
];

function monitorTerminalLog() {
  console.log('📊 Monitoring terminal log for errors...\n');
  console.log('Terminal log path:', TERMINAL_LOG);
  console.log('Waiting for log updates...\n');

  if (!fs.existsSync(TERMINAL_LOG)) {
    console.warn('⚠️  Terminal log file not found. Make sure the app is running.');
    return;
  }

  let lastSize = fs.statSync(TERMINAL_LOG).size;
  let errorCount = 0;
  let successCount = 0;

  const checkLog = () => {
    try {
      const stats = fs.statSync(TERMINAL_LOG);
      if (stats.size > lastSize) {
        const content = fs.readFileSync(TERMINAL_LOG, 'utf8');
        const newContent = content.slice(lastSize);
        lastSize = stats.size;

        // Check for errors
        ERROR_PATTERNS.forEach((pattern, index) => {
          if (pattern.test(newContent)) {
            errorCount++;
            console.error(`❌ ERROR DETECTED (${errorCount}):`, pattern.toString());
            const lines = newContent.split('\n');
            lines.forEach((line, lineIndex) => {
              if (pattern.test(line)) {
                console.error(`   Line: ${line.trim()}`);
              }
            });
          }
        });

        // Check for successes
        SUCCESS_PATTERNS.forEach((pattern) => {
          if (pattern.test(newContent)) {
            successCount++;
            console.log(`✅ SUCCESS (${successCount}):`, pattern.toString());
          }
        });
      }
    } catch (error) {
      console.error('Error reading log:', error.message);
    }
  };

  // Check every 500ms
  const interval = setInterval(checkLog, 500);

  // Print summary on exit
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n\n📊 SUMMARY:');
    console.log(`   Errors detected: ${errorCount}`);
    console.log(`   Successes detected: ${successCount}`);
    process.exit(0);
  });
}

function printTestScenarios() {
  console.log('🧪 TEST SCENARIOS TO MANUALLY EXECUTE:\n');
  TEST_SCENARIOS.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    scenario.steps.forEach((step) => {
      console.log(`   ${step}`);
    });
    console.log('');
  });
}

function main() {
  console.log('🚀 Chat Profile Switching Test Monitor\n');
  console.log('='.repeat(50));
  console.log('');
  
  printTestScenarios();
  
  console.log('='.repeat(50));
  console.log('');
  console.log('Starting log monitoring...');
  console.log('Press Ctrl+C to stop monitoring\n');
  
  monitorTerminalLog();
}

if (require.main === module) {
  main();
}

module.exports = { monitorTerminalLog, TEST_SCENARIOS, ERROR_PATTERNS, SUCCESS_PATTERNS };

# Chat Profile Switching Test Guide

## Overview
This guide helps you test chat functionality when switching between company profiles and sending messages to users from different companies.

## Prerequisites
1. App is running (`npm start --clean`)
2. You are logged in
3. You have access to at least 2 company profiles
4. You have a list of users from different companies to test with

## Test Scripts

### Option 1: Automated Monitoring Script
```bash
./test-chat-profile-switching.sh
```
This script monitors the terminal log in real-time and alerts you to errors or successes.

### Option 2: Node.js Monitoring Script
```bash
node test-chat-profile-switching.js
```
This script provides structured test scenarios and monitors the log file.

## Test Scenarios

### Scenario 1: Basic Profile Switch
**Steps:**
1. Start on user profile
2. Switch to Company A profile
3. Wait 2-3 seconds for StreamChat connection
4. Navigate to Messages tab
5. **Expected:** No "Error loading channel list" appears
6. **Check terminal for:** "StreamChat: User connected successfully"

### Scenario 2: Open Chat from Company Profile
**Steps:**
1. From Company A profile, navigate to a user's profile
2. Tap "Start Chat" or message button
3. Wait for chat to open
4. **Expected:** Chat opens without "Both secret and user tokens are not set" error
5. **Check terminal for:** "Client is ready (from provider)" and "Channel watched successfully"

### Scenario 3: Switch Between Companies
**Steps:**
1. Switch: User → Company A
2. Wait for connection (check terminal for "User connected successfully")
3. Switch: Company A → Company B
4. Wait for reconnection (check terminal)
5. Open chat with a user from Company B
6. **Expected:** Chat loads and works correctly
7. **Check terminal:** No "tokens not set" errors

### Scenario 4: Send Message After Switch
**Steps:**
1. Switch to a company profile
2. Open chat with a user
3. Wait for chat to fully load (check terminal)
4. Send test message: "Test message from company profile"
5. **Expected:** Message appears in chat
6. **Check terminal:** No errors during send

### Scenario 5: Multiple Rapid Switches
**Steps:**
1. Rapidly switch: User → Company A → Company B → User → Company A
2. After each switch, wait 1-2 seconds
3. After final switch, open chat
4. **Expected:** Chat works correctly despite rapid switches
5. **Check terminal:** No connection timeout errors

### Scenario 6: Send Messages to Users from Different Companies
**Steps:**
1. Switch to Company A
2. Open chat with User 1 (can be from any company)
3. Send message: "Message 1 from Company A"
4. Switch to Company B
5. Open chat with User 2 (can be from any company)
6. Send message: "Message 2 from Company B"
7. Switch back to Company A
8. Open previous chat with User 1
9. **Expected:** Previous chat still works, can send another message
10. **Check terminal:** No errors during any step

## What to Monitor

### ✅ Good Signs (Should Appear)
- `StreamChat: User connected successfully`
- `Client is ready (from provider)`
- `Channel watched successfully`
- `Conversation created successfully`
- `💬 [StreamChatProvider] Connection result: { connected: true, ... }`

### ❌ Bad Signs (Should NOT Appear)
- `Both secret and user tokens are not set`
- `Error loading channel list`
- `Property 'useStreamChatReady' doesn't exist`
- `Client connection timeout`
- `Failed to watch channel`
- `StreamChat client not connected, cannot watch channel`

## Troubleshooting

### If you see "tokens not set" error:
1. Check if `clientReady` is true in StreamChatProvider
2. Verify the connection completed before opening chat
3. Wait a few seconds after profile switch before opening chat

### If chat doesn't load:
1. Check terminal for connection status
2. Verify you're on the correct profile
3. Try switching profiles again
4. Restart the app if issues persist

### If messages don't send:
1. Verify StreamChat is connected (check terminal)
2. Check if channel is watched (look for "Channel watched successfully")
3. Try sending again after a few seconds

## Expected Behavior After Fixes

1. **Profile Switch:** StreamChat should reconnect automatically within 1-2 seconds
2. **Chat Opening:** Chat should open without "tokens not set" errors
3. **Message Sending:** Messages should send successfully from any profile
4. **Multiple Switches:** Should handle rapid profile switches gracefully
5. **Cross-Company Chats:** Should work correctly regardless of which company profile you're on

## Notes

- The fixes ensure `clientReady` is only set to `true` after successful connection
- `waitForConnection` now uses `clientReady` instead of unreliable `connectionState`
- All `client.userID` accesses are wrapped in try/catch to prevent throws
- Profile switches trigger automatic StreamChat reconnection

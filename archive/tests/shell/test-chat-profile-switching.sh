#!/bin/bash

# Comprehensive Test Script for Chat Profile Switching
# Tests chat functionality when switching between company profiles and sending messages

set -e

TERMINAL_LOG="$HOME/.cursor/projects/Users-aghone01-Documents-CS-OneCrewApp/terminals/6.txt"
ERROR_COUNT=0
SUCCESS_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Chat Profile Switching Test Script${NC}"
echo "======================================"
echo ""

# Function to check for errors in log
check_errors() {
    local pattern="$1"
    local description="$2"
    
    if [ -f "$TERMINAL_LOG" ]; then
        if grep -q "$pattern" "$TERMINAL_LOG"; then
            echo -e "${RED}❌ ERROR: $description${NC}"
            ERROR_COUNT=$((ERROR_COUNT + 1))
            return 1
        fi
    fi
    return 0
}

# Function to check for success patterns
check_success() {
    local pattern="$1"
    local description="$2"
    
    if [ -f "$TERMINAL_LOG" ]; then
        if grep -q "$pattern" "$TERMINAL_LOG"; then
            echo -e "${GREEN}✅ SUCCESS: $description${NC}"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            return 0
        fi
    fi
    return 1
}

# Function to monitor log in real-time
monitor_log() {
    echo -e "${YELLOW}📊 Monitoring terminal log for errors...${NC}"
    echo "Log file: $TERMINAL_LOG"
    echo ""
    
    if [ ! -f "$TERMINAL_LOG" ]; then
        echo -e "${RED}⚠️  Terminal log not found. Make sure the app is running.${NC}"
        return 1
    fi
    
    # Get initial file size
    local last_size=$(stat -f%z "$TERMINAL_LOG" 2>/dev/null || stat -c%s "$TERMINAL_LOG" 2>/dev/null || echo "0")
    
    echo -e "${BLUE}Monitoring started. Press Ctrl+C to stop.${NC}"
    echo ""
    
    while true; do
        sleep 1
        
        if [ -f "$TERMINAL_LOG" ]; then
            local current_size=$(stat -f%z "$TERMINAL_LOG" 2>/dev/null || stat -c%s "$TERMINAL_LOG" 2>/dev/null || echo "0")
            
            if [ "$current_size" -gt "$last_size" ]; then
                # Read new content
                local new_content=$(tail -c +$((last_size + 1)) "$TERMINAL_LOG" 2>/dev/null || dd if="$TERMINAL_LOG" bs=1 skip=$last_size 2>/dev/null)
                last_size=$current_size
                
                # Check for errors
                if echo "$new_content" | grep -qE "(Both secret and user tokens|Error loading channel list|Property 'useStreamChatReady'|StreamChat client not connected|Failed to watch channel|Client connection timeout)"; then
                    echo -e "${RED}❌ ERROR DETECTED:${NC}"
                    echo "$new_content" | grep -E "(Both secret and user tokens|Error loading channel list|Property 'useStreamChatReady'|StreamChat client not connected|Failed to watch channel|Client connection timeout)" | head -5
                    ERROR_COUNT=$((ERROR_COUNT + 1))
                fi
                
                # Check for successes
                if echo "$new_content" | grep -qE "(StreamChat: User connected successfully|Client is ready \(from provider\)|Channel watched successfully|Conversation created successfully)"; then
                    echo -e "${GREEN}✅ SUCCESS DETECTED:${NC}"
                    echo "$new_content" | grep -E "(StreamChat: User connected successfully|Client is ready \(from provider\)|Channel watched successfully|Conversation created successfully)" | head -3
                    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
                fi
            fi
        fi
    done
}

# Print test scenarios
print_test_scenarios() {
    echo -e "${BLUE}🧪 TEST SCENARIOS TO EXECUTE:${NC}"
    echo ""
    
    echo -e "${YELLOW}SCENARIO 1: Basic Profile Switch${NC}"
    echo "  1. Start on user profile"
    echo "  2. Switch to Company A profile"
    echo "  3. Wait 2-3 seconds for connection"
    echo "  4. Navigate to Messages tab"
    echo "  5. Verify no 'Error loading channel list' appears"
    echo ""
    
    echo -e "${YELLOW}SCENARIO 2: Open Chat from Company Profile${NC}"
    echo "  1. From Company A profile, navigate to a user's profile"
    echo "  2. Tap 'Start Chat' or message button"
    echo "  3. Wait for chat to open"
    echo "  4. Verify chat loads without 'tokens not set' error"
    echo "  5. Verify channel loads successfully"
    echo ""
    
    echo -e "${YELLOW}SCENARIO 3: Switch Between Companies${NC}"
    echo "  1. Switch: User → Company A"
    echo "  2. Wait for connection (check terminal)"
    echo "  3. Switch: Company A → Company B"
    echo "  4. Wait for reconnection (check terminal)"
    echo "  5. Open chat with a user from Company B"
    echo "  6. Verify chat works correctly"
    echo ""
    
    echo -e "${YELLOW}SCENARIO 4: Send Message After Switch${NC}"
    echo "  1. Switch to a company profile"
    echo "  2. Open chat with a user"
    echo "  3. Wait for chat to fully load"
    echo "  4. Send test message: 'Test from company profile'"
    echo "  5. Verify message appears in chat"
    echo "  6. Check terminal for any errors"
    echo ""
    
    echo -e "${YELLOW}SCENARIO 5: Multiple Rapid Switches${NC}"
    echo "  1. Rapidly switch: User → Company A → Company B → User → Company A"
    echo "  2. After each switch, wait 1-2 seconds"
    echo "  3. After final switch, open chat"
    echo "  4. Verify chat works correctly"
    echo "  5. Check terminal for connection errors"
    echo ""
    
    echo -e "${YELLOW}SCENARIO 6: Send Messages to Users from Different Companies${NC}"
    echo "  1. Switch to Company A"
    echo "  2. Open chat with User 1 (from Company A or different company)"
    echo "  3. Send message: 'Message 1 from Company A'"
    echo "  4. Switch to Company B"
    echo "  5. Open chat with User 2 (from Company B or different company)"
    echo "  6. Send message: 'Message 2 from Company B'"
    echo "  7. Switch back to Company A"
    echo "  8. Verify previous chat with User 1 still works"
    echo "  9. Send another message"
    echo ""
}

# Main function
main() {
    print_test_scenarios
    
    echo "======================================"
    echo ""
    echo -e "${BLUE}MONITORING PATTERNS:${NC}"
    echo ""
    echo -e "${GREEN}✅ GOOD SIGNS (should appear):${NC}"
    echo "  - 'StreamChat: User connected successfully'"
    echo "  - 'Client is ready (from provider)'"
    echo "  - 'Channel watched successfully'"
    echo "  - 'Conversation created successfully'"
    echo ""
    echo -e "${RED}❌ BAD SIGNS (should NOT appear):${NC}"
    echo "  - 'Both secret and user tokens are not set'"
    echo "  - 'Error loading channel list'"
    echo "  - 'Property useStreamChatReady doesn't exist'"
    echo "  - 'Client connection timeout'"
    echo "  - 'Failed to watch channel'"
    echo ""
    echo "======================================"
    echo ""
    echo -e "${YELLOW}Press Enter to start monitoring (or Ctrl+C to exit)...${NC}"
    read
    
    # Set up signal handler
    trap 'echo ""; echo -e "${BLUE}📊 SUMMARY:${NC}"; echo "   Errors detected: $ERROR_COUNT"; echo "   Successes detected: $SUCCESS_COUNT"; exit 0' INT TERM
    
    monitor_log
}

# Run main function
main

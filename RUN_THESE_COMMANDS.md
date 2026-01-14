# Run These Git Commands

The terminal tool is having issues, so please run these commands **manually in your terminal**:

## Commands to Run:

```bash
cd /Users/aghone01/Documents/CS/OneCrew_BE/OneCrewBE

git checkout -b feature/fix-stream-chat-token-endpoint

git add src/domains/chat/routes/chat.ts

git commit -m "Fix Stream Chat token endpoint to return formatted user_id

- Format user_id as onecrew_user_{id} or onecrew_company_{id}
- Use formatted ID for token generation
- Support both STREAM_CHAT_API_KEY and STREAM_API_KEY env vars
- Fixes frontend connection issue"

git push origin feature/fix-stream-chat-token-endpoint
```

## After Running Commands:

1. **Verify the branch was created:**
   ```bash
   git branch
   ```

2. **Check the commit:**
   ```bash
   git log -1
   ```

3. **Verify push was successful:**
   ```bash
   git branch -r
   ```

## Then Test:

```bash
cd /Users/aghone01/Documents/CS/OneCrewApp
./test-stream-chat.sh
```

## Next: Deploy Backend

After pushing, you'll need to:
1. Create Pull Request on GitHub
2. Merge to main/develop
3. Deploy to production

Then test on iOS simulator!


# Backend Deployment Required: Academy Ads API

Date: May 4, 2026
Requester: Frontend/Mobile team

## Summary
The mobile/frontend app is now wired to load Academy ads from:
- GET /api/academy/ads

Current blocker:
- This route is not deployed in the active backend environments yet.

Observed responses:
- Staging: {"success":false,"error":"Route /api/academy/ads not found"}
- Production: {"success":false,"error":"Route /api/academy/ads not found"}

Because of this, ads created in Admin Portal cannot appear in the app.

## Backend Deployment Requirements
Please deploy OneCrewBE with Academy Ads features enabled:

1. Public Academy ads endpoint
- GET /api/academy/ads

2. Admin Academy ads CRUD endpoints
- GET /api/admin/academy-ads
- POST /api/admin/academy-ads
- PUT /api/admin/academy-ads/:id
- DELETE /api/admin/academy-ads/:id

3. Academy ad image upload endpoint
- POST /api/upload/academy-ads/image

## Required Backend Environment Variables
Set/verify on deployed backend runtime:

- SUPABASE_URL=https://uwdzkrferlogqasrxcve.supabase.co
- SUPABASE_SERVICE_ROLE_KEY=<real service role key>
- PORT=3001 (local) or platform-managed in cloud

Important:
- Do not use /rest/v1/ in SUPABASE_URL for server config.

## Environment Alignment Requirement
Admin Portal and mobile app must target the same backend environment.

Frontend currently points to staging backend by default in ApiContext.
If backend deploy happens in another environment, app will still not show ads.

## Recommended Deploy Order
1. Deploy backend with routes above.
2. Verify backend health and Academy Ads API.
3. Deploy/confirm Admin Portal Academy Ads pages.
4. Publish an ad in portal.
5. Validate in app.

## Verification Checklist
Run after backend deployment:

1. Health
- GET /health returns OK

2. Academy ads endpoint
- GET /api/academy/ads returns:
  - success: true
  - data: [] or published ads

3. Published ad visibility
- Create ad in Admin Portal
- Ensure status is Published
- Confirm response includes new ad title
- Open app Academy/Home view and confirm banner appears

4. Payload contract (must be supported)
Each ad item should include:
- id
- title
- subtitle
- image_url
- cta_text
- cta_link
- status (published)
- display_order

## Curl Smoke Tests
Replace <backend-domain> with deployed host:

curl -s https://<backend-domain>/health
curl -s https://<backend-domain>/api/academy/ads

Expected: second command returns success=true and data array.

## Notes for Backend Team
Frontend is ready and already integrated with /api/academy/ads.
No further frontend code changes are required for basic ad rendering once backend routes are deployed and ads are published.

# Backend Fix for Task Assignments with User Details

## Problem
Tasks are showing "Project (role)" or "User {user_id}" instead of actual user names because the task assignment data doesn't include full user details.

## Current Situation
- `api.getProjectTasks(projectId)` returns tasks with assignments
- Assignments have `user_id` and `service_role` but not full user objects with names
- Frontend falls back to displaying generic "Project (role)" or "User {user_id}"

## Recommended Backend Solution

### Option 1: Enhance Existing `GET /api/projects/:projectId/tasks` Endpoint (RECOMMENDED)

**Modify the endpoint to populate user details in assignments:**

```javascript
// Backend endpoint enhancement
GET /api/projects/:projectId/tasks

// Response should include:
{
  "success": true,
  "data": [
    {
      "id": "task-id",
      "title": "development",
      "status": "pending",
      "assignments": [
        {
          "id": "assignment-id",
          "user_id": "7035afdd",
          "service_role": "director",
          "user": {  // ← ADD THIS: Full user object
            "id": "7035afdd",
            "name": "John Doe",  // ← This is what's missing
            "email": "john@example.com",
            "image_url": "https://...",
            "primary_role": "director"
          },
          "assigned_at": "2024-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

**Implementation approach:**
- Use database JOIN or populate/aggregate to include user details
- Include at minimum: `id`, `name`, `image_url`, `primary_role`

### Option 2: New Endpoint `GET /api/projects/:projectId/tasks?include=users`

**Add query parameter to optionally include user details:**

```javascript
GET /api/projects/:projectId/tasks?include=users

// Same response structure as Option 1, but only includes users when requested
```

### Option 3: Separate Endpoint for Task Assignments with Users

**Create a dedicated endpoint:**

```javascript
GET /api/projects/:projectId/tasks/:taskId/assignments-with-users

// Response:
{
  "success": true,
  "data": {
    "task_id": "task-id",
    "assignments": [
      {
        "id": "assignment-id",
        "user_id": "7035afdd",
        "service_role": "director",
        "user": {
          "id": "7035afdd",
          "name": "John Doe",
          "email": "john@example.com",
          "image_url": "https://...",
          "primary_role": "director"
        },
        "assigned_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

## Database Query Example (if using SQL/Prisma)

```sql
-- Example SQL query
SELECT 
  t.*,
  json_agg(
    json_build_object(
      'id', ta.id,
      'user_id', ta.user_id,
      'service_role', ta.service_role,
      'assigned_at', ta.assigned_at,
      'user', json_build_object(
        'id', u.id,
        'name', u.name,
        'email', u.email,
        'image_url', u.image_url,
        'primary_role', u.primary_role
      )
    )
  ) as assignments
FROM tasks t
LEFT JOIN task_assignments ta ON t.id = ta.task_id
LEFT JOIN users u ON ta.user_id = u.id
WHERE t.project_id = :projectId
GROUP BY t.id;
```

## Frontend Expectations

After backend fix, the frontend code in `ProjectDashboard.tsx` will automatically work because it already handles:

```javascript
// Line 145-153 in ProjectDashboard.tsx
members = task.assignments.map((assignment: any) => ({
  id: assignment.user_id,
  name: assignment.users?.name || assignment.user?.name || assignment.user_name || `User ${assignment.user_id.substring(0, 8)}`,
  user: assignment.users || assignment.user,
  service_role: assignment.service_role,
  // ...
}));
```

The code already checks for `assignment.user?.name` or `assignment.users?.name`, so once the backend includes this, it will work automatically.

## Priority

**Option 1 is recommended** because:
- Single API call (better performance)
- Most efficient (one database query with JOIN)
- No frontend changes needed
- Follows RESTful best practices

## Testing

After implementing, verify:
1. `GET /api/projects/:projectId/tasks` returns tasks with full user objects in assignments
2. Each assignment has a `user` object with at least `id`, `name`, and `primary_role`
3. Frontend displays actual user names instead of "Project (role)"

## Current Frontend Workaround

Currently, the frontend tries to fetch user details individually when missing, but this is inefficient and may fail due to permissions. The backend solution is the proper fix.








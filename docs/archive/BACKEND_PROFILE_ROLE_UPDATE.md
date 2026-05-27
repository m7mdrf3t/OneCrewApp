# Backend Requirements: Profile Role Update (Category & Primary Role)

This document describes the backend changes required so that **users can change their category and primary role** from the OneCrew app’s profile editing screen.

**Staging base URL:** `https://onecrew-backend-staging-309236356616.us-central1.run.app` (or your backend base URL)

---

## 1. Summary

The app now sends optional **`category`** and **`primary_role`** in the existing **PUT /api/users/:id** request when the user edits their profile and changes their role. The backend must:

1. **Accept** optional `category` and `primary_role` in the request body.
2. **Validate** `primary_role` when provided (e.g. must exist in the roles table or allowed set for the user’s category).
3. **Persist** the updated `category` and `primary_role` on the user record.
4. **Return** the updated user (including `category` and `primary_role`) in the response so the app can refresh the in-memory user.

No new endpoints are required; only the existing user update endpoint behavior is extended.

---

## 2. API Contract

### Endpoint

**PUT /api/users/:id**

- **Auth:** Bearer token (user can update only their own profile, or as per your auth rules).
- **Path:** `id` = user ID (typically the current user’s ID).

### Request body (additional fields)

The app may include these optional fields in the JSON body in addition to existing profile fields (e.g. `bio`, `specialty`, `location_text`, `image_url`):

| Field           | Type   | Example     | Description |
|----------------|--------|-------------|-------------|
| `category`     | string | `"crew"` or `"talent"` | User category. Only these two values are sent from the app for profile edit. |
| `primary_role` | string | `"director"`, `"actor"` (or label) | Primary role. The app sends **role code** when GET /api/roles returns `code`/`value`; backend should accept both code and label (e.g. via getRoleByCodeOrLabel) and persist the **code**. |

- If **`category`** is omitted, do not change the user’s category.
- If **`primary_role`** is omitted or empty string, do not change the user’s primary role (or clear it, depending on product rules).

### Validation rules (recommended)

1. **category**
   - If present, must be one of: `crew`, `talent` (and optionally `company` if you support it elsewhere).
   - Return **400** with a clear message if an invalid value is sent.

2. **primary_role**
   - If present and non-empty, resolve via a role lookup that accepts **code or label** (e.g. `getRoleByCodeOrLabel`) and ensure the role belongs to the user’s (possibly updated) category.
   - Persist the role **code** on the user (e.g. `director`, `actor`) so responses and directory filters stay consistent.
   - Return **400** with a clear message (e.g. “Invalid role for this category”) if validation fails.

### Response

- **200 OK**  
  Response body should include the **updated user object** (e.g. in `data` or as per your current PUT response shape).  
  The updated user must include:
  - `category` (updated value if it was sent)
  - `primary_role` (updated value if it was sent)

So that the app can set the in-memory user from the response and show the new role/category everywhere (e.g. directory, talent profile section) without an extra GET.

---

## 3. Data model assumptions

- **Users** table (or equivalent) has at least:
  - `category` (e.g. enum or string: `crew`, `talent`, `company`).
  - `primary_role` (e.g. string role name, or foreign key to a roles table).
- **Roles** are available per category (e.g. **GET /api/roles?category=crew** and **GET /api/roles?category=talent**). The same role names/ids used there should be accepted for **primary_role** when updating the user.

---

## 4. Implementation checklist

| # | Task | Done |
|---|------|------|
| 1 | In PUT /api/users/:id handler, read optional `category` and `primary_role` from request body. | |
| 2 | If `category` is present, validate and update user’s category. | |
| 3 | If `primary_role` is present, validate against roles for (updated) category and update user’s primary_role. | |
| 4 | Return 200 with updated user object including `category` and `primary_role`. | |
| 5 | Return 400 with clear message if validation fails. | |

---

## 5. Verification (curl)

After implementation, you can verify with (replace `BASE`, `TOKEN`, and `USER_ID`):

```bash
BASE="https://onecrew-backend-staging-309236356616.us-central1.run.app"
TOKEN="<your_bearer_token>"
USER_ID="<current_user_id>"

# Update only primary_role (keep category unchanged)
curl -s -X PUT "$BASE/api/users/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"bio":"My bio","primary_role":"Director"}' | jq '.data.category, .data.primary_role'

# Update category and primary_role
curl -s -X PUT "$BASE/api/users/$USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"bio":"My bio","category":"talent","primary_role":"Actor"}' | jq '.data.category, .data.primary_role'
```

Expect **200** and the response to include the updated `category` and `primary_role` on the user.

---

## 6. Frontend behavior (for reference)

- **Profile edit screen:** In “Basic Information”, the user sees:
  - **Category:** dropdown (Crew / Talent).
  - **Primary role:** dropdown (options depend on selected category; options come from GET /api/roles?category=crew and GET /api/roles?category=talent).
- On save, the app sends **PUT /api/users/:id** with optional `category` and `primary_role` along with other profile fields.
- After a successful response, the app updates the in-memory user from the response so the new role/category are reflected immediately (e.g. directory, talent-specific sections).

---

## 7. Summary

- **Endpoint:** PUT /api/users/:id (existing).
- **New/optional body fields:** `category` (crew | talent), `primary_role` (string).
- **Backend:** Accept, validate, persist, and return updated user with `category` and `primary_role`.
- **No new endpoints;** only extend the existing user update.

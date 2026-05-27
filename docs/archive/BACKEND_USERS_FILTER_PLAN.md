# Backend Plan: Users List Search & Filters (All Members)

This document is a development plan for the backend so that **GET /api/users** correctly supports search (`q`) and the filters **Gender**, **Nationality**, **Location**, and **Skills** used by the OneCrew app’s All Members section.

**Staging base URL:** `https://onecrew-backend-staging-309236356616.us-central1.run.app`

---

## Verification (after backend development) ✅

Re-tested with curl; all requirements now pass:

| Requirement | Query param(s) | Result |
|-------------|----------------|--------|
| **Search** | `q` | ✅ 200 – smart/full-text search returns matching users |
| **Location** | `location` | ✅ 200 – only users with matching `location_text` |
| **Gender** | `gender` | ✅ 200 – only users with matching `user_details.gender` (e.g. `gender=female` → all returned have `"gender":"female"`) |
| **Nationality** | `nationality`, `nationalities[]` | ✅ 200 – only users with matching nationality (e.g. `nationality=Egypt` → Egyptian / Egypt) |
| **Skills** | `skills[]` | ✅ 200 – param accepted (no 500); returns filtered list or empty array if no matches |

Combined filters (e.g. `gender=male&location=Cairo`) also work: response contains only male users in Cairo.

---

## 1. Original state (before backend fixes)

| Requirement | Query param(s) | Previous behavior |
|-------------|----------------|-------------------|
| **Search** | `q` | ✅ Worked |
| **Location** | `location` | ✅ Worked |
| **Gender** | `gender` | ❌ Accepted but not applied |
| **Nationality** | `nationality`, `nationalities[]` | ❌ Accepted but not applied |
| **Skills** | `skills[]` (or `skills`) | ❌ 500 error |

---

## 2. API contract (what the frontend sends)

The app calls **GET /api/users** with the following query parameters. The backend must accept and apply them without returning 500.

| Param | Type | Example | Description |
|-------|------|---------|--------------|
| `q` | string | `q=test` | Search query (smart/full-text). Already working. |
| `location` | string | `location=Cairo` | Filter by user’s current location. Already working. |
| `gender` | string | `gender=female` | Filter by profile gender. One of: `male`, `female`, `non_binary`, `prefer_not_to_say`, `other`. |
| `nationality` | string | `nationality=Egypt` | Filter by profile nationality (single; partial match acceptable). |
| `nationalities[]` | string[] | `nationalities[]=Egypt&nationalities[]=Lebanon` | Optional: filter by any of these nationalities (OR). |
| `skills[]` | string[] | `skills[]=Acting&skills[]=Singing` | Filter users who have **at least one** of these skills (by name or ID). |
| `page` | number | `page=1` | Pagination page. |
| `limit` | number | `limit=50` | Page size. |

Response shape (unchanged): `{ success: true, data: User[], pagination?: { page, limit, total?, totalPages? } }`.

### Smart search: always “starts with” (prefix match)

For **any** non-empty `q`, the backend should return members whose **name starts with** the query string (prefix match). Typing more letters narrows the list:

- `q=M` → all members whose name starts with **M** (e.g. Mary, Michael, Mohamed).
- `q=Mi` → all members whose name starts with **Mi** (e.g. Michael, Mike, Mina).
- `q=Mic` → all members whose name starts with **Mic** (e.g. Michael, Michelle).
- And so on: longer prefix = smaller, more focused list.

**Implementation:** Use a single **prefix match** on the user’s display name for every `q`, e.g. `name ILIKE 'q%'` (case-insensitive). No need to switch to full-text for longer queries — the same prefix logic applies at any length.

The frontend already sends `q` for any length (including one letter) and uses a shorter debounce for 1–2 characters.

---

## 3. Data model assumptions (from API response)

Inferred from staging response:

- **Users** have `user_details` (or joined table) with at least: `gender`, `nationality`.
- **Location** is on the user (e.g. `location_text`) and is already filtered.
- **Skills** are linked via a join (e.g. `user_skills` with `skill_id`), and there is a **skills reference table** (e.g. `skills.id`, `skills.name`). Frontend can send skill **names** (e.g. "Acting"); backend can match by name or resolve to ID and filter by `skill_id`.

---

## 4. Backend implementation plan

### 4.1 Fix Skills filter (priority 1 – currently 500)

**Goal:** Accept `skills` or `skills[]` without throwing; optionally apply filter.

**Steps:**

1. **Locate the GET /api/users handler** (e.g. `routes/users.js`, `controllers/usersController.js`, or equivalent).
2. **Find where query params are parsed** (e.g. `req.query`). Ensure array params are read correctly:
   - Express: `req.query['skills[]']` or `req.query.skills` may be a string or array depending on client.
   - Normalize to an array: e.g. `const skills = [].concat(req.query['skills[]'] || req.query.skills || []).filter(Boolean)`.
3. **Identify the cause of 500:**
   - If skills are passed into a raw query or ORM without handling, fix the handling (e.g. don’t pass undefined or wrong type into a builder).
   - If the error is from a missing column or wrong table, fix the query (see below).
4. **Implement skills filtering (once 500 is fixed):**
   - If skills are **names**: resolve names to skill IDs via the skills reference table (e.g. `SELECT id FROM skills WHERE name ILIKE ANY($1)` or similar).
   - Filter users who have at least one of these skills: e.g. `WHERE EXISTS (SELECT 1 FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = users.id AND (s.id = ANY($skillIds) OR s.name ILIKE ANY($skillNames)))` (exact SQL depends on your schema).
   - If the backend only has `skill_id` and no name table, accept only skill IDs in `skills[]` and filter by `user_skills.skill_id` IN (...).
5. **Edge case:** If `skills[]` is empty or missing, do not add a skills condition (return all users for that dimension).

**Definition of done:**  
`GET /api/users?limit=5&skills[]=Acting` returns **200** and only users that have the "Acting" skill (or the corresponding skill_id). No 500.

---

### 4.2 Apply Gender filter

**Goal:** When `gender` is sent, restrict results to users whose profile gender matches.

**Steps:**

1. In the same GET /api/users handler, read `const gender = req.query.gender` (string, e.g. `female`).
2. If `gender` is missing or empty, skip this filter.
3. Add a condition to the users query so that only rows with matching profile gender are returned. For example:
   - If `user_details` is a joined table: `AND user_details.gender = $gender` (use parameterized query; normalize case if needed, e.g. lowercase).
   - If gender is stored in a JSONB column, adjust accordingly (e.g. `AND user_details->>'gender' = $gender`).
4. Use case-insensitive comparison if the DB stores mixed case (e.g. `LOWER(user_details.gender) = LOWER($gender)`).

**Definition of done:**  
`GET /api/users?limit=5&gender=female` returns **200** and only users with `user_details.gender === 'female'` (or equivalent). No users with `gender: "male"` in the response.

---

### 4.3 Apply Nationality filter

**Goal:** When `nationality` or `nationalities[]` is sent, restrict results to users whose profile nationality matches (single value or any of the list).

**Steps:**

1. Read `nationality` (single) and `nationalities[]` (array). Normalize to a list: e.g. `const nationalities = [].concat(req.query.nationality || [], req.query['nationalities[]'] || []).filter(Boolean)` (adjust key names to match your framework’s parsing).
2. If the list is empty, skip this filter.
3. Add a condition so that the user’s profile nationality matches **any** of the values (OR), with partial/match semantics if desired (e.g. `user_details.nationality ILIKE '%Egypt%'` or `LOWER(nationality) IN (...)`).
4. Use parameterized queries and case-insensitive comparison to avoid SQL injection and casing issues.

**Definition of done:**  
`GET /api/users?limit=5&nationality=Egypt` returns **200** and only users whose profile nationality contains "Egypt" (or matches your chosen rule). Same for `nationalities[]=Egypt&nationalities[]=Lebanon` (users matching any of the two).

---

## 5. Order of implementation

| Order | Task | Rationale |
|-------|------|------------|
| 1 | Fix 500 on `skills[]` / `skills` (parse + safe handling) | Unblocks All Members when Skills filter is used. |
| 2 | Implement skills filtering (by name or ID) | Completes Skills feature. |
| 3 | Apply gender filter in GET /api/users | Small change, high impact. |
| 4 | Apply nationality + nationalities[] filter | Same handler, similar pattern to gender. |

---

## 6. Verification (curl)

Run these after each change. Base URL: `https://onecrew-backend-staging-309236356616.us-central1.run.app` (or your local backend).

```bash
BASE="https://onecrew-backend-staging-309236356616.us-central1.run.app"

# 1. Search (should still work)
curl -s "$BASE/api/users?limit=3&q=test" | jq '.success, (.data | length)'

# 2. Location (should still work)
curl -s "$BASE/api/users?limit=3&location=Cairo" | jq '.success, (.data | length), [.data[].location_text]'

# 3. Gender (after fix: only female)
curl -s "$BASE/api/users?limit=5&gender=female" | jq '.success, [.data[].user_details.gender]'

# 4. Nationality (after fix: only Egypt or matching)
curl -s "$BASE/api/users?limit=5&nationality=Egypt" | jq '.success, [.data[].user_details.nationality]'

# 5. Skills (after fix: 200 and only users with Acting)
curl -s "$BASE/api/users?limit=5&skills[]=Acting" | jq '.success, .error, (.data | length)'
```

If you don’t have `jq`, check `curl -s "..."` and inspect `success`, `data`, and `error` in the JSON by hand.

---

## 7. Summary

- **No backend change needed for:** `q` (search), `location`.
- **Backend changes required:**
  1. **Skills:** Fix 500 when `skills`/`skills[]` is present; then implement filtering by skill (name or ID).
  2. **Gender:** Apply `gender` to the users query (e.g. `user_details.gender`).
  3. **Nationality:** Apply `nationality` and `nationalities[]` to the users query (e.g. `user_details.nationality`).

After these are implemented and the curl checks pass, the All Members section will work with smart search and all four filters (Gender, Nationality, Location, Skills) without frontend changes.

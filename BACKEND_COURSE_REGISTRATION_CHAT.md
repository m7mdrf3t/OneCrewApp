# Backend Requirements: Course Registration Chat and Notifications

This document describes the backend changes required so that when a user registers for an academy course, the academy receives a notification and a chat message with the registration details, and registration counts are correct everywhere.

**Staging base URL:** `https://onecrew-backend-staging-309236356616.us-central1.run.app` (or your backend base URL)

---

## 1. Summary

The app now performs **normal course registration** when the user taps "Register Now": it calls the existing course registration endpoint and shows a success message; the user does not open chat. The backend must:

1. **On successful course registration:** Ensure a conversation (channel) exists between the registering user and the academy (company); send a message in that channel with the registration details; optionally send a push notification to the academy.
2. **In GET course and GET academy courses responses:** Include `registration_count` (number of registered users) and, when applicable, `is_registered` (whether the current user is registered) so the app can show correct counts and status.

No new public endpoints are required; extend the existing registration and course GET behavior as described below.

---

## 2. Trigger: When a user registers for a course

**Trigger:** The existing endpoint that creates a course registration (e.g. **POST** register current user for a course). After the registration record is successfully created and before returning 200 to the client:

### 2.1 Conversation / channel

- Ensure a conversation (channel) exists between the **registering user** and the **academy (company)** that owns the course.
- Use the same conversation ID / channel semantics as your existing chat (e.g. user–company 1:1). If the app uses a backend endpoint to create conversations, call that logic or create the channel server-side so both the user and the company are members.

### 2.2 Send a message in that channel

- Send a message (e.g. via Stream Chat server-side) **in that conversation**, containing the registration details.
- **Plain text body** (example):  
  `"Course registration request – Course: [course title], Registered by: [user name], [optional: user email or id]."`
- **Optional custom data** for the app to display a rich registration card:
  - `course_id`, `course_title`, `user_id`, `user_name`, `registered_at`
- The message must appear in the **academy’s** chat (the same channel the academy sees when they open the conversation with that user). The user will also see this conversation and the message; the app treats it as informational (the user already sees "Registration successful" on the course screen).

### 2.3 Notification

- Send a push (or in-app) notification to the **academy** (company profile / company members who manage courses) so they are notified of the new registration.
- Example content: **"New registration for [Course title]: [User name]."**

---

## 3. Registration count and user status

### 3.1 GET course (by id) and GET academy courses (list)

Responses must include:

| Field               | Type    | Description |
|---------------------|---------|-------------|
| `registration_count`| number  | Number of registered users for that course. Must reflect the actual count so the academy sees correct "X registered" in Course Registrations and elsewhere. |
| `is_registered`     | boolean | (When the request is in a user context) Whether the current user is registered for that course. So the course detail screen shows "Registered" and the correct button state. |

- Ensure that **after a successful registration**, the next GET for that course returns updated `registration_count` and, for the registering user, `is_registered: true`.

### 3.2 Cache / freshness (optional)

- If the backend uses any cache for course or academy-course responses, invalidate or update it when a registration is created (or use a short TTL) so the academy and user see updated counts quickly.

---

## 4. Flow summary

```mermaid
sequenceDiagram
  participant User
  participant App
  participant Backend
  participant StreamChat
  participant Academy

  User->>App: Press Register Now
  App->>Backend: POST register for course
  Backend->>Backend: Create registration record
  Backend->>StreamChat: Ensure user-academy channel, send message with registration details
  StreamChat->>Academy: New message + optional push
  Backend->>App: 200 + updated course/registration_count
  App->>App: loadCourse() -> getCourseById
  App->>User: Alert success; UI shows Registered, updated count
```

---

## 5. Implementation checklist

| # | Task | Done |
|---|------|------|
| 1 | In the course registration (POST) handler, after creating the registration record, ensure a conversation exists between the registering user and the academy (company). | Yes |
| 2 | Send a message in that channel with registration details (text + optional custom data: course_id, course_title, user_id, user_name, registered_at). | Yes |
| 3 | Send a push (or in-app) notification to the academy: e.g. "New registration for [Course title]: [User name]." | Yes |
| 4 | Ensure GET course (by id) and GET academy courses include `registration_count` (actual count) and, for user context, `is_registered`. | Yes |
| 5 | Invalidate or refresh any cached course/academy-course responses when a registration is created (or use short TTL). | N/A (no cache) |

---

## 6. Backend implementation complete

The backend has been updated as follows:

- **CourseService.registerUser** (self-registration) and **CourseService.registerUserByAdmin** (admin registration): after creating the registration, they call `StreamChatService.createConversation` (user–academy channel), then `StreamChatService.sendMessage` with the registration text and custom_data, then bulk push to company owners/admins. Failures are logged only and do not affect the registration response.
- **StreamChatService.sendMessage** supports optional `custom_data` on the message (e.g. course_id, course_title, user_id, user_name, registered_at).
- GET course and GET academy courses already use `enrichCourseWithDetails` for `registration_count` and `is_registered`; no course response caching was found.

---

## 7. App behavior (reference)

- **Register Now does not open chat.** The app no longer navigates to the academy chat when the user taps "Register Now". The in-app auto-send of a registration message from ChatPage has been removed; the backend sends the message and notification instead.
- **User:** Taps "Register Now" → app calls `registerForCourse(courseId)` only → on success shows "You have been registered for this course" and refetches the course so UI shows registered state and updated count. No chat screen is opened.
- **Academy:** Sees "X registered" in Course Registrations modal and elsewhere from `course.registration_count` returned by GET academy courses / GET course. Receives the new message and push when a user registers (backend sends both).
- If "Register Now" still opens a chat on your device, ensure you are on the latest app build (e.g. rebuild or clear Metro cache and reload); the only code path for Register Now in this repo is API registration + success alert + loadCourse.

# Agenda Backend Service

A separate microservice for handling agenda/calendar functionality, connected to the main OneCrew backend.

## Architecture

- **Separate Service**: Independent from main backend but connected
- **Database**: Supabase (real-time database)
- **Authentication**: JWT tokens from main backend
- **Communication**: HTTP REST API

## Project Structure

```
agenda-backend-service/
├── src/
│   ├── routes/
│   │   ├── events.ts              # Event CRUD endpoints
│   │   ├── booking-requests.ts    # Booking request endpoints
│   │   └── attendees.ts           # Attendee management
│   ├── services/
│   │   ├── MainBackendService.ts  # Service to connect to main backend
│   │   ├── SupabaseService.ts     # Supabase integration
│   │   └── AgendaService.ts       # Business logic
│   ├── models/
│   │   ├── Event.ts
│   │   └── BookingRequest.ts
│   ├── middleware/
│   │   └── auth.ts                # JWT validation
│   └── config/
│       ├── database.ts
│       └── mainBackend.ts
├── package.json
└── README.md
```

## API Endpoints

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:eventId` - Get single event
- `PUT /api/events/:eventId` - Update event
- `DELETE /api/events/:eventId` - Delete event

### Booking Requests
- `GET /api/booking-requests` - List booking requests
- `POST /api/booking-requests` - Create booking request
- `GET /api/booking-requests/:requestId` - Get single booking request
- `PUT /api/booking-requests/:requestId/respond` - Respond to booking request
- `DELETE /api/booking-requests/:requestId` - Cancel booking request

### Attendees
- `GET /api/events/:eventId/attendees` - Get event attendees
- `POST /api/events/:eventId/attendees` - Add attendee to event
- `PUT /api/events/:eventId/attendees/:attendeeId` - Update attendee status
- `DELETE /api/events/:eventId/attendees/:attendeeId` - Remove attendee

## Environment Variables

```env
PORT=3001
MAIN_BACKEND_URL=https://onecrew-backend-309236356616.us-central1.run.app
SUPABASE_URL=https://uwdzkrferlogqasrxcve.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret (same as main backend)
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Supabase**
   - Run the SQL schema from `../agenda-backend-schema.sql` in Supabase SQL editor
   - Get your Supabase URL and service role key

3. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Fill in all required environment variables

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## Main Backend Integration

The agenda service connects to the main backend for:
- User validation and details
- Project information
- Team member lists
- Authentication token validation

## Database Schema

See `../agenda-backend-schema.sql` for the complete Supabase schema.

## Authentication

The service validates JWT tokens from the main backend. The token should be passed in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Real-time Updates

Supabase real-time subscriptions are used for live updates. The frontend subscribes to:
- `agenda_events` table changes
- `booking_requests` table changes

## Deployment

The service can be deployed to:
- Google Cloud Run (recommended, same as main backend)
- AWS Lambda
- Heroku
- Any Node.js hosting platform

## API Documentation

Full API documentation will be available at `/api/docs` when the service is running.


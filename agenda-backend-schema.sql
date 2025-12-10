-- =====================================================
-- Agenda Backend Service - Supabase Database Schema
-- =====================================================
-- 
-- This SQL file contains the database schema for the
-- agenda/calendar feature. Run this in your Supabase
-- SQL editor to set up the tables.
--
-- The agenda backend service will use these tables
-- for storing events, attendees, and booking requests.
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- AGENDA EVENTS TABLE
-- =====================================================
-- Stores calendar events/appointments
CREATE TABLE IF NOT EXISTS agenda_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References main backend users (not a foreign key since it's in different DB)
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  event_type TEXT DEFAULT 'work' CHECK (event_type IN ('work', 'personal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- AGENDA EVENT ATTENDEES TABLE
-- =====================================================
-- Many-to-many relationship between events and users
CREATE TABLE IF NOT EXISTS agenda_event_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References main backend users
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id) -- Prevent duplicate attendees
);

-- =====================================================
-- BOOKING REQUESTS TABLE
-- =====================================================
-- Stores booking/availability requests between users
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL, -- References main backend users
  target_user_id UUID NOT NULL, -- References main backend users
  project_id UUID, -- References main backend projects (optional)
  requested_date DATE NOT NULL,
  requested_start_time TIME,
  requested_end_time TIME,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'suggested_edit')),
  suggested_date DATE, -- If status is 'suggested_edit'
  suggested_start_time TIME,
  suggested_end_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Agenda Events Indexes
CREATE INDEX IF NOT EXISTS idx_agenda_events_user_id ON agenda_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_events_start_time ON agenda_events(start_time);
CREATE INDEX IF NOT EXISTS idx_agenda_events_status ON agenda_events(status);
CREATE INDEX IF NOT EXISTS idx_agenda_events_event_type ON agenda_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agenda_events_date_range ON agenda_events(start_time, end_time);

-- Agenda Event Attendees Indexes
CREATE INDEX IF NOT EXISTS idx_agenda_event_attendees_event_id ON agenda_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_agenda_event_attendees_user_id ON agenda_event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_event_attendees_status ON agenda_event_attendees(status);

-- Booking Requests Indexes
CREATE INDEX IF NOT EXISTS idx_booking_requests_target_user_id ON booking_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_requester_id ON booking_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_requested_date ON booking_requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_booking_requests_project_id ON booking_requests(project_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for agenda_events
CREATE TRIGGER update_agenda_events_updated_at
  BEFORE UPDATE ON agenda_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for booking_requests
CREATE TRIGGER update_booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own events or events they're attending
CREATE POLICY "Users can view their own events"
  ON agenda_events FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view events they're attending"
  ON agenda_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agenda_event_attendees
      WHERE agenda_event_attendees.event_id = agenda_events.id
      AND agenda_event_attendees.user_id::text = auth.uid()::text
    )
  );

-- Policy: Users can create their own events
CREATE POLICY "Users can create their own events"
  ON agenda_events FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can update their own events
CREATE POLICY "Users can update their own events"
  ON agenda_events FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete their own events"
  ON agenda_events FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Policy: Users can view attendees of events they own or attend
CREATE POLICY "Users can view attendees of their events"
  ON agenda_event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agenda_events
      WHERE agenda_events.id = agenda_event_attendees.event_id
      AND (agenda_events.user_id::text = auth.uid()::text
        OR agenda_event_attendees.user_id::text = auth.uid()::text)
    )
  );

-- Policy: Event owners can add attendees
CREATE POLICY "Event owners can add attendees"
  ON agenda_event_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agenda_events
      WHERE agenda_events.id = agenda_event_attendees.event_id
      AND agenda_events.user_id::text = auth.uid()::text
    )
  );

-- Policy: Event owners can update attendee status
CREATE POLICY "Event owners can update attendees"
  ON agenda_event_attendees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agenda_events
      WHERE agenda_events.id = agenda_event_attendees.event_id
      AND agenda_events.user_id::text = auth.uid()::text
    )
  );

-- Policy: Event owners can remove attendees
CREATE POLICY "Event owners can remove attendees"
  ON agenda_event_attendees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agenda_events
      WHERE agenda_events.id = agenda_event_attendees.event_id
      AND agenda_events.user_id::text = auth.uid()::text
    )
  );

-- Policy: Users can view booking requests where they are requester or target
CREATE POLICY "Users can view their booking requests"
  ON booking_requests FOR SELECT
  USING (
    requester_id::text = auth.uid()::text
    OR target_user_id::text = auth.uid()::text
  );

-- Policy: Users can create booking requests
CREATE POLICY "Users can create booking requests"
  ON booking_requests FOR INSERT
  WITH CHECK (requester_id::text = auth.uid()::text);

-- Policy: Target users can respond to booking requests
CREATE POLICY "Target users can respond to booking requests"
  ON booking_requests FOR UPDATE
  USING (target_user_id::text = auth.uid()::text);

-- Policy: Requesters can cancel their booking requests
CREATE POLICY "Requesters can cancel booking requests"
  ON booking_requests FOR DELETE
  USING (requester_id::text = auth.uid()::text);

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- 1. The user_id, requester_id, target_user_id, and project_id
--    fields reference IDs from the main backend, not foreign keys
--    since they're in different databases.
--
-- 2. The agenda backend service will validate these IDs by
--    calling the main backend API.
--
-- 3. RLS policies use auth.uid() which requires Supabase Auth.
--    If using JWT tokens from the main backend, you may need
--    to adjust the RLS policies or use service role key.
--
-- 4. For production, consider adding:
--    - Soft delete (deleted_at column)
--    - Audit logging
--    - Rate limiting
--    - Data retention policies
-- =====================================================


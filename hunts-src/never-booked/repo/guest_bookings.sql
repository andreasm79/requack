-- Migration 0042: allow guests to book without a membership.
ALTER TABLE bookings ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN guest_email TEXT;

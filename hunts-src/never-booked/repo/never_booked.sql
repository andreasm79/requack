-- Members who have never booked an event, for the re-engagement email.
SELECT m.id, m.name, m.email
FROM members m
!!WHERE m.id NOT IN (SELECT b.member_id FROM bookings b)
ORDER BY m.joined_at;

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, googleCalendarUrl, parseTime } from '../js/core/reminder.js';

const options = { dateKey: '2026-11-23', hour: 23, minute: 50, url: 'https://andreasm79.github.io/requack/', now: new Date(Date.UTC(2026, 10, 22, 12, 0, 0)) };

test('ics is a daily floating-time event with CRLF lines', () => {
  const ics = buildIcs(options);
  assert.ok(ics.includes('\r\n'));
  assert.ok(ics.includes('DTSTART:20261123T235000'));
  assert.ok(ics.includes('DTEND:20261124T000500'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY'));
  assert.ok(ics.includes('DTSTAMP:20261122T120000Z'));
  assert.ok(ics.includes('DESCRIPTION:Open reQuack and run your due recalls.\\nhttps://andreasm79.github.io/requack/'));
  assert.equal(ics.split('BEGIN:').length - 1, 3);
});

test('google calendar link repeats daily in the given time zone', () => {
  const link = new URL(googleCalendarUrl({ ...options, timeZone: 'Europe/Dublin' }));
  assert.equal(link.hostname, 'calendar.google.com');
  assert.equal(link.searchParams.get('recur'), 'RRULE:FREQ=DAILY');
  assert.equal(link.searchParams.get('ctz'), 'Europe/Dublin');
  assert.equal(link.searchParams.get('dates'), '20261123T235000/20261124T000500');
});

test('parseTime accepts HH:MM only', () => {
  assert.deepEqual(parseTime('07:05'), { hour: 7, minute: 5 });
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('7pm'), null);
});

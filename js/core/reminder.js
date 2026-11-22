import { addDays } from './dates.js';

const TITLE = 'Requack: 15 minutes of recalls';
const LENGTH_MINUTES = 15;

function pad(n) {
  return String(n).padStart(2, '0');
}

function stamp(dateKey, hour, minute) {
  return `${dateKey.replace(/-/g, '')}T${pad(hour)}${pad(minute)}00`;
}

function endStamp(dateKey, hour, minute) {
  const total = hour * 60 + minute + LENGTH_MINUTES;
  const day = total >= 24 * 60 ? addDays(dateKey, 1) : dateKey;
  return stamp(day, Math.floor(total / 60) % 24, total % 60);
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(value) {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

export function buildIcs({ dateKey, hour, minute, url, now = new Date() }) {
  const description = escapeText(`Open Requack and run your due recalls.\n${url}`);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Requack//Daily reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:requack-daily-${utcStamp(now)}@requack`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${stamp(dateKey, hour, minute)}`,
    `DTEND:${endStamp(dateKey, hour, minute)}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText(TITLE)}`,
    `DESCRIPTION:${description}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0M',
    `DESCRIPTION:${escapeText(TITLE)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function googleCalendarUrl({ dateKey, hour, minute, url, timeZone }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: TITLE,
    details: `Open Requack and run your due recalls.\n${url}`,
    dates: `${stamp(dateKey, hour, minute)}/${endStamp(dateKey, hour, minute)}`,
    recur: 'RRULE:FREQ=DAILY',
  });
  if (timeZone) params.set('ctz', timeZone);
  return `https://calendar.google.com/calendar/render?${params}`;
}

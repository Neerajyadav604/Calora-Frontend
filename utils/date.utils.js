const DEFAULT_TIME_ZONE =
  process.env.EXPO_PUBLIC_APP_TIME_ZONE ||
  process.env.EXPO_PUBLIC_TIME_ZONE ||
  'Asia/Kolkata';

const dateFormatterCache = new Map();
const offsetFormatterCache = new Map();

const normalizeInputDate = (input = new Date()) => {
  if (input instanceof Date) {
    return input;
  }

  if (typeof input === 'string') {
    const dateOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

const getDateFormatter = (timeZone = DEFAULT_TIME_ZONE) => {
  if (!dateFormatterCache.has(timeZone)) {
    dateFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    );
  }

  return dateFormatterCache.get(timeZone);
};

const getOffsetFormatter = (timeZone = DEFAULT_TIME_ZONE) => {
  if (!offsetFormatterCache.has(timeZone)) {
    offsetFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'shortOffset',
      })
    );
  }

  return offsetFormatterCache.get(timeZone);
};

const getZonedDateParts = (date, timeZone = DEFAULT_TIME_ZONE) => {
  const parts = getDateFormatter(timeZone).formatToParts(normalizeInputDate(date));
  const values = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
};

const formatDate = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
};

const getCurrentDateKey = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) =>
  formatDate(date, timeZone);

const getTodayDate = (timeZone = DEFAULT_TIME_ZONE) => getCurrentDateKey(new Date(), timeZone);

const getTimeZoneOffsetMinutes = (date, timeZone = DEFAULT_TIME_ZONE) => {
  const parts = getOffsetFormatter(timeZone).formatToParts(normalizeInputDate(date));
  const zoneName = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT+00:00';
  const match = zoneName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);

  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
};

const getStartOfDay = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  const baseUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  const firstOffset = getTimeZoneOffsetMinutes(baseUtc, timeZone);
  let utcInstant = baseUtc - firstOffset * 60 * 1000;
  const secondOffset = getTimeZoneOffsetMinutes(utcInstant, timeZone);

  if (secondOffset !== firstOffset) {
    utcInstant = baseUtc - secondOffset * 60 * 1000;
  }

  return new Date(utcInstant);
};

const getEndOfDay = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const start = getStartOfDay(date, timeZone);
  return new Date(start.getTime() + (24 * 60 * 60 * 1000) - 1);
};

const isSameDay = (left, right = new Date(), timeZone = DEFAULT_TIME_ZONE) =>
  getCurrentDateKey(left, timeZone) === getCurrentDateKey(right, timeZone);

const addDays = (date, days = 1) => {
  const copy = normalizeInputDate(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const formatFriendlyDate = (date, { timeZone = DEFAULT_TIME_ZONE, locale = 'en-US' } = {}) => {
  const input = normalizeInputDate(date);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(input);
};

const formatTime = (date, { timeZone = DEFAULT_TIME_ZONE, locale = 'en-US' } = {}) => {
  const input = normalizeInputDate(date);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(input);
};

const getTomorrowKey = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) =>
  getCurrentDateKey(addDays(getStartOfDay(date, timeZone), 1), timeZone);

module.exports = {
  DEFAULT_TIME_ZONE,
  formatDate,
  getTodayDate,
  getCurrentDateKey,
  isSameDay,
  getStartOfDay,
  getEndOfDay,
  addDays,
  formatFriendlyDate,
  formatTime,
  getTomorrowKey,
  normalizeInputDate,
};

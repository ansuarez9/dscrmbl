import { afterEach, expect, it, vi } from 'vitest';
import { getDailyNumber, getTimeUntilNextDay } from './seededRandom';
import { localDateKey, storedDateKey } from './localDate';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it('uses calendar days for numbering across both daylight-saving changes', () => {
  vi.stubEnv('TZ', 'America/New_York');
  expect(getDailyNumber('2026-03-09') - getDailyNumber('2026-03-08')).toBe(1);
  expect(getDailyNumber('2026-11-02') - getDailyNumber('2026-11-01')).toBe(1);
  expect(storedDateKey('Mon Oct 26 2026')).toBe('2026-10-26');
});

it('counts down to the next local midnight on 23-hour and 25-hour days', () => {
  vi.stubEnv('TZ', 'America/New_York');
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 8, 0));
  expect(localDateKey()).toBe('2026-03-08');
  expect(getTimeUntilNextDay().hours).toBe(23);
  vi.setSystemTime(new Date(2026, 10, 1, 0));
  expect(localDateKey()).toBe('2026-11-01');
  expect(getTimeUntilNextDay().hours).toBe(25);
});

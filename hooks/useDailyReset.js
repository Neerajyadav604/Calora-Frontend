import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { DEFAULT_TIME_ZONE, addDays, getCurrentDateKey, getStartOfDay } from '../utils/date.utils';

const getDelayUntilNextReset = (timeZone = DEFAULT_TIME_ZONE) => {
  const now = new Date();
  const midnight = addDays(getStartOfDay(now, timeZone), 1);
  const delay = midnight.getTime() - now.getTime();
  return Math.max(delay, 1000);
};

export default function useDailyReset({ enabled = true, onDateChange } = {}) {
  const [currentDateKey, setCurrentDateKey] = useState(() => getCurrentDateKey());
  const [resetTick, setResetTick] = useState(0);
  const dateRef = useRef(currentDateKey);
  const callbackRef = useRef(onDateChange);
  const timerRef = useRef(null);

  useEffect(() => {
    callbackRef.current = onDateChange;
  }, [onDateChange]);

  const syncDate = () => {
    const nextDateKey = getCurrentDateKey();

    if (dateRef.current !== nextDateKey) {
      dateRef.current = nextDateKey;
      setCurrentDateKey(nextDateKey);
      setResetTick((value) => value + 1);
      callbackRef.current?.(nextDateKey);
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    syncDate();

    const schedule = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        syncDate();
        schedule();
      }, getDelayUntilNextReset());
    };

    schedule();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncDate();
        schedule();
      }
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      appStateSubscription.remove();
    };
  }, [enabled]);

  return useMemo(() => ({
    currentDateKey,
    isToday: currentDateKey === getCurrentDateKey(),
    resetTick,
    forceSync: syncDate,
  }), [currentDateKey, resetTick]);
}

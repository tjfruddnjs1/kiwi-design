/**
 * Simple debounce utility for API call optimization
 */

type AnyFunction = (...args: any[]) => any;

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends AnyFunction>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 * Unlike debounce, throttle guarantees the function will be called at regular intervals.
 */
export function throttle<T extends AnyFunction>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastTime >= wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastTime = now;
      func.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(
        () => {
          lastTime = Date.now();
          func.apply(this, args);
          timeoutId = null;
        },
        wait - (now - lastTime)
      );
    }
  };
}

/**
 * Creates a function that can only be called once per wait period.
 * Returns cached result during the cooldown period.
 */
export function createDedupedFetch<T extends AnyFunction>(
  func: T,
  wait: number = 1000
): T {
  let lastCallTime = 0;
  let cachedPromise: ReturnType<T> | null = null;
  let isRunning = false;

  return async function (
    this: unknown,
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> {
    const now = Date.now();

    // If a call is in progress, return the existing promise
    if (isRunning && cachedPromise) {
      return cachedPromise;
    }

    // If within cooldown period, return cached promise
    if (now - lastCallTime < wait && cachedPromise) {
      return cachedPromise;
    }

    isRunning = true;
    lastCallTime = now;
    cachedPromise = func.apply(this, args);

    try {
      const result = await cachedPromise;
      return result;
    } finally {
      isRunning = false;
    }
  } as T;
}

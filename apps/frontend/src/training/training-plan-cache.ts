import type { MonthlyTrainingPlanState } from './training-plan.js';

export const trainingPlanCacheTtlMs = 5 * 60 * 1000;

const trainingPlanCacheKeyPrefix = 'funcione-training-plan-cache:';

type CachedTrainingPlanState = {
  cachedAt: number;
  state: MonthlyTrainingPlanState;
};

export function getTrainingPlanCacheKey(userId: string) {
  return `${trainingPlanCacheKeyPrefix}${userId}`;
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function clearCachedTrainingPlanState(userId: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(getTrainingPlanCacheKey(userId));
  } catch {
    // Storage access can fail in restricted browser contexts.
  }
}

export function readCachedTrainingPlanState(
  userId: string,
  now = Date.now(),
): MonthlyTrainingPlanState | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const storedCache = window.localStorage.getItem(
      getTrainingPlanCacheKey(userId),
    );

    if (!storedCache) {
      return null;
    }

    const cache = JSON.parse(storedCache) as Partial<CachedTrainingPlanState>;

    if (typeof cache.cachedAt !== 'number' || !cache.state) {
      clearCachedTrainingPlanState(userId);
      return null;
    }

    if (now - cache.cachedAt > trainingPlanCacheTtlMs) {
      clearCachedTrainingPlanState(userId);
      return null;
    }

    return cache.state;
  } catch {
    clearCachedTrainingPlanState(userId);
    return null;
  }
}

export function writeCachedTrainingPlanState(
  userId: string,
  state: MonthlyTrainingPlanState,
  now = Date.now(),
) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      getTrainingPlanCacheKey(userId),
      JSON.stringify({ cachedAt: now, state } satisfies CachedTrainingPlanState),
    );
  } catch {
    // Ignore quota or privacy-mode failures; the live request state still works.
  }
}

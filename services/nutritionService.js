import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import {
  DEFAULT_TIME_ZONE,
  addDays,
  formatFriendlyDate,
  formatTime,
  getCurrentDateKey,
  getTomorrowKey,
  isSameDay,
} from '../utils/date.utils';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://192.168.1.53:5000/api/v1';

const CACHE_PREFIX = '@calora:nutrition:v2';
const HISTORY_CACHE_PREFIX = '@calora:nutrition:history:v2';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
const TOTAL_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'water'];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clone = (value) => JSON.parse(JSON.stringify(value ?? null));

const getCacheKey = (uid, dateKey) => `${CACHE_PREFIX}:${uid}:${dateKey}`;
const getHistoryCacheKey = (uid, cacheKey) => `${HISTORY_CACHE_PREFIX}:${uid}:${cacheKey}`;

const createEmptyNutrition = (uid, dateKey = getCurrentDateKey()) => ({
  id: null,
  userId: uid || null,
  date: dateKey,
  totals: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    water: 0,
  },
  meals: {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  },
  micronutrients: {},
  meta: {
    foodItemCount: 0,
    updatedAt: null,
    createdAt: null,
  },
  mealEntries: [],
});

const normalizeMicronutrients = (value) => {
  if (!value) return {};

  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  return { ...value };
};

const normalizeFoodEntry = (entry = {}, mealType = 'breakfast') => {
  const timestamp = entry.timestamp || entry.loggedAt || new Date().toISOString();
  return {
    id: String(entry.id || entry._id || `${mealType}-${timestamp}`),
    foodId: entry.foodId ? String(entry.foodId) : null,
    name: entry.name || 'Food',
    quantity: toNumber(entry.quantity, toNumber(entry.grams, 0)),
    calories: toNumber(entry.calories, 0),
    protein: toNumber(entry.protein, 0),
    carbs: toNumber(entry.carbs, 0),
    fat: toNumber(entry.fat, 0),
    fiber: toNumber(entry.fiber, 0),
    sugar: toNumber(entry.sugar, 0),
    sodium: toNumber(entry.sodium, 0),
    water: toNumber(entry.water, 0),
    timestamp,
    mealType,
  };
};

const normalizeMealGroups = (meals = {}) => {
  const grouped = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  };

  for (const mealType of MEAL_TYPES) {
    const items = Array.isArray(meals[mealType]) ? meals[mealType] : [];
    grouped[mealType] = items.map((item) => normalizeFoodEntry(item, mealType));
  }

  return grouped;
};

const flattenMeals = (mealGroups = {}) =>
  MEAL_TYPES.flatMap((mealType) =>
    (mealGroups[mealType] || []).map((item) => ({
      ...item,
      mealType,
    }))
  );

const normalizeNutrition = (payload = {}, uid, fallbackDateKey = getCurrentDateKey()) => {
  const totals = payload.totals || payload;
  const meals = payload.meals || {};
  const mealGroups = normalizeMealGroups(meals);
  const mealEntries = flattenMeals(mealGroups).sort((left, right) => {
    const leftTime = new Date(left.timestamp).getTime();
    const rightTime = new Date(right.timestamp).getTime();
    return rightTime - leftTime;
  });

  return {
    id: payload.id || payload._id || null,
    userId: payload.userId || payload.uid || uid || null,
    date: payload.date || fallbackDateKey,
    totals: {
      calories: toNumber(totals.calories, 0),
      protein: toNumber(totals.protein, 0),
      carbs: toNumber(totals.carbs, 0),
      fat: toNumber(totals.fat, 0),
      fiber: toNumber(totals.fiber, 0),
      sugar: toNumber(totals.sugar, 0),
      sodium: toNumber(totals.sodium, 0),
      water: toNumber(totals.water, 0),
    },
    meals: mealGroups,
    micronutrients: normalizeMicronutrients(payload.micronutrients),
    meta: {
      foodItemCount:
        payload.meta?.foodItemCount ??
        mealEntries.length,
      updatedAt: payload.meta?.updatedAt || payload.updatedAt || null,
      createdAt: payload.meta?.createdAt || payload.createdAt || null,
    },
    mealEntries,
  };
};

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  return query.toString() ? `?${query.toString()}` : '';
};

const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to access nutrition data.');
  }

  return user.getIdToken();
};

const requestJson = async (endpoint, { method = 'GET', body = null, token } = {}) => {
  const headers = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};

const readCache = async (uid, dateKey) => {
  try {
    const raw = await AsyncStorage.getItem(getCacheKey(uid, dateKey));
    return raw ? normalizeNutrition(JSON.parse(raw), uid, dateKey) : null;
  } catch (_) {
    return null;
  }
};

const writeCache = async (uid, dateKey, nutrition) => {
  try {
    await AsyncStorage.setItem(getCacheKey(uid, dateKey), JSON.stringify(nutrition));
  } catch (_) {
    // Cache should never block the user flow.
  }
};

const readHistoryCache = async (uid, cacheKey) => {
  try {
    const raw = await AsyncStorage.getItem(getHistoryCacheKey(uid, cacheKey));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

const writeHistoryCache = async (uid, cacheKey, history) => {
  try {
    await AsyncStorage.setItem(getHistoryCacheKey(uid, cacheKey), JSON.stringify(history));
  } catch (_) {
    // ignore cache failures
  }
};

const withOptimisticCache = async (uid, dateKey, updateFn, requestFn) => {
  const previous = await readCache(uid, dateKey);
  const baseline = previous || createEmptyNutrition(uid, dateKey);
  const optimistic = normalizeNutrition(updateFn(clone(baseline)) || baseline, uid, dateKey);

  await writeCache(uid, dateKey, optimistic);

  try {
    const response = await requestFn();
    const serverNutrition = normalizeNutrition(response?.data || response || {}, uid, dateKey);
    await writeCache(uid, dateKey, serverNutrition);
    return serverNutrition;
  } catch (error) {
    if (previous) {
      await writeCache(uid, dateKey, previous);
    }
    throw error;
  }
};

export const getTodayNutrition = async (uid, dateKey = getCurrentDateKey()) => {
  return getNutritionByDate(uid, dateKey);
};

export const getNutritionByDate = async (uid, dateKey) => {
  const token = await getAuthToken();
  const cache = await readCache(uid, dateKey);

  try {
    const endpoint = isSameDay(dateKey, getCurrentDateKey(), DEFAULT_TIME_ZONE)
      ? '/nutrition/today'
      : `/nutrition/date/${dateKey}`;
    const response = await requestJson(endpoint, { token });
    const nutrition = normalizeNutrition(response.data || {}, uid, dateKey);
    await writeCache(uid, dateKey, nutrition);
    return nutrition;
  } catch (error) {
    if (cache) {
      return cache;
    }
    throw error;
  }
};

export const getNutritionHistory = async (uid, options = {}) => {
  const token = await getAuthToken();
  const cacheKey = JSON.stringify(options || {});
  const cached = await readHistoryCache(uid, cacheKey);

  const query = buildQueryString({
    days: options.days,
    from: options.from,
    to: options.to,
    limit: options.limit,
    includeAnalytics: options.includeAnalytics ? 'true' : undefined,
  });

  try {
    const response = await requestJson(`/nutrition/history${query}`, { token });
    const payload = response.data || {};
    const logs = Array.isArray(payload.logs)
      ? payload.logs.map((entry) => normalizeNutrition(entry, uid, entry.date))
      : [];

    const normalized = {
      ...payload,
      logs,
    };

    await writeHistoryCache(uid, cacheKey, normalized);
    return normalized;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
};

export const addFood = async (uid, meal, dateKey = getCurrentDateKey()) => {
  const token = await getAuthToken();
  const mealType = String(meal.mealType || 'breakfast').toLowerCase();
  const normalizedMeal = {
    foodId: meal.foodId || null,
    name: meal.name || 'Food',
    quantity: toNumber(meal.quantity ?? meal.grams, 0),
    calories: toNumber(meal.calories, 0),
    protein: toNumber(meal.protein, 0),
    carbs: toNumber(meal.carbs, 0),
    fat: toNumber(meal.fat ?? meal.fats, 0),
    fiber: toNumber(meal.fiber, 0),
    sugar: toNumber(meal.sugar, 0),
    sodium: toNumber(meal.sodium, 0),
    water: toNumber(meal.water, 0),
    timestamp: meal.timestamp || new Date().toISOString(),
    mealType,
  };

  return withOptimisticCache(
    uid,
    dateKey,
    (current) => {
      const next = clone(current);
      next.meals[mealType] = [...(next.meals[mealType] || []), normalizedMeal];
      next.totals.calories += normalizedMeal.calories;
      next.totals.protein += normalizedMeal.protein;
      next.totals.carbs += normalizedMeal.carbs;
      next.totals.fat += normalizedMeal.fat;
      next.totals.fiber += normalizedMeal.fiber;
      next.totals.sugar += normalizedMeal.sugar;
      next.totals.sodium += normalizedMeal.sodium;
      next.totals.water += normalizedMeal.water;
      next.meta.foodItemCount += 1;
      next.mealEntries = flattenMeals(next.meals);
      return next;
    },
    () => requestJson('/nutrition/add-food', {
      method: 'POST',
      token,
      body: {
        date: dateKey,
        ...normalizedMeal,
      },
    })
  );
};

export const removeFood = async (uid, mealId, dateKey = getCurrentDateKey()) => {
  const token = await getAuthToken();

  return withOptimisticCache(
    uid,
    dateKey,
    (current) => {
      const next = clone(current);
      let removed = null;

      for (const mealType of MEAL_TYPES) {
        const index = next.meals[mealType].findIndex((item) => String(item.id) === String(mealId));
        if (index !== -1) {
          [removed] = next.meals[mealType].splice(index, 1);
          break;
        }
      }

      if (!removed) {
        return next;
      }

      next.totals.calories = Math.max(0, next.totals.calories - toNumber(removed.calories, 0));
      next.totals.protein = Math.max(0, next.totals.protein - toNumber(removed.protein, 0));
      next.totals.carbs = Math.max(0, next.totals.carbs - toNumber(removed.carbs, 0));
      next.totals.fat = Math.max(0, next.totals.fat - toNumber(removed.fat, 0));
      next.totals.fiber = Math.max(0, next.totals.fiber - toNumber(removed.fiber, 0));
      next.totals.sugar = Math.max(0, next.totals.sugar - toNumber(removed.sugar, 0));
      next.totals.sodium = Math.max(0, next.totals.sodium - toNumber(removed.sodium, 0));
      next.totals.water = Math.max(0, next.totals.water - toNumber(removed.water, 0));
      next.meta.foodItemCount = Math.max(0, next.meta.foodItemCount - 1);
      next.mealEntries = flattenMeals(next.meals);
      return next;
    },
    () => requestJson(`/nutrition/food/${mealId}${buildQueryString({ date: dateKey })}`, {
      method: 'DELETE',
      token,
    })
  );
};

export const updateWater = async (uid, water, dateKey = getCurrentDateKey()) => {
  const token = await getAuthToken();
  const amount = toNumber(water, 0);

  return withOptimisticCache(
    uid,
    dateKey,
    (current) => {
      const next = clone(current);
      next.totals.water = Math.max(0, next.totals.water + amount);
      return next;
    },
    () => requestJson('/nutrition/water', {
      method: 'POST',
      token,
      body: {
        date: dateKey,
        amount,
      },
    })
  );
};

export const nutritionService = {
  getTodayNutrition,
  getNutritionByDate,
  getNutritionHistory,
  addFood,
  removeFood,
  updateWater,
  formatFriendlyDate,
  formatTime,
  getTomorrowKey,
};

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDailyReset from './useDailyReset';
import { DEFAULT_TIME_ZONE, formatFriendlyDate, getCurrentDateKey } from '../utils/date.utils';
import {
  addFood as addFoodToService,
  getNutritionByDate,
  getTodayNutrition,
  removeFood as removeFoodFromService,
  updateWater as updateWaterInService,
} from '../services/nutritionService';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

const EMPTY_NUTRITION = {
  id: null,
  userId: null,
  date: getCurrentDateKey(),
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
};

const clone = (value) => JSON.parse(JSON.stringify(value ?? null));

const flattenMeals = (meals = {}) =>
  MEAL_TYPES.flatMap((mealType) =>
    (meals[mealType] || []).map((entry) => ({
      ...entry,
      mealType,
    }))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

const mergeNutrition = (current, next) => {
  const source = next || current || EMPTY_NUTRITION;
  const meals = {
    breakfast: source.meals?.breakfast || [],
    lunch: source.meals?.lunch || [],
    dinner: source.meals?.dinner || [],
    snacks: source.meals?.snacks || [],
  };

  return {
    ...EMPTY_NUTRITION,
    ...source,
    totals: {
      ...EMPTY_NUTRITION.totals,
      ...(source.totals || {}),
    },
    meals,
    micronutrients: source.micronutrients || {},
    meta: {
      ...EMPTY_NUTRITION.meta,
      ...(source.meta || {}),
    },
    mealEntries: source.mealEntries || flattenMeals(meals),
  };
};

const optimisticAddFood = (nutrition, meal) => {
  const mealType = String(meal.mealType || 'breakfast').toLowerCase();
  const foodEntry = {
    id: meal.id || `${Date.now()}`,
    foodId: meal.foodId || null,
    name: meal.name || 'Food',
    quantity: Number(meal.quantity ?? meal.grams ?? 0),
    calories: Number(meal.calories) || 0,
    protein: Number(meal.protein) || 0,
    carbs: Number(meal.carbs) || 0,
    fat: Number(meal.fat ?? meal.fats) || 0,
    fiber: Number(meal.fiber) || 0,
    sugar: Number(meal.sugar) || 0,
    sodium: Number(meal.sodium) || 0,
    water: Number(meal.water) || 0,
    timestamp: meal.timestamp || new Date().toISOString(),
    mealType,
  };

  const next = clone(nutrition || EMPTY_NUTRITION);
  next.meals[mealType] = [...(next.meals[mealType] || []), foodEntry];
  next.totals.calories += foodEntry.calories;
  next.totals.protein += foodEntry.protein;
  next.totals.carbs += foodEntry.carbs;
  next.totals.fat += foodEntry.fat;
  next.totals.fiber += foodEntry.fiber;
  next.totals.sugar += foodEntry.sugar;
  next.totals.sodium += foodEntry.sodium;
  next.totals.water += foodEntry.water;
  next.meta.foodItemCount += 1;
  next.mealEntries = flattenMeals(next.meals);
  return next;
};

const optimisticRemoveFood = (nutrition, mealId) => {
  const next = clone(nutrition || EMPTY_NUTRITION);
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

  next.totals.calories = Math.max(0, next.totals.calories - (Number(removed.calories) || 0));
  next.totals.protein = Math.max(0, next.totals.protein - (Number(removed.protein) || 0));
  next.totals.carbs = Math.max(0, next.totals.carbs - (Number(removed.carbs) || 0));
  next.totals.fat = Math.max(0, next.totals.fat - (Number(removed.fat) || 0));
  next.totals.fiber = Math.max(0, next.totals.fiber - (Number(removed.fiber) || 0));
  next.totals.sugar = Math.max(0, next.totals.sugar - (Number(removed.sugar) || 0));
  next.totals.sodium = Math.max(0, next.totals.sodium - (Number(removed.sodium) || 0));
  next.totals.water = Math.max(0, next.totals.water - (Number(removed.water) || 0));
  next.meta.foodItemCount = Math.max(0, next.meta.foodItemCount - 1);
  next.mealEntries = flattenMeals(next.meals);
  return next;
};

const optimisticWater = (nutrition, amount) => {
  const next = clone(nutrition || EMPTY_NUTRITION);
  next.totals.water = Math.max(0, next.totals.water + (Number(amount) || 0));
  return next;
};

export default function useDailyNutrition({ userId, dateKey: controlledDateKey } = {}) {
  const { currentDateKey, resetTick, isToday } = useDailyReset({ enabled: !controlledDateKey });
  const activeDateKey = controlledDateKey || currentDateKey;
  const [nutrition, setNutrition] = useState(EMPTY_NUTRITION);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const snapshotRef = useRef(EMPTY_NUTRITION);

  const loadNutrition = useCallback(async ({ silent = false } = {}) => {
    if (!userId) {
      setNutrition(EMPTY_NUTRITION);
      setLoading(false);
      return;
    }

    setError(null);
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = activeDateKey === getCurrentDateKey()
        ? await getTodayNutrition(userId, activeDateKey)
        : await getNutritionByDate(userId, activeDateKey);
      const nextNutrition = mergeNutrition(snapshotRef.current, data);
      snapshotRef.current = nextNutrition;
      setNutrition(nextNutrition);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeDateKey, userId]);

  useEffect(() => {
    if (!userId) {
      setNutrition(EMPTY_NUTRITION);
      setLoading(false);
      return undefined;
    }

    const empty = EMPTY_NUTRITION;
    snapshotRef.current = empty;
    setNutrition(empty);
    loadNutrition();
  }, [activeDateKey, loadNutrition, resetTick, userId]);

  const refresh = useCallback(async () => {
    await loadNutrition({ silent: false });
  }, [loadNutrition]);

  const addFood = useCallback(async (meal) => {
    if (!userId) {
      throw new Error('User is not authenticated');
    }

    const previous = snapshotRef.current || nutrition || EMPTY_NUTRITION;
    const optimistic = optimisticAddFood(previous, meal);
    snapshotRef.current = optimistic;
    setNutrition(optimistic);

    try {
      const updated = await addFoodToService(userId, meal, activeDateKey);
      const normalized = mergeNutrition(optimistic, updated);
      snapshotRef.current = normalized;
      setNutrition(normalized);
      return normalized;
    } catch (mutationError) {
      snapshotRef.current = previous;
      setNutrition(previous);
      throw mutationError;
    }
  }, [activeDateKey, nutrition, userId]);

  const removeFood = useCallback(async (mealId) => {
    if (!userId) {
      throw new Error('User is not authenticated');
    }

    const previous = snapshotRef.current || nutrition || EMPTY_NUTRITION;
    const optimistic = optimisticRemoveFood(previous, mealId);
    snapshotRef.current = optimistic;
    setNutrition(optimistic);

    try {
      const updated = await removeFoodFromService(userId, mealId, activeDateKey);
      const normalized = mergeNutrition(optimistic, updated);
      snapshotRef.current = normalized;
      setNutrition(normalized);
      return normalized;
    } catch (mutationError) {
      snapshotRef.current = previous;
      setNutrition(previous);
      throw mutationError;
    }
  }, [activeDateKey, nutrition, userId]);

  const updateWater = useCallback(async (waterAmount) => {
    if (!userId) {
      throw new Error('User is not authenticated');
    }

    const previous = snapshotRef.current || nutrition || EMPTY_NUTRITION;
    const optimistic = optimisticWater(previous, waterAmount);
    snapshotRef.current = optimistic;
    setNutrition(optimistic);

    try {
      const updated = await updateWaterInService(userId, waterAmount, activeDateKey);
      const normalized = mergeNutrition(optimistic, updated);
      snapshotRef.current = normalized;
      setNutrition(normalized);
      return normalized;
    } catch (mutationError) {
      snapshotRef.current = previous;
      setNutrition(previous);
      throw mutationError;
    }
  }, [activeDateKey, nutrition, userId]);

  const dateLabel = useMemo(() => {
    if (activeDateKey === currentDateKey) {
      return 'Today';
    }

    return formatFriendlyDate(activeDateKey, { timeZone: DEFAULT_TIME_ZONE });
  }, [activeDateKey, currentDateKey]);

  const groupedMeals = useMemo(() => nutrition.meals || EMPTY_NUTRITION.meals, [nutrition]);
  const mealEntries = useMemo(() => nutrition.mealEntries || [], [nutrition]);

  return useMemo(() => ({
    nutrition,
    mealEntries,
    groupedMeals,
    loading,
    refreshing,
    error,
    currentDateKey: activeDateKey,
    dateLabel,
    isToday,
    refresh,
    addFood,
    removeFood,
    updateWater,
  }), [addFood, activeDateKey, dateLabel, error, groupedMeals, isToday, loading, mealEntries, nutrition, refresh, refreshing, removeFood, updateWater]);
}

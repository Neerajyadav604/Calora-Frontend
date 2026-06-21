import { auth } from '../config/firebase';
import apiRequest from './api';

const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to access analytics.');
  }

  return await user.getIdToken();
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const average = (values = []) => {
  const list = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!list.length) return 0;
  return Math.round(list.reduce((sum, value) => sum + value, 0) / list.length);
};

const pickNumber = (entry, keys = ['value']) => {
  if (typeof entry === 'number') {
    return toNumber(entry, 0);
  }

  if (!entry || typeof entry !== 'object') {
    return 0;
  }

  for (const key of keys) {
    if (entry[key] !== undefined && entry[key] !== null && entry[key] !== '') {
      return toNumber(entry[key], 0);
    }
  }

  return 0;
};

const normalizeNumericSeries = (series, keys = ['value']) => {
  if (!Array.isArray(series)) return [];
  return series.map((entry) => pickNumber(entry, keys));
};

const normalizeMacroSeries = (series) => {
  if (!Array.isArray(series)) return [];

  return series.map((entry) => {
    if (typeof entry === 'number') {
      return {
        protein: 0,
        carbs: 0,
        fats: 0,
        calories: toNumber(entry, 0),
      };
    }

    if (!entry || typeof entry !== 'object') {
      return { protein: 0, carbs: 0, fats: 0, calories: 0 };
    }

    return {
      protein: toNumber(
        entry.protein ?? entry.avgProtein ?? entry.totalProtein ?? entry.proteinG ?? entry.p,
        0
      ),
      carbs: toNumber(
        entry.carbs ?? entry.avgCarbs ?? entry.totalCarbs ?? entry.carbsG ?? entry.c,
        0
      ),
      fats: toNumber(
        entry.fats ?? entry.fat ?? entry.avgFat ?? entry.totalFat ?? entry.fatG ?? entry.f,
        0
      ),
      calories: toNumber(
        entry.calories ?? entry.avgCalories ?? entry.totalCalories ?? entry.kcal ?? entry.value,
        0
      ),
    };
  });
};

const normalizeSummary = (payload = {}, days = 7) => {
  const data = payload?.data ?? payload?.summary ?? payload ?? {};

  const calorieTrend = normalizeNumericSeries(data.calorieTrend ?? data.caloriesTrend ?? data.calorie_history, [
    'calories',
    'value',
    'totalCalories',
    'kcal',
  ]);

  const macroTrend = normalizeMacroSeries(data.macroTrend ?? data.macrosTrend ?? data.macro_history);

  const weightTrend = normalizeNumericSeries(data.weightTrend ?? data.weightHistory ?? data.weights ?? data.weight_history, [
    'weight',
    'value',
    'kg',
  ]);

  const avgCalories = toNumber(
    data.avgCalories ?? data.averageCalories ?? data.average_calories ?? average(calorieTrend),
    0
  );

  const avgProtein = toNumber(
    data.avgProtein ?? data.averageProtein ?? data.average_protein ?? average(macroTrend.map((item) => item.protein)),
    0
  );

  const avgCarbs = toNumber(
    data.avgCarbs ?? data.averageCarbs ?? data.average_carbs ?? average(macroTrend.map((item) => item.carbs)),
    0
  );

  const avgFat = toNumber(
    data.avgFat ?? data.averageFat ?? data.average_fat ?? average(macroTrend.map((item) => item.fats)),
    0
  );

  const targetCalories = toNumber(data.targetCalories ?? data.dailyCalorieTarget ?? data.calorieTarget, 0);
  const targetProtein = toNumber(data.targetProtein ?? data.proteinTarget ?? data.macros?.protein, 0);
  const targetCarbs = toNumber(data.targetCarbs ?? data.carbsTarget ?? data.macros?.carbs, 0);
  const targetFat = toNumber(data.targetFat ?? data.fatTarget ?? data.macros?.fats ?? data.macros?.fat, 0);
  const daysTracked = toNumber(data.daysTracked ?? data.trackedDays ?? data.totalDaysTracked, calorieTrend.length);
  const consistencyPct = toNumber(data.consistencyPct ?? data.consistency ?? data.goalConsistency, 0);
  const latestWeight = weightTrend.length ? weightTrend[weightTrend.length - 1] : toNumber(data.latestWeight ?? data.currentWeight, 0) || null;
  const earliestWeight = weightTrend.length ? weightTrend[0] : toNumber(data.earliestWeight, 0) || null;
  const weightChange =
    data.weightChange !== undefined && data.weightChange !== null
      ? toNumber(data.weightChange, 0)
      : latestWeight != null && earliestWeight != null
        ? Math.round((latestWeight - earliestWeight) * 10) / 10
        : null;
  const avgDeficit =
    data.avgDeficit !== undefined && data.avgDeficit !== null
      ? toNumber(data.avgDeficit, 0)
      : targetCalories > 0
        ? Math.round(targetCalories - avgCalories)
        : null;

  return {
    ...data,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    daysTracked: Math.max(0, daysTracked),
    calorieTrend,
    macroTrend,
    weightTrend,
    consistencyPct,
    latestWeight,
    earliestWeight,
    weightChange,
    avgDeficit,
    dayLabels: Array.isArray(data.dayLabels) ? data.dayLabels : [],
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
    insights: Array.isArray(data.insights) ? data.insights : [],
  };
};

const normalizeWeightHistory = (payload = {}) => {
  const data = payload?.data ?? payload?.history ?? payload ?? {};
  const entries = Array.isArray(data)
    ? data
    : Array.isArray(data.entries)
    ? data.entries
    : Array.isArray(data.history)
      ? data.history
      : Array.isArray(data.weights)
        ? data.weights
        : Array.isArray(data.data)
          ? data.data
          : [];

  return entries.map((entry) => ({
    id: String(entry.id ?? entry._id ?? `${entry.recordedAt ?? entry.date ?? Date.now()}`),
    weight: toNumber(entry.weight ?? entry.value ?? entry.kg, 0),
    recordedAt: entry.recordedAt ?? entry.date ?? entry.createdAt ?? null,
  }));
};

export const getAnalyticsSummary = async (days = 7) => {
  try {
    const token = await getAuthToken();
    const response = await apiRequest(`/analytics/summary?days=${days}`, 'GET', null, token);

    if (response?.success === false) {
      throw new Error(response?.message || 'Failed to load analytics summary.');
    }

    return {
      success: true,
      data: normalizeSummary(response, days),
      message: response?.message || '',
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Failed to load analytics summary.',
      data: null,
    };
  }
};

export const getWeightHistory = async () => {
  try {
    const token = await getAuthToken();
    const response = await apiRequest('/analytics/weight/history', 'GET', null, token);

    if (response?.success === false) {
      throw new Error(response?.message || 'Failed to load weight history.');
    }

    return {
      success: true,
      data: normalizeWeightHistory(response),
      message: response?.message || '',
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Failed to load weight history.',
      data: [],
    };
  }
};

export const saveWeight = async (weight) => {
  try {
    const token = await getAuthToken();
    const numericWeight = toNumber(weight, NaN);

    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      throw new Error('Weight must be a number greater than 0.');
    }

    const response = await apiRequest(
      '/analytics/weight',
      'POST',
      {
        weight: numericWeight,
      },
      token
    );

    if (response?.success === false) {
      throw new Error(response?.message || 'Failed to save weight.');
    }

    return {
      success: true,
      data: response?.data ?? response ?? null,
      message: response?.message || 'Weight saved.',
    };
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Failed to save weight.',
    };
  }
};

const analyticsService = {
  getAnalyticsSummary,
  getWeightHistory,
  saveWeight,
};

export default analyticsService;

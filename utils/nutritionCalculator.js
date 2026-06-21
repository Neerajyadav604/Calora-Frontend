const GOAL_LABELS = {
  lose: 'Lose Weight',
  maintain: 'Maintain Weight',
  gain: 'Gain Muscle',
};

const GOAL_ALIASES = {
  lose: ['lose', 'lose weight'],
  maintain: ['maintain', 'maintain weight'],
  gain: ['gain', 'gain weight', 'build muscle'],
};

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  'lightly active': 1.375,
  moderate: 1.55,
  'moderately active': 1.55,
  active: 1.725,
  'very active': 1.725,
  extra: 1.9,
  'extra active': 1.9,
};

const toNumber = (value, fallback = NaN) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeGoalKey = (goal) => {
  const value = String(goal || '').trim().toLowerCase();

  if (!value) return 'maintain';

  for (const [key, aliases] of Object.entries(GOAL_ALIASES)) {
    if (aliases.includes(value)) {
      return key;
    }
  }

  return value;
};

export const getGoalLabel = (goal) => {
  const key = normalizeGoalKey(goal);
  return GOAL_LABELS[key] || GOAL_LABELS.maintain;
};

export const getActivityMultiplier = (activityLevel) => {
  const value = String(activityLevel || '').trim().toLowerCase();
  return ACTIVITY_MULTIPLIERS[value] || 1.55;
};

export const calculateBMR = (params = {}) => {
  // Height -> cm
  let heightCm;
  if (params.heightUnit === 'ft') {
    const raw = String(params.height);
    const match = raw.match(/(\d+)'(\d+)/);
    if (match) {
      heightCm = parseInt(match[1], 10) * 30.48 + parseInt(match[2], 10) * 2.54;
    } else {
      heightCm = 170;
    }
  } else {
    heightCm = toNumber(params.height);
  }

  // Weight -> kg
  let weightKg;
  if (params.weightUnit === 'lbs') {
    weightKg = toNumber(params.weight) * 0.453592;
  } else {
    weightKg = toNumber(params.weight);
  }

  const age = parseInt(params.age, 10);
  const gender = String(params.gender || '').toLowerCase();

  let bmr;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    // female + other
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  return Number.isNaN(bmr) ? 1800 : bmr;
};

export const getGoalAdjustment = (goal) => {
  const key = normalizeGoalKey(goal);

  switch (key) {
    case 'lose':
      return { delta: -500, label: '-500 cal deficit' };
    case 'gain':
      return { delta: 300, label: '+300 cal surplus' };
    case 'maintain':
    default:
      return { delta: 0, label: 'Maintenance' };
  }
};

export const getMacros = (calories, goal) => {
  const key = normalizeGoalKey(goal);
  const ratios = {
    lose: { protein: 0.35, carbs: 0.4, fat: 0.25 },
    maintain: { protein: 0.3, carbs: 0.45, fat: 0.25 },
    gain: { protein: 0.3, carbs: 0.5, fat: 0.2 },
  };

  const ratio = ratios[key] || ratios.maintain;
  return {
    protein: Math.round((calories * ratio.protein) / 4),
    carbs: Math.round((calories * ratio.carbs) / 4),
    fat: Math.round((calories * ratio.fat) / 9),
  };
};

export const calculateNutritionTargets = (params = {}) => {
  const goal = normalizeGoalKey(params.goal ?? params.goalType);
  const activityMultiplier =
    toNumber(params.activityMultiplier, NaN) || getActivityMultiplier(params.activityLevel);

  const bmr = Math.round(calculateBMR(params));
  const tdee = Math.round(bmr * activityMultiplier);
  const adjustment = getGoalAdjustment(goal);
  const targetCalories = tdee + adjustment.delta;
  const macros = getMacros(targetCalories, goal);

  return {
    bmr,
    tdee,
    targetCalories,
    macros: {
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fat,
    },
    adjustment,
    goal,
    activityMultiplier,
  };
};

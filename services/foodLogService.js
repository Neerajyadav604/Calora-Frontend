// services/foodLogService.js
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// ── Get today's date key ──────────────────────────────────────
export const getTodayKey = () => new Date().toISOString().split('T')[0];

// ── Get document ID for a user's daily log ───────────────────
export const getLogDocId = (uid, dateKey) => `${uid}_${dateKey}`;

// ── Subscribe to today's log (real-time) ─────────────────────
// Returns unsubscribe function — call it on component unmount
export const subscribeTodayLog = (uid, callback) => {
  const dateKey = getTodayKey();
  const docId   = getLogDocId(uid, dateKey);
  const ref     = doc(db, 'foodLogs', docId);

  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback({ calories: 0, protein: 0, carbs: 0, fats: 0, meals: [] });
    }
  });
};

// ── Add a meal to today's log ─────────────────────────────────
export const addMealToLog = async ({ name, calories, protein, carbs, fats, mealType }) => {
  const user    = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const dateKey = getTodayKey();
  const docId   = getLogDocId(user.uid, dateKey);
  const ref     = doc(db, 'foodLogs', docId);

  // Get current log
  const snap = await getDoc(ref);
  const current = snap.exists()
    ? snap.data()
    : { calories: 0, protein: 0, carbs: 0, fats: 0, meals: [] };

  const newMeal = {
    id:        Date.now().toString(),
    name,
    calories:  Number(calories),
    protein:   Number(protein),
    carbs:     Number(carbs),
    fats:      Number(fats),
    mealType:  mealType || 'Snack',
    loggedAt:  new Date().toISOString(),
  };

  const updated = {
    uid:       user.uid,
    date:      dateKey,
    calories:  (current.calories || 0) + newMeal.calories,
    protein:   (current.protein  || 0) + newMeal.protein,
    carbs:     (current.carbs    || 0) + newMeal.carbs,
    fats:      (current.fats     || 0) + newMeal.fats,
    meals:     [...(current.meals || []), newMeal],
    updatedAt: new Date().toISOString(),
  };

  await setDoc(ref, updated, { merge: false });
  return updated;
};

// ── Remove a meal from today's log ───────────────────────────
export const removeMealFromLog = async (mealId) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const dateKey = getTodayKey();
  const docId   = getLogDocId(user.uid, dateKey);
  const ref     = doc(db, 'foodLogs', docId);

  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const current = snap.data();
  const meal    = current.meals.find((m) => m.id === mealId);
  if (!meal) return;

  const updated = {
    ...current,
    calories:  Math.max((current.calories || 0) - meal.calories, 0),
    protein:   Math.max((current.protein  || 0) - meal.protein,  0),
    carbs:     Math.max((current.carbs    || 0) - meal.carbs,    0),
    fats:      Math.max((current.fats     || 0) - meal.fats,     0),
    meals:     current.meals.filter((m) => m.id !== mealId),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(ref, updated, { merge: false });
  return updated;
};
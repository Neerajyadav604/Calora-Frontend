import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import useDailyNutrition from '../../hooks/useDailyNutrition';
import { auth, db } from '../../config/firebase';
import { DEFAULT_TIME_ZONE, addDays, formatTime, getCurrentDateKey, isSameDay } from '../../utils/date.utils';

const StatCard = ({ icon, title, value, unit, subtitle, color = '#CCFF00' }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
      <Ionicons name={icon} size={18} color="#1A1D10" />
    </View>
    <Text style={styles.statTitle}>{title}</Text>
    <Text style={styles.statValue}>
      {value}
      {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
    </Text>
    {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
  </View>
);

const MacroBar = ({ label, current, goal, color }) => {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  return (
    <View style={styles.macroItem}>
      <View style={styles.macroRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroMeta}>{Math.round(current)}g / {Math.round(goal)}g</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const MealPreview = ({ meal }) => (
  <View style={styles.mealRow}>
    <View style={styles.mealDot} />
    <View style={styles.mealTextWrap}>
      <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
      <Text style={styles.mealMetaText}>
        {String(meal.mealType || 'meal').replace(/^./, (char) => char.toUpperCase())} · {formatTime(meal.timestamp || meal.loggedAt, { timeZone: DEFAULT_TIME_ZONE })}
      </Text>
    </View>
    <Text style={styles.mealCalories}>{Math.round(meal.calories)} kcal</Text>
  </View>
);

const CalendarStrip = () => {
  const [weekOffset, setWeekOffset] = useState(0);

  const { today, items } = useMemo(() => {
    const now = new Date();

    // Get Monday of current week
    const dow = now.getDay(); // 0=Sun
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    
    // Build Monday by manually setting date — avoids addDays timezone issues
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      // Build each date manually — no addDays utility
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);

      const dateKey = getCurrentDateKey(date, DEFAULT_TIME_ZONE);

      return {
        date,
        dateKey,
        dayLabel: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          timeZone: DEFAULT_TIME_ZONE,
        }).format(date).slice(0, 3),
        dayNumber: new Intl.DateTimeFormat('en-US', {
          day: 'numeric',
          timeZone: DEFAULT_TIME_ZONE,
        }).format(date),
        isToday: isSameDay(date, now, DEFAULT_TIME_ZONE),
      };
    });

    return { today: now, items: days };
  }, [weekOffset]);

  const monthLabel = useMemo(() => {
    if (!items.length) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: DEFAULT_TIME_ZONE,
    }).format(items[3].date);
  }, [items]);

  return (
    <View style={styles.calendarStripWrap}>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarMonthLabel}>{monthLabel}</Text>
        <View style={styles.calendarNavRow}>
          <TouchableOpacity
            style={styles.calendarNavBtn}
            onPress={() => setWeekOffset(p => p - 1)}
          >
            <Ionicons name="chevron-back" size={16} color="#1A1D10" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.calendarNavBtn}
            onPress={() => setWeekOffset(p => p + 1)}
          >
            <Ionicons name="chevron-forward" size={16} color="#1A1D10" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarRow}>
        {items.map((item, index) => (
          <View key={`${item.dateKey}-${index}`} style={styles.calendarDayCol}>
            <Text style={styles.calendarDayLabel}>{item.dayLabel}</Text>
            <View style={[styles.calendarChip, item.isToday && styles.calendarChipActive]}>
              <Text style={[styles.calendarChipDate, item.isToday && styles.calendarChipDateActive]}>
                {item.dayNumber}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const user = auth.currentUser;
  const {
    nutrition,
    mealEntries,
    loading,
    refreshing,
    error,
    refresh,
    currentDateKey,
    dateLabel,
  } = useDailyNutrition({ userId: user?.uid });

  useEffect(() => {
    if (!user?.uid) {
      setProfileLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setProfile(snap.exists() ? snap.data() : null);
        setProfileLoading(false);
        setProfileError(null);
      },
      (err) => {
        setProfileLoading(false);
        setProfileError(err);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const targets = useMemo(() => ({
    calories: Number(profile?.dailyCalorieTarget || profile?.targetCalories || 0),
    protein: Number(profile?.macros?.protein || 0),
    carbs: Number(profile?.macros?.carbs || 0),
    fats: Number(profile?.macros?.fats || 0),
    water: Number(profile?.waterGoal || 2.5),
  }), [profile]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const name = profile?.name || user?.displayName || 'there';
  const calories = nutrition?.totals?.calories || 0;
  const protein = nutrition?.totals?.protein || 0;
  const carbs = nutrition?.totals?.carbs || 0;
  const fats = nutrition?.totals?.fat || 0;
  const water = nutrition?.totals?.water || 0;
  const micronutrients = nutrition?.micronutrients || {};
  const caloriesPct = targets.calories > 0 ? Math.min(Math.round((calories / targets.calories) * 100), 100) : 0;
  const caloriesRemaining = Math.max(targets.calories - calories, 0);
  const micronutrientEntries = Object.entries(micronutrients).slice(0, 6);
  const topMeals = mealEntries.slice(0, 5);

  if (loading || profileLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#CCFF00" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAEA" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1A1D10" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              {profile?.photoURL || user?.photoURL ? (
                <Image source={{ uri: profile?.photoURL || user?.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLetter}>{String(name).charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{name}</Text>
              <Text style={styles.dateText}>{dateLabel} · {currentDateKey}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Nutrition')}>
            <Ionicons name="restaurant-outline" size={22} color="#1A1D10" />
          </TouchableOpacity>
        </View>

        <CalendarStrip />

        {(error || profileError) ? (
          <View style={styles.alertBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
            <Text style={styles.alertText}>Nutrition data is loading from the backend, but one request failed. Pull to refresh.</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.ringOuter}>
              <View style={styles.ringTrack} />
              <View style={styles.ringProgress}>
                <Text style={styles.ringValue}>{caloriesPct}%</Text>
                <Text style={styles.ringLabel}>of goal</Text>
              </View>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Today only. No stale totals.</Text>
              <Text style={styles.heroSubtitle}>
                {targets.calories > 0
                  ? `${Math.round(calories)} of ${targets.calories.toLocaleString()} kcal logged. ${caloriesRemaining.toLocaleString()} kcal left.`
                  : `${Math.round(calories)} kcal logged today.`}
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Nutrition')}>
                <Text style={styles.primaryButtonText}>Open Nutrition</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Macros</Text>
          <Text style={styles.sectionMeta}>Today&apos;s backend document</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard icon="flame-outline" title="Calories" value={Math.round(calories)} unit="kcal" subtitle={targets.calories ? `${caloriesPct}% of goal` : 'No calorie target set'} color="#CCFF00" />
          <StatCard icon="fitness-outline" title="Protein" value={Math.round(protein)} unit="g" subtitle={targets.protein ? `${Math.round((protein / targets.protein) * 100)}% of goal` : 'Target pending'} color="#7C5CBF" />
          <StatCard icon="leaf-outline" title="Carbs" value={Math.round(carbs)} unit="g" subtitle={targets.carbs ? `${Math.round((carbs / targets.carbs) * 100)}% of goal` : 'Target pending'} color="#4A90D9" />
          <StatCard icon="nutrition-outline" title="Fats" value={Math.round(fats)} unit="g" subtitle={targets.fats ? `${Math.round((fats / targets.fats) * 100)}% of goal` : 'Target pending'} color="#F59E0B" />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Hydration</Text>
            <Text style={styles.sectionMeta}>{water.toFixed(2)} L logged</Text>
          </View>
          <View style={styles.macroTrackLarge}>
            <View style={[styles.macroFillLarge, { width: `${targets.water > 0 ? Math.min((water / targets.water) * 100, 100) : 0}%` }]} />
          </View>
          <Text style={styles.helperText}>
            {targets.water > 0 ? `${Math.max(targets.water - water, 0).toFixed(2)} L left for today` : 'Set a water goal in profile'}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Micronutrients</Text>
            <Text style={styles.sectionMeta}>{Object.keys(micronutrients).length} tracked</Text>
          </View>
          <View style={styles.microWrap}>
            {micronutrientEntries.length > 0 ? micronutrientEntries.map(([key, value]) => (
              <View key={key} style={styles.microChip}>
                <Text style={styles.microKey}>{key}</Text>
                <Text style={styles.microValue}>{String(value)}</Text>
              </View>
            )) : (
              <Text style={styles.emptyText}>No micronutrients logged yet for today.</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Meals Today</Text>
          <Text style={styles.sectionMeta}>{mealEntries.length} items</Text>
        </View>
        <View style={styles.sectionCard}>
          {topMeals.length > 0 ? topMeals.map((meal) => (
            <MealPreview key={meal.id} meal={meal} />
          )) : (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={28} color="#C8CCBB" />
              <Text style={styles.emptyTitle}>Nothing logged yet today</Text>
              <Text style={styles.emptyText}>Open Nutrition to add your first meal for today.</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Analytics Ready</Text>
          <Text style={styles.sectionMeta}>History stays preserved</Text>
        </View>
        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Analytics')}>
            <Ionicons name="stats-chart-outline" size={18} color="#1A1D10" />
            <Text style={styles.secondaryButtonText}>View Trends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={refresh}>
            <Ionicons name="refresh-outline" size={18} color="#1A1D10" />
            <Text style={styles.secondaryButtonText}>Sync Today</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAEA' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 28, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#CCFF00', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarLetter: { fontSize: 18, fontWeight: '900', color: '#1A1D10' },
  greeting: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  userName: { fontSize: 18, fontWeight: '900', color: '#1A1D10' },
  dateText: { fontSize: 12, color: '#9AA08A', marginTop: 2 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  // ── Calendar (replace old calendar styles) ──────────────────────
calendarStripWrap: {
  marginTop: 2,
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 14,
  shadowColor: '#000',
  shadowOpacity: 0.03,
  shadowRadius: 10,
  elevation: 1,
},
calendarHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 14,
},
calendarMonthLabel: {
  fontSize: 16,
  fontWeight: '900',
  color: '#1A1D10',
},
calendarNavRow: {
  flexDirection: 'row',
  gap: 8,
},
calendarNavBtn: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: '#F7FAEA',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E8EDD0',
},
calendarRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
calendarDayCol: {
  flex: 1,
  alignItems: 'center',
  gap: 6,
},
calendarDayLabel: {
  fontSize: 11,
  fontWeight: '700',
  color: '#9AA08A',
  textTransform: 'capitalize',
},
calendarChip: {
  width: 34,
  height: 34,
  borderRadius: 17,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
},
calendarChipActive: {
  backgroundColor: '#CCFF00',
},
calendarChipDate: {
  fontSize: 15,
  fontWeight: '800',
  color: '#1A1D10',
},
calendarChipDateActive: {
  color: '#1A1D10',
},

  alertBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 16, padding: 14 },
  alertText: { flex: 1, color: '#92400E', fontSize: 13, lineHeight: 18 },
  heroCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 18, elevation: 2 },
  heroTopRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  ringOuter: { width: 116, height: 116, borderRadius: 58, backgroundColor: '#F4F5EC', alignItems: 'center', justifyContent: 'center' },
  ringTrack: { position: 'absolute', width: 116, height: 116, borderRadius: 58, borderWidth: 12, borderColor: '#E8EDD0' },
  ringProgress: { alignItems: 'center' },
  ringValue: { fontSize: 26, fontWeight: '900', color: '#1A1D10' },
  ringLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700', letterSpacing: 1 },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#1A1D10', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, lineHeight: 19, color: '#4B5563', marginBottom: 14 },
  primaryButton: { backgroundColor: '#CCFF00', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start' },
  primaryButtonText: { fontSize: 14, fontWeight: '800', color: '#1A1D10' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1A1D10' },
  sectionMeta: { fontSize: 12, color: '#9AA08A' },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 1, gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1, gap: 6 },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statTitle: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#1A1D10' },
  statUnit: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  statSubtitle: { fontSize: 11, color: '#9AA08A' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  macroTrackLarge: { height: 10, borderRadius: 999, backgroundColor: '#EEF0E8', overflow: 'hidden' },
  macroFillLarge: { height: 10, borderRadius: 999, backgroundColor: '#CCFF00' },
  helperText: { fontSize: 12, color: '#6B7280' },
  microWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  microChip: { backgroundColor: '#F8FAF0', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, minWidth: '30%' },
  microKey: { fontSize: 11, color: '#6B7280', fontWeight: '700', textTransform: 'capitalize' },
  microValue: { fontSize: 14, fontWeight: '900', color: '#1A1D10', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#1A1D10' },
  emptyText: { fontSize: 13, color: '#9AA08A', textAlign: 'center' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EEF0E8' },
  mealDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CCFF00' },
  mealTextWrap: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '800', color: '#1A1D10' },
  mealMetaText: { fontSize: 12, color: '#9AA08A', marginTop: 2 },
  mealCalories: { fontSize: 13, fontWeight: '800', color: '#1A1D10' },
  ctaRow: { flexDirection: 'row', gap: 12 },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E8EDD0' },
  secondaryButtonText: { fontSize: 14, fontWeight: '800', color: '#1A1D10' },
  macroItem: { gap: 6 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { fontSize: 13, fontWeight: '800', color: '#1A1D10' },
  macroMeta: { fontSize: 12, color: '#9AA08A' },
  macroTrack: { height: 8, borderRadius: 999, backgroundColor: '#EEF0E8', overflow: 'hidden' },
  macroFill: { height: 8, borderRadius: 999 },
});




import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { collection, getDocs, doc, getDoc, orderBy, query, limit } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { getCurrentDateKey, addDays, DEFAULT_TIME_ZONE } from '../../utils/date.utils';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 120;

const PERIODS = ['7D', '30D', '90D'];
const ACCENT = '#CCFF00';
const PURPLE = '#A78BFA';
const CYAN = '#22D3EE';
const BG = '#0F1A0A';
const CARD = '#1A2410';
const BORDER = '#2A3A1A';

// ── Helpers ─────────────────────────────────────────────────────────────────

function getDayKeys(days) {
  const keys = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    keys.push(getCurrentDateKey(d, DEFAULT_TIME_ZONE));
  }
  return keys;
}

function shortDayLabel(dateKey) {
  // dateKey format: YYYY-MM-DD
  const d = new Date(dateKey + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d).slice(0, 3);
}

// ── Sparkline SVG ────────────────────────────────────────────────────────────

const Sparkline = ({ data, color = ACCENT }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return (
    <View style={{ height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingVertical: 8 }}>
      {data.map((v, i) => {
        const heightPct = ((v - min) / range) * 100;
        return (
          <View key={i} style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={{
              width: '60%',
              height: `${Math.max(heightPct, 4)}%`,
              backgroundColor: color,
              borderRadius: 4,
              opacity: i === data.length - 1 ? 1 : 0.5 + (i / data.length) * 0.5,
            }} />
          </View>
        );
      })}
    </View>
  );
};

// ── Donut Chart ──────────────────────────────────────────────────────────────

const DonutChart = ({ protein, carbs, fats }) => {
  const total = protein + carbs + fats || 1;
  const proteinPct = Math.round((protein / total) * 100);
  const carbsPct = Math.round((carbs / total) * 100);
  const fatsPct = Math.round((fats / total) * 100);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 160, height: 160 }}>
      {/* Outer ring segments as thick borders */}
      <View style={{
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 18,
        borderColor: BORDER,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* Macro bars as stacked progress */}
        <View style={{ gap: 6, width: 80 }}>
          <View style={{ height: 5, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
            <View style={{ width: `${proteinPct}%`, height: 5, backgroundColor: ACCENT, borderRadius: 999 }} />
          </View>
          <View style={{ height: 5, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
            <View style={{ width: `${carbsPct}%`, height: 5, backgroundColor: PURPLE, borderRadius: 999 }} />
          </View>
          <View style={{ height: 5, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' }}>
            <View style={{ width: `${fatsPct}%`, height: 5, backgroundColor: CYAN, borderRadius: 999 }} />
          </View>
        </View>
      </View>
    </View>
  );
};

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen({ navigation }) {
  const [period, setPeriod] = useState('7D');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);

  const user = auth.currentUser;
  const days = period === '7D' ? 7 : period === '30D' ? 30 : 90;

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const dayKeys = getDayKeys(days);

      // 1. Fetch profile from Firestore
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      const profileData = profileSnap.exists() ? profileSnap.data() : {};
      setProfile(profileData);

      // 2. Fetch daily logs from Firestore for each day in range
      const logPromises = dayKeys.map(dateKey =>
        getDoc(doc(db, 'logs', user.uid, 'daily', dateKey))
      );
      const logSnaps = await Promise.all(logPromises);

      const dailyLogs = dayKeys.map((dateKey, i) => {
        const snap = logSnaps[i];
        if (!snap.exists()) return { dateKey, calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };
        const d = snap.data();
        return {
          dateKey,
          calories: Number(d.totalCalories || 0),
          protein: Number(d.totalProtein || 0),
          carbs: Number(d.totalCarbs || 0),
          fat: Number(d.totalFat || 0),
          water: Number(d.totalWater || 0),
        };
      });

      // 3. Fetch weight log from Firestore
      const weightQuery = query(
        collection(db, 'weightLog', user.uid, 'entries'),
        orderBy('recordedAt', 'desc'),
        limit(days)
      );
      const weightSnaps = await getDocs(weightQuery);
      const weightEntries = weightSnaps.docs
        .map(d => ({ weight: Number(d.data().weight || 0), recordedAt: d.data().recordedAt }))
        .reverse();

      // ── Calculate stats ────────────────────────────────────────────────────
      const loggedDays = dailyLogs.filter(d => d.calories > 0);
      const avgCalories = loggedDays.length
        ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length)
        : 0;
      const avgProtein = loggedDays.length
        ? Math.round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length)
        : 0;

      const targetCalories = Number(profileData.dailyCalorieTarget || profileData.targetCalories || 0);
      const calorieTrend = dailyLogs.map(d => d.calories);
      const weightTrend = weightEntries.map(w => w.weight);

      const avgDeficit = targetCalories > 0
        ? Math.round(targetCalories - avgCalories)
        : null;

      // Macro averages
      const avgProteinG = loggedDays.length
        ? loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length : 0;
      const avgCarbsG = loggedDays.length
        ? loggedDays.reduce((s, d) => s + d.carbs, 0) / loggedDays.length : 0;
      const avgFatG = loggedDays.length
        ? loggedDays.reduce((s, d) => s + d.fat, 0) / loggedDays.length : 0;

      // Consistency — days where calories > 80% of target
      const consistentDays = targetCalories > 0
        ? loggedDays.filter(d => d.calories >= targetCalories * 0.8).length
        : loggedDays.length;
      const consistencyPct = days > 0
        ? Math.round((consistentDays / days) * 100)
        : 0;

      // Weight change
      const latestWeight = weightEntries.length ? weightEntries[weightEntries.length - 1].weight : null;
      const earliestWeight = weightEntries.length > 1 ? weightEntries[0].weight : null;
      const weightChange = latestWeight && earliestWeight
        ? Math.round((latestWeight - earliestWeight) * 10) / 10
        : null;

      // Achievements
      const achievements = [];
      if (loggedDays.length >= (days === 7 ? 5 : days === 30 ? 20 : 60))
        achievements.push({ icon: 'flash', label: 'Logging\nStreak', color: ACCENT });
      if (avgProteinG >= (Number(profileData.macros?.protein || 0) * 0.9))
        achievements.push({ icon: 'barbell', label: 'Protein\nMaster', color: PURPLE });
      if (loggedDays.some(d => d.water >= (Number(profileData.waterGoal || 2.5) * 0.9)))
        achievements.push({ icon: 'water', label: 'Hydration\nPro', color: CYAN });

      // AI Insights (rule-based, no API call)
      const insights = [];
      if (avgProteinG > 0 && Number(profileData.macros?.protein || 0) > 0) {
        const proteinPct = Math.round((avgProteinG / Number(profileData.macros.protein)) * 100);
        if (proteinPct >= 90)
          insights.push({ icon: 'trending-up', title: 'Protein Goal Hit', body: `You're averaging ${proteinPct}% of your protein target. Great consistency for muscle retention.` });
        else
          insights.push({ icon: 'trending-down', title: 'Protein Gap', body: `Averaging ${proteinPct}% of protein goal. Try adding one high-protein meal per day.` });
      }
      if (consistencyPct >= 80)
        insights.push({ icon: 'checkmark-circle', title: 'Goal Accuracy', body: `You hit your calorie goal ${consistentDays}/${days} days. Consistency is key for your current cycle.` });
      else if (loggedDays.length < days * 0.5)
        insights.push({ icon: 'alert-circle', title: 'Log More Days', body: `Only ${loggedDays.length} of ${days} days logged. Consistent tracking improves accuracy.` });

      setData({
        avgCalories,
        avgProtein,
        calorieTrend,
        dayLabels: dayKeys.map(shortDayLabel),
        avgDeficit,
        targetCalories,
        avgProteinG: Math.round(avgProteinG),
        avgCarbsG: Math.round(avgCarbsG),
        avgFatG: Math.round(avgFatG),
        consistencyPct,
        latestWeight,
        weightChange,
        weightTrend,
        weightTarget: Number(profileData.weightGoal || 0),
        achievements,
        insights,
        loggedDays: loggedDays.length,
      });
    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ── Chart x-axis labels (sparse) ──────────────────────────────────────────
  const xLabels = useMemo(() => {
    if (!data?.dayLabels) return [];
    const labels = data.dayLabels;
    if (labels.length <= 7) return labels;
    // Show ~5 labels
    const step = Math.floor(labels.length / 4);
    return labels.map((l, i) =>
      i === 0 || i === labels.length - 1 || i % step === 0 ? l : ''
    );
  }, [data?.dayLabels]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  const macroTotal = (data?.avgProteinG || 0) + (data?.avgCarbsG || 0) + (data?.avgFatG || 0) || 1;
  const proteinPct = Math.round(((data?.avgProteinG || 0) / macroTotal) * 100);
  const carbsPct = Math.round(((data?.avgCarbsG || 0) / macroTotal) * 100);
  const fatsPct = Math.round(((data?.avgFatG || 0) / macroTotal) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analysis</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="calendar-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => { setPeriod(p); setLoading(true); }}
            >
              <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Avg Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Ionicons name="flame-outline" size={16} color={ACCENT} />
              <Text style={styles.statLabel}>AVG CAL</Text>
            </View>
            <Text style={styles.statValue}>{(data?.avgCalories || 0).toLocaleString()}</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, {
                width: `${data?.targetCalories > 0 ? Math.min((data.avgCalories / data.targetCalories) * 100, 100) : 0}%`,
                backgroundColor: ACCENT
              }]} />
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Ionicons name="trending-up-outline" size={16} color={PURPLE} />
              <Text style={styles.statLabel}>AVG PROTEIN</Text>
            </View>
            <Text style={styles.statValue}>{data?.avgProtein || 0}g</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, {
                width: `${profile?.macros?.protein > 0 ? Math.min((data?.avgProtein / profile.macros.protein) * 100, 100) : 0}%`,
                backgroundColor: PURPLE
              }]} />
            </View>
          </View>
        </View>

        {/* Calorie Trend */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Calorie Trend</Text>
              {data?.avgDeficit != null && (
                <Text style={[styles.cardSub, { color: data.avgDeficit > 0 ? ACCENT : '#F87171' }]}>
                  {data.avgDeficit > 0 ? `Average Deficit: ${data.avgDeficit} kcal` : `Average Surplus: ${Math.abs(data.avgDeficit)} kcal`}
                </Text>
              )}
            </View>
            <View style={styles.legendCol}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
                <Text style={styles.legendText}>Consumed</Text>
              </View>
              {data?.targetCalories > 0 && (
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: '#4B5563', borderStyle: 'dashed' }]} />
                  <Text style={styles.legendText}>Target</Text>
                </View>
              )}
            </View>
          </View>
          <Sparkline data={data?.calorieTrend || []} color={ACCENT} showDots={days <= 7} />
          {/* X axis labels */}
          <View style={styles.xAxisRow}>
            {xLabels.map((l, i) => (
              <Text key={i} style={styles.xAxisLabel}>{l}</Text>
            ))}
          </View>
        </View>

        {/* Macros Donut */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>MACROS</Text>
            <View style={[styles.consistencyBadge]}>
              <Text style={styles.consistencyText}>{data?.consistencyPct || 0}% Consistency</Text>
            </View>
          </View>
          <View style={styles.donutRow}>
            <View style={styles.donutWrap}>
              <DonutChart
                protein={data?.avgProteinG || 0}
                carbs={data?.avgCarbsG || 0}
                fats={data?.avgFatG || 0}
              />
              <View style={styles.donutCenter}>
                <Text style={styles.donutValue}>
                  {((data?.avgCalories || 0) / 1000).toFixed(1)}k
                </Text>
                <Text style={styles.donutLabel}>Kcal Avg</Text>
              </View>
            </View>
            <View style={styles.macroLegend}>
              <View style={styles.macroLegendItem}>
                <Text style={[styles.macroLegendLabel, { color: ACCENT }]}>Protein</Text>
                <Text style={styles.macroLegendPct}>{proteinPct}%</Text>
                <Text style={styles.macroLegendG}>{data?.avgProteinG || 0}g avg</Text>
              </View>
              <View style={styles.macroLegendItem}>
                <Text style={[styles.macroLegendLabel, { color: PURPLE }]}>Carbs</Text>
                <Text style={styles.macroLegendPct}>{carbsPct}%</Text>
                <Text style={styles.macroLegendG}>{data?.avgCarbsG || 0}g avg</Text>
              </View>
              <View style={styles.macroLegendItem}>
                <Text style={[styles.macroLegendLabel, { color: CYAN }]}>Fats</Text>
                <Text style={styles.macroLegendPct}>{fatsPct}%</Text>
                <Text style={styles.macroLegendG}>{data?.avgFatG || 0}g avg</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weight Progress */}
        {data?.latestWeight ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>WEIGHT PROGRESS</Text>
            <View style={styles.weightTopRow}>
              <Text style={styles.weightValue}>{data.latestWeight}<Text style={styles.weightUnit}> kg</Text></Text>
              {data.weightChange != null && (
                <View style={[styles.weightChangeBadge, { backgroundColor: data.weightChange < 0 ? '#1A3A1A' : '#3A1A1A' }]}>
                  <Ionicons
                    name={data.weightChange < 0 ? 'arrow-down' : 'arrow-up'}
                    size={12}
                    color={data.weightChange < 0 ? ACCENT : '#F87171'}
                  />
                  <Text style={[styles.weightChangeText, { color: data.weightChange < 0 ? ACCENT : '#F87171' }]}>
                    {Math.abs(data.weightChange)}kg
                  </Text>
                </View>
              )}
            </View>
            {data.weightTrend.length > 1 && (
              <Sparkline data={data.weightTrend} color={PURPLE} showDots={true} />
            )}
            {data?.weightTarget > 0 && (
              <View style={styles.weightFootRow}>
                <Text style={styles.weightFootText}>{data.weightTrend[0] || '-'}kg</Text>
                <Text style={styles.weightFootText}>Target: {data.weightTarget}kg</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* AI Insights */}
        {data?.insights?.length > 0 && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="sparkles" size={16} color={ACCENT} />
              <Text style={styles.sectionTitle}>AI Insights</Text>
            </View>
            {data.insights.map((ins, i) => (
              <View key={i} style={styles.insightCard}>
                <View style={styles.insightAccent} />
                <View style={styles.insightContent}>
                  <View style={styles.insightIconWrap}>
                    <Ionicons name={ins.icon} size={18} color={ACCENT} />
                  </View>
                  <View style={styles.insightText}>
                    <Text style={styles.insightTitle}>{ins.title}</Text>
                    <Text style={styles.insightBody}>{ins.body}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Achievements */}
        {data?.achievements?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
            <View style={styles.achieveRow}>
              {data.achievements.map((a, i) => (
                <View key={i} style={styles.achieveItem}>
                  <View style={[styles.achieveIcon, { borderColor: a.color }]}>
                    <Ionicons name={a.icon} size={22} color={a.color} />
                  </View>
                  <Text style={styles.achieveLabel}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {data?.loggedDays === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={40} color="#2A3A1A" />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyBody}>Log meals in Nutrition to see your trends here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },

  periodRow: { flexDirection: 'row', gap: 8 },
  periodChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  periodChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  periodChipText: { fontSize: 13, fontWeight: '800', color: '#9AA08A' },
  periodChipTextActive: { color: '#0F1A0A' },

  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 14, gap: 6, borderWidth: 1, borderColor: BORDER },
  statTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5 },
  statValue: { fontSize: 26, fontWeight: '900', color: '#fff' },
  statBar: { height: 4, borderRadius: 999, backgroundColor: BORDER, overflow: 'hidden' },
  statBarFill: { height: 4, borderRadius: 999 },

  card: { backgroundColor: CARD, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: BORDER },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  cardSub: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  legendCol: { gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6B7280' },

  xAxisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  xAxisLabel: { fontSize: 10, color: '#4B5563', fontWeight: '700' },

  consistencyBadge: { backgroundColor: '#2A1A4A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  consistencyText: { fontSize: 11, fontWeight: '800', color: PURPLE },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutWrap: { position: 'relative', width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutValue: { fontSize: 22, fontWeight: '900', color: '#fff' },
  donutLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700' },

  macroLegend: { flex: 1, gap: 16 },
  macroLegendItem: { gap: 2 },
  macroLegendLabel: { fontSize: 13, fontWeight: '900' },
  macroLegendPct: { fontSize: 22, fontWeight: '900', color: '#fff' },
  macroLegendG: { fontSize: 11, color: '#6B7280' },

  weightTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weightValue: { fontSize: 36, fontWeight: '900', color: '#fff' },
  weightUnit: { fontSize: 16, color: '#6B7280' },
  weightChangeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  weightChangeText: { fontSize: 13, fontWeight: '800' },
  weightFootRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weightFootText: { fontSize: 12, color: '#4B5563', fontWeight: '700' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  insightCard: { backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  insightAccent: { height: 3, backgroundColor: ACCENT },
  insightContent: { flexDirection: 'row', gap: 12, padding: 14 },
  insightIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A2A10', alignItems: 'center', justifyContent: 'center' },
  insightText: { flex: 1, gap: 4 },
  insightTitle: { fontSize: 14, fontWeight: '900', color: '#fff' },
  insightBody: { fontSize: 13, color: '#9AA08A', lineHeight: 19 },

  achieveRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  achieveItem: { alignItems: 'center', gap: 8 },
  achieveIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1A0A' },
  achieveLabel: { fontSize: 11, color: '#9AA08A', fontWeight: '700', textAlign: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#2A3A1A' },
  emptyBody: { fontSize: 13, color: '#2A3A1A', textAlign: 'center' },
});
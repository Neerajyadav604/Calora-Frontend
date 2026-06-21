// screens/onboarding/CalcScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  calculateNutritionTargets,
  getGoalLabel,
} from '../../utils/nutritionCalculator';

export default function CalcScreen({ navigation, route }) {
  const params = route.params || {};
  const {
    bmr,
    tdee,
    targetCalories: target,
    macros,
    adjustment: adjust,
  } = calculateNutritionTargets(params);

  const animVal = useRef(new Animated.Value(0)).current;
  const countRef = useRef(0);
  const [displayCal, setDisplayCal] = React.useState(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(animVal, {
      toValue: target,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    animVal.addListener(({ value }) => {
      const rounded = Math.round(value);
      if (rounded !== countRef.current) {
        countRef.current = rounded;
        setDisplayCal(rounded);
      }
    });

    return () => animVal.removeAllListeners();
  }, []);

  const goalLabel =
    getGoalLabel(params.goal);

  const handleContinue = () => {
    navigation.navigate('Motivation', {
      ...params,
      bmr,
      tdee,
      targetCalories: target,
      macros,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1D10" />
        </TouchableOpacity>
        <Text style={styles.stepText}>Step 8 of 8</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Your daily calories</Text>
          <Text style={styles.subtitle}>
            Calculated using the Mifflin-St Jeor formula,{'\n'}personalised for your goal.
          </Text>
        </View>

        <LinearGradient
          colors={['#DFFFB0', '#CCFF00']}
          style={styles.calorieCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.calorieLabel}>Daily Target</Text>
          <Text style={styles.calorieNumber}>{displayCal}</Text>
          <Text style={styles.calorieUnit}>kcal / day</Text>
          <View style={styles.goalBadge}>
            <Text style={styles.goalBadgeText}>{goalLabel}</Text>
          </View>
        </LinearGradient>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownValue}>{bmr}</Text>
            <Text style={styles.breakdownLabel}>BMR</Text>
            <Text style={styles.breakdownHint}>Base metabolic rate</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownValue}>{tdee}</Text>
            <Text style={styles.breakdownLabel}>TDEE</Text>
            <Text style={styles.breakdownHint}>With activity</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.breakdownCard}>
            <Text
              style={[
                styles.breakdownValue,
                adjust.delta > 0 && { color: '#4CAF50' },
                adjust.delta < 0 && { color: '#F44336' },
              ]}
            >
              {adjust.delta > 0 ? `+${adjust.delta}` : adjust.delta === 0 ? '-' : adjust.delta}
            </Text>
            <Text style={styles.breakdownLabel}>Adjustment</Text>
            <Text style={styles.breakdownHint}>{adjust.label}</Text>
          </View>
        </View>

        <View style={styles.macrosSection}>
          <Text style={styles.macrosTitle}>Recommended Macros</Text>
          <View style={styles.macrosRow}>
            <MacroCard label="Protein" value={macros.protein} unit="g" color="#674BB5" />
            <MacroCard label="Carbs" value={macros.carbs} unit="g" color="#CCFF00" />
            <MacroCard label="Fat" value={macros.fats} unit="g" color="#FF9F45" />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#674BB5" />
          <Text style={styles.infoText}>
            These are estimates. You can adjust targets anytime from your profile.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Looks good - Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function MacroCard({ label, value, unit, color }) {
  return (
    <View style={styles.macroCard}>
      <View style={[styles.macroBar, { backgroundColor: color }]} />
      <Text style={styles.macroValue}>
        {value}
        <Text style={styles.macroUnit}>{unit}</Text>
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FBE5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  stepText: { fontSize: 15, fontWeight: '600', color: '#1A1D10' },
  scrollContent: { paddingBottom: 24 },
  titleBlock: { paddingHorizontal: 24, marginTop: 16, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1D10', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#5A6040', lineHeight: 21 },
  calorieCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  calorieLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A4A10',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  calorieNumber: { fontSize: 72, fontWeight: '900', color: '#1A1D10', lineHeight: 80 },
  calorieUnit: { fontSize: 18, fontWeight: '600', color: '#3A4A10', marginTop: 4, marginBottom: 16 },
  goalBadge: { backgroundColor: '#1A1D1022', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 50 },
  goalBadgeText: { fontSize: 13, fontWeight: '700', color: '#1A1D10' },
  breakdownRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  breakdownCard: { flex: 1, alignItems: 'center' },
  breakdownValue: { fontSize: 22, fontWeight: '800', color: '#1A1D10' },
  breakdownLabel: { fontSize: 12, fontWeight: '700', color: '#674BB5', marginTop: 2 },
  breakdownHint: { fontSize: 11, color: '#8A9A5B', marginTop: 2, textAlign: 'center' },
  divider: { width: 1, backgroundColor: '#E8EDCF', marginVertical: 4 },
  macrosSection: { marginHorizontal: 20, marginBottom: 16 },
  macrosTitle: { fontSize: 16, fontWeight: '700', color: '#1A1D10', marginBottom: 12 },
  macrosRow: { flexDirection: 'row', gap: 12 },
  macroCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  macroBar: { width: 32, height: 4, borderRadius: 2, marginBottom: 8 },
  macroValue: { fontSize: 22, fontWeight: '800', color: '#1A1D10' },
  macroUnit: { fontSize: 13, fontWeight: '600', color: '#6B7A40' },
  macroLabel: { fontSize: 12, color: '#8A9A5B', marginTop: 2, fontWeight: '600' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    backgroundColor: '#F0EAFF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: '#674BB5', lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12, backgroundColor: '#F9FBE5' },
  continueBtn: { backgroundColor: '#CCFF00', borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  continueBtnText: { fontSize: 18, fontWeight: '700', color: '#1A1D10' },
});

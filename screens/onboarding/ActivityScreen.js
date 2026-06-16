// screens/onboarding/ActivityScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ACTIVITIES = [
  {
    id: 'sedentary',
    title: 'Sedentary',
    subtitle: 'Little or no exercise, desk job',
    icon: '🛋️',
    multiplier: 1.2,
  },
  {
    id: 'light',
    title: 'Lightly Active',
    subtitle: 'Light exercise 1–3 days/week',
    icon: '🚶',
    multiplier: 1.375,
  },
  {
    id: 'moderate',
    title: 'Moderately Active',
    subtitle: 'Moderate exercise 3–5 days/week',
    icon: '🏃',
    multiplier: 1.55,
  },
  {
    id: 'active',
    title: 'Very Active',
    subtitle: 'Hard exercise 6–7 days/week',
    icon: '🏋️',
    multiplier: 1.725,
  },
  {
    id: 'extra',
    title: 'Extra Active',
    subtitle: 'Very hard exercise, physical job',
    icon: '⚡',
    multiplier: 1.9,
  },
];

export default function ActivityScreen({ navigation, route }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (id) => {
    setSelected(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleContinue = () => {
  const activity = ACTIVITIES.find(a => a.id === selected);
  navigation.navigate('Calc', {
    ...route.params,
    activityLevel: selected,
    activityMultiplier: activity.multiplier,
  });
};

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1D10" />
        </TouchableOpacity>
        <Text style={styles.stepText}>Step 7 of 8</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>How active are you?</Text>
          <Text style={styles.subtitle}>
            Pick the option that best describes{'\n'}your typical week.
          </Text>
        </View>

        {/* Activity Cards */}
        <View style={styles.cardsContainer}>
          {ACTIVITIES.map((activity, index) => {
            const isSelected = selected === activity.id;
            return (
              <TouchableOpacity
                key={activity.id}
                onPress={() => handleSelect(activity.id)}
                activeOpacity={0.85}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                ]}
              >
                {/* Left accent bar */}
                {isSelected && <View style={styles.accentBar} />}

                {/* Icon */}
                <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
                  <Text style={styles.icon}>{activity.icon}</Text>
                </View>

                {/* Text */}
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                    {activity.title}
                  </Text>
                  <Text style={styles.cardSubtitle}>{activity.subtitle}</Text>
                </View>

                {/* Check */}
                <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={15} color="#1A1D10" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Continue */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={!selected}
        >
          <Text style={[styles.continueBtnText, !selected && styles.continueBtnTextDisabled]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FBE5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1D10',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  titleBlock: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1D10',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#5A6040',
    lineHeight: 22,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  cardSelected: {
    backgroundColor: '#F4FFCC',
    borderColor: '#CCFF00',
    elevation: 3,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#CCFF00',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxSelected: {
    backgroundColor: '#DDFF80',
  },
  icon: {
    fontSize: 24,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A3A3A',
    marginBottom: 3,
  },
  cardTitleSelected: {
    color: '#1A1D10',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7A40',
    lineHeight: 18,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#F9FBE5',
  },
  continueBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#E4EAC8',
  },
  continueBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D10',
  },
  continueBtnTextDisabled: {
    color: '#9AAA60',
  },
});
// screens/onboarding/GoalScreen.js
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
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const GOALS = [
  {
    id: 'lose',
    title: 'Lose Weight',
    subtitle: 'Burn fat and reach a healthier body weight',
    icon: '🔥',
    gradient: ['#FFF9E6', '#FFF0C2'],
    borderColor: '#FFD700',
  },
  {
    id: 'maintain',
    title: 'Maintain Weight',
    subtitle: 'Stay at your current weight and build healthy habits',
    icon: '⚖️',
    gradient: ['#E6F9FF', '#C2EEFF'],
    borderColor: '#00BFFF',
  },
  {
    id: 'gain',
    title: 'Gain Muscle',
    subtitle: 'Build strength and increase lean muscle mass',
    icon: '💪',
    gradient: ['#EDFFD6', '#D4FAA8'],
    borderColor: '#CCFF00',
  },
];

export default function GoalScreen({ navigation, route }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (id) => {
    setSelected(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleContinue = () => {
  navigation.navigate('Activity', {
    ...route.params,
    goal: selected,
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
        <Text style={styles.stepText}>Step 6 of 8</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>What's your main goal?</Text>
          <Text style={styles.subtitle}>
            This helps us set the right calorie{'\n'}and nutrition targets for you.
          </Text>
        </View>

        {/* Goal Cards */}
        <View style={styles.cardsContainer}>
          {GOALS.map((goal) => {
            const isSelected = selected === goal.id;
            return (
              <TouchableOpacity
                key={goal.id}
                onPress={() => handleSelect(goal.id)}
                activeOpacity={0.85}
                style={[
                  styles.cardWrapper,
                  isSelected && { borderColor: goal.borderColor, borderWidth: 2.5 },
                ]}
              >
                <LinearGradient
                  colors={isSelected ? goal.gradient : ['#FFFFFF', '#F5F5F5']}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Left: icon */}
                  <View style={[styles.iconBox, isSelected && { backgroundColor: goal.borderColor + '33' }]}>
                    <Text style={styles.icon}>{goal.icon}</Text>
                  </View>

                  {/* Middle: text */}
                  <View style={styles.cardText}>
                    <Text style={[styles.cardTitle, isSelected && { color: '#1A1D10' }]}>
                      {goal.title}
                    </Text>
                    <Text style={styles.cardSubtitle}>{goal.subtitle}</Text>
                  </View>

                  {/* Right: check */}
                  <View style={[
                    styles.checkCircle,
                    isSelected && { backgroundColor: goal.borderColor, borderColor: goal.borderColor },
                  ]}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#1A1D10" />
                    )}
                  </View>
                </LinearGradient>
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
    marginBottom: 32,
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
    gap: 16,
  },
  cardWrapper: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3A3A3A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7A40',
    lineHeight: 18,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
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
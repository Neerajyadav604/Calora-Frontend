import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function GenderScreen({ navigation }) {
  const [selected, setSelected] = useState(null);

  const options = [
    {
      id: 'male',
      label: 'Male',
      icon: <MaterialCommunityIcons name="gender-male" size={22} color="#1A1D10" />,
    },
    {
      id: 'female',
      label: 'Female',
      icon: <MaterialCommunityIcons name="gender-female" size={22} color="#1A1D10" />,
    },
    {
      id: 'other',
      label: 'Other',
      icon: <MaterialCommunityIcons name="gender-transgender" size={22} color="#1A1D10" />,
    },
  ];

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('Age', { gender: selected });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#1A1D10" />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>
          Choose your gender to help us calibrate your fitness metrics and goals.
        </Text>
      </View>

      {/* Gender Options */}
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => setSelected(option.id)}
              activeOpacity={0.8}
            >
              {/* Icon Circle */}
              <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                {option.icon}
              </View>

              {/* Label */}
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                {option.label}
              </Text>

              {/* Checkmark */}
              <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={selected ? 0.85 : 1}
        >
          <Text style={[styles.continueBtnText, !selected && styles.continueBtnTextDisabled]}>
            Continue →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FBE5',
    paddingHorizontal: 24,
  },
  backBtn: {
    marginTop: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  header: {
    marginTop: 24,
    marginBottom: 36,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1D10',
    marginBottom: 10,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A7D70',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0D0',
  },
  optionCardSelected: {
    borderColor: '#CCFF00',
    backgroundColor: '#F5FFD6',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconCircleSelected: {
    backgroundColor: '#CCFF00',
  },
  optionLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D10',
  },
  optionLabelSelected: {
    color: '#1A1D10',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#C0C0B0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkCircleSelected: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 36,
    left: 24,
    right: 24,
  },
  continueBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: '#E8E8E0',
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D10',
  },
  continueBtnTextDisabled: {
    color: '#A0A090',
  },
});
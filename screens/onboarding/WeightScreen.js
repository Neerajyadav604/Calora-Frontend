// screens/onboarding/WeightScreen.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ITEM_HEIGHT = 72;
const VISIBLE_ITEMS = 7;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2); // 3

// kg: 30 – 200 (step 0.5)
const KG_VALUES = Array.from({ length: 341 }, (_, i) =>
  parseFloat((30 + i * 0.5).toFixed(1))
);

// lbs: 66 – 440 (step 1)
const LBS_VALUES = Array.from({ length: 375 }, (_, i) => 66 + i);

const DEFAULT_KG_INDEX = KG_VALUES.indexOf(70);   // 70 kg
const DEFAULT_LBS_INDEX = LBS_VALUES.indexOf(154); // ~70 kg in lbs

export default function WeightScreen({ navigation, route }) {
  const [unit, setUnit] = useState('kg');
  const [selectedIndex, setSelectedIndex] = useState(DEFAULT_KG_INDEX);
  const scrollRef = useRef(null);
  const selectedIndexRef = useRef(DEFAULT_KG_INDEX);

  const data = unit === 'kg' ? KG_VALUES : LBS_VALUES;

  useEffect(() => {
    const idx = unit === 'kg' ? DEFAULT_KG_INDEX : DEFAULT_LBS_INDEX;
    selectedIndexRef.current = idx;
    setSelectedIndex(idx);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
    }, 50);
  }, [unit]);

  const handleScroll = (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, data.length - 1));
    if (clamped !== selectedIndexRef.current) {
      selectedIndexRef.current = clamped;
      setSelectedIndex(clamped);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleScrollEnd = (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, data.length - 1));
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
    selectedIndexRef.current = clamped;
    setSelectedIndex(clamped);
  };

  const getItemStyle = (distance) => {
    switch (distance) {
      case 0: return { fontSize: 48, color: '#1A1D10', fontWeight: '800', opacity: 1 };
      case 1: return { fontSize: 40, color: '#6B7A40', fontWeight: '600', opacity: 0.55 };
      case 2: return { fontSize: 34, color: '#8A9A5B', fontWeight: '500', opacity: 0.35 };
      default: return { fontSize: 28, color: '#A0B060', fontWeight: '400', opacity: 0.15 };
    }
  };

  const getDisplayValue = () => {
    const val = data[selectedIndex];
    return unit === 'kg' ? `${val} kg` : `${val} lbs`;
  };

  const handleContinue = () => {
  navigation.navigate('Goal', {
    ...route.params,          // carries gender + age + height forward
    weight: data[selectedIndex],
    weightUnit: unit,
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
        <Text style={styles.stepText}>Step 5 of 6</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>What's your weight?</Text>
        <Text style={styles.subtitle}>
          We'll use this to calculate your{'\n'}personalized calorie targets.
        </Text>
      </View>

      {/* Unit Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleBg}>
          <TouchableOpacity
            style={[styles.toggleBtn, unit === 'kg' && styles.toggleActive]}
            onPress={() => setUnit('kg')}
          >
            <Text style={[styles.toggleText, unit === 'kg' && styles.toggleTextActive]}>
              KG
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, unit === 'lbs' && styles.toggleActive]}
            onPress={() => setUnit('lbs')}
          >
            <Text style={[styles.toggleText, unit === 'lbs' && styles.toggleTextActive]}>
              LBS
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Drum Roll Picker */}
      <View style={styles.pickerWrapper}>
        <View style={styles.selectionBox} pointerEvents="none" />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * CENTER_INDEX,
          }}
        >
          {data.map((item, i) => {
            const distance = Math.abs(i - selectedIndex);
            const s = getItemStyle(distance);
            const isSelected = distance === 0;

            return (
              <View key={i} style={styles.itemRow}>
                <Text
                  style={[
                    styles.itemText,
                    {
                      fontSize: s.fontSize,
                      color: s.color,
                      fontWeight: s.fontWeight,
                      opacity: s.opacity,
                    },
                  ]}
                >
                  {item}
                </Text>
                {isSelected && (
                  <Text style={styles.unitLabel}>{unit}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Display value */}
      <View style={styles.displayRow}>
        <Text style={styles.displayValue}>{getDisplayValue()}</Text>
      </View>

      {/* Continue */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
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
  titleBlock: {
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 20,
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
  toggleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleBg: {
    flexDirection: 'row',
    backgroundColor: '#E4EAC8',
    borderRadius: 50,
    padding: 4,
    width: width * 0.58,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A9A5B',
  },
  toggleTextActive: {
    color: '#1A1D10',
  },
  pickerWrapper: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 20,
  },
  selectionBox: {
    position: 'absolute',
    top: ITEM_HEIGHT * CENTER_INDEX,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#EEF5D0',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CCFF00',
    zIndex: 0,
  },
  itemRow: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  itemText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  unitLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A6020',
    marginLeft: 6,
    marginTop: 6,
  },
  displayRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  displayValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1A1D10',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    marginTop: 'auto',
  },
  continueBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D10',
  },
});
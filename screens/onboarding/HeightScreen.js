// screens/onboarding/HeightScreen.js
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
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2); // = 3

const CM_VALUES = Array.from({ length: 151 }, (_, i) => 100 + i);

const FTIN_VALUES = [];
for (let ft = 3; ft <= 7; ft++) {
  for (let inch = 0; inch < 12; inch++) {
    FTIN_VALUES.push(`${ft}'${inch}"`);
  }
}

const DEFAULT_CM_INDEX = 75;  // 175 cm
const DEFAULT_FT_INDEX = FTIN_VALUES.indexOf(`5'7"`);

export default function HeightScreen({ navigation,route }) {
  const [unit, setUnit] = useState('cm');
  const [selectedIndex, setSelectedIndex] = useState(DEFAULT_CM_INDEX);
  const scrollRef = useRef(null);
  const selectedIndexRef = useRef(DEFAULT_CM_INDEX);

  const data = unit === 'cm' ? CM_VALUES : FTIN_VALUES;

  useEffect(() => {
    const idx = unit === 'cm' ? DEFAULT_CM_INDEX : DEFAULT_FT_INDEX;
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

  const getDisplayValue = () =>
    unit === 'cm'
      ? `${CM_VALUES[selectedIndex]} cm`
      : FTIN_VALUES[selectedIndex];

  const handleContinue = () => {
  navigation.navigate('Weight', {
    ...route.params,          // carries gender + age forward
    height: data[selectedIndex],
    heightUnit: unit,
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
        <Text style={styles.stepText}>Step 4 of 6</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>How tall are you?</Text>
        <Text style={styles.subtitle}>
          This helps us calculate your BMI and{'\n'}daily activity targets accurately.
        </Text>
      </View>

      {/* Unit Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleBg}>
          <TouchableOpacity
            style={[styles.toggleBtn, unit === 'cm' && styles.toggleActive]}
            onPress={() => setUnit('cm')}
          >
            <Text style={[styles.toggleText, unit === 'cm' && styles.toggleTextActive]}>
              CM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, unit === 'ft' && styles.toggleActive]}
            onPress={() => setUnit('ft')}
          >
            <Text style={[styles.toggleText, unit === 'ft' && styles.toggleTextActive]}>
              FT/IN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Picker */}
      <View style={styles.pickerWrapper}>
        {/* Highlight box — sits behind the ScrollView items */}
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
                {/* Unit label only on selected row, inside the row */}
                {isSelected && (
                  <Text style={styles.unitLabel}>
                    {unit === 'cm' ? 'cm' : ''}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Large display value below picker */}
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
    top: ITEM_HEIGHT * CENTER_INDEX,   // 3 * 72 = 216 from top of picker
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: '#EEF5D0',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CCFF00',
    zIndex: 0,                          // behind the ScrollView text
  },
  itemRow: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,                          // text above the box
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
    marginTop: 6,                       // slight baseline offset to align with big number
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
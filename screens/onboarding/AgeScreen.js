import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const ITEM_HEIGHT = 80;
const VISIBLE = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE;
const AGES = Array.from({ length: 91 }, (_, i) => i + 10);
const DEFAULT_AGE = 25;
const DEFAULT_INDEX = AGES.indexOf(DEFAULT_AGE); // index 15

export default function AgeScreen({ navigation, route }) {
  const { gender } = route.params || {};
  const [selectedAge, setSelectedAge] = useState(DEFAULT_AGE);
  const scrollRef = useRef(null);

  // Scroll to default age on mount
  const onLayout = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: DEFAULT_INDEX * ITEM_HEIGHT,
      animated: false,
    });
  }, []);

  const onScrollEnd = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, AGES.length - 1));
    setSelectedAge(AGES[clamped]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#1A1D10" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>How old are you?</Text>
        <Text style={styles.subtitle}>
          This helps us calculate your calorie needs and target heart rate zones accurately.
        </Text>
      </View>

      {/* Picker */}
      <View style={styles.pickerContainer}>

        {/* Top line */}
        <View style={[styles.line, { top: ITEM_HEIGHT * 2 }]} />

        {/* Dots row — sits between the two lines */}
        <View style={[styles.dotsRow, { top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }]}>
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Bottom line */}
        <View style={[styles.line, { top: ITEM_HEIGHT * 3 }]} />

        {/* Scroll */}
        <ScrollView
          ref={scrollRef}
          onLayout={onLayout}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={onScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingTop: ITEM_HEIGHT * 2,
            paddingBottom: ITEM_HEIGHT * 2,
          }}
          style={{ height: PICKER_HEIGHT }}
        >
          {AGES.map((age) => {
            const distance = Math.abs(age - selectedAge);
            let fontSize = 22;
            let opacity = 0.12;
            let fontWeight = '400';
            let color = '#1A1D10';

            if (distance === 0) {
              fontSize = 56;
              opacity = 1;
              fontWeight = '800';
            } else if (distance === 1) {
              fontSize = 34;
              opacity = 0.4;
            } else if (distance === 2) {
              fontSize = 26;
              opacity = 0.2;
            }

            return (
              <View key={age} style={styles.ageItem}>
                <Text style={{ fontSize, opacity, fontWeight, color }}>
                  {age}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => navigation.navigate('Height', { gender, age: selectedAge })}
        >
          <Text style={styles.continueBtnText}>Continue →</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>Step 2 of 6</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  backText: {
    fontSize: 16,
    color: '#1A1D10',
    fontWeight: '500',
  },
  header: {
    marginTop: 28,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1D10',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A7D70',
    lineHeight: 24,
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#B8BCA8',
    zIndex: 10,
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 11,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1A1D10',
  },
  ageItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottom: {
    paddingBottom: 36,
    alignItems: 'center',
    gap: 16,
  },
  continueBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 50,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D10',
  },
  stepText: {
    fontSize: 14,
    color: '#7A7D70',
  },
});
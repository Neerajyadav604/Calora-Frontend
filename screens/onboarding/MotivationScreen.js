// screens/onboarding/MotivationScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

// ── Replace this with your actual image ──────────────────────────────────────
// import motivationBg from '../../../assets/motivation-bg.jpg';
// Then use: source={motivationBg} on ImageBackground
// For now it uses a dark background color as placeholder
// ─────────────────────────────────────────────────────────────────────────────

export default function MotivationScreen({ navigation, route }) {
  const params = route.params || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

 const handleFinish = async () => {
  setLoading(true);
  setError(null);

  try {
    const user = auth.currentUser;          // ✅ shared auth instance
    if (!user) throw new Error('No user logged in');

    const profileData = {
      gender:             params.gender,
      age:                parseInt(params.age),
      height:             params.height,
      heightUnit:         params.heightUnit,
      weight:             params.weight,
      weightUnit:         params.weightUnit,
      goal:               params.goal,
      activityLevel:      params.activityLevel,
      activityMultiplier: params.activityMultiplier,
      bmr:                params.bmr,
      tdee:               params.tdee,
      targetCalories:     params.targetCalories,
      macros:             params.macros,
      onboardingDone:     true,
      createdAt:          new Date().toISOString(),
      updatedAt:          new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid), profileData, { merge: true }); // ✅ shared db
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return;

  } catch (err) {
    console.error('Save error:', err);
    setError('Something went wrong. Please try again.');
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── REPLACE source below with your image ── */}
      <ImageBackground
        source={require('../../assets/screen.png')} // 👈 add your image here
        style={styles.bg}
        resizeMode="cover"
      >
        {/* Dark overlay */}
        <View style={styles.overlay} />

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.brandBadge}>
            <Text style={styles.brandText}>CALORA</Text>
          </View>
        </View>

        {/* Bottom content */}
        <View style={styles.bottomContent}>

          {/* Label */}
          <View style={styles.labelRow}>
            <View style={styles.labelLine} />
            <Text style={styles.labelText}>MOTIVATION</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>
            RISE TO THE{'\n'}
            <Text style={styles.headlineAccent}>CHALLENGE</Text>
          </Text>

          {/* Subtext */}
          <Text style={styles.subtext}>
            Your personal nutrition journey starts here.{'\n'}
            Track smarter and redefine what's possible.
          </Text>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#FF5252" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={handleFinish}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1A1D10" />
            ) : (
              <Text style={styles.ctaText}>START YOUR JOURNEY  →</Text>
            )}
          </TouchableOpacity>

          {/* Footer note */}
          <Text style={styles.footerNote}>JOIN 10K+ USERS WORLDWIDE</Text>

        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  bg: {
    flex: 1,
    width,
    height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    opacity: 0.55,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadge: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF55',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  labelLine: {
    width: 32,
    height: 1.5,
    backgroundColor: '#CCFF00',
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CCFF00',
    letterSpacing: 3,
  },
  headline: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 56,
    marginBottom: 20,
  },
  headlineAccent: {
    color: '#CCFF00',
  },
  subtext: {
    fontSize: 16,
    color: '#FFFFFFBB',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF525222',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FF5252',
  },
  ctaBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1A1D10',
    letterSpacing: 1,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF55',
    letterSpacing: 2,
  },
});

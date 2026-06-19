import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../config/firebase';
import { sendEmailVerification, reload ,signOut } from 'firebase/auth';

export default function VerifyEmailScreen({ navigation, route }) {
  const { email } = route.params || {};
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown === 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // handleVerify — remove the manual navigation, just let Navigation.js take over
const handleVerify = async () => {
  setChecking(true);
  try {
    await reload(auth.currentUser);
    const user = auth.currentUser;
    if (user?.emailVerified) {
      // Do nothing — Navigation.js sees onboardingDone: false and renders OnboardingStack automatically
    } else {
      Alert.alert(
        'Not Verified Yet',
        'Please open the link we sent to your email first, then tap the button below.',
      );
    }
  } catch (error) {
    Alert.alert('Error', 'Something went wrong. Please try again.');
  }
  setChecking(false);
};
  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setCountdown(60);
      setCanResend(false);
      Alert.alert('Email Sent!', 'A new verification link has been sent to your inbox.');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend. Please try again.');
    }
    setResending(false);
  };

  const handleBack = async () => {
  try { await signOut(auth); } catch (e) {}
  // No navigation.replace needed — signing out sets user to null,
  // Navigation.js renders AuthStack automatically
};

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.brandName}>CALORA</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Center content */}
        <View style={styles.content}>

          {/* Mail icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="mail-unread-outline" size={52} color="#1A1D10" />
          </View>

          <Text style={styles.title}>Check your email</Text>

          <Text style={styles.subtitle}>
            We sent a verification link to
          </Text>

          <Text style={styles.emailText}>{email}</Text>

          <Text style={styles.instruction}>
            Open the link in that email to verify your account.{'\n'}
            Once done, come back and tap the button below.
          </Text>

          {/* Steps */}
          <View style={styles.stepsCard}>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepText}>Open your email inbox</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepText}>Find the email from Calora</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
              <Text style={styles.stepText}>Tap the "Verify Email" link</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
              <Text style={styles.stepText}>Come back and tap below</Text>
            </View>
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={handleVerify}
            disabled={checking}
            activeOpacity={0.85}
          >
            {checking
              ? <ActivityIndicator color="#1A1D10" />
              : <Text style={styles.verifyBtnText}>I've verified my email →</Text>
            }
          </TouchableOpacity>

          {/* Resend */}
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending
                ? <ActivityIndicator color="#CCFF00" />
                : <Text style={styles.resendActive}>Resend verification email</Text>
              }
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdown}>
              Resend link in {formatTime(countdown)}
            </Text>
          )}

          <Text style={styles.spamNote}>
            Can't find it? Check your spam folder.
          </Text>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  safeArea: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#CCFF00',
    letterSpacing: 3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#CCFF00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CCFF00',
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CCFF00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1D10',
  },
  stepText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  verifyBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 50,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  verifyBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D10',
  },
  countdown: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  resendActive: {
    fontSize: 14,
    color: '#CCFF00',
    fontWeight: '600',
  },
  spamNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
});
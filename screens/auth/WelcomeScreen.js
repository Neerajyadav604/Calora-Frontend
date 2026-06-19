import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { loginWithGoogle, syncUserWithBackend } from '../../services/authService';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const slideUp = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

 const handleGoogleLogin = async () => {
  setGoogleLoading(true);
  const result = await loginWithGoogle();
  setGoogleLoading(false);

  if (result.success) {
    await syncUserWithBackend(result.user);
    // DELETE: navigation.replace('Gender');  ← remove this line
  } else {
    Alert.alert('Google Sign-In Failed', result.message);
  }
};

  return (
    <View style={styles.container}>

      {/* TOP — Full Image */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/welcomescreen.png')}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.appNameOverlay}>
          <Text style={styles.appNameText}>Calora</Text>
        </View>
      </View>

      {/* BOTTOM — Card */}
      <Animated.View style={[
        styles.bottomCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideUp }],
        },
      ]}>

        <View style={styles.indicator} />

        <Text style={styles.heading}>Level up your{'\n'}fitness journey.</Text>

        <Text style={styles.subtitle}>
          Track calories, monitor macros, and build{'\n'}healthy habits that last a lifetime.
        </Text>

        {/* Email Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
          style={styles.emailButton}>
          <LinearGradient
            colors={['#CCFF00', '#ABD600']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emailButtonGradient}>
            <Ionicons name="mail-outline" size={20} color="#1A1D10" />
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Google Button */}
        <TouchableOpacity
          style={styles.googleButton}
          activeOpacity={0.85}
          onPress={handleGoogleLogin}
          disabled={googleLoading}>
          <View style={styles.googleButtonInner}>
            {googleLoading
              ? <ActivityIndicator size="small" color="#674BB5" />
              : <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
            }
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Login Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}>
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Text style={styles.loginLink}>Log in</Text>
          </Text>
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FBE5',
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  appNameOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  appNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 40,
    marginTop: -30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#CCFF00',
    borderRadius: 2,
    marginBottom: 20,
  },
  heading: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1A1D10',
    letterSpacing: -0.5,
    lineHeight: 42,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#444933',
    lineHeight: 24,
    marginBottom: 24,
  },
  emailButton: {
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#CCFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  emailButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D10',
  },
  googleButton: {
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#C4C9AC',
    marginBottom: 20,
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#674BB5',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1D10',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#C4C9AC',
  },
  dividerText: {
    fontSize: 13,
    color: '#747A60',
  },
  loginText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#444933',
  },
  loginLink: {
    color: '#506600',
    fontWeight: '700',
  },
});
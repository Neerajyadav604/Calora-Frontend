import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const FITNESS_ICONS = ['🏃', '💪', '❤️', '🔥', '⚡', '🥗'];

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;

  const iconAnimations = FITNESS_ICONS.map(() => ({
    opacity: useRef(new Animated.Value(0)).current,
    scale: useRef(new Animated.Value(0)).current,
  }));

  useEffect(() => {
    // Ring animation
    Animated.parallel([
      Animated.spring(ringScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo animation
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Icons animation - one by one
    FITNESS_ICONS.forEach((_, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(iconAnimations[index].scale, {
            toValue: 1,
            tension: 60,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(iconAnimations[index].opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }, 600 + index * 150);
    });

    // Text fade in
    setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 1200);

    
   
  }, []);

  const spin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getIconPosition = (index) => {
    const angle = (index * 360) / FITNESS_ICONS.length;
    const radian = (angle * Math.PI) / 180;
    const radius = 110;
    return {
      x: Math.cos(radian) * radius,
      y: Math.sin(radian) * radius,
    };
  };

  return (
    <View style={styles.container}>

      {/* Rotating ring with icons */}
      <Animated.View style={[
        styles.ringContainer,
        {
          transform: [
            { scale: ringScale },
            { rotate: spin },
          ],
        },
      ]}>
        {FITNESS_ICONS.map((icon, index) => {
          const pos = getIconPosition(index);
          return (
            <Animated.View
              key={index}
              style={[
                styles.iconWrapper,
                {
                  transform: [
                    { translateX: pos.x },
                    { translateY: pos.y },
                    { scale: iconAnimations[index].scale },
                  ],
                  opacity: iconAnimations[index].opacity,
                },
              ]}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>{icon}</Text>
              </View>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* Center Logo */}
      <Animated.View style={[
        styles.logoContainer,
        {
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        },
      ]}>
        <LinearGradient
          colors={['#CCFF00', '#ABD600']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBox}>
          <Text style={styles.logoText}>C</Text>
        </LinearGradient>
      </Animated.View>

      {/* App Name & Tagline */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.appName}>Calora</Text>
        <Text style={styles.tagline}>Track Calories. Build Better Habits.</Text>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  iconWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  logoContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#000000',
  },
  textContainer: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
});
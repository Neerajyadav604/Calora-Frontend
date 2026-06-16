// components/SuccessOverlay.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  Animated,
  StyleSheet,
  Text,
  Easing,
  Platform,
} from 'react-native';

// ─── Option A: Lottie (recommended) ───────────────────────────────────────────
// Install: npx expo install lottie-react-native
// Then drop a Lottie JSON into assets/animations/success.json
// Good free sources: lottiefiles.com (search "success checkmark")
let LottieView: any = null;
try {
  LottieView = require('lottie-react-native').default;
} catch (_) {
  // Lottie not installed — falls back to built-in animation below
}

// ─── Option B: Built-in pure-RN animated checkmark (zero dependencies) ────────
const CheckmarkSVG = () => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Circle pops in with overshoot
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 10,
        stiffness: 180,
        useNativeDriver: true,
      }),
      // 2. Check stroke draws in
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // strokeDashoffset needs JS driver
      }),
      // 3. Pulse glow
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const strokeLength = 56; // approximate path length for checkmark
  const strokeDashoffset = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [strokeLength, 0],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.2, 0],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale: glowScale }], opacity: glowOpacity },
        ]}
      />
      {/* Circle background */}
      <View style={styles.circleOuter}>
        <View style={styles.circleInner}>
          {/* Checkmark — drawn with two rotated rectangles (no SVG dep needed) */}
          <Animated.View style={[styles.checkLong, { opacity: checkAnim }]} />
          <Animated.View style={[styles.checkShort, { opacity: checkAnim }]} />
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Main overlay ─────────────────────────────────────────────────────────────
interface SuccessOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  onDismiss?: () => void;
  /** Duration before auto-dismiss in ms (default 1800) */
  duration?: number;
  /** Path to your Lottie JSON if using Option A */
  lottieSource?: any;
}

export const SuccessOverlay: React.FC<SuccessOverlayProps> = ({
  visible,
  message = 'Added to Log',
  subMessage,
  onDismiss,
  duration = 1800,
  lottieSource,
}) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale       = useRef(new Animated.Value(0.82)).current;
  const cardOpacity     = useRef(new Animated.Value(0)).current;
  const lottieRef       = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;

    // Entrance
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1, duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1, damping: 14, stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      lottieRef.current?.play();
    });

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0, duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.9, duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0, duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss?.());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      statusBarTranslucent
      visible={visible}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Animated.View
          style={[
            styles.card,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          {/* Animation area */}
          <View style={styles.animationContainer}>
            {LottieView && lottieSource ? (
              <LottieView
                ref={lottieRef}
                source={lottieSource}
                style={{ width: 110, height: 110 }}
                autoPlay={false}
                loop={false}
                speed={1.1}
              />
            ) : (
              <CheckmarkSVG />
            )}
          </View>

          {/* Text */}
          <Text style={styles.message}>{message}</Text>
          {subMessage ? (
            <Text style={styles.subMessage}>{subMessage}</Text>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const GREEN = '#22C55E';
const GREEN_DARK = '#16A34A';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 230,
    backgroundColor: '#1C1C1E',         // dark card — swap to '#fff' for light mode
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  animationContainer: {
    marginBottom: 20,
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Built-in checkmark pieces ──────────────────────────────────────────────
  pulseRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: GREEN,
  },
  circleOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  circleInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Short leg of ✓ (bottom-left to center)
  checkShort: {
    position: 'absolute',
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    bottom: 29,
    left: 20,
    transform: [{ rotate: '45deg' }],
  },
  // Long leg of ✓ (center to top-right)
  checkLong: {
    position: 'absolute',
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    bottom: 33,
    left: 28,
    transform: [{ rotate: '-55deg' }],
  },
  // ── Text ───────────────────────────────────────────────────────────────────
  message: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subMessage: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
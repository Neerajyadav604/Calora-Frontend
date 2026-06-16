import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification } from 'firebase/auth';
import { loginWithEmail, syncUserWithBackend , checkOnboardingStatus} from '../../services/authService';

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email.trim())             newErrors.email    = 'Email is required';
    else if (!email.includes('@')) newErrors.email    = 'Enter a valid email';
    if (!password)                 newErrors.password = 'Password is required';
    else if (password.length < 6)  newErrors.password = 'Minimum 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
  if (!validate()) return;
  setLoading(true);

  const result = await loginWithEmail(email.trim(), password);

  if (result.success) {
    // Block login if email not verified
    if (!result.user.emailVerified) {
      await sendEmailVerification(result.user);
      navigation.replace('VerifyEmail', { email: email.trim() });
      setLoading(false);
      return;
    }

    await syncUserWithBackend(result.user);
    const onboardingDone = await checkOnboardingStatus(result.user.uid);

    if (onboardingDone) {
      return;
    } else {
      navigation.replace('Gender');
    }
  } else {
    Alert.alert('Login Failed', result.message);
  }

  setLoading(false);
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#1A1D10" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Welcome back 👋</Text>
        <Text style={styles.subtitle}>Login to continue your fitness journey</Text>
      </View>

      <View style={styles.form}>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputBox, errors.email && styles.inputError]}>
            <Ionicons name="mail-outline" size={20} color="#7A7D70" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#B0B0A0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors({ ...errors, email: null }); }}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputBox, errors.password && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color="#7A7D70" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#B0B0A0"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors({ ...errors, password: null }); }}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#7A7D70" />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <TouchableOpacity style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#1A1D10" />
            : <Text style={styles.loginBtnText}>Login →</Text>
          }
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A7D70',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D10',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0D0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: '#FF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1D10',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    color: '#674BB5',
    fontSize: 14,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D10',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0D0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#7A7D70',
    fontSize: 14,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#7A7D70',
    fontSize: 15,
  },
  registerLink: {
    color: '#674BB5',
    fontSize: 15,
    fontWeight: '700',
  },
});

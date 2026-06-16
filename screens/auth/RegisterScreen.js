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
  ScrollView,
} from 'react-native';
import { registerWithEmail, syncUserWithBackend } from '../../services/authService';
import { sendEmailVerification } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';


export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});

  // ─── Validate ───────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};
    if (!fullName.trim())           newErrors.fullName = 'Full name is required';
    if (!email.trim())              newErrors.email    = 'Email is required';
    else if (!email.includes('@'))  newErrors.email    = 'Enter a valid email';
    if (!password)                  newErrors.password = 'Password is required';
    else if (password.length < 6)   newErrors.password = 'Minimum 6 characters';
    if (!confirm)                   newErrors.confirm  = 'Please confirm your password';
    else if (confirm !== password)  newErrors.confirm  = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Register ───────────────────────────────────────────────
  const handleRegister = async () => {
  if (!validate()) return;
  setLoading(true);

  const result = await registerWithEmail(fullName.trim(), email.trim(), password);

  if (result.success) {
    await syncUserWithBackend(result.user);
    // Go to verify screen instead of onboarding
    navigation.replace('VerifyEmail', { email: email.trim() });
  } else {
    Alert.alert('Registration Failed', result.message);
  }

  setLoading(false);
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1D10" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create account 🚀</Text>
          <Text style={styles.subtitle}>Start your fitness journey today</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputBox, errors.fullName && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color="#7A7D70" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#B0B0A0"
                value={fullName}
                onChangeText={(t) => { setFullName(t); setErrors({ ...errors, fullName: null }); }}
              />
            </View>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          {/* Email */}
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

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputBox, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#7A7D70" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
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

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputBox, errors.confirm && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#7A7D70" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repeat your password"
                placeholderTextColor="#B0B0A0"
                secureTextEntry={!showConf}
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setErrors({ ...errors, confirm: null }); }}
              />
              <TouchableOpacity onPress={() => setShowConf(!showConf)}>
                <Ionicons name={showConf ? 'eye-off-outline' : 'eye-outline'} size={20} color="#7A7D70" />
              </TouchableOpacity>
            </View>
            {errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#1A1D10" />
              : <Text style={styles.registerBtnText}>Create Account →</Text>
            }
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
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
  registerBtn: {
    backgroundColor: '#CCFF00',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1D10',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  loginText: {
    color: '#7A7D70',
    fontSize: 15,
  },
  loginLink: {
    color: '#674BB5',
    fontSize: 15,
    fontWeight: '700',
  },
});
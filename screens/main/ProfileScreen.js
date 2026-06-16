// screens/main/ProfileScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, Modal,
  TextInput, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  deleteUser, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
} from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { logout } from '../../services/authService';

// ── Streak Ring ───────────────────────────────────────────────
function StreakRing({ logged, goal = 5, size = 110, stroke = 10 }) {
  const pct = Math.min((logged / goal) * 100, 100);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: stroke, borderColor: '#E8EDD0',
      }} />
      {/* Fill — top/right/bottom/left quarters */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: stroke,
        borderColor: 'transparent',
        borderTopColor:    pct > 0  ? '#CCFF00' : 'transparent',
        borderRightColor:  pct > 25 ? '#CCFF00' : 'transparent',
        borderBottomColor: pct > 50 ? '#CCFF00' : 'transparent',
        borderLeftColor:   pct > 75 ? '#CCFF00' : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
      <View style={{ alignItems: 'center' }}>
        <Text style={ringStyles.big}>{logged}/{goal}</Text>
        <Text style={ringStyles.sub}>DAYS</Text>
      </View>
    </View>
  );
}
const ringStyles = StyleSheet.create({
  big: { fontSize: 22, fontWeight: '900', color: '#1A1D10', letterSpacing: -0.5 },
  sub: { fontSize: 10, fontWeight: '700', color: '#9AA08A', letterSpacing: 1.2, marginTop: 2 },
});

// ── Biometric Stat Card ───────────────────────────────────────
function BioCard({ label, value, unit }) {
  return (
    <View style={styles.bioCard}>
      <Text style={styles.bioLabel}>{label}</Text>
      <View style={styles.bioValueRow}>
        <Text style={styles.bioValue}>{value ?? '—'}</Text>
        {unit ? <Text style={styles.bioUnit}> {unit}</Text> : null}
      </View>
    </View>
  );
}

// ── Settings Row ──────────────────────────────────────────────
function SettingsRow({ icon, label, sublabel, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingsIcon}>
        <Ionicons name={icon} size={20} color={danger ? '#E53935' : '#5A6040'} />
      </View>
      <View style={styles.settingsText}>
        <Text style={[styles.settingsLabel, danger && { color: '#E53935' }]}>{label}</Text>
        {sublabel ? <Text style={styles.settingsSub}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C8CCBB" />
    </TouchableOpacity>
  );
}

// ── Change Password Modal ─────────────────────────────────────
function ChangePasswordModal({ visible, onClose }) {
  const [current,  setCurrent]  = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleChange = async () => {
    setError('');
    if (!current || !newPass || !confirm) { setError('All fields are required.'); return; }
    if (newPass !== confirm)              { setError('New passwords do not match.'); return; }
    if (newPass.length < 6)              { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const user       = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPass);
      Alert.alert('Success', 'Password updated successfully.');
      onClose();
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (e) {
      setError(e.code === 'auth/wrong-password' ? 'Current password is incorrect.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>Change Password</Text>

          {['Current Password', 'New Password', 'Confirm New Password'].map((label, i) => {
            const vals   = [current,  newPass,  confirm];
            const setters = [setCurrent, setNewPass, setConfirm];
            return (
              <View key={label} style={modalStyles.fieldWrap}>
                <Text style={modalStyles.fieldLabel}>{label}</Text>
                <TextInput
                  style={modalStyles.input}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor="#B0B0A0"
                  value={vals[i]}
                  onChangeText={setters[i]}
                />
              </View>
            );
          })}

          {error ? <Text style={modalStyles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={modalStyles.saveBtn}
            onPress={handleChange}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#1A1D10" />
              : <Text style={modalStyles.saveBtnText}>Update Password</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
            <Text style={modalStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0D0', alignSelf: 'center', marginBottom: 20 },
  title:         { fontSize: 20, fontWeight: '900', color: '#1A1D10', marginBottom: 20 },
  fieldWrap:     { marginBottom: 14 },
  fieldLabel:    { fontSize: 13, fontWeight: '600', color: '#5A6040', marginBottom: 6 },
  input:         { backgroundColor: '#F4F5EC', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1D10' },
  error:         { fontSize: 13, color: '#E53935', marginBottom: 12, fontWeight: '500' },
  saveBtn:       { backgroundColor: '#CCFF00', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText:   { fontSize: 16, fontWeight: '800', color: '#1A1D10' },
  cancelBtn:     { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#9AA08A' },
});

// ── Profile Screen ────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [showPassModal,setShowPassModal] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // ── Derived ───────────────────────────────────────────────
  const name       = profile?.name        || 'User';
  const weight     = profile?.weight      ?? null;
  const height     = profile?.height      ?? null;
  const joinedAt   = profile?.createdAt
    ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString('default', { month: 'long', year: 'numeric' })
    : null;
  const streakDays = profile?.streakDays  || 0;
  const streakGoal = profile?.streakGoal  || 5;
  const goalType   = profile?.goalType    || 'Not set';

  const bmi = weight && height
    ? (weight / Math.pow(height / 100, 2)).toFixed(1)
    : null;

  const getBmiLabel = (b) => {
    if (!b) return null;
    const n = parseFloat(b);
    if (n < 18.5) return { label: 'Underweight', color: '#4A90D9' };
    if (n < 25)   return { label: 'Healthy',      color: '#CCFF00' };
    if (n < 30)   return { label: 'Overweight',   color: '#FFA000' };
    return               { label: 'Obese',         color: '#E53935' };
  };
  const bmiInfo = getBmiLabel(bmi);

  // ── Handlers ─────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          const result = await logout();
          if (!result.success) {
            Alert.alert('Logout failed', result.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(auth.currentUser);
            } catch (e) {
              Alert.alert('Error', 'Please re-login and try again. ' + e.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <Text style={styles.appName}>CALORA</Text>
        <View style={styles.avatar}>
          {profile?.photoURL || auth.currentUser?.photoURL ? (
            <Image
              source={{ uri: profile?.photoURL || auth.currentUser?.photoURL }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{name[0]?.toUpperCase() || 'C'}</Text>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <StreakRing logged={streakDays} goal={streakGoal} />

          <View style={styles.goalBadge}>
            <Text style={styles.goalBadgeText}>{goalType.toUpperCase()}</Text>
          </View>

          <Text style={styles.heroName}>{name}</Text>
          {joinedAt && (
            <Text style={styles.heroSince}>Active since {joinedAt}</Text>
          )}

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Decorative leaf watermark */}
          <View style={styles.watermark} pointerEvents="none">
            <Ionicons name="leaf-outline" size={80} color="#E8EDD0" />
          </View>
        </View>

        {/* ── Biometrics ── */}
        <Text style={styles.sectionLabel}>BIOMETRICS</Text>
        <View style={styles.bioRow}>
          <BioCard label="Weight" value={weight} unit="kg" />
          <BioCard label="Height" value={height} unit="cm" />
          <View style={[styles.bioCard, { position: 'relative' }]}>
            <Text style={styles.bioLabel}>BMI</Text>
            <Text style={styles.bioValue}>{bmi ?? '—'}</Text>
            {bmiInfo && (
              <View style={[styles.bmiBadge, { backgroundColor: bmiInfo.color + '33' }]}>
                <Text style={[styles.bmiBadgeText, { color: bmiInfo.color === '#CCFF00' ? '#5A6040' : bmiInfo.color }]}>
                  {bmiInfo.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Logging Streak ── */}
        <View style={styles.streakCard}>
          <View style={[styles.streakIcon, { backgroundColor: '#7C5CBF' }]}>
            <MaterialCommunityIcons name="fire" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.streakText}>
            <Text style={styles.streakTitle}>Logging Streak</Text>
            <Text style={styles.streakDays}>{streakDays} Days</Text>
          </View>
          <View style={styles.streakFlames}>
            {[0, 1, 2].map(i => (
              <MaterialCommunityIcons
                key={i}
                name="fire"
                size={22}
                color={i < Math.min(streakDays, 3) ? '#CCFF00' : '#E8EDD0'}
              />
            ))}
          </View>
        </View>

        {/* ── Settings ── */}
        <Text style={styles.sectionLabel}>SETTINGS</Text>
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="person-circle-outline"
            label="Account Settings"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="notifications-outline"
            label="Notification Preferences"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => setShowPassModal(true)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => {}}
          />
        </View>

        {/* ── Danger Zone ── */}
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            sublabel="Permanently removes all your data"
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOG OUT</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      <ChangePasswordModal
        visible={showPassModal}
        onClose={() => setShowPassModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#F9FBE5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FBE5' },
  scroll:           { paddingHorizontal: 16, paddingTop: 8, gap: 16 },

  // Top bar
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 100, paddingBottom: 8 },
  appName:    { fontSize: 22, fontWeight: '900', color: '#1A1D10', letterSpacing: 2 },
  avatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#CCFF00', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage:{ width: 40, height: 40, borderRadius: 20 },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#1A1D10' },

  // Hero card
  heroCard:   { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  goalBadge:  { backgroundColor: '#CCFF00', borderRadius: 50, paddingHorizontal: 14, paddingVertical: 5, marginTop: 14 },
  goalBadgeText: { fontSize: 11, fontWeight: '800', color: '#1A1D10', letterSpacing: 1 },
  heroName:   { fontSize: 26, fontWeight: '900', color: '#1A1D10', marginTop: 10, letterSpacing: -0.3 },
  heroSince:  { fontSize: 14, color: '#9AA08A', marginTop: 4, fontWeight: '500' },
  editBtn:    { backgroundColor: '#CCFF00', borderRadius: 50, paddingHorizontal: 28, paddingVertical: 12, marginTop: 16 },
  editBtnText:{ fontSize: 15, fontWeight: '800', color: '#1A1D10' },
  watermark:  { position: 'absolute', right: -10, top: 10, opacity: 0.5 },

  // Section label
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#9AA08A', letterSpacing: 1.5, marginBottom: -4 },

  // Biometrics
  bioRow:       { flexDirection: 'row', gap: 10 },
  bioCard:      { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  bioLabel:     { fontSize: 12, color: '#9AA08A', fontWeight: '600', marginBottom: 6 },
  bioValueRow:  { flexDirection: 'row', alignItems: 'baseline' },
  bioValue:     { fontSize: 22, fontWeight: '900', color: '#1A1D10' },
  bioUnit:      { fontSize: 13, fontWeight: '600', color: '#9AA08A' },
  bmiBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8, alignSelf: 'flex-start' },
  bmiBadgeText: { fontSize: 11, fontWeight: '700' },

  // Streak card
  streakCard:   { backgroundColor: '#F4F5EC', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakIcon:   { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  streakText:   { flex: 1 },
  streakTitle:  { fontSize: 14, fontWeight: '600', color: '#5A6040' },
  streakDays:   { fontSize: 22, fontWeight: '900', color: '#1A1D10', marginTop: 2 },
  streakFlames: { flexDirection: 'row', gap: 4 },

  // Settings card
  settingsCard: { backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  settingsRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F4F5EC', justifyContent: 'center', alignItems: 'center' },
  settingsText: { flex: 1 },
  settingsLabel:{ fontSize: 15, fontWeight: '600', color: '#1A1D10' },
  settingsSub:  { fontSize: 12, color: '#9AA08A', marginTop: 2 },
  divider:      { height: 1, backgroundColor: '#F4F5EC', marginLeft: 68 },

  // Logout
  logoutBtn:  { backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 18, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#E53935', letterSpacing: 1 },
});

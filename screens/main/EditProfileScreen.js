// screens/main/EditProfileScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, TextInput, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../config/firebase';
import { uploadProfilePhoto } from '../../services/userService';
import { calculateNutritionTargets } from '../../utils/nutritionCalculator';

const GOAL_OPTIONS     = ['Lose Weight', 'Maintain Weight', 'Gain Weight', 'Build Muscle'];
const ACTIVITY_OPTIONS = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'];
const GENDER_OPTIONS   = ['Male', 'Female', 'Other'];

// ── Labelled Input ────────────────────────────────────────────
function Field({ label, value, onChangeText, keyboardType = 'default', editable = true, placeholder }) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, !editable && fieldStyles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        editable={editable}
        placeholder={placeholder || ''}
        placeholderTextColor="#B0B0A0"
      />
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  wrap:          { marginBottom: 14 },
  label:         { fontSize: 13, fontWeight: '600', color: '#5A6040', marginBottom: 6 },
  input:         { backgroundColor: '#F4F5EC', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1D10', fontWeight: '500' },
  inputDisabled: { opacity: 0.5 },
});

// ── Pill Selector ─────────────────────────────────────────────
function PillSelector({ label, options, selected, onSelect }) {
  return (
    <View style={pillStyles.wrap}>
      <Text style={pillStyles.label}>{label}</Text>
      <View style={pillStyles.row}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[pillStyles.pill, selected === opt && pillStyles.pillActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[pillStyles.pillText, selected === opt && pillStyles.pillTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  wrap:           { marginBottom: 14 },
  label:          { fontSize: 13, fontWeight: '600', color: '#5A6040', marginBottom: 10 },
  row:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:           { borderRadius: 50, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#F4F5EC' },
  pillActive:     { backgroundColor: '#CCFF00' },
  pillText:       { fontSize: 13, fontWeight: '600', color: '#9AA08A' },
  pillTextActive: { color: '#1A1D10', fontWeight: '700' },
});

// ── Goal Dropdown ─────────────────────────────────────────────
function GoalDropdown({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dropStyles.wrap}>
      <Text style={dropStyles.label}>Primary Goal</Text>
      <TouchableOpacity style={dropStyles.trigger} onPress={() => setOpen(o => !o)}>
        <Text style={dropStyles.triggerText}>{value || 'Select goal'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#5A6040" />
      </TouchableOpacity>
      {open && (
        <View style={dropStyles.menu}>
          {GOAL_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[dropStyles.menuItem, value === opt && dropStyles.menuItemActive]}
              onPress={() => { onSelect(opt); setOpen(false); }}
            >
              <Text style={[dropStyles.menuText, value === opt && dropStyles.menuTextActive]}>
                {opt}
              </Text>
              {value === opt && <Ionicons name="checkmark" size={16} color="#1A1D10" />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
const dropStyles = StyleSheet.create({
  wrap:           { marginBottom: 14 },
  label:          { fontSize: 13, fontWeight: '600', color: '#5A6040', marginBottom: 6 },
  trigger:        { backgroundColor: '#F4F5EC', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  triggerText:    { fontSize: 15, fontWeight: '600', color: '#1A1D10' },
  menu:           { backgroundColor: '#FFFFFF', borderRadius: 14, marginTop: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
  menuItem:       { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuItemActive: { backgroundColor: '#F4F5EC' },
  menuText:       { fontSize: 15, color: '#5A6040', fontWeight: '500' },
  menuTextActive: { color: '#1A1D10', fontWeight: '700' },
});

// ── BMI Display ───────────────────────────────────────────────
function BmiDisplay({ weight, height }) {
  if (!weight || !height || isNaN(weight) || isNaN(height) || height === 0) return null;
  const bmi = (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1);
  const getInfo = (b) => {
    const n = parseFloat(b);
    if (n < 18.5) return { label: 'Underweight', bg: '#E8F4FF', color: '#4A90D9' };
    if (n < 25)   return { label: 'Healthy',      bg: '#F0FFD6', color: '#5A6040' };
    if (n < 30)   return { label: 'Overweight',   bg: '#FFF3E0', color: '#FFA000' };
    return               { label: 'Obese',         bg: '#FFEBEE', color: '#E53935' };
  };
  const info = getInfo(bmi);
  return (
    <View style={bmiStyles.row}>
      <View>
        <Text style={bmiStyles.label}>Current BMI</Text>
        <Text style={bmiStyles.value}>{bmi}</Text>
      </View>
      <View style={[bmiStyles.badge, { backgroundColor: info.bg }]}>
        <Text style={[bmiStyles.badgeText, { color: info.color }]}>{info.label}</Text>
      </View>
    </View>
  );
}
const bmiStyles = StyleSheet.create({
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F1E8' },
  label:     { fontSize: 12, color: '#9AA08A', fontWeight: '600', marginBottom: 4 },
  value:     { fontSize: 26, fontWeight: '900', color: '#1A1D10' },
  badge:     { borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8 },
  badgeText: { fontSize: 14, fontWeight: '700' },
});

// ── Section Label ─────────────────────────────────────────────
function SectionLabel({ text }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: '#9AA08A', letterSpacing: 1.5, marginBottom: -4 }}>
      {text}
    </Text>
  );
}

// ── Avatar with Upload ────────────────────────────────────────
function AvatarUpload({ name, photoURL, onPhotoChange }) {
  const [uploading,  setUploading]  = useState(false);
  const [uploadPct,  setUploadPct]  = useState(0);

  const pickImage = async () => {
    try {
      // 1. Check current permission status first
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();

      let finalStatus = existingStatus;

      // 2. Only request if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please go to Settings and allow Calora to access your photo library.',
          [{ text: 'OK' }]
        );
        return;
      }

      // 3. Open picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      console.log('ImagePicker result:', JSON.stringify(result));

      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri ?? result.uri ?? null;
      if (!uri) {
        Alert.alert('Error', 'Could not get image. Please try again.');
        return;
      }
      await uploadPhoto(uri);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const uploadPhoto = async (uri) => {
    setUploading(true);
    setUploadPct(0);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const uploadResult = await uploadProfilePhoto(uri, setUploadPct);
      if (!uploadResult.success) {
        throw new Error(uploadResult.message || 'Upload failed');
      }

      if (!uploadResult.imageUrl) {
        throw new Error('Profile photo upload succeeded but no image URL was returned');
      }

      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: uploadResult.imageUrl,
      });
      onPhotoChange(uploadResult.imageUrl);
      setUploading(false);
      setUploadPct(0);
    } catch (e) {
      Alert.alert('Error', e.message);
      setUploading(false);
      setUploadPct(0);
    }
  };

  return (
    <View style={avatarStyles.wrap}>
      {/* Entire avatar is one big tap target */}
      <TouchableOpacity
        onPress={pickImage}
        disabled={uploading}
        activeOpacity={0.8}
        style={avatarStyles.touchable}
      >
        {/* Circle */}
        <View style={avatarStyles.circle}>
          {photoURL
            ? <Image source={{ uri: photoURL }} style={avatarStyles.image} />
            : <Text style={avatarStyles.initial}>{name[0]?.toUpperCase() || 'C'}</Text>
          }
        </View>

        {/* Uploading overlay */}
        {uploading && (
          <View style={avatarStyles.overlay}>
            <Text style={avatarStyles.overlayPct}>{uploadPct}%</Text>
          </View>
        )}

        {/* Pencil badge — purely decorative, touch handled by parent */}
        <View style={avatarStyles.badge}>
          <Ionicons name="pencil" size={14} color="#1A1D10" />
        </View>
      </TouchableOpacity>

      {uploading && (
        <Text style={avatarStyles.uploadingLabel}>Uploading {uploadPct}%</Text>
      )}
    </View>
  );
}
const avatarStyles = StyleSheet.create({
  wrap:           { alignItems: 'center', marginVertical: 8 },
  touchable:      { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  circle:         { width: 96, height: 96, borderRadius: 48, backgroundColor: '#CCFF00', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#B8E800', overflow: 'hidden' },
  image:          { width: 96, height: 96 },
  initial:        { fontSize: 38, fontWeight: '900', color: '#1A1D10' },
  overlay:        { position: 'absolute', top: 0, left: 0, width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  overlayPct:     { fontSize: 18, fontWeight: '900', color: '#CCFF00' },
  badge:          { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: '#CCFF00', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  uploadingLabel: { marginTop: 8, fontSize: 12, color: '#7C5CBF', fontWeight: '600' },
});

// ── Edit Profile Screen ───────────────────────────────────────
export default function EditProfileScreen({ navigation }) {
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Fields
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [age,      setAge]      = useState('');
  const [gender,   setGender]   = useState('');
  const [weight,   setWeight]   = useState('');
  const [height,   setHeight]   = useState('');
  const [goalType, setGoalType] = useState('');
  const [activity, setActivity] = useState('');
  const [photoURL, setPhotoURL] = useState(null);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setName(d.name              || '');
        setEmail(user.email         || '');
        setAge(d.age?.toString()    || '');
        setGender(d.gender          || '');
        setWeight(d.weight?.toString() || '');
        setHeight(d.height?.toString() || '');
        setGoalType(d.goalType      || '');
        setActivity(d.activityLevel || '');
        setPhotoURL(d.photoURL      || null);
      }
      setLoading(false);
    })();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Validation', 'Full name is required.'); return; }
    setSaving(true);
    try {
      const nutritionTargets = calculateNutritionTargets({
        age,
        gender,
        weight,
        height,
        goalType,
        activityLevel: activity,
      });

      await updateDoc(doc(db, 'users', user.uid), {
        name:          name.trim(),
        age:           parseInt(age)      || null,
        gender,
        weight:        parseFloat(weight) || null,
        height:        parseFloat(height) || null,
        goalType,
        activityLevel: activity,
        targetCalories: nutritionTargets.targetCalories,
        macros: nutritionTargets.macros,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
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

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1A1D10" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Avatar with upload ── */}
          <AvatarUpload
            name={name}
            photoURL={photoURL}
            onPhotoChange={(url) => setPhotoURL(url)}
          />

          {/* ── Personal Details ── */}
          <SectionLabel text="PERSONAL DETAILS" />
          <View style={styles.card}>
            <Field label="Full Name"     value={name}   onChangeText={setName}   placeholder="Your full name" />
            <Field label="Email Address" value={email}  editable={false} />
            <Field label="Age"           value={age}    onChangeText={setAge}    keyboardType="numeric" placeholder="e.g. 25" />
            <PillSelector label="Gender" options={GENDER_OPTIONS} selected={gender} onSelect={setGender} />
          </View>

          {/* ── Biometrics ── */}
          <SectionLabel text="BIOMETRICS" />
          <View style={styles.card}>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="75" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="175" />
              </View>
            </View>
            <BmiDisplay weight={weight} height={height} />
          </View>

          {/* ── Goal Settings ── */}
          <SectionLabel text="GOAL SETTINGS" />
          <View style={styles.card}>
            <GoalDropdown value={goalType} onSelect={setGoalType} />
            <PillSelector
              label="Activity Level"
              options={ACTIVITY_OPTIONS}
              selected={activity}
              onSelect={setActivity}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Save Button (sticky) ── */}
      <View style={styles.saveWrap}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#1A1D10" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#F9FBE5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FBE5' },
  scroll:           { paddingHorizontal: 16, paddingTop: 8, gap: 16 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1A1D10', letterSpacing: -0.3 },

  card:   { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  twoCol: { flexDirection: 'row', gap: 12 },

  saveWrap:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#F9FBE5' },
  saveBtn:     { backgroundColor: '#CCFF00', borderRadius: 20, paddingVertical: 18, alignItems: 'center', shadowColor: '#CCFF00', shadowOpacity: 0.4, shadowRadius: 12, elevation: 4 },
  saveBtnText: { fontSize: 17, fontWeight: '900', color: '#1A1D10', letterSpacing: 0.3 },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resetProfileMacros, updateProfileMacros } from '../services/profileService';

const FIELD_LABELS = {
  targetCalories: 'Calories',
  protein: 'Protein (g)',
  carbs: 'Carbs (g)',
  fats: 'Fats (g)',
};

const sanitizeNumericInput = (value) => String(value || '').replace(/[^0-9]/g, '');

const toPositiveInteger = (value) => {
  const parsed = parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createEmptyErrors = () => ({
  targetCalories: '',
  protein: '',
  carbs: '',
  fats: '',
});

export default function MacroEditorModal({
  visible,
  initialValues,
  onClose,
  onSaved,
  onReset,
}) {
  const [targetCalories, setTargetCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [errors, setErrors] = useState(createEmptyErrors());
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const normalizedValues = useMemo(() => ({
    targetCalories: toPositiveInteger(initialValues?.targetCalories),
    protein: toPositiveInteger(initialValues?.protein),
    carbs: toPositiveInteger(initialValues?.carbs),
    fats: toPositiveInteger(initialValues?.fats),
  }), [initialValues]);

  useEffect(() => {
    if (!visible) return;

    setTargetCalories(normalizedValues.targetCalories === 0 ? '0' : String(normalizedValues.targetCalories || ''));
    setProtein(normalizedValues.protein === 0 ? '0' : String(normalizedValues.protein || ''));
    setCarbs(normalizedValues.carbs === 0 ? '0' : String(normalizedValues.carbs || ''));
    setFats(normalizedValues.fats === 0 ? '0' : String(normalizedValues.fats || ''));
    setErrors(createEmptyErrors());
    setSaving(false);
    setResetting(false);
  }, [normalizedValues, visible]);

  const validateField = (label, value) => {
    const numeric = toPositiveInteger(value);
    if (!value || numeric <= 0) {
      return `${label} must be greater than 0.`;
    }
    return '';
  };

  const validateForm = () => {
    const nextErrors = {
      targetCalories: validateField(FIELD_LABELS.targetCalories, targetCalories),
      protein: validateField(FIELD_LABELS.protein, protein),
      carbs: validateField(FIELD_LABELS.carbs, carbs),
      fats: validateField(FIELD_LABELS.fats, fats),
    };

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const buildPayload = () => ({
    targetCalories: toPositiveInteger(targetCalories),
    protein: toPositiveInteger(protein),
    carbs: toPositiveInteger(carbs),
    fats: toPositiveInteger(fats),
  });

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const payload = buildPayload();
    setSaving(true);
    try {
      const result = await updateProfileMacros(payload);
      if (!result?.success) {
        throw new Error(result?.message || 'Could not save macro targets.');
      }

      onSaved?.(payload, result?.data || null);
      onClose?.();
    } catch (error) {
      Alert.alert('Save failed', error.message || 'Could not save macro targets.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const result = await resetProfileMacros();
      if (!result?.success) {
        throw new Error(result?.message || 'Could not reset macro targets.');
      }

      const nextValues = result?.data || null;
      onReset?.(nextValues);
      onClose?.();
    } catch (error) {
      Alert.alert('Reset failed', error.message || 'Could not reset macro targets.');
    } finally {
      setResetting(false);
    }
  };

  const handleDismiss = () => {
    if (saving || resetting) return;
    onClose?.();
  };

  const renderField = (key, value, setter, placeholder) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{FIELD_LABELS[key]}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => {
          setter(sanitizeNumericInput(text));
          if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: '' }));
          }
        }}
        onBlur={() => {
          setErrors((prev) => ({ ...prev, [key]: validateField(FIELD_LABELS[key], value) }));
        }}
        placeholder={placeholder}
        placeholderTextColor="#A0B060"
        keyboardType="number-pad"
        style={[styles.input, errors[key] && styles.inputError]}
        returnKeyType="done"
      />
      {errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropPressable} activeOpacity={1} onPress={handleDismiss} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Edit Macro Targets</Text>
                <Text style={styles.subtitle}>Adjust your daily calorie and macro goals.</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
                <Ionicons name="close" size={20} color="#1A1D10" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {renderField('targetCalories', targetCalories, setTargetCalories, 'e.g. 2400')}
              <View style={styles.row}>
                <View style={styles.rowCol}>
                  {renderField('protein', protein, setProtein, 'e.g. 150')}
                </View>
                <View style={styles.rowCol}>
                  {renderField('carbs', carbs, setCarbs, 'e.g. 280')}
                </View>
              </View>
              {renderField('fats', fats, setFats, 'e.g. 70')}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, (saving || resetting) && styles.btnDisabled]}
                  onPress={handleReset}
                  disabled={saving || resetting}
                  activeOpacity={0.85}
                >
                  {resetting ? (
                    <ActivityIndicator color="#1A1D10" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>Reset to Recommended</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, (saving || resetting) && styles.btnDisabled]}
                  onPress={handleSave}
                  disabled={saving || resetting}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#1A1D10" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#F9FBE5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D8E0B0',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1D10',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7A40',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF0E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 8,
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5A6040',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E0D0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#1A1D10',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowCol: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1A1D10',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1D10',
    textAlign: 'center',
  },
  primaryBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#CCFF00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1D10',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

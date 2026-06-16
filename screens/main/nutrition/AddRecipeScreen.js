import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import {
  createRecipe,
  createRecipeWithImage,
} from '../../../services/recipeService';

// ── Constants ─────────────────────────────────────────────────
const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Drink'];
const DIETARY_TYPES = ['Veg', 'Non-Veg', 'Vegan'];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
const SPICE_OPTIONS = ['No Spice', 'Mild', 'Medium', 'Hot'];
const DIETARY_TAGS = ['High Protein', 'Low Carb', 'Keto', 'Gluten Free', 'Dairy Free'];

const normalizeDietaryType = (value) => {
  if (value === 'Non-Veg') return 'non-veg';
  if (value === 'Veg') return 'veg';
  if (value === 'Vegan') return 'vegan';
  return value.toLowerCase();
};

const getToken = async () => {
  try {
    const user = getAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
};

// ── Section Card Wrapper ──────────────────────────────────────
function SectionCard({ children, style }) {
  return <View style={[styles.sectionCard, style]}>{children}</View>;
}

// ── Label ─────────────────────────────────────────────────────
function FieldLabel({ text }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

// ── Dropdown (simple tap-to-cycle) ───────────────────────────
function Dropdown({ options, value, onChange, style }) {
  const currentIndex = options.indexOf(value);
  const handlePress = () => {
    const next = options[(currentIndex + 1) % options.length];
    onChange(next);
  };
  return (
    <TouchableOpacity style={[styles.dropdown, style]} onPress={handlePress} activeOpacity={0.8}>
      <Text style={styles.dropdownText} numberOfLines={1}>{value}</Text>
      <Ionicons name="chevron-down" size={14} color="#6B7A40" />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function AddRecipeScreen({ navigation }) {
  // Image
  const [imageUri, setImageUri] = useState(null);

  // Basic info
  const [recipeName, setRecipeName] = useState('');
  const [category, setCategory] = useState('Breakfast');
  const [cuisine, setCuisine] = useState('');
  const [dietaryType, setDietaryType] = useState('Veg');

  // Nutrition
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fats, setFats] = useState('0');
  const [servingSize, setServingSize] = useState('');
  const [servings, setServings] = useState('1');
  const [prepTime, setPrepTime] = useState('10');
  const [cookTime, setCookTime] = useState('20');

  // Ingredients
  const [ingredients, setIngredients] = useState(['']);

  // Instructions
  const [steps, setSteps] = useState(['']);

  // Difficulty & Spice
  const [difficulty, setDifficulty] = useState('Easy');
  const [spice, setSpice] = useState('No Spice');

  // Tags
  const [selectedTags, setSelectedTags] = useState([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Derived ─────────────────────────────────────────────────
  const totalTime = (parseInt(prepTime) || 0) + (parseInt(cookTime) || 0);

  // ── Image Picker ─────────────────────────────────────────────
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to add a recipe image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ── Ingredients ───────────────────────────────────────────────
  const addIngredient = () => {
    if (ingredients.length >= 20) return;
    setIngredients(prev => [...prev, '']);
  };

  const updateIngredient = (text, index) => {
    setIngredients(prev => prev.map((item, i) => (i === index ? text : item)));
  };

  const removeIngredient = (index) => {
    if (ingredients.length === 1) return;
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // ── Steps ─────────────────────────────────────────────────────
  const addStep = () => {
    setSteps(prev => [...prev, '']);
  };

  const updateStep = (text, index) => {
    setSteps(prev => prev.map((item, i) => (i === index ? text : item)));
  };

  const removeStep = (index) => {
    if (steps.length === 1) return;
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  // ── Tags ──────────────────────────────────────────────────────
  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // ── Validation ────────────────────────────────────────────────
  const validate = () => {
    if (!recipeName.trim()) {
      Alert.alert('Missing info', 'Please enter a recipe name.');
      return false;
    }
    if (ingredients.filter(i => i.trim()).length === 0) {
      Alert.alert('Missing info', 'Please add at least one ingredient.');
      return false;
    }
    if (steps.filter(s => s.trim()).length === 0) {
      Alert.alert('Missing info', 'Please add at least one instruction step.');
      return false;
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Not signed in', 'Please sign in to publish a recipe.');
        return;
      }

      const payload = {
        title: recipeName.trim(),
        category,
        cuisine: cuisine.trim(),
        dietaryType: normalizeDietaryType(dietaryType),
        perServing: {
          calories: parseInt(calories) || 0,
          protein: parseInt(protein) || 0,
          carbs: parseInt(carbs) || 0,
          fat: parseInt(fats) || 0,
        },
        servingSize: servingSize.trim(),
        servings: parseInt(servings) || 1,
        prepTime: parseInt(prepTime) || 0,
        cookTime: parseInt(cookTime) || 0,
        totalTime,
        ingredients: ingredients.filter(i => i.trim()).map(name => ({ name: name.trim() })),
        instructions: steps.filter(s => s.trim()).map((desc, idx) => ({
          step: idx + 1,
          text: desc.trim(),
        })),
        difficulty,
        spiceLevel: spice,
        dietaryTags: selectedTags,
      };

      const res = imageUri
        ? await createRecipeWithImage({
            imageUri,
            recipeData: payload,
            onUploadProgress: setUploadProgress,
          })
        : await createRecipe(payload);

      if (res?.success) {
        Alert.alert('Published! 🎉', 'Your recipe is now live for the community.', [
          { text: 'Great!', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', res?.message || 'Failed to publish recipe. Please try again.');
      }
    } catch (err) {
      console.error('AddRecipe error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1D10" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Recipe</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color="#1A1D10" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Photo Picker ── */}
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.85}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.pickedImage} />
            ) : (
              <View style={styles.imagePickerInner}>
                <View style={styles.cameraIconCircle}>
                  <Ionicons name="camera-outline" size={28} color="#6B7A40" />
                </View>
                <Text style={styles.imagePickerText}>Tap to add a recipe photo</Text>
              </View>
            )}
            {imageUri && (
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* ── Recipe Name ── */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="RECIPE NAME" />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. High-Protein Quinoa Bowl"
              placeholderTextColor="#A0B060"
              value={recipeName}
              onChangeText={setRecipeName}
            />
          </View>

          {/* ── Category & Cuisine ── */}
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <FieldLabel text="CATEGORY" />
              <Dropdown options={CATEGORIES} value={category} onChange={setCategory} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <FieldLabel text="CUISINE" />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mediterranean"
                placeholderTextColor="#A0B060"
                value={cuisine}
                onChangeText={setCuisine}
              />
            </View>
          </View>

          {/* ── Dietary Type ── */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="DIETARY TYPE" />
            <View style={styles.dietaryRow}>
              {DIETARY_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.dietaryBtn, dietaryType === type && styles.dietaryBtnActive]}
                  onPress={() => setDietaryType(type)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dietaryBtnText, dietaryType === type && styles.dietaryBtnTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Nutrition Per Serving ── */}
          <SectionCard>
            <Text style={styles.cardTitle}>Nutrition Per Serving</Text>
            <View style={styles.nutritionGrid}>
              {[
                { label: 'CALORIES', value: calories, setter: setCalories },
                { label: 'PROTEIN (G)', value: protein, setter: setProtein },
                { label: 'CARBS (G)', value: carbs, setter: setCarbs },
                { label: 'FATS (G)', value: fats, setter: setFats },
              ].map(({ label, value, setter }) => (
                <View key={label} style={styles.nutritionCell}>
                  <FieldLabel text={label} />
                  <View style={styles.nutritionInput}>
                    <TextInput
                      style={styles.nutritionValue}
                      value={value}
                      onChangeText={setter}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <FieldLabel text="SERVING SIZE" />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 250g"
                  placeholderTextColor="#A0B060"
                  value={servingSize}
                  onChangeText={setServingSize}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <FieldLabel text="SERVINGS" />
                <TextInput
                  style={styles.textInput}
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            </View>

            <View style={styles.timeRow}>
              {[
                { label: 'PREP (MIN)', value: prepTime, setter: setPrepTime },
                { label: 'COOK (MIN)', value: cookTime, setter: setCookTime },
                { label: 'TOTAL (MIN)', value: String(totalTime), setter: null },
              ].map(({ label, value, setter }) => (
                <View key={label} style={styles.timeCell}>
                  <FieldLabel text={label} />
                  <TextInput
                    style={[styles.textInput, !setter && styles.readOnlyInput]}
                    value={value}
                    onChangeText={setter ?? undefined}
                    keyboardType="numeric"
                    editable={!!setter}
                    selectTextOnFocus={!!setter}
                  />
                </View>
              ))}
            </View>
          </SectionCard>

          {/* ── Ingredients ── */}
          <SectionCard>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Ingredients</Text>
              <Text style={styles.cardSubCount}>{ingredients.filter(i => i.trim()).length}/20 Items</Text>
            </View>

            {ingredients.map((ing, index) => (
              <View key={index} style={styles.listInputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Ingredient Name"
                  placeholderTextColor="#A0B060"
                  value={ing}
                  onChangeText={text => updateIngredient(text, index)}
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity onPress={() => removeIngredient(index)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={20} color="#B0BF7A" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.addRowBtn}
              onPress={addIngredient}
              activeOpacity={0.8}
              disabled={ingredients.length >= 20}
            >
              <Ionicons name="add" size={18} color="#4A6020" />
              <Text style={styles.addRowBtnText}>Add Ingredient</Text>
            </TouchableOpacity>
          </SectionCard>

          {/* ── Instructions ── */}
          <SectionCard>
            <Text style={styles.cardTitle}>Instructions</Text>

            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.textInput, styles.stepInput]}
                    placeholder="Describe this step..."
                    placeholderTextColor="#A0B060"
                    value={step}
                    onChangeText={text => updateStep(text, index)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {steps.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeStep(index)}
                      style={styles.removeStepBtn}
                    >
                      <Text style={styles.removeStepText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addRowBtn} onPress={addStep} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#4A6020" />
              <Text style={styles.addRowBtnText}>Add Step</Text>
            </TouchableOpacity>
          </SectionCard>

          {/* ── Difficulty & Spice ── */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="DIFFICULTY & SPICE" />
            <View style={styles.rowFields}>
              <Dropdown
                options={DIFFICULTY_OPTIONS}
                value={difficulty}
                onChange={setDifficulty}
                style={{ flex: 1 }}
              />
              <Dropdown
                options={SPICE_OPTIONS}
                value={spice}
                onChange={setSpice}
                style={{ flex: 1, marginLeft: 12 }}
              />
            </View>
          </View>

          {/* ── Dietary Tags ── */}
          <View style={styles.fieldGroup}>
            <FieldLabel text="DIETARY TAGS" />
            <View style={styles.tagsRow}>
              {DIETARY_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipActive]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tagChipText, selectedTags.includes(tag) && styles.tagChipTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Publish Button ── */}
          <TouchableOpacity
            style={[styles.publishBtn, submitting && styles.publishBtnDisabled]}
            onPress={handlePublish}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              uploadProgress > 0 ? (
                <Text style={styles.publishBtnText}>
                  Uploading {uploadProgress}%
                </Text>
              ) : (
                <ActivityIndicator color="#1A1D10" />
              )
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color="#1A1D10" />
                <Text style={styles.publishBtnText}>Publish Recipe</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.publishNote}>Your recipe will be visible to the community</Text>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FBE5',
  },

  // ── Header ─────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  settingsBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D10',
  },

  // ── Scroll ─────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },

  // ── Image picker ───────────────────────────────────────────
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E8F0BE',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerInner: {
    alignItems: 'center',
    gap: 10,
  },
  cameraIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    fontSize: 13,
    color: '#6B7A40',
    fontWeight: '600',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00000050',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Fields ─────────────────────────────────────────────────
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A9A5B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#1A1D10',
    borderWidth: 1,
    borderColor: '#E4EDB0',
  },
  rowFields: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  readOnlyInput: {
    color: '#6B7A40',
    backgroundColor: '#F0F5D8',
  },

  // ── Dietary type ───────────────────────────────────────────
  dietaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4EDB0',
    overflow: 'hidden',
  },
  dietaryBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dietaryBtnActive: {
    backgroundColor: '#CCFF00',
  },
  dietaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7A40',
  },
  dietaryBtnTextActive: {
    color: '#1A1D10',
  },

  // ── Section card ───────────────────────────────────────────
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F0C8',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1D10',
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardSubCount: {
    fontSize: 12,
    color: '#8A9A5B',
    fontWeight: '600',
  },

  // ── Nutrition ──────────────────────────────────────────────
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  nutritionCell: {
    width: '47%',
  },
  nutritionInput: {
    backgroundColor: '#F5FAE0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4EDB0',
    alignItems: 'center',
    paddingVertical: 12,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D10',
    textAlign: 'center',
    minWidth: 50,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  timeCell: {
    flex: 1,
  },

  // ── Dropdown ───────────────────────────────────────────────
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#E4EDB0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#1A1D10',
    flex: 1,
    marginRight: 6,
  },

  // ── Ingredients / Steps ────────────────────────────────────
  listInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  removeBtn: {
    padding: 4,
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CCFF00',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    marginTop: 4,
  },
  addRowBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A6020',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CCFF00',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 13,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1D10',
  },
  stepInput: {
    minHeight: 90,
    paddingTop: 12,
  },
  removeStepBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  removeStepText: {
    fontSize: 12,
    color: '#B0BF7A',
    fontWeight: '600',
  },

  // ── Tags ───────────────────────────────────────────────────
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E4EDB0',
  },
  tagChipActive: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7A40',
  },
  tagChipTextActive: {
    color: '#1A1D10',
  },

  // ── Publish ────────────────────────────────────────────────
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CCFF00',
    borderRadius: 18,
    paddingVertical: 18,
    marginTop: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#CCFF00',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1D10',
  },
  publishNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8A9A5B',
    marginTop: 10,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import apiRequest from '../../../services/api'; 

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACCENT = '#CCFF00';
const BG = '#F7FAEA';

// ── Macro Chip ───────────────────────────────────────────────────
const MacroChip = ({ value, unit, label }) => (
  <View style={styles.macroChip}>
    <Text style={styles.macroValue}>{value}<Text style={styles.macroUnit}>{unit}</Text></Text>
    <Text style={styles.macroLabel}>{label}</Text>
  </View>
);

// ── Ingredient Row ───────────────────────────────────────────────
const IngredientRow = ({ name, checked, onToggle }) => (
  <TouchableOpacity style={styles.ingredientRow} onPress={onToggle} activeOpacity={0.7}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Ionicons name="checkmark" size={12} color="#1A1D10" />}
    </View>
    <Text style={[styles.ingredientText, checked && styles.ingredientTextChecked]}>
      {name}
    </Text>
  </TouchableOpacity>
);

// ── Step Row ─────────────────────────────────────────────────────
const StepRow = ({ step, text, isActive }) => (
  <View style={styles.stepRow}>
    <View style={[styles.stepBadge, isActive && styles.stepBadgeActive]}>
      <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{step}</Text>
    </View>
    <View style={styles.stepContent}>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────
export default function RecipeDetailScreen({ route, navigation }) {
  const { recipeId } = route.params;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [cookingMode, setCookingMode] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const user = auth.currentUser;

  // ── Fetch recipe from your Node.js backend ───────────────────
  const fetchRecipe = useCallback(async () => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const data = await apiRequest(`/recipes/${recipeId}`, 'GET', null, token);
    
    if (data.success) {
      setRecipe(data.data);
      if (user?.uid && data.data.savedBy?.includes(user.uid)) {
        setSaved(true);
      }
    }
  } catch (e) {
    console.error('Recipe fetch error:', e);
  } finally {
    setLoading(false);
  }
}, [recipeId, user?.uid]);
  useEffect(() => { fetchRecipe(); }, [fetchRecipe]);

  // ── Toggle Save ──────────────────────────────────────────────
 const toggleSave = async () => {
  if (!user?.uid || saving) return;
  setSaving(true);
  try {
    const token = await auth.currentUser?.getIdToken();
    const endpoint = saved ? `/recipes/${recipeId}/unsave` : `/recipes/${recipeId}/save`;
    const data = await apiRequest(endpoint, 'POST', null, token);
    
    if (data.success) {
      setSaved(prev => !prev);
    }
  } catch (e) {
    console.error('Save error:', e);
  } finally {
    setSaving(false);
  }
};

  // ── Toggle Ingredient Check ──────────────────────────────────
  const toggleIngredient = (index) => {
    setCheckedIngredients(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // ── Tip (rule-based, from recipe data) ──────────────────────
  const getTip = (recipe) => {
    if (!recipe) return null;
    if (recipe.dietaryTags?.includes('High Protein'))
      return `Add a handful of roasted chickpeas for an extra 5g of fiber and a satisfying crunch!`;
    if (recipe.dietaryTags?.includes('Low Carb'))
      return `Swap rice for cauliflower rice to keep it low carb and add more volume.`;
    if (recipe.dietaryType === 'vegan')
      return `Use nutritional yeast for a cheesy flavour boost without any dairy.`;
    return `Let the dish rest for 2 minutes before serving to let the flavours settle.`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={40} color="#9AA08A" />
          <Text style={styles.errorText}>Recipe not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.errorBack}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tip = getTip(recipe);
  const totalIngredients = recipe.ingredients?.length || 0;
  const checkedCount = Object.values(checkedIngredients).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      >
        {/* ── Hero Image ── */}
        <View style={styles.heroWrap}>
          {recipe.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="restaurant-outline" size={48} color="#4A5568" />
            </View>
          )}

          {/* Overlay gradient feel via dark bottom */}
          <View style={styles.heroOverlay} />

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#1A1D10" />
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity style={styles.saveBtn} onPress={toggleSave} disabled={saving}>
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saved ? ACCENT : '#1A1D10'}
            />
          </TouchableOpacity>
        </View>

        {/* ── Content Card ── */}
        <View style={styles.contentCard}>

          {/* Title & Description */}
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          {recipe.description ? (
            <Text style={styles.recipeDesc}>{recipe.description}</Text>
          ) : null}

          {/* Meta Row */}
          <View style={styles.metaRow}>
            {recipe.totalTime ? (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.metaText}>{recipe.totalTime} min</Text>
              </View>
            ) : null}
            {recipe.servings ? (
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={14} color="#6B7280" />
                <Text style={styles.metaText}>{recipe.servings} Servings</Text>
              </View>
            ) : null}
          </View>

          {/* Dietary Tags */}
          {recipe.dietaryTags?.length > 0 && (
            <View style={styles.tagsRow}>
              {recipe.dietaryTags.map((tag, i) => (
                <View key={i} style={styles.dietaryTag}>
                  <Ionicons name="leaf-outline" size={12} color="#3B6D11" />
                  <Text style={styles.dietaryTagText}>
                    {recipe.dietaryType === 'veg' ? 'Veg' : recipe.dietaryType === 'vegan' ? 'Vegan' : 'Non-Veg'} / {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Macro Grid */}
          <View style={styles.macroGrid}>
            <MacroChip value={recipe.perServing?.calories || 0} unit="" label="KCAL" />
            <MacroChip value={`${recipe.perServing?.protein || 0}g`} unit="" label="PROTEIN" />
            <MacroChip value={`${recipe.perServing?.carbs || 0}g`} unit="" label="CARBS" />
            <MacroChip value={`${recipe.perServing?.fat || 0}g`} unit="" label="FATS" />
          </View>

          {/* ── Ingredients ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {totalIngredients > 0 && (
                <Text style={styles.sectionMeta}>{checkedCount}/{totalIngredients}</Text>
              )}
            </View>
            {recipe.ingredients?.map((ing, i) => (
              <IngredientRow
                key={i}
                name={ing.name}
                checked={!!checkedIngredients[i]}
                onToggle={() => toggleIngredient(i)}
              />
            ))}
          </View>

          {/* ── Cooking Steps ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cooking Steps</Text>
            {recipe.instructions?.map((ins, i) => (
              <StepRow
                key={i}
                step={ins.step || i + 1}
                text={ins.text}
                isActive={cookingMode && activeStep === i}
              />
            ))}
          </View>

          {/* ── Tip Card ── */}
          {tip && (
            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Ionicons name="sparkles" size={14} color={ACCENT} />
                <Text style={styles.tipLabel}>ASTRA TIP</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          )}

          {/* Bottom spacing for sticky button */}
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* ── Sticky Start Cooking Button ── */}
      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => {
            setCookingMode(true);
            setActiveStep(0);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="play-circle-outline" size={20} color="#1A1D10" />
          <Text style={styles.startBtnText}>
            {cookingMode ? `Step ${activeStep + 1} of ${recipe.instructions?.length || 1}` : 'Start Cooking'}
          </Text>
        </TouchableOpacity>

        {/* Next Step button in cooking mode */}
        {cookingMode && activeStep < (recipe.instructions?.length || 1) - 1 && (
          <TouchableOpacity
            style={styles.nextStepBtn}
            onPress={() => setActiveStep(p => p + 1)}
          >
            <Ionicons name="arrow-forward" size={18} color="#1A1D10" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  errorBack: { fontSize: 14, color: ACCENT, fontWeight: '800' },
  scroll: { paddingBottom: 0 },

  // Hero
  heroWrap: { width: SCREEN_WIDTH, height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', backgroundColor: '#E8EDD0', alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'transparent' },
  backBtn: { position: 'absolute', top: 48, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffffDD', alignItems: 'center', justifyContent: 'center' },
  saveBtn: { position: 'absolute', top: 48, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffffDD', alignItems: 'center', justifyContent: 'center' },

  // Content
  contentCard: { backgroundColor: BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, padding: 20, gap: 16 },
  recipeTitle: { fontSize: 26, fontWeight: '900', color: '#1A1D10' },
  recipeDesc: { fontSize: 14, color: '#6B7280', lineHeight: 21 },

  // Meta
  metaRow: { flexDirection: 'row', gap: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#E8EDD0' },
  metaText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietaryTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EAF3DE', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  dietaryTagText: { fontSize: 12, fontWeight: '800', color: '#3B6D11' },

  // Macros
  macroGrid: { flexDirection: 'row', gap: 10 },
  macroChip: { flex: 1, backgroundColor: '#F0F4E8', borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  macroValue: { fontSize: 20, fontWeight: '900', color: '#1A1D10' },
  macroUnit: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  macroLabel: { fontSize: 10, fontWeight: '800', color: '#9AA08A', letterSpacing: 0.5 },

  // Sections
  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1A1D10' },
  sectionMeta: { fontSize: 12, color: '#9AA08A', fontWeight: '700' },

  // Ingredients
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EDD0' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#C8CCBB', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: ACCENT, borderColor: ACCENT },
  ingredientText: { flex: 1, fontSize: 14, color: '#1A1D10', fontWeight: '600', lineHeight: 20 },
  ingredientTextChecked: { textDecorationLine: 'line-through', color: '#9AA08A' },

  // Steps
  stepRow: { flexDirection: 'row', gap: 14, paddingBottom: 16 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8EDD0', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepBadgeActive: { backgroundColor: ACCENT },
  stepNumber: { fontSize: 13, fontWeight: '900', color: '#6B7280' },
  stepNumberActive: { color: '#1A1D10' },
  stepContent: { flex: 1, gap: 4 },
  stepTitle: { fontSize: 14, fontWeight: '900', color: '#1A1D10' },
  stepText: { fontSize: 14, color: '#4B5563', lineHeight: 21 },

  // Tip
  tipCard: { backgroundColor: '#F0F4FF', borderRadius: 18, padding: 16, gap: 8, borderLeftWidth: 3, borderLeftColor: ACCENT },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipLabel: { fontSize: 11, fontWeight: '900', color: '#3B6D11', letterSpacing: 1 },
  tipText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },

  // Sticky bottom
  stickyBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, backgroundColor: BG, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8EDD0' },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 999, paddingVertical: 16 },
  startBtnText: { fontSize: 16, fontWeight: '900', color: '#1A1D10' },
  nextStepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8EDD0', alignItems: 'center', justifyContent: 'center' },
});
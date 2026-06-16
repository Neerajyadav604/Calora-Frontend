// screens/main/NutritionScreen.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import useDailyNutrition from '../../hooks/useDailyNutrition';
import apiRequest from '../../services/api';
import { SuccessOverlay } from '../../components/SuccessOverlay';
import { useSuccessOverlay } from '../../hooks/useSuccessOverlay';

const { width } = Dimensions.get('window');
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// â”€â”€â”€ Calorie Ring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CalorieRing({ eaten, target, size = 220, stroke = 18 }) {
  const remaining = Math.max(target - eaten, 0);
  const pct = target > 0 ? Math.min((eaten / target) * 100, 100) : 0;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: '#E8EDD0' }} />
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke,
        borderColor: 'transparent',
        borderTopColor:    pct > 0  ? '#CCFF00' : 'transparent',
        borderRightColor:  pct > 25 ? '#CCFF00' : 'transparent',
        borderBottomColor: pct > 50 ? '#CCFF00' : 'transparent',
        borderLeftColor:   pct > 75 ? '#CCFF00' : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.ringNum}>{remaining.toLocaleString()}</Text>
        <Text style={styles.ringSub}>LEFT</Text>
      </View>
    </View>
  );
}

// â”€â”€â”€ Macro Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MacroBar({ label, current, goal, color }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  return (
    <View style={styles.macroBarWrap}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValues}>{Math.round(current)}g / {Math.round(goal)}g</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// â”€â”€â”€ Meal Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MealItem({ meal, onDelete }) {
  const timeSource = meal.timestamp || meal.loggedAt;
  const time = timeSource
    ? new Date(timeSource).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const mealTypeLabel = String(meal.mealType || 'meal')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
  const grams = meal.grams ?? meal.quantity;
  return (
    <View style={styles.mealItem}>
      <View style={styles.mealIconBox}>
        <Ionicons name="fast-food-outline" size={22} color="#7A7D70" />
      </View>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
        <Text style={styles.mealMeta}>{mealTypeLabel} • {time}</Text>
        {grams ? <Text style={styles.mealGrams}>{grams}g serving</Text> : null}
      </View>
      <View style={styles.mealRight}>
        <Text style={styles.mealCal}>{Math.round(meal.calories)}</Text>
        <Text style={styles.mealCalLabel}>kcal</Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(meal.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={16} color="#FF5252" />
      </TouchableOpacity>
    </View>
  );
}
function Field({ label, value, onChange, placeholder, required }) {
  return (
    <View style={styles.cfField}>
      <Text style={styles.cfLabel}>
        {label}{required ? <Text style={{ color: '#FF5252' }}> *</Text> : null}
      </Text>
      <TextInput
        style={styles.cfInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#B0B0A0"
        keyboardType={label === 'Name' || label === 'Category' ? 'default' : 'numeric'}
        blurOnSubmit={false}
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}

// â”€â”€â”€ Custom Food Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CustomFoodModal({ visible, onClose, prefillName, onFoodCreated }) {
  const [name,     setName]     = useState('');
  const [category, setCategory] = useState('');
  const [calories, setCalories] = useState('');
  const [protein,  setProtein]  = useState('');
  const [carbs,    setCarbs]    = useState('');
  const [fat,      setFat]      = useState('');
  const [saving,   setSaving]   = useState(false);

  // âœ… CHANGE 1: Success overlay state for custom food save
  const { visible: successVisible, config, showSuccess, dismiss } = useSuccessOverlay();

  useEffect(() => {
    if (visible) {
      setName(prefillName || '');
      setCategory('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
    }
  }, [visible]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim())     { Alert.alert('Required', 'Food name is required.'); return; }
    if (!category.trim()) { Alert.alert('Required', 'Category is required.'); return; }
    if (!calories)        { Alert.alert('Required', 'Calories per 100g is required.'); return; }

    setSaving(true);
    try {
      const user  = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const res   = await apiRequest('/foods/custom', 'POST', {
        name:     name.trim(),
        category: category.trim(),
        per100g: {
          calories: parseFloat(calories) || 0,
          protein:  parseFloat(protein)  || 0,
          carbs:    parseFloat(carbs)    || 0,
          fat:      parseFloat(fat)      || 0,
        },
        source: 'custom',
      }, token);

      if (res.success && res.data) {
        // âœ… CHANGE 1: Replace Alert.alert with success overlay
        // Do NOT call handleClose() here â€” onDismiss handles it after animation
        onFoodCreated(res.data.food || res.data);
        showSuccess({
          message: 'Food Saved!',
          subMessage: `"${name.trim()}" added to database`,
          duration: 1800,
        });
      } else {
        Alert.alert('Error', res.message || 'Could not save custom food.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const previewCalories = parseFloat(calories) || 0;
  const previewProtein  = parseFloat(protein)  || 0;
  const previewCarbs    = parseFloat(carbs)    || 0;
  const previewFat      = parseFloat(fat)      || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#1A1D10" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Custom Food</Text>
            <TouchableOpacity
              style={[styles.cfSaveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#1A1D10" />
                : <Text style={styles.cfSaveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.cfScroll}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cfBanner}>
              <Ionicons name="information-circle-outline" size={18} color="#5A6040" />
              <Text style={styles.cfBannerText}>
                Saved to the database â€” easy to find and log again next time.
              </Text>
            </View>

            <Text style={styles.cfSection}>Basic Info</Text>
            <Field label="Name"     value={name}     onChange={setName}     placeholder="e.g. Homemade Paneer" required />
            <Field label="Category" value={category} onChange={setCategory} placeholder="e.g. Dairy, Snacks"   required />

            <Text style={styles.cfSection}>Nutrition per 100g</Text>

            <View style={styles.cfField}>
              <Text style={styles.cfLabel}>Calories (kcal)<Text style={{ color: '#FF5252' }}> *</Text></Text>
              <TextInput
                style={[styles.cfInput, styles.cfHighlight]}
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor="#B0B0A0"
                keyboardType="numeric"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.cfMacroGrid}>
              {[
                { label: 'Protein (g)', val: protein, set: setProtein, color: '#CCFF00' },
                { label: 'Carbs (g)',   val: carbs,   set: setCarbs,   color: '#7C5CBF' },
                { label: 'Fat (g)',     val: fat,     set: setFat,     color: '#4A90D9' },
              ].map((m) => (
                <View key={m.label} style={styles.cfMacroItem}>
                  <View style={[styles.cfMacroDot, { backgroundColor: m.color }]} />
                  <Text style={styles.cfLabel}>{m.label}</Text>
                  <TextInput
                    style={styles.cfMacroInput}
                    value={m.val}
                    onChangeText={m.set}
                    placeholder="0"
                    placeholderTextColor="#B0B0A0"
                    keyboardType="numeric"
                    blurOnSubmit={false}
                  />
                </View>
              ))}
            </View>

            {calories ? (
              <View style={styles.cfPreview}>
                <Text style={styles.cfPreviewTitle}>Preview per 100g</Text>
                <View style={styles.previewRow}>
                  {[
                    { label: 'Cal',     val: `${previewCalories} kcal`, color: '#CCFF00' },
                    { label: 'Protein', val: `${previewProtein}g`,      color: '#4A90D9' },
                    { label: 'Carbs',   val: `${previewCarbs}g`,        color: '#7C5CBF' },
                    { label: 'Fat',     val: `${previewFat}g`,          color: '#FF9500' },
                  ].map((n) => (
                    <View key={n.label} style={styles.previewItem}>
                      <View style={[styles.previewDot, { backgroundColor: n.color }]} />
                      <Text style={styles.previewVal}>{n.val}</Text>
                      <Text style={styles.previewLabel}>{n.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* âœ… CHANGE 1: Success overlay â€” placed outside SafeAreaView so it renders above everything */}
      <SuccessOverlay
        visible={successVisible}
        message={config.message}
        subMessage={config.subMessage}
        duration={config.duration}
        onDismiss={() => {
          dismiss();
          handleClose(); // close modal AFTER animation finishes
        }}
      />
    </Modal>
  );
}

// â”€â”€â”€ Log Meal Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LogMealModal({ visible, onClose, onLogged }) {
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [grams,      setGrams]      = useState('100');
  const [mealType,   setMealType]   = useState('Breakfast');
  const [logging,    setLogging]    = useState(false);
  const [searchErr,  setSearchErr]  = useState('');
  const [noResults,  setNoResults]  = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const debounceRef = useRef(null);

  const { visible: successVisible, config, showSuccess, dismiss } = useSuccessOverlay();

  const resetModal = () => {
    setQuery(''); setResults([]); setSelected(null);
    setGrams('100'); setMealType('Breakfast');
    setSearchErr(''); setSearching(false); setNoResults(false);
  };

  const handleClose = () => { resetModal(); onClose(); };

  const handleSearch = (text) => {
    setQuery(text);
    setSearchErr('');
    setNoResults(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiRequest(`/foods/search?q=${encodeURIComponent(text.trim())}&limit=15`);
        if (res.success && res.data?.foods) {
          setResults(res.data.foods);
          setNoResults(res.data.foods.length === 0);
        } else {
          setSearchErr(res.message || 'Search failed.');
        }
      } catch (e) {
        setSearchErr('Could not reach server.');
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const computeNutrition = (food, g) => {
    const ratio = g / 100;
    return {
      calories: (food.per100g.calories || 0) * ratio,
      protein:  (food.per100g.protein  || 0) * ratio,
      carbs:    (food.per100g.carbs    || 0) * ratio,
      fats:     (food.per100g.fat      || 0) * ratio,
    };
  };

  const handleLog = async () => {
    if (!selected) return;
    const g = parseFloat(grams);
    if (!g || g <= 0) { Alert.alert('Invalid', 'Enter a valid gram amount.'); return; }
    setLogging(true);
    try {
      const nutr = computeNutrition(selected, g);
      const timestamp = new Date().toISOString();
      const newMeal = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: selected.name,
        foodId: selected._id || selected.id || null,
        grams: g,
        quantity: g,
        mealType,
        calories: nutr.calories,
        protein: nutr.protein,
        carbs: nutr.carbs,
        fat: nutr.fats,
        fats: nutr.fats,
        timestamp,
        loggedAt: timestamp,
      };

      if (typeof onLogged === 'function') {
        await onLogged(newMeal);
      }

      showSuccess({
        message: 'Meal Logged!',
        subMessage: `${selected.name} · ${Math.round(nutr.calories)} kcal`,
        duration: 1600,
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to log meal.');
    } finally {
      setLogging(false);
    }
  };

  const handleCustomFoodCreated = (food) => {
    setCustomOpen(false);
    setSelected(food);
    setQuery(food.name);
    setResults([]);
    setNoResults(false);
  };

  const preview = selected && grams ? computeNutrition(selected, parseFloat(grams) || 0) : null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log a Meal</Text>
              <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#1A1D10" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSectionLabel}>Meal Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.mealTypeRow}
                keyboardShouldPersistTaps="always"
              >
                {MEAL_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                    onPress={() => setMealType(type)}
                  >
                    <Text style={[styles.mealTypeBtnText, mealType === type && styles.mealTypeBtnTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalSectionLabel}>Search Food</Text>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={20} color="#9AA08A" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search dal, rice, chicken..."
                  placeholderTextColor="#B0B0A0"
                  value={query}
                  onChangeText={handleSearch}
                  autoCorrect={false}
                  blurOnSubmit={false}
                />
                {searching && <ActivityIndicator size="small" color="#CCFF00" />}
                {query.length > 0 && !searching && (
                  <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setNoResults(false); }}>
                    <Ionicons name="close-circle" size={18} color="#B0B0A0" />
                  </TouchableOpacity>
                )}
              </View>

              {searchErr ? <Text style={styles.searchErr}>{searchErr}</Text> : null}

              {noResults && !selected && (
                <View style={styles.noResultsCard}>
                  <View style={styles.noResultsIcon}>
                    <Ionicons name="search-outline" size={28} color="#9AA08A" />
                  </View>
                  <Text style={styles.noResultsTitle}>"{query}" not in database</Text>
                  <Text style={styles.noResultsSub}>Add it as a custom food — saved for future use.</Text>
                  <TouchableOpacity style={styles.addCustomBtn} onPress={() => setCustomOpen(true)}>
                    <Ionicons name="add-circle-outline" size={18} color="#1A1D10" />
                    <Text style={styles.addCustomBtnText}>Add "{query}" as Custom Food</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!selected && results.length > 0 && (
                <View style={styles.resultsList}>
                  {results.map((food) => (
                    <TouchableOpacity
                      key={food._id}
                      style={styles.resultItem}
                      onPress={() => { setSelected(food); setResults([]); }}
                    >
                      <View style={styles.resultLeft}>
                        <Text style={styles.resultName}>{food.name}</Text>
                        <Text style={styles.resultCategory}>{food.category}</Text>
                      </View>
                      <View style={styles.resultRight}>
                        <Text style={styles.resultCal}>{Math.round(food.per100g.calories)}</Text>
                        <Text style={styles.resultCalLabel}>kcal/100g</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.addCustomInline} onPress={() => setCustomOpen(true)}>
                    <Ionicons name="add-circle-outline" size={16} color="#5A6040" />
                    <Text style={styles.addCustomInlineText}>Can't find it? Add a custom food</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!query && !selected && (
                <TouchableOpacity style={styles.customFoodShortcut} onPress={() => setCustomOpen(true)}>
                  <View style={styles.customFoodShortcutIcon}>
                    <Ionicons name="create-outline" size={20} color="#5A6040" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customFoodShortcutTitle}>Add Custom Food</Text>
                    <Text style={styles.customFoodShortcutSub}>Create a food not in the database</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9AA08A" />
                </TouchableOpacity>
              )}

              {selected && (
                <View style={styles.selectedCard}>
                  <View style={styles.selectedHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.selectedNameRow}>
                        <Text style={styles.selectedName}>{selected.name}</Text>
                        {selected.source === 'custom' && (
                          <View style={styles.customBadge}>
                            <Text style={styles.customBadgeText}>Custom</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.selectedCategory}>{selected.category}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSelected(null); setQuery(''); }}>
                      <Ionicons name="close-circle" size={22} color="#9AA08A" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.per100Row}>
                    {[
                      { label: 'Cal',     val: Math.round(selected.per100g.calories) },
                      { label: 'Protein', val: `${selected.per100g.protein}g`        },
                      { label: 'Carbs',   val: `${selected.per100g.carbs}g`          },
                      { label: 'Fat',     val: `${selected.per100g.fat}g`            },
                    ].map((n) => (
                      <View key={n.label} style={styles.per100Item}>
                        <Text style={styles.per100Val}>{n.val}</Text>
                        <Text style={styles.per100Label}>{n.label}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.modalSectionLabel}>Serving Size (grams)</Text>
                  <View style={styles.gramsRow}>
                    <TouchableOpacity style={styles.gramBtn} onPress={() => setGrams(String(Math.max((parseFloat(grams) || 0) - 10, 10)))}>
                      <Ionicons name="remove" size={20} color="#1A1D10" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.gramsInput}
                      value={grams}
                      onChangeText={setGrams}
                      keyboardType="numeric"
                      blurOnSubmit={false}
                      selectTextOnFocus
                    />
                    <Text style={styles.gramsUnit}>g</Text>
                    <TouchableOpacity style={styles.gramBtn} onPress={() => setGrams(String((parseFloat(grams) || 0) + 10))}>
                      <Ionicons name="add" size={20} color="#1A1D10" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.presetRow}>
                    {['50', '100', '150', '200', '250'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.presetBtn, grams === g && styles.presetBtnActive]}
                        onPress={() => setGrams(g)}
                      >
                        <Text style={[styles.presetText, grams === g && styles.presetTextActive]}>{g}g</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {preview && (
                    <View style={styles.previewCard}>
                      <Text style={styles.previewTitle}>Nutrition for {grams}g</Text>
                      <View style={styles.previewRow}>
                        {[
                          { label: 'Calories', val: Math.round(preview.calories), unit: 'kcal', color: '#CCFF00' },
                          { label: 'Protein',  val: Math.round(preview.protein),  unit: 'g',    color: '#4A90D9' },
                          { label: 'Carbs',    val: Math.round(preview.carbs),    unit: 'g',    color: '#7C5CBF' },
                          { label: 'Fat',      val: Math.round(preview.fats),     unit: 'g',    color: '#FF9500' },
                        ].map((n) => (
                          <View key={n.label} style={styles.previewItem}>
                            <View style={[styles.previewDot, { backgroundColor: n.color }]} />
                            <Text style={styles.previewVal}>{n.val}{n.unit}</Text>
                            <Text style={styles.previewLabel}>{n.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.logBtn, logging && { opacity: 0.7 }]}
                    onPress={handleLog}
                    disabled={logging}
                  >
                    {logging
                      ? <ActivityIndicator color="#1A1D10" />
                      : <Text style={styles.logBtnText}>Add to {mealType}</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: 60 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <SuccessOverlay
          visible={successVisible}
          message={config.message}
          subMessage={config.subMessage}
          duration={config.duration}
          onDismiss={() => {
            dismiss();
            handleClose();
          }}
        />
      </Modal>

      <CustomFoodModal
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        prefillName={query}
        onFoodCreated={handleCustomFoodCreated}
      />
    </>
  );
}
export default function NutritionScreen() {
  const [profile, setProfile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const user = auth.currentUser;
  const {
    nutrition,
    mealEntries,
    groupedMeals,
    loading: nutritionLoading,
    refreshing,
    error,
    refresh,
    addFood,
    removeFood,
    dateLabel,
    currentDateKey,
  } = useDailyNutrition({ userId: user?.uid });

  const handleModalClose = useCallback(() => setModalOpen(false), []);
  const handleAddFood = useCallback(async (meal) => addFood(meal), [addFood]);
  const handleDelete = useCallback(async (mealId) => {
    await removeFood(mealId);
  }, [removeFood]);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setProfileLoading(false);
      return undefined;
    }

    setProfileLoading(true);
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        setProfile(null);
      }
      setProfileLoading(false);
      setProfileError(null);
    }, (err) => {
      setProfileLoading(false);
      setProfileError(err);
    });

    return unsub;
  }, [user?.uid]);

  if (profileLoading || nutritionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CCFF00" />
      </View>
    );
  }

  const targetCalories = profile?.targetCalories || 0;
  const macros = profile?.macros || { protein: 0, carbs: 0, fats: 0 };
  const eaten = nutrition?.totals?.calories || 0;
  const burned = nutrition?.totals?.burned || nutrition?.burned || 0;
  const protein = nutrition?.totals?.protein || 0;
  const carbs = nutrition?.totals?.carbs || 0;
  const fats = nutrition?.totals?.fat || 0;
  const meals = mealEntries || [];

  const grouped = MEAL_TYPES.reduce((acc, type) => {
    acc[type] = groupedMeals[type.toLowerCase()] || [];
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      <View style={styles.header}>
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => {}} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#1A1D10" />
          </TouchableOpacity>
          <Text style={styles.dateTitle}>{dateLabel}</Text>
          <TouchableOpacity onPress={() => {}} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#1A1D10" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.calendarBtn}>
          <Ionicons name="calendar-outline" size={22} color="#1A1D10" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        <View style={styles.card}>
          <View style={styles.ringCardInner}>
            <CalorieRing eaten={eaten} target={targetCalories} />
          </View>
          <View style={styles.ringStats}>
            <View style={styles.ringStat}>
              <Text style={styles.ringStatLabel}>EATEN</Text>
              <Text style={styles.ringStatVal}>{Math.round(eaten).toLocaleString()}</Text>
            </View>
            <View style={styles.ringStatDivider} />
            <View style={styles.ringStat}>
              <Text style={styles.ringStatLabel}>BURNED</Text>
              <Text style={[styles.ringStatVal, { color: '#7C5CBF' }]}>
                {burned > 0 ? burned.toLocaleString() : '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>MACRONUTRIENTS</Text>
          <View style={{ marginTop: 16, gap: 14 }}>
            <MacroBar label="Protein" current={protein} goal={macros.protein} color="#CCFF00" />
            <MacroBar label="Carbohydrates" current={carbs} goal={macros.carbs} color="#7C5CBF" />
            <MacroBar label="Fats" current={fats} goal={macros.fats} color="#4A90D9" />
          </View>
        </View>

        <View style={styles.foodLogHeader}>
          <Text style={styles.foodLogTitle}>Food Log</Text>
          <TouchableOpacity style={styles.logMealBtn} onPress={() => setModalOpen(true)}>
            <Ionicons name="add" size={18} color="#1A1D10" />
            <Text style={styles.logMealBtnText}>Log Meal</Text>
          </TouchableOpacity>
        </View>

        {meals.length === 0 ? (
          <View style={styles.emptyLog}>
            <Ionicons name="restaurant-outline" size={40} color="#C0C8A0" />
            <Text style={styles.emptyLogText}>No meals logged yet</Text>
            <Text style={styles.emptyLogSub}>Tap "Log Meal" to add your first meal</Text>
          </View>
        ) : (
          MEAL_TYPES.map((type) =>
            grouped[type].length > 0 ? (
              <View key={type} style={{ gap: 8, marginBottom: 8 }}>
                <Text style={styles.mealTypeHeading}>{type}</Text>
                {grouped[type].map((meal) => (
                  <MealItem key={meal.id} meal={meal} onDelete={handleDelete} />
                ))}
              </View>
            ) : null
          )
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <LogMealModal
        visible={modalOpen}
        onClose={handleModalClose}
        onLogged={handleAddFood}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#F9FBE5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FBE5' },
  scroll:           { paddingHorizontal: 16, paddingTop: 8, gap: 16 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  dateNav:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateTitle:   { fontSize: 26, fontWeight: '800', color: '#1A1D10' },
  navBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  calendarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  card:          { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  ringCardInner: { alignItems: 'center', marginBottom: 20 },
  ringNum:       { fontSize: 52, fontWeight: '900', color: '#1A1D10', letterSpacing: -1 },
  ringSub:       { fontSize: 14, fontWeight: '600', color: '#9AA08A', letterSpacing: 2, marginTop: 2 },
  ringStats:     { flexDirection: 'row', justifyContent: 'center', gap: 40 },
  ringStat:      { alignItems: 'center' },
  ringStatLabel: { fontSize: 11, fontWeight: '700', color: '#9AA08A', letterSpacing: 1.5, marginBottom: 4 },
  ringStatVal:   { fontSize: 24, fontWeight: '900', color: '#1A1D10' },
  ringStatDivider: { width: 1, backgroundColor: '#E8EDD0', height: 40, alignSelf: 'center' },

  sectionLabel:  { fontSize: 12, fontWeight: '700', color: '#9AA08A', letterSpacing: 1.5 },
  macroBarWrap:  { gap: 6 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  macroLabel:    { fontSize: 15, fontWeight: '600', color: '#1A1D10' },
  macroValues:   { fontSize: 13, color: '#9AA08A' },
  macroTrack:    { height: 8, backgroundColor: '#EEF0E8', borderRadius: 4 },
  macroFill:     { height: 8, borderRadius: 4 },

  foodLogHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodLogTitle:    { fontSize: 22, fontWeight: '800', color: '#1A1D10' },
  logMealBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#CCFF00', borderRadius: 50, paddingHorizontal: 16, paddingVertical: 10 },
  logMealBtnText:  { fontSize: 14, fontWeight: '700', color: '#1A1D10' },
  mealTypeHeading: { fontSize: 13, fontWeight: '700', color: '#9AA08A', letterSpacing: 1, marginTop: 4 },

  mealItem:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  mealIconBox:  { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F2E8', justifyContent: 'center', alignItems: 'center' },
  mealInfo:     { flex: 1 },
  mealName:     { fontSize: 15, fontWeight: '700', color: '#1A1D10', marginBottom: 2 },
  mealMeta:     { fontSize: 12, color: '#9AA08A' },
  mealGrams:    { fontSize: 11, color: '#B0B8A0', marginTop: 1 },
  mealRight:    { alignItems: 'flex-end' },
  mealCal:      { fontSize: 20, fontWeight: '900', color: '#1A1D10' },
  mealCalLabel: { fontSize: 11, color: '#9AA08A' },
  deleteBtn:    { padding: 6 },

  emptyLog:     { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyLogText: { fontSize: 17, fontWeight: '700', color: '#9AA08A' },
  emptyLogSub:  { fontSize: 13, color: '#B0B8A0', textAlign: 'center' },

  modalSafe:         { flex: 1, backgroundColor: '#F9FBE5' },
  modalHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8EDD0' },
  modalTitle:        { fontSize: 20, fontWeight: '800', color: '#1A1D10' },
  modalCloseBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEEEE8', justifyContent: 'center', alignItems: 'center' },
  modalScroll:       { padding: 20, gap: 12 },
  modalSectionLabel: { fontSize: 12, fontWeight: '700', color: '#9AA08A', letterSpacing: 1.5, marginBottom: 8, marginTop: 4 },

  mealTypeRow:           { marginBottom: 4 },
  mealTypeBtn:           { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 50, backgroundColor: '#EEEEE8', marginRight: 8 },
  mealTypeBtnActive:     { backgroundColor: '#CCFF00' },
  mealTypeBtnText:       { fontSize: 14, fontWeight: '600', color: '#7A7D70' },
  mealTypeBtnTextActive: { color: '#1A1D10' },

  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1.5, borderColor: '#E0E0D0' },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1D10' },
  searchErr:   { fontSize: 13, color: '#FF5252', marginTop: 4 },

  noResultsCard:   { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#E8EDD0' },
  noResultsIcon:   { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0F2E8', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  noResultsTitle:  { fontSize: 16, fontWeight: '800', color: '#1A1D10', textAlign: 'center' },
  noResultsSub:    { fontSize: 13, color: '#9AA08A', textAlign: 'center', lineHeight: 20 },
  addCustomBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#CCFF00', borderRadius: 50, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  addCustomBtnText:{ fontSize: 14, fontWeight: '700', color: '#1A1D10' },

  resultsList:    { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E8EDD0' },
  resultItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F2E8' },
  resultLeft:     { flex: 1 },
  resultName:     { fontSize: 15, fontWeight: '600', color: '#1A1D10', marginBottom: 2 },
  resultCategory: { fontSize: 12, color: '#9AA08A' },
  resultRight:    { alignItems: 'flex-end' },
  resultCal:      { fontSize: 16, fontWeight: '800', color: '#1A1D10' },
  resultCalLabel: { fontSize: 11, color: '#9AA08A' },

  addCustomInline:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F8FAF0' },
  addCustomInlineText: { fontSize: 14, fontWeight: '600', color: '#5A6040' },

  customFoodShortcut:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#E8EDD0', borderStyle: 'dashed' },
  customFoodShortcutIcon:  { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F2E8', justifyContent: 'center', alignItems: 'center' },
  customFoodShortcutTitle: { fontSize: 15, fontWeight: '700', color: '#1A1D10' },
  customFoodShortcutSub:   { fontSize: 12, color: '#9AA08A', marginTop: 2 },

  selectedCard:     { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, gap: 12, borderWidth: 1.5, borderColor: '#CCFF00' },
  selectedHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  selectedNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  selectedName:     { fontSize: 18, fontWeight: '800', color: '#1A1D10', marginBottom: 2 },
  selectedCategory: { fontSize: 13, color: '#9AA08A' },
  customBadge:      { backgroundColor: '#E8F5E9', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  customBadgeText:  { fontSize: 11, fontWeight: '700', color: '#2E7D32' },

  per100Row:   { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F5F7ED', borderRadius: 12, padding: 12 },
  per100Item:  { alignItems: 'center' },
  per100Val:   { fontSize: 16, fontWeight: '800', color: '#1A1D10' },
  per100Label: { fontSize: 11, color: '#9AA08A', marginTop: 2 },

  gramsRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gramBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF0E8', justifyContent: 'center', alignItems: 'center' },
  gramsInput: { flex: 1, fontSize: 28, fontWeight: '900', color: '#1A1D10', textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#CCFF00', paddingBottom: 4 },
  gramsUnit:  { fontSize: 18, fontWeight: '600', color: '#9AA08A' },

  presetRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  presetBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: '#EEF0E8' },
  presetBtnActive: { backgroundColor: '#CCFF00' },
  presetText:      { fontSize: 13, fontWeight: '600', color: '#5A6040' },
  presetTextActive:{ color: '#1A1D10' },

  previewCard:  { backgroundColor: '#F5F7ED', borderRadius: 16, padding: 16 },
  previewTitle: { fontSize: 13, fontWeight: '700', color: '#5A6040', marginBottom: 12, letterSpacing: 0.5 },
  previewRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  previewItem:  { alignItems: 'center', gap: 4 },
  previewDot:   { width: 8, height: 8, borderRadius: 4 },
  previewVal:   { fontSize: 16, fontWeight: '800', color: '#1A1D10' },
  previewLabel: { fontSize: 11, color: '#9AA08A' },

  logBtn:     { backgroundColor: '#CCFF00', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  logBtnText: { fontSize: 17, fontWeight: '800', color: '#1A1D10' },

  cfScroll:       { padding: 20, gap: 8 },
  cfBanner:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F0F4E0', borderRadius: 14, padding: 14, marginBottom: 8 },
  cfBannerText:   { flex: 1, fontSize: 13, color: '#5A6040', lineHeight: 20 },
  cfSection:      { fontSize: 12, fontWeight: '700', color: '#9AA08A', letterSpacing: 1.5, marginTop: 12, marginBottom: 4 },
  cfField:        { gap: 6, marginBottom: 4 },
  cfLabel:        { fontSize: 13, fontWeight: '600', color: '#5A6040' },
  cfInput:        { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1D10', borderWidth: 1.5, borderColor: '#E0E0D0' },
  cfHighlight:    { borderColor: '#CCFF00', fontSize: 22, fontWeight: '800' },
  cfRow:          { gap: 4 },
  cfSaveBtn:      { backgroundColor: '#CCFF00', borderRadius: 50, paddingHorizontal: 20, paddingVertical: 8 },
  cfSaveBtnText:  { fontSize: 15, fontWeight: '800', color: '#1A1D10' },
  cfMacroGrid:    { flexDirection: 'row', gap: 10, marginTop: 8 },
  cfMacroItem:    { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, gap: 6, borderWidth: 1.5, borderColor: '#E8EDD0', alignItems: 'center' },
  cfMacroDot:     { width: 8, height: 8, borderRadius: 4 },
  cfMacroInput:   { fontSize: 20, fontWeight: '800', color: '#1A1D10', textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#E0E0D0', paddingBottom: 2, width: '100%' },
  cfPreview:      { backgroundColor: '#F5F7ED', borderRadius: 16, padding: 16, marginTop: 8 },
  cfPreviewTitle: { fontSize: 12, fontWeight: '700', color: '#5A6040', letterSpacing: 0.5, marginBottom: 10 },
});



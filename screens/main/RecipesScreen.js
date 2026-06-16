import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getFeaturedRecipes,
  getTraditionalRecipes,
  getQuickRecipes,       // ← correct name
  searchRecipes,
  filterRecipes,
  saveRecipe,
  unsaveRecipe,
} from '../../services/recipeService';
import { getAuth } from 'firebase/auth';

const { width } = Dimensions.get('window');

const FILTERS = ['All', 'High Protein', 'Vegan', 'Low Carb', 'Keto', 'Gluten Free'];

// ── Helper: get Firebase ID token ─────────────────────────────
const getToken = async () => {
  try {
    const user = getAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
};

// ── Skeleton Block ────────────────────────────────────────────
function SkeletonBlock({ width: w, height: h, borderRadius = 8, style }) {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        { width: w, height: h, borderRadius, backgroundColor: '#D8E0B0', opacity },
        style,
      ]}
    />
  );
}

function FeaturedSkeleton() {
  return (
    <View style={styles.featuredCard}>
      <SkeletonBlock width="100%" height={200} borderRadius={16} />
      <View style={{ padding: 12, gap: 8 }}>
        <SkeletonBlock width="70%" height={20} />
        <SkeletonBlock width="50%" height={16} />
      </View>
    </View>
  );
}

function SmallCardSkeleton() {
  return (
    <View style={[styles.smallCard, { justifyContent: 'flex-start' }]}>
      <SkeletonBlock width="100%" height={120} borderRadius={12} />
      <View style={{ padding: 8, gap: 6 }}>
        <SkeletonBlock width="80%" height={14} />
        <SkeletonBlock width="50%" height={12} />
      </View>
    </View>
  );
}

function TraditionalSkeleton() {
  return (
    <View style={[styles.traditionalCard, { width: width * 0.75 }]}>
      <SkeletonBlock width={64} height={64} borderRadius={12} />
      <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
        <SkeletonBlock width="70%" height={16} />
        <SkeletonBlock width="40%" height={12} />
        <SkeletonBlock width="30%" height={12} />
      </View>
    </View>
  );
}

function QuickBiteSkeleton() {
  return (
    <View style={styles.quickBiteCard}>
      <SkeletonBlock width={44} height={44} borderRadius={12} />
      <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
        <SkeletonBlock width="60%" height={15} />
        <SkeletonBlock width="40%" height={12} />
      </View>
      <SkeletonBlock width={20} height={20} borderRadius={10} />
    </View>
  );
}

// ── Featured Card ─────────────────────────────────────────────
function FeaturedCard({ recipe, onPress, onSave, savedIds }) {
  const isSaved = savedIds.includes(recipe._id);
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={() => onPress(recipe)} activeOpacity={0.9}>
      <View style={{ position: 'relative' }}>
        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} style={styles.featuredImage} />
        ) : (
          <View style={[styles.featuredImage, styles.noImage]}>
            <Ionicons name="restaurant-outline" size={40} color="#8A9A5B" />
          </View>
        )}
        {recipe.isTopChoice && (
          <View style={styles.topChoiceBadge}>
            <Text style={styles.topChoiceText}>TOP CHOICE</Text>
          </View>
        )}
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(recipe._id, isSaved)}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isSaved ? '#CCFF00' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.featuredInfo}>
        <View style={styles.featuredTitleRow}>
          <Text style={styles.featuredTitle} numberOfLines={1}>{recipe.title}</Text>
          <Text style={styles.featuredCal}>{recipe.perServing?.calories || 0} kcal</Text>
        </View>
        <View style={styles.featuredMeta}>
          <Ionicons name="time-outline" size={14} color="#6B7A40" />
          <Text style={styles.featuredMetaText}>{recipe.totalTime || 0} mins</Text>
          <Ionicons name="barbell-outline" size={14} color="#6B7A40" style={{ marginLeft: 12 }} />
          <Text style={styles.featuredMetaText}>{recipe.perServing?.protein || 0}g Protein</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Small Card ────────────────────────────────────────────────
function SmallCard({ recipe, onPress, onSave, savedIds }) {
  const isSaved = savedIds.includes(recipe._id);
  return (
    <TouchableOpacity style={styles.smallCard} onPress={() => onPress(recipe)} activeOpacity={0.9}>
      <View style={{ position: 'relative' }}>
        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} style={styles.smallImage} />
        ) : (
          <View style={[styles.smallImage, styles.noImage]}>
            <Ionicons name="restaurant-outline" size={28} color="#8A9A5B" />
          </View>
        )}
        <TouchableOpacity style={styles.smallSaveBtn} onPress={() => onSave(recipe._id, isSaved)}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={14}
            color={isSaved ? '#CCFF00' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.smallInfo}>
        <Text style={styles.smallTitle} numberOfLines={1}>{recipe.title}</Text>
        <View style={styles.smallMeta}>
          <Text style={styles.smallCal}>{recipe.perServing?.calories || 0} kcal</Text>
          <Text style={styles.smallTime}>{recipe.totalTime || 0}m</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Traditional Card ──────────────────────────────────────────
function TraditionalCard({ recipe, onPress }) {
  return (
    // FIX: use width * 0.75 so horizontal scroll works properly
    <TouchableOpacity
      style={[styles.traditionalCard, { width: width * 0.75 }]}
      onPress={() => onPress(recipe)}
      activeOpacity={0.9}
    >
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={styles.traditionalImage} />
      ) : (
        <View style={[styles.traditionalImage, styles.noImage]}>
          <Ionicons name="restaurant-outline" size={24} color="#8A9A5B" />
        </View>
      )}
      <View style={styles.traditionalInfo}>
        <Text style={styles.traditionalTitle} numberOfLines={1}>{recipe.title}</Text>
        <Text style={styles.traditionalSub} numberOfLines={1}>{recipe.description || recipe.cuisine}</Text>
        <View style={styles.traditionalTags}>
          {recipe.dietaryType && (
            <View style={styles.dietBadge}>
              <Text style={styles.dietBadgeText}>{recipe.dietaryType.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.traditionalCal}>{recipe.perServing?.calories || 0} kcal</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Quick Bite Card ───────────────────────────────────────────
function QuickBiteCard({ recipe, onPress }) {
  return (
    <TouchableOpacity style={styles.quickBiteCard} onPress={() => onPress(recipe)} activeOpacity={0.9}>
      <View style={styles.quickBiteIcon}>
        <Ionicons name="flash-outline" size={22} color="#4A6020" />
      </View>
      <View style={styles.quickBiteInfo}>
        <Text style={styles.quickBiteTitle} numberOfLines={1}>{recipe.title}</Text>
        <Text style={styles.quickBiteSub}>
          {recipe.description || 'Quick recipe'} • {recipe.totalTime || 0} mins
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#8A9A5B" />
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function RecipesScreen({ navigation }) {
  const [featured, setFeatured]           = useState([]);
  const [traditional, setTraditional]     = useState([]);
  const [quickBites, setQuickBites]       = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [savedIds, setSavedIds]           = useState([]);
  const [activeFilter, setActiveFilter]   = useState('All');
  const [searchQuery, setSearchQuery]     = useState('');
  const [isSearching, setIsSearching]     = useState(false);
  const [refreshing, setRefreshing]       = useState(false);

  const [loadingFeatured, setLoadingFeatured]       = useState(true);
  const [loadingTraditional, setLoadingTraditional] = useState(true);
  const [loadingQuick, setLoadingQuick]             = useState(true);

  // ── Load all sections ───────────────────────────────────────
 const loadAll = async () => {
  setLoadingFeatured(true);
  setLoadingTraditional(true);
  setLoadingQuick(true);

  const [f, t, q] = await Promise.all([
    getFeaturedRecipes(),
    getTraditionalRecipes(),
    getQuickRecipes(),     // ✅ fixed name
  ]);

  console.log('FEATURED:', JSON.stringify(f));
  console.log('TRADITIONAL:', JSON.stringify(t));
  console.log('QUICK:', JSON.stringify(q));

  if (f.success) setFeatured(f.data);
  setLoadingFeatured(false);

  if (t.success) setTraditional(t.data);
  setLoadingTraditional(false);

  if (q.success) setQuickBites(q.data);
  setLoadingQuick(false);
};

  useEffect(() => { loadAll(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setActiveFilter('All');
    await loadAll();
    setRefreshing(false);
  };

  // ── Search with debounce ────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      const res = await searchRecipes(searchQuery.trim());
      if (res.success) setSearchResults(res.data);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // ── Filter chips — applies to ALL sections ──────────────────
  // FIX: filter was only updating featured; now updates all 3 sections
  const handleFilter = async (filter) => {
  setActiveFilter(filter);

  if (filter === 'All') {
    loadAll();
    return;
  }

  setLoadingFeatured(true);
  setLoadingTraditional(true);
  setLoadingQuick(true);

  // ✅ Pass object, not string
  const res = await filterRecipes({ tag: filter });

  if (res.success) {
    setFeatured(res.data.filter(r => r.isFeatured).length > 0
      ? res.data.filter(r => r.isFeatured)
      : res.data);
    setTraditional(res.data.filter(r => r.cuisine === 'Indian').length > 0
      ? res.data.filter(r => r.cuisine === 'Indian')
      : res.data);
    setQuickBites(res.data.filter(r => r.totalTime <= 10).length > 0
      ? res.data.filter(r => r.totalTime <= 10)
      : res.data);
  }

  setLoadingFeatured(false);
  setLoadingTraditional(false);
  setLoadingQuick(false);
};

  // ── Save / Unsave — FIX: pass Firebase ID token ─────────────
  const handleSave = async (id, isSaved) => {
    // Optimistic update
    setSavedIds(prev =>
      isSaved ? prev.filter(s => s !== id) : [...prev, id]
    );

    const token = await getToken();
    if (!token) {
      // Revert optimistic update if not logged in
      setSavedIds(prev =>
        isSaved ? [...prev, id] : prev.filter(s => s !== id)
      );
      return;
    }

    const res = isSaved
      ? await unsaveRecipe(id, token)
      : await saveRecipe(id, token);

    // Revert if backend call failed
    if (!res?.success) {
      setSavedIds(prev =>
        isSaved ? [...prev, id] : prev.filter(s => s !== id)
      );
    }
  };

  const goToDetail = (recipe) => {
    navigation.navigate('RecipeDetail', { recipeId: recipe._id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FBE5" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#CCFF00" />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Healthy Indian Eats</Text>
            <Text style={styles.headerSub}>Fuel your fitness with traditional flavors.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddRecipe')}>
            <Ionicons name="add" size={24} color="#1A1D10" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#8A9A5B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search healthy recipes..."
            placeholderTextColor="#A0B060"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8A9A5B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => handleFilter(f)}
            >
              <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Search Results ── */}
        {isSearching && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {searchResults.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={40} color="#B0BF7A" />
                <Text style={styles.emptyText}>No recipes found</Text>
              </View>
            ) : (
              searchResults.map(r => (
                <TraditionalCard key={r._id} recipe={r} onPress={goToDetail} />
              ))
            )}
          </View>
        )}

        {/* ── Main Sections ── */}
        {!isSearching && (
          <>
            {/* Daily Featured */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Featured</Text>
              <TouchableOpacity><Text style={styles.seeMore}>View All</Text></TouchableOpacity>
            </View>

            {loadingFeatured ? (
              <>
                <FeaturedSkeleton />
                <View style={styles.smallCardsRow}>
                  <SmallCardSkeleton />
                  <SmallCardSkeleton />
                </View>
              </>
            ) : featured.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="restaurant-outline" size={40} color="#B0BF7A" />
                <Text style={styles.emptyText}>No featured recipes yet</Text>
                <Text style={styles.emptySubText}>Be the first to add one!</Text>
              </View>
            ) : (
              <>
                <FeaturedCard
                  recipe={featured[0]}
                  onPress={goToDetail}
                  onSave={handleSave}
                  savedIds={savedIds}
                />
                {featured.length > 1 && (
                  <View style={styles.smallCardsRow}>
                    {featured.slice(1, 3).map(r => (
                      <SmallCard
                        key={r._id}
                        recipe={r}
                        onPress={goToDetail}
                        onSave={handleSave}
                        savedIds={savedIds}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Traditional Favorites */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Traditional Favorites</Text>
              <TouchableOpacity><Text style={styles.seeMore}>See More</Text></TouchableOpacity>
            </View>

            {loadingTraditional ? (
              // FIX: skeleton also uses horizontal scroll like the real list
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 20 }}>
                <TraditionalSkeleton />
                <TraditionalSkeleton />
              </ScrollView>
            ) : traditional.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No traditional recipes yet</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
              >
                {traditional.map(r => (
                  <TraditionalCard key={r._id} recipe={r} onPress={goToDetail} />
                ))}
              </ScrollView>
            )}

            {/* Quick Healthy Bites */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Quick Healthy Bites</Text>
            </View>

            {loadingQuick ? (
              <>
                <QuickBiteSkeleton />
                <QuickBiteSkeleton />
              </>
            ) : quickBites.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No quick bites yet</Text>
              </View>
            ) : (
              quickBites.map(r => (
                <QuickBiteCard key={r._id} recipe={r} onPress={goToDetail} />
              ))
            )}

            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FBE5',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1D10',
  },
  headerSub: {
    fontSize: 13,
    color: '#6B7A40',
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFF00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEFAD0',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1D10',
  },
  filtersRow: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: '#EEFAD0',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#CCFF00',
    borderColor: '#CCFF00',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7A40',
  },
  filterChipTextActive: {
    color: '#1A1D10',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D10',
  },
  seeMore: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A6020',
  },
  // Featured
  featuredCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  featuredImage: {
    width: '100%',
    height: 200,
  },
  topChoiceBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#CCFF00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  topChoiceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1D10',
    letterSpacing: 0.5,
  },
  saveBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#00000040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredInfo: {
    padding: 14,
  },
  featuredTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D10',
    flex: 1,
  },
  featuredCal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A6020',
    marginLeft: 8,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredMetaText: {
    fontSize: 13,
    color: '#6B7A40',
    marginLeft: 4,
  },
  // Small cards
  smallCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  smallCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  smallImage: {
    width: '100%',
    height: 120,
  },
  smallSaveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00000040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallInfo: {
    padding: 10,
  },
  smallTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1D10',
    marginBottom: 4,
  },
  smallMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCal: {
    fontSize: 12,
    color: '#6B7A40',
    fontWeight: '600',
  },
  smallTime: {
    fontSize: 12,
    color: '#8A9A5B',
  },
  // Traditional — FIX: removed fixed width: width - 40 (was causing full-width cards in horizontal scroll)
  traditionalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  traditionalImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  traditionalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  traditionalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D10',
    marginBottom: 2,
  },
  traditionalSub: {
    fontSize: 12,
    color: '#6B7A40',
    marginBottom: 6,
  },
  traditionalTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dietBadge: {
    backgroundColor: '#CCFF00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dietBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1D10',
  },
  traditionalCal: {
    fontSize: 12,
    color: '#6B7A40',
    fontWeight: '600',
  },
  // Quick Bites
  quickBiteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    gap: 12,
  },
  quickBiteIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEFAD0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBiteInfo: {
    flex: 1,
  },
  quickBiteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D10',
    marginBottom: 2,
  },
  quickBiteSub: {
    fontSize: 12,
    color: '#6B7A40',
  },
  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8A9A5B',
  },
  emptySubText: {
    fontSize: 13,
    color: '#A0B060',
  },
  noImage: {
    backgroundColor: '#EEFAD0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});